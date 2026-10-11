// Theme tokens (public/tokens.css): every text/background pair the page uses
// clears WCAG AA in all three themes, and panel borders clear 3:1.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const css = fs.readFileSync(path.join(__dirname, '..', 'public', 'tokens.css'), 'utf8');

function block(selector) {
  const i = css.indexOf(selector + ' {');
  assert.ok(i >= 0, selector);
  const body = css.slice(i, css.indexOf('\n}', i));
  const out = {};
  for (const m of body.matchAll(/--([\w-]+):\s*([^;]+);/g)) out[m[1]] = m[2].trim();
  return out;
}
const base = block(':root');
const themes = {
  'ministry-dark': base,
  reading: { ...base, ...block(":root[data-theme='reading']") },
  'low-glare': { ...base, ...block(":root[data-theme='low-glare']") }
};

function rgb(t, name) {
  let v = t[name];
  for (let i = 0; i < 5 && /^var\(/.test(v); i++) v = t[v.slice(6, -1)];
  const parts = v.split(/\s+/).map(Number);
  assert.equal(parts.length, 3, name + ' = ' + v);
  return parts;
}
function lum([r, g, b]) {
  const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
function ratio(a, b) {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

const TEXT = ['c-theme-text', 'c-theme-dim', 'c-accent', 'c-success', 'c-danger', 'c-warning', 'c-counter',
  'c-wave-1', 'c-wave-2', 'c-wave-3', 'c-wave-4', 'c-wave-5', 'c-wave-6'];
const GROUNDS = ['c-dark-bg', 'c-dark-card', 'c-dark-input'];
// filled buttons/badges carry --c-ink text
const FILLS = ['c-accent', 'c-success', 'c-warning', 'c-danger', 'c-counter', 'c-success-dark', 'c-accent-dim',
  'c-wave-1', 'c-wave-2', 'c-wave-3', 'c-wave-4', 'c-wave-5', 'c-wave-6'];

for (const [name, t] of Object.entries(themes)) {
  test(`theme ${name}: text and coloured text clear AA (4.5:1) on page, cards and inputs`, () => {
    const bad = [];
    for (const fg of TEXT) for (const bg of GROUNDS) {
      const r = ratio(rgb(t, fg), rgb(t, bg));
      if (r < 4.5) bad.push(`${fg} on ${bg}: ${r.toFixed(2)}`);
    }
    assert.deepEqual(bad, []);
  });
  test(`theme ${name}: text on filled buttons/badges clears AA`, () => {
    const bad = [];
    for (const bg of FILLS) {
      const r = ratio(rgb(t, 'c-ink'), rgb(t, bg));
      if (r < 4.5) bad.push(`ink on ${bg}: ${r.toFixed(2)}`);
    }
    assert.deepEqual(bad, []);
  });
  test(`theme ${name}: borders clear 3:1 against page and cards`, () => {
    for (const bg of GROUNDS) {
      const r = ratio(rgb(t, 'c-theme-border'), rgb(t, bg));
      assert.ok(r >= 3, `border on ${bg}: ${r.toFixed(2)}`);
    }
  });
}

test('style sheets use theme tokens only (no hardcoded colours)', () => {
  for (const f of ['style.css', 'login.css']) {
    const s = fs.readFileSync(path.join(__dirname, '..', 'public', f), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    assert.doesNotMatch(s, /#[0-9a-fA-F]{3,8}\b|rgba?\(\s*\d/, f);
  }
});
