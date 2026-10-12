// The user guide: content complete in all 9 languages, every {token} is a real UI label,
// the page is behind the gate, and nothing breaks the CSP.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const HELP = require('../public/help-content.js');
const LANG = require('../public/i18n.js');
const { createApp } = require('../server.js');

const CODES = ['en', 'es', 'fr', 'de', 'pl', 'ko', 'zh', 'tr', 'ar'];
const texts = (sec) => sec[2].flatMap((b) => (Array.isArray(b[1]) ? b[1] : [b[1]]));

test('guide exists in every language, with the same sections and block shapes as English', () => {
  assert.deepEqual(Object.keys(HELP), CODES);
  const en = HELP.en;
  for (const c of CODES) {
    const h = HELP[c];
    for (const k of ['page_title', 'back', 'contents']) assert.ok(h[k] && h[k].length, c + ' ' + k);
    assert.deepEqual(h.sections.map((s) => s[0]), en.sections.map((s) => s[0]), c + ' section ids');
    h.sections.forEach((s, i) => {
      assert.ok(s[1], c + ' ' + s[0] + ' title');
      assert.deepEqual(s[2].map((b) => b[0]), en.sections[i][2].map((b) => b[0]), c + ' ' + s[0] + ' block kinds');
      s[2].forEach((b, j) => {
        const e = en.sections[i][2][j];
        if (Array.isArray(b[1])) assert.equal(b[1].length, e[1].length, c + ' ' + s[0] + ' list length');
        for (const t of (Array.isArray(b[1]) ? b[1] : [b[1]])) assert.ok(typeof t === 'string' && t.trim(), c + ' ' + s[0] + ' empty text');
      });
    });
  }
});

test('every {token} in the guide is a string label in every language, and every token English uses is used', () => {
  for (const c of CODES) {
    HELP[c].sections.forEach((s, i) => {
      const got = texts(s).join(' ').match(/\{[a-z_0-9]+\}/gi) || [];
      const want = texts(HELP.en.sections[i]).join(' ').match(/\{[a-z_0-9]+\}/gi) || [];
      for (const tok of new Set(want)) assert.ok(got.includes(tok), c + ' ' + s[0] + ' is missing ' + tok); // translations may use more labels
      for (const tok of got) {
        const key = tok.slice(1, -1);
        assert.equal(typeof LANG[c][key], 'string', c + ' ' + key + ' is not a label');
      }
    });
    assert.ok(!/[<>]/.test(JSON.stringify(HELP[c])), c + ' no markup in the text');
  }
});

test('the guide page and its scripts follow the CSP (no inline script/style, no external URLs)', () => {
  const page = fs.readFileSync(path.join(__dirname, '../public/help.html'), 'utf8');
  assert.doesNotMatch(page, /https?:\/\//);
  assert.doesNotMatch(page, /<script>|<style>|\son[a-z]+="|style="/);
  for (const f of ['help.js', 'help-content.js']) {
    const src = fs.readFileSync(path.join(__dirname, '../public', f), 'utf8');
    assert.doesNotMatch(src, /innerHTML|outerHTML|insertAdjacentHTML|document\.write|eval\(/, f);
  }
});

test('/help is behind the gate and served with it; the tool links to it', async () => {
  const server = createApp({ log: { warn() {} }, password: 'test-gate-pw' }).listen(0);
  await new Promise((r) => server.once('listening', r));
  const base = 'http://127.0.0.1:' + server.address().port;
  try {
    const anon = await fetch(base + '/help', { redirect: 'manual', headers: { accept: 'text/html' } });
    assert.equal(anon.status, 302);
    assert.match(anon.headers.get('location'), /^\/login\?next=%2Fhelp/);
    for (const p of ['/help.js', '/help-content.js', '/help.css']) assert.equal((await fetch(base + p, { redirect: 'manual' })).status, 401, p);
    const crypto = require('node:crypto');
    const cookie = 'rally_gate=' + crypto.createHmac('sha256', 'test-gate-pw').update('rally-gate-v1').digest('base64url');
    const ok = await fetch(base + '/help', { headers: { cookie } });
    assert.equal(ok.status, 200);
    assert.equal(ok.headers.get('x-robots-tag'), 'noindex, nofollow');
    assert.match(await ok.text(), /id="help-body"/);
    const main = await (await fetch(base + '/', { headers: { cookie } })).text();
    assert.match(main, /href="\/help"/);
  } finally { server.close(); }
});
