// "What's new": same releases, dates and item counts in all 9 languages, English matches CHANGELOG.md,
// and the page is behind the gate.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const CL = require('../public/changelog-content.js');
const { createApp } = require('../server.js');

const CODES = ['en', 'es', 'fr', 'de', 'pl', 'ko', 'zh', 'tr', 'ar'];

test('change log exists in every language with the same releases, dates and item counts', () => {
  assert.deepEqual(Object.keys(CL), CODES);
  for (const c of CODES) {
    assert.ok(CL[c].whats_new.trim(), c);
    assert.deepEqual(CL[c].releases.map((r) => [r.id, r.date, r.items.length]), CL.en.releases.map((r) => [r.id, r.date, r.items.length]), c);
    for (const r of CL[c].releases) {
      assert.ok(r.title.trim(), c + ' ' + r.id);
      for (const i of r.items) assert.ok(i.trim() && !/[<>]/.test(i), c + ' ' + r.id);
    }
  }
  const dates = CL.en.releases.map((r) => r.date);
  assert.deepEqual([...dates].sort().reverse(), dates, 'newest first');
});

test('CHANGELOG.md lists every English release and item', () => {
  const md = fs.readFileSync(path.join(__dirname, '../CHANGELOG.md'), 'utf8');
  for (const r of CL.en.releases) {
    assert.ok(md.includes(`## ${r.title} (${r.date})`), r.id);
    for (const i of r.items) assert.ok(md.includes('- ' + i), r.id + ': ' + i.slice(0, 40));
  }
});

test('/changelog is gated, linked from the guide, and follows the CSP', async () => {
  const page = fs.readFileSync(path.join(__dirname, '../public/changelog.html'), 'utf8');
  assert.doesNotMatch(page, /https?:\/\/|<script>|<style>|\son[a-z]+="|style="/);
  assert.doesNotMatch(fs.readFileSync(path.join(__dirname, '../public/changelog.js'), 'utf8'), /innerHTML|insertAdjacentHTML|eval\(/);
  const server = createApp({ log: { warn() {} }, password: 'test-gate-pw' }).listen(0);
  await new Promise((r) => server.once('listening', r));
  const base = 'http://127.0.0.1:' + server.address().port;
  try {
    const anon = await fetch(base + '/changelog', { redirect: 'manual', headers: { accept: 'text/html' } });
    assert.equal(anon.status, 302);
    assert.equal((await fetch(base + '/changelog-content.js', { redirect: 'manual' })).status, 401);
    const cookie = 'rally_gate=' + crypto.createHmac('sha256', 'test-gate-pw').update('rally-gate-v1').digest('base64url');
    const ok = await fetch(base + '/changelog', { headers: { cookie } });
    assert.equal(ok.status, 200);
    assert.equal(ok.headers.get('x-robots-tag'), 'noindex, nofollow');
    assert.match(await (await fetch(base + '/help', { headers: { cookie } })).text(), /href="\/changelog"/);
  } finally { server.close(); }
});
