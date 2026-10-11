// Attack | Counter lists, rally durations and the 9 languages.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../public/core.js');
const LANG = require('../public/i18n.js');

const at = (iso) => Date.parse(iso);

// localStorage stand-in
function memStore(init) {
  const m = new Map(Object.entries(init || {}));
  return {
    m,
    get: (k) => (m.has(k) ? m.get(k) : null),
    apply: (obj) => { for (const [k, v] of Object.entries(obj)) { if (v === null) m.delete(k); else m.set(k, v); } }
  };
}

test('9 languages, in the event app order, with every key English has', () => {
  assert.deepEqual(Object.keys(LANG), ['en', 'es', 'fr', 'de', 'pl', 'ko', 'zh', 'tr', 'ar']);
  const keys = Object.keys(LANG.en).sort();
  for (const code of Object.keys(LANG)) {
    assert.deepEqual(Object.keys(LANG[code]).sort(), keys, code);
    for (const k of keys) {
      assert.notEqual(LANG[code][k], '', code + '.' + k);
      assert.equal(typeof LANG[code][k], typeof LANG.en[k], code + '.' + k + ' type');
    }
  }
  assert.equal(LANG.es.lang_name, 'Español');
  assert.equal(LANG.fr.lang_name, 'Français');
  assert.equal(LANG.de.lang_name, 'Deutsch');
});

test('Counter copy text: heading + caller lines, in all 9 languages', () => {
  const heads = {
    en: 'COUNTER - land 12:00:00',
    es: 'CONTRAATAQUE - llegada 12:00:00',
    fr: 'CONTRE-ATTAQUE - arrivée 12:00:00',
    de: 'KONTER - Ankunft 12:00:00',
    pl: 'KONTRA - lądowanie 12:00:00',
    ko: '카운터 - 도착 12:00:00',
    zh: '反击 - 到达 12:00:00',
    tr: 'KONTRA - varış 12:00:00',
    ar: 'هجوم مضاد - الوصول 12:00:00'
  };
  assert.deepEqual(Object.keys(heads).sort(), Object.keys(LANG).sort());
  const callers = [
    { name: 'Bravo', marchSeconds: 55, wave: 1 },
    { name: 'Alpha', marchSeconds: 105, wave: 1 },
    { name: 'Off', marchSeconds: 200, wave: 0 }
  ];
  for (const [code, head] of Object.entries(heads)) {
    const L = LANG[code];
    const text = C.buildCounterCopyText(callers, at('2026-10-09T12:00:00Z'), 300, L);
    assert.equal(text, [
      head,
      '11:53:15 - Alpha (' + L.march_word + ' 1:45)',
      '11:54:05 - Bravo (' + L.march_word + ' 0:55)'
    ].join('\n'), code);
    assert.doesNotMatch(text, /UTC|\t/, code);
  }
  // exact owner-approved English
  assert.equal(C.buildCounterCopyText([{ name: 'X', marchSeconds: 30, wave: 1 }], at('2026-10-09T23:59:00Z'), 60, LANG.en),
    'COUNTER - land 23:59:00\n23:57:30 - X (march 0:30)');
});

test('Counter labels: tab and copy button carry the alliance tag; empty tag falls back', () => {
  for (const code of Object.keys(LANG)) {
    const L = LANG[code];
    assert.match(L.list_tab('BDE'), /BDE/, code);
    assert.match(L.copy_counter_btn('BDE'), /BDE/, code);
    assert.equal(L.list_tab(''), L.list_counter, code);
    assert.ok(L.copy_counter_btn('').length > 0, code);
    assert.match(L.list_auto_reset('X'), /X/, code);
    for (const n of [1, 2, 3, 5, 10]) assert.match(L.dur_n(n), new RegExp('\\b' + n + '|^' + n), code + ' ' + n);
  }
  assert.equal(LANG.en.list_tab('BDE'), 'Counter: BDE');
  assert.equal(LANG.en.copy_counter_btn('BDE'), 'Copy Counter: BDE');
  assert.equal(C.cleanLabel('  <BDE>\tX  '), 'BDE X');
  assert.equal(C.cleanLabel('ABCDEFGHIJKLMNOP').length, C.MAX_LABEL);
  assert.equal(C.cleanLabel(null), '');
});

test('Attack copy text is unchanged by the Counter feature (same as before, one wave + waves)', () => {
  const callers = [{ name: 'Alpha', marchSeconds: 105, wave: 1 }];
  assert.equal(C.buildWavesCopyText(callers, [at('2026-10-09T12:00:00Z')], 300, LANG.en),
    'Land 12:00:00\n11:53:15 - Alpha (march 1:45)');
});

test('rally duration: 1, 2, 3, 5, 10 min, default 5; a saved 10 still works; junk -> 5', () => {
  assert.deepEqual(C.DURATION_CHOICES, [60, 120, 180, 300, 600]);
  assert.equal(C.DEFAULT_DURATION, 300);
  assert.equal(C.normalizeDuration(null), 300);
  assert.equal(C.normalizeDuration('600'), 600);
  assert.equal(C.normalizeDuration('60'), 60);
  assert.equal(C.normalizeDuration(120), 120);
  assert.equal(C.normalizeDuration('180'), 180);
  assert.equal(C.normalizeDuration('42'), 300);
  assert.equal(C.normalizeDuration('abc'), 300);
  assert.equal(C.normalizeReaction(null), 30);
  assert.equal(C.normalizeReaction('180'), 180);
  assert.equal(C.normalizeReaction('7'), 30);
  // a 1-minute rally: start = arrival - 60s - march
  const s = C.buildSchedule([{ name: 'A', marchSeconds: 30 }], at('2026-10-09T12:00:00Z'), 60);
  assert.equal(C.formatUTC(s[0].setOffMs), '11:58:30');
});

test('migration: data saved before Counter existed loads as the Attack list; Counter starts empty and live', () => {
  const now = at('2026-10-09T12:00:00Z');
  const s = memStore({
    rally_callers: JSON.stringify([{ name: 'Alpha', marchSeconds: 105, selected: true }, { name: 'Bravo', marchSeconds: 55, selected: false }]),
    rally_waves: JSON.stringify({ count: 2, defaultDelay: 15, gaps: [null] }),
    rally_duration: '600',
    rally_buffer: '45',
    rally_frozen_ms: String(now + 30000),
    rally_frozen_at_ms: String(now - 60000)
  });
  const a = C.loadList(s.get, 'attack', now);
  assert.deepEqual(a.callers, [{ name: 'Alpha', marchSeconds: 105, wave: 1 }, { name: 'Bravo', marchSeconds: 55, wave: 0 }]);
  assert.equal(a.waves.count, 2);
  assert.equal(a.waves.defaultDelay, 15);
  assert.equal(a.durationSec, 600);
  assert.equal(a.reactionSec, 45);
  assert.deepEqual(a.plan, { mode: 'frozen', firstStartMs: now + 30000, frozenAtMs: now - 60000 });
  const c = C.loadList(s.get, 'counter', now);
  assert.deepEqual(c.callers, []);
  assert.deepEqual(c.plan, { mode: 'live' });
  assert.equal(c.waves.count, 1);
  assert.equal(c.durationSec, 300);
  assert.equal(c.reactionSec, 30);
  assert.equal(c.label, '');
  // an old typed Land at (several waves) also stays with Attack
  const s2 = memStore({ rally_arrival_ms: String(now + 600000), rally_land_ms: JSON.stringify([now + 600000, now + 610000]), rally_waves: JSON.stringify({ count: 2 }) });
  const a2 = C.loadList(s2.get, 'attack', now);
  assert.equal(a2.plan.mode, 'fixed');
  assert.deepEqual(a2.plan.landMs, [now + 600000, now + 610000]);
  assert.equal(a2.plan.frozenAtMs, now, 'no stored freeze time: counts from now');
  // plans older than an hour are dropped
  assert.deepEqual(C.loadList(memStore({ rally_frozen_ms: String(now - 3700e3) }).get, 'attack', now).plan, { mode: 'live' });
  // Counter: waves above 1 in saved data are off (single wave)
  const s3 = memStore({ rally_counter_callers: JSON.stringify([{ name: 'X', marchSeconds: 40, wave: 2 }, { name: 'Y', marchSeconds: 50, wave: 1 }]) });
  assert.deepEqual(C.loadList(s3.get, 'counter', now).callers.map((x) => x.wave), [0, 1]);
});

test('the two lists use disjoint storage keys', () => {
  const vals = (k) => Object.values(C.LIST_KEYS[k]).filter(Boolean);
  const attack = new Set(vals('attack'));
  for (const k of vals('counter')) assert.ok(!attack.has(k), k);
  // Attack keeps the pre-Counter keys
  assert.equal(C.LIST_KEYS.attack.callers, 'rally_callers');
  assert.equal(C.LIST_KEYS.attack.frozen, 'rally_frozen_ms');
  for (const kind of C.LISTS) {
    for (const plan of [{ mode: 'live' }, { mode: 'frozen', firstStartMs: 1, frozenAtMs: 2 }, { mode: 'fixed', arrivalMs: 3, landMs: [3, 4], frozenAtMs: 5 }]) {
      for (const key of Object.keys(C.planStorage(kind, plan))) assert.ok(vals(kind).includes(key), kind + ' ' + key);
    }
  }
});

test('independence: freezing Counter leaves Attack live; each list has its own auto-reset deadline', () => {
  const t0 = at('2026-10-09T12:00:00Z');
  const s = memStore({
    rally_callers: C.callersStorage([{ name: 'Alpha', marchSeconds: 105, wave: 1 }]),
    rally_counter_callers: C.callersStorage([{ name: 'Zed', marchSeconds: 40, wave: 1 }])
  });
  // freeze Counter at t0
  const cPlan = C.freezePlan(t0, 30);
  s.apply(C.planStorage('counter', cPlan));
  let a = C.loadList(s.get, 'attack', t0 + 1000);
  let c = C.loadList(s.get, 'counter', t0 + 1000);
  assert.deepEqual(a.plan, { mode: 'live' }, 'Attack still live');
  assert.equal(c.plan.mode, 'frozen');
  assert.equal(c.plan.firstStartMs, t0 + 30000);
  // Attack's times follow the clock; Counter's stay put
  const aLand = (now) => C.planArrivalMs(a.plan, now, a.callers, 30, 300, a.waves);
  const cLand = (now) => C.planArrivalMs(c.plan, now, c.callers, 30, 300, c.waves);
  assert.equal(aLand(t0 + 10000) - aLand(t0), 10000);
  assert.equal(cLand(t0 + 10000), cLand(t0));
  // freeze Attack 2 minutes later: Counter untouched
  s.apply(C.planStorage('attack', C.freezePlan(t0 + 120000, 30)));
  a = C.loadList(s.get, 'attack', t0 + 121000);
  c = C.loadList(s.get, 'counter', t0 + 121000);
  assert.equal(a.plan.mode, 'frozen');
  assert.equal(c.plan.firstStartMs, t0 + 30000, 'Counter kept its own frozen plan');
  // separate deadlines (5 min each, counted from each freeze)
  assert.equal(C.autoResetDeadlineMs(c.plan.frozenAtMs, 5), t0 + 300000);
  assert.equal(C.autoResetDeadlineMs(a.plan.frozenAtMs, 5), t0 + 420000);
  assert.equal(C.autoResetDue(c.plan.frozenAtMs, 5, t0 + 300000), true);
  assert.equal(C.autoResetDue(a.plan.frozenAtMs, 5, t0 + 300000), false);
  // Counter auto-resets: Attack stays frozen
  s.apply(C.planStorage('counter', { mode: 'live' }));
  assert.deepEqual(C.loadList(s.get, 'counter', t0 + 300000).plan, { mode: 'live' });
  assert.equal(C.loadList(s.get, 'attack', t0 + 300000).plan.mode, 'frozen');
  // Attack Reset: Counter untouched
  s.apply(C.planStorage('counter', C.freezePlan(t0 + 310000, 30)));
  s.apply(C.planStorage('attack', { mode: 'live' }));
  assert.equal(C.loadList(s.get, 'counter', t0 + 311000).plan.mode, 'frozen');
  assert.deepEqual(C.loadList(s.get, 'attack', t0 + 311000).plan, { mode: 'live' });
  // the caller lists never mix
  assert.deepEqual(C.loadList(s.get, 'attack', t0).callers.map((x) => x.name), ['Alpha']);
  assert.deepEqual(C.loadList(s.get, 'counter', t0).callers.map((x) => x.name), ['Zed']);
});
