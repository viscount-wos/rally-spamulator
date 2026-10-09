// Server smoke: static files, headers, /health, no old API.
const test = require('node:test');
const assert = require('node:assert/strict');
const app = require('../server.js');

let server, base;
test.before(async () => {
  server = app.listen(0);
  await new Promise((r) => server.once('listening', r));
  base = 'http://127.0.0.1:' + server.address().port;
});
test.after(() => server.close());

test('/health', async () => {
  const r = await fetch(base + '/health');
  assert.equal(r.status, 200);
  assert.deepEqual(await r.json(), { status: 'ok' });
});

test('index is served with CSP, nosniff and no-cache, and is compressed', async () => {
  const r = await fetch(base + '/', { headers: { 'Accept-Encoding': 'gzip' } });
  assert.equal(r.status, 200);
  assert.match(r.headers.get('content-security-policy'), /default-src 'none'; script-src 'self'/);
  assert.equal(r.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(r.headers.get('cache-control'), 'no-cache');
  assert.equal(r.headers.get('content-encoding'), 'gzip');
  assert.equal(r.headers.get('x-powered-by'), null);
  const html = await r.text();
  assert.match(html, /id="copy-btn"/);
  assert.doesNotMatch(html, /https?:\/\//, 'no external URLs');
  assert.doesNotMatch(html, /\son[a-z]+="/, 'no inline event handlers (CSP)');
  assert.doesNotMatch(html, /style="/, 'no inline styles (CSP)');
});

test('old login/API routes are gone', async () => {
  for (const p of ['/api/rallies', '/api/users', '/api/docs', '/api/events']) {
    assert.equal((await fetch(base + p)).status, 404, p);
  }
  const r = await fetch(base + '/login', { redirect: 'manual' });
  assert.equal(r.status, 302);
  assert.equal(r.headers.get('location'), '/');
});
