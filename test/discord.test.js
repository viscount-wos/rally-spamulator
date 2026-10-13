// Discord posting (Advanced): webhook checks, message text, and the server relay (Discord stubbed).
const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../public/core.js');
const { createApp } = require('../server.js');

const HOOK = 'https://discord.com/api/webhooks/123456789012345678/' + 'A'.repeat(40);
const quiet = { warn() {} };
const servers = [];
async function start(opts) {
  const server = createApp({ log: quiet, ...opts }).listen(0);
  await new Promise((r) => server.once('listening', r));
  servers.push(server);
  return 'http://127.0.0.1:' + server.address().port;
}
test.after(() => servers.forEach((s) => s.close()));
const post = (base, body, headers = {}) => fetch(base + '/api/discord', {
  method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body)
});

test('isDiscordWebhook accepts only https discord webhook URLs', () => {
  assert.ok(C.isDiscordWebhook(HOOK));
  assert.ok(C.isDiscordWebhook(HOOK.replace('discord.com', 'discordapp.com')));
  for (const bad of [
    '', null, undefined, 42,
    HOOK.replace('https', 'http'),
    HOOK.replace('discord.com', 'evil.com'),
    'https://evil.com/?x=https://discord.com/api/webhooks/123456789012345678/' + 'A'.repeat(40),
    'https://discord.com.evil.com/api/webhooks/123456789012345678/' + 'A'.repeat(40),
    'https://user@discord.com/api/webhooks/123456789012345678/' + 'A'.repeat(40),
    HOOK + '?thread_id=1',
    HOOK + '/extra',
    'https://discord.com/api/webhooks/12/abc'
  ]) assert.equal(C.isDiscordWebhook(bad), false, String(bad));
});

test('normalizeChannels keeps valid {name,url}, cleans names, caps the list', () => {
  assert.deepEqual(C.normalizeChannels('not json'), []);
  assert.deepEqual(C.normalizeChannels({}), []);
  const r = C.normalizeChannels(JSON.stringify([{ name: '  LOV  ', url: HOOK }, { name: 'bad', url: 'http://x' }, { url: HOOK }]));
  assert.deepEqual(r, [{ name: 'LOV', url: HOOK }, { name: 'Discord', url: HOOK }]);
  const many = Array.from({ length: 20 }, (_, i) => ({ name: 'c' + i, url: HOOK }));
  assert.equal(C.normalizeChannels(many).length, C.MAX_CHANNELS);
  assert.equal(C.cleanChannelName('x'.repeat(50)).length, C.MAX_CHANNEL_NAME);
});

test('discordContent is a code block and backticks cannot close it early', () => {
  assert.equal(C.discordContent('Land 00:05:00\n23:58:15 - A'), '```\nLand 00:05:00\n23:58:15 - A\n```');
  assert.equal(C.discordContent('a```b'), "```\na'''b\n```");
  assert.ok(C.discordFits('x'.repeat(1990)));
  assert.equal(C.discordFits('x'.repeat(1995)), false);
});

test('relay: posts the text in a code block with mentions disabled, returns ok', async () => {
  const calls = [];
  const base = await start({ password: '', fetch: async (url, init) => { calls.push({ url, init }); return { ok: true, status: 204 }; } });
  const r = await post(base, { url: HOOK, text: 'Land 18:00:00 @everyone' });
  assert.equal(r.status, 200);
  assert.deepEqual(await r.json(), { ok: true });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, HOOK);
  const sent = JSON.parse(calls[0].init.body);
  assert.equal(sent.content, '```\nLand 18:00:00 @everyone\n```');
  assert.deepEqual(sent.allowed_mentions, { parse: [] });
  assert.equal(calls[0].init.redirect, 'error');
});

test('relay: rejects other URLs and bad text without calling anything', async () => {
  let called = 0;
  const base = await start({ password: '', fetch: async () => { called++; return { ok: true }; } });
  for (const body of [
    { url: 'https://evil.com/x', text: 'hi' },
    { url: HOOK.replace('https', 'http'), text: 'hi' },
    { url: HOOK, text: '' },
    { url: HOOK, text: 5 },
    { url: HOOK, text: 'x'.repeat(2000) },
    {}
  ]) assert.equal((await post(base, body)).status, 400, JSON.stringify(body).slice(0, 60));
  assert.equal(called, 0);
});

test('relay: Discord errors map to our own codes and never echo the URL', async () => {
  for (const [status, want, code] of [[404, 400, 'gone'], [401, 400, 'gone'], [429, 502, 'discord'], [500, 502, 'discord']]) {
    const base = await start({ password: '', fetch: async () => ({ ok: false, status }) });
    const r = await post(base, { url: HOOK, text: 'hi' });
    assert.equal(r.status, want);
    const body = await r.text();
    assert.equal(JSON.parse(body).error, code);
    assert.ok(!body.includes('webhooks'));
  }
  const down = await start({ password: '', fetch: async () => { throw new Error('boom ' + HOOK); } });
  const r = await post(down, { url: HOOK, text: 'hi' });
  assert.equal(r.status, 502);
  assert.ok(!(await r.text()).includes('webhooks'));
});

test('relay: rate limited per client', async () => {
  const base = await start({ password: '', fetch: async () => ({ ok: true }) });
  let last;
  for (let i = 0; i < 31; i++) last = await post(base, { url: HOOK, text: 'hi' });
  assert.equal(last.status, 429);
});

test('relay: behind the password gate (401 without the cookie)', async () => {
  const base = await start({ password: 'test-gate-pw', fetch: async () => ({ ok: true }) });
  const r = await post(base, { url: HOOK, text: 'hi' });
  assert.equal(r.status, 401);
});
