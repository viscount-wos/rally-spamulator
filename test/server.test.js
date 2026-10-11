// Server tests: static files, headers, /health and the shared-password gate.
// Uses a dummy password; the real one only ever comes from GATE_PASSWORD in production.
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { createApp, gateConfig, safeNext, COOKIE, RATE_MAX } = require('../server.js');

const PW = 'test-gate-pw';
const quiet = { warn() {} };
const servers = [];

async function start(opts) {
  const server = createApp({ log: quiet, ...opts }).listen(0);
  await new Promise((r) => server.once('listening', r));
  servers.push(server);
  return 'http://127.0.0.1:' + server.address().port;
}
test.after(() => servers.forEach((s) => s.close()));

const html = { accept: 'text/html,application/xhtml+xml' };
const get = (url, headers = {}) => fetch(url, { redirect: 'manual', headers });
const login = (base, password, next, headers = {}) => fetch(base + '/login', {
  method: 'POST',
  redirect: 'manual',
  headers: { 'content-type': 'application/x-www-form-urlencoded', ...headers },
  body: new URLSearchParams(next === undefined ? { password } : { password, next }).toString()
});
const cookieOf = (r) => (r.headers.get('set-cookie') || '').split(';')[0];
const expectedToken = crypto.createHmac('sha256', PW).update('rally-gate-v1').digest('base64url');

// ---------- gate OFF (dev: GATE_PASSWORD unset) ----------
test('gate off: app, assets and /health are open; /login leads to the app', async () => {
  const base = await start({ password: '' });
  const r = await get(base + '/', { 'Accept-Encoding': 'gzip' });
  assert.equal(r.status, 200);
  assert.match(r.headers.get('content-security-policy'), /default-src 'none'; script-src 'self'/);
  assert.equal(r.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(r.headers.get('cache-control'), 'no-cache');
  assert.equal(r.headers.get('content-encoding'), 'gzip');
  assert.equal(r.headers.get('x-powered-by'), null);
  const page = await r.text();
  assert.match(page, /id="copy-btn"/);
  assert.match(page, /href="\/logout"/, 'log out link in the footer');
  assert.doesNotMatch(page, /https?:\/\//, 'no external URLs');
  assert.doesNotMatch(page, /\son[a-z]+="/, 'no inline event handlers (CSP)');
  assert.doesNotMatch(page, /style="/, 'no inline styles (CSP)');
  for (const p of ['/app.js', '/core.js', '/i18n.js', '/style.css']) assert.equal((await get(base + p)).status, 200, p);
  assert.equal((await get(base + '/health')).status, 200);
  const l = await get(base + '/login');
  assert.equal(l.status, 302);
  assert.equal(l.headers.get('location'), '/');
  for (const p of ['/api/rallies', '/api/users', '/api/docs', '/api/events']) {
    assert.equal((await get(base + p)).status, 404, p);
  }
});

test('gate off logs a warning; production without GATE_PASSWORD refuses', () => {
  const warnings = [];
  createApp({ password: '', log: { warn: (m) => warnings.push(m) } });
  assert.match(warnings.join(' '), /DISABLED/);
  assert.throws(() => gateConfig({ NODE_ENV: 'production' }), /GATE_PASSWORD/);
  assert.throws(() => gateConfig({ NODE_ENV: 'production', GATE_PASSWORD: '' }), /GATE_PASSWORD/);
  assert.deepEqual(gateConfig({ NODE_ENV: 'production', GATE_PASSWORD: PW }), { password: PW });
  assert.deepEqual(gateConfig({}), { password: '' });
});

test('prod: `node server.js` exits non-zero without GATE_PASSWORD', () => {
  const env = { PATH: process.env.PATH, NODE_ENV: 'production', PORT: '0' };
  const r = spawnSync(process.execPath, [path.join(__dirname, '..', 'server.js')], { env, timeout: 10000, encoding: 'utf8' });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /GATE_PASSWORD is not set/);
});

// ---------- gate ON ----------
test('gate on: /health open; pages redirect to /login?next=; everything else 401', async () => {
  const base = await start({ password: PW });
  const h = await get(base + '/health');
  assert.equal(h.status, 200);
  assert.deepEqual(await h.json(), { status: 'ok' });

  const r = await get(base + '/', html);
  assert.equal(r.status, 302);
  assert.equal(r.headers.get('location'), '/login?next=%2F');
  const r2 = await get(base + '/index.html?x=1', html);
  assert.equal(r2.headers.get('location'), '/login?next=' + encodeURIComponent('/index.html?x=1'));

  for (const p of ['/', '/index.html', '/app.js', '/core.js', '/i18n.js', '/style.css', '/nope']) {
    const a = await get(base + p);
    assert.equal(a.status, 401, p);
    assert.equal(a.headers.get('cache-control'), 'no-store', p);
  }
  assert.equal((await fetch(base + '/', { method: 'POST' })).status, 401);
});

test('gate on: login page and its own assets are open, CSP-clean, next is escaped', async () => {
  const base = await start({ password: PW });
  const r = await get(base + '/login?next=' + encodeURIComponent('/index.html?a="><b>'));
  assert.equal(r.status, 200);
  assert.equal(r.headers.get('cache-control'), 'no-store');
  assert.match(r.headers.get('content-security-policy'), /form-action 'self'/);
  const page = await r.text();
  assert.match(page, /type="password"/);
  assert.match(page, /data-error=""/);
  assert.doesNotMatch(page, /<b>/, 'next is HTML-escaped');
  assert.match(page, /name="next" value="\/index.html\?a=%22%3E%3Cb%3E"/);
  assert.doesNotMatch(page, /<script>|<style>|\son[a-z]+="|style="/, 'no inline script/style (CSP)');
  for (const p of ['/login.css', '/login.js', '/icon.svg', '/tokens.css', '/theme.js', '/robots.txt']) assert.equal((await get(base + p)).status, 200, p);
});

test('wrong password: 401 + translated error code, no cookie', async () => {
  const base = await start({ password: PW });
  for (const bad of ['nope', '', PW + ' ', PW.toUpperCase()]) {
    const r = await login(base, bad, '/');
    assert.equal(r.status, 401, JSON.stringify(bad));
    assert.equal(r.headers.get('set-cookie'), null);
    assert.match(await r.text(), /data-error="bad"/);
  }
  const noField = await fetch(base + '/login', { method: 'POST', redirect: 'manual' });
  assert.equal(noField.status, 401);
});

test('right password: cookie flags, redirect to next, cookie opens the app', async () => {
  const base = await start({ password: PW });
  const r = await login(base, PW, '/style.css?v=2');
  assert.equal(r.status, 303);
  assert.equal(r.headers.get('location'), '/style.css?v=2');
  const sc = r.headers.get('set-cookie');
  assert.match(sc, new RegExp('^' + COOKIE + '='));
  for (const flag of ['HttpOnly', 'SameSite=Lax', 'Path=/', 'Max-Age=2592000']) assert.ok(sc.includes(flag), flag);
  assert.ok(!sc.includes('Secure'), 'no Secure flag on plain http');
  assert.equal(cookieOf(r), COOKIE + '=' + expectedToken, 'cookie = HMAC-SHA256(password, "rally-gate-v1"), base64url');
  assert.ok(!sc.includes(PW), 'password itself is never in the cookie');

  const cookie = { cookie: cookieOf(r) };
  for (const p of ['/', '/index.html', '/app.js', '/core.js', '/i18n.js', '/style.css']) {
    assert.equal((await get(base + p, cookie)).status, 200, p);
  }
  // already logged in: /login goes on to next
  const again = await get(base + '/login?next=%2Fapp.js', cookie);
  assert.equal(again.status, 303);
  assert.equal(again.headers.get('location'), '/app.js');
});

test('Secure flag when the request came over https (X-Forwarded-Proto, trust proxy 1)', async () => {
  const base = await start({ password: PW });
  const r = await login(base, PW, '/', { 'x-forwarded-proto': 'https' });
  assert.match(r.headers.get('set-cookie'), /; Secure/);
});

test('tampered, old-password and missing cookies fail', async () => {
  const base = await start({ password: PW });
  const flip = expectedToken.slice(0, -1) + (expectedToken.endsWith('A') ? 'B' : 'A');
  const other = crypto.createHmac('sha256', 'old-dummy-pw').update('rally-gate-v1').digest('base64url');
  for (const c of [flip, other, '', expectedToken + 'x', PW]) {
    assert.equal((await get(base + '/app.js', { cookie: COOKIE + '=' + c })).status, 401, c);
  }
  assert.equal((await get(base + '/app.js', { cookie: 'other=' + expectedToken })).status, 401);
  // a changed password invalidates old cookies (logs everyone out)
  const base2 = await start({ password: 'new-dummy-pw' });
  assert.equal((await get(base2 + '/app.js', { cookie: COOKIE + '=' + expectedToken })).status, 401);
});

test('logout clears the cookie', async () => {
  const base = await start({ password: PW });
  const r = await get(base + '/logout');
  assert.equal(r.status, 303);
  assert.equal(r.headers.get('location'), '/login');
  assert.match(r.headers.get('set-cookie'), new RegExp('^' + COOKIE + '=; .*Max-Age=0'));
});

test('open redirects are blocked', async () => {
  const base = await start({ password: PW });
  const evil = ['https://evil.example/', '//evil.example', '/\\evil.example', '\\\\evil.example', 'javascript:alert(1)',
    'evil', '', '/login', '/logout', '/\t/evil.example', ' /x', '/\r\nSet-Cookie: x=1'];
  for (const next of evil) {
    const r = await login(base, PW, next);
    assert.equal(r.status, 303);
    assert.equal(r.headers.get('location'), '/', JSON.stringify(next));
  }
  assert.equal((await login(base, PW)).headers.get('location'), '/');
  // encoded characters stay encoded inside the path (no header injection, same site)
  assert.equal(safeNext('/%0d%0aSet-Cookie:x'), '/%0d%0aSet-Cookie:x');
  assert.equal(safeNext('/a/b?c=d'), '/a/b?c=d');
});

test('rate limit: 10 attempts per IP per 15 min, then 429; right-most X-Forwarded-For counts', async () => {
  const base = await start({ password: PW });
  const ip = (left) => ({ 'x-forwarded-for': left + ', 203.0.113.7' });
  for (let i = 0; i < RATE_MAX; i++) {
    // a spoofed left-hand entry does not give a fresh budget
    assert.equal((await login(base, 'wrong', '/', ip('10.0.0.' + i))).status, 401, 'attempt ' + (i + 1));
  }
  const blocked = await login(base, PW, '/', ip('10.9.9.9'));
  assert.equal(blocked.status, 429);
  assert.equal(blocked.headers.get('set-cookie'), null, 'even the right password is refused while limited');
  assert.match(await blocked.text(), /data-error="rate"/);
  assert.ok(Number(blocked.headers.get('retry-after')) > 0);
  // another client is unaffected
  assert.equal((await login(base, PW, '/', { 'x-forwarded-for': '198.51.100.9' })).status, 303);
});

// ---------- privacy: no indexing ----------
test('X-Robots-Tag: noindex, nofollow on every response (login, health, 401, redirect, app, 404)', async () => {
  const base = await start({ password: PW });
  const ok = await login(base, PW, '/');
  const cookie = { cookie: cookieOf(ok) };
  const cases = [
    ['/login', {}, 200], ['/health', {}, 200], ['/app.js', {}, 401], ['/', html, 302],
    ['/robots.txt', {}, 200], ['/', cookie, 200], ['/nope.txt', cookie, 404]
  ];
  for (const [p, h, status] of cases) {
    const r = await get(base + p, h);
    assert.equal(r.status, status, p);
    assert.equal(r.headers.get('x-robots-tag'), 'noindex, nofollow', p + ' ' + status);
  }
  const bad = await login(base, 'nope', '/');
  assert.equal(bad.status, 401);
  assert.equal(bad.headers.get('x-robots-tag'), 'noindex, nofollow', 'wrong password');
  assert.equal(ok.headers.get('x-robots-tag'), 'noindex, nofollow', 'login redirect');
  // the login page keeps its meta robots noindex too
  assert.match(await (await get(base + '/login')).text(), /<meta name="robots" content="noindex">/);
  // gate off (dev) as well
  const dev = await start({});
  assert.equal((await get(dev + '/')).headers.get('x-robots-tag'), 'noindex, nofollow');
});

test('/robots.txt is served without the gate and disallows everything', async () => {
  const base = await start({ password: PW });
  const r = await get(base + '/robots.txt');
  assert.equal(r.status, 200);
  assert.match(r.headers.get('content-type'), /^text\/plain/);
  assert.equal(await r.text(), 'User-agent: *\nDisallow: /\n');
  assert.equal(r.headers.get('set-cookie'), null);
  const dev = await start({});
  assert.equal(await (await get(dev + '/robots.txt')).text(), 'User-agent: *\nDisallow: /\n');
});
