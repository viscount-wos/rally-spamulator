// Unit tests for the rally maths, copy text and Garrison maths.
// Run: npm test   (node --test test/)
const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../public/core.js');
const LANG = require('../public/i18n.js');

const at = (iso) => Date.parse(iso);

test('formatMarch / parseMarch round-trip', () => {
  assert.equal(C.formatMarch(105), '1:45');
  assert.equal(C.formatMarch(5), '0:05');
  assert.equal(C.parseMarch('1:45'), 105);
  assert.equal(C.parseMarch('105'), 105);
  assert.equal(C.parseMarch(''), 0);
});

test('LIVE: first start = now + reaction (whole second); arrival = first start + duration + longest march', () => {
  const now = at('2026-10-09T12:00:07.640Z');
  assert.equal(C.formatUTC(C.liveFirstStartMs(now, 30)), '12:00:37'); // milliseconds dropped
  const callers = [{ name: 'A', marchSeconds: 120 }, { name: 'B', marchSeconds: 45 }];
  const live = { mode: 'live' };
  const arrival = C.planArrivalMs(live, now, callers, 30, 300);
  assert.equal(C.formatUTC(arrival), '12:07:37'); // 12:00:37 + 5:00 + 2:00
  const s = C.buildSchedule(callers, arrival, 300);
  assert.deepEqual(s.map((x) => C.formatUTC(x.setOffMs)), ['12:00:37', '12:01:52']);
  // every time moves forward one second per second
  const later = C.planArrivalMs(live, now + 5000, callers, 30, 300);
  assert.equal(later - arrival, 5000);
  assert.equal(C.firstStartPassed(live, now + 3600e3, callers, 30, 300), false);
});

test('FROZEN: times stay put as the clock runs; first-start-passed detection', () => {
  const t0 = at('2026-10-09T12:00:05Z');
  const callers = [{ name: 'A', marchSeconds: 105 }, { name: 'B', marchSeconds: 55 }];
  const plan = C.freezePlan(t0, 30);
  assert.deepEqual(plan, { mode: 'frozen', firstStartMs: at('2026-10-09T12:00:35Z'), frozenAtMs: t0 });
  const a0 = C.planArrivalMs(plan, t0, callers, 30, 300);
  for (const dt of [1000, 29000, 60000, 3600e3]) {
    assert.equal(C.planArrivalMs(plan, t0 + dt, callers, 30, 300), a0, 'unchanged after ' + dt + 'ms');
  }
  assert.equal(C.formatUTC(a0), '12:07:20');
  const copyAt = (ms) => C.buildCopyText(callers, C.planArrivalMs(plan, ms, callers, 30, 300), 300, LANG.en);
  assert.equal(copyAt(t0), copyAt(t0 + 20000));
  // passed only once the first start is strictly behind "now"
  assert.equal(C.firstStartPassed(plan, at('2026-10-09T12:00:34.999Z'), callers, 30, 300), false);
  assert.equal(C.firstStartPassed(plan, at('2026-10-09T12:00:35Z'), callers, 30, 300), false);
  assert.equal(C.firstStartPassed(plan, at('2026-10-09T12:00:35.001Z'), callers, 30, 300), true);
  // reaction time no longer matters once frozen
  assert.equal(C.planArrivalMs(plan, t0, callers, 120, 300), a0);
});

test('FROZEN edits recompute from the frozen first start (callers, duration)', () => {
  const t0 = at('2026-10-09T12:00:00Z');
  const plan = C.freezePlan(t0, 30); // first start 12:00:30
  const three = [{ name: 'A', marchSeconds: 105 }, { name: 'B', marchSeconds: 55 }, { name: 'C', marchSeconds: 30 }];
  const first = (cs, dur) => C.planFirstStartMs(plan, t0 + 9000, cs, 30, dur);
  assert.equal(C.formatUTC(first(three, 300)), '12:00:30');
  assert.equal(C.formatUTC(first(three.slice(1), 300)), '12:00:30'); // longest caller removed
  assert.equal(C.formatUTC(first(three, 600)), '12:00:30');          // 10 min rally
  assert.equal(C.formatUTC(C.planArrivalMs(plan, t0, three, 30, 600)), '12:12:15');
});

test('FIXED (typed Land at) arrival is used as-is; passed when the first start is behind', () => {
  const now = at('2026-10-09T23:50:00Z');
  const plan = { mode: 'fixed', arrivalMs: C.resolveTargetMs(C.parseClock('00:05'), now) };
  const callers = [{ name: 'A', marchSeconds: 105 }];
  assert.equal(C.planArrivalMs(plan, now + 600e3, callers, 30, 300), plan.arrivalMs);
  assert.equal(C.firstStartPassed(plan, now, callers, 30, 300), false);
  assert.equal(C.firstStartPassed(plan, at('2026-10-09T23:58:16Z'), callers, 30, 300), true);
});

test('live and frozen plans across midnight UTC', () => {
  const callers = [{ name: 'Alpha', marchSeconds: 105 }, { name: 'Bravo', marchSeconds: 55 }];
  const t0 = at('2026-10-09T23:59:50Z');
  const live = C.planArrivalMs({ mode: 'live' }, t0, callers, 30, 300);
  assert.equal(new Date(live).toISOString(), '2026-10-10T00:07:05.000Z'); // first start 00:00:20 + 5:00 + 1:45
  const plan = C.freezePlan(t0, 30);
  assert.equal(new Date(plan.firstStartMs).toISOString(), '2026-10-10T00:00:20.000Z');
  const text = C.buildCopyText(callers, C.planArrivalMs(plan, t0 + 25000, callers, 30, 300), 300, LANG.en);
  assert.equal(text, 'Land 00:07:05\n00:00:20 - Alpha (march 1:45)\n00:01:10 - Bravo (march 0:55)');
  assert.equal(C.firstStartPassed(plan, at('2026-10-10T00:00:19Z'), callers, 30, 300), false);
  assert.equal(C.firstStartPassed(plan, at('2026-10-10T00:00:21Z'), callers, 30, 300), true);
});

test('set-off = arrival - rally duration - march; longest march first, ties keep list order', () => {
  const arrival = at('2026-10-09T20:00:00Z');
  const s = C.buildSchedule([
    { name: 'Short', marchSeconds: 30 },
    { name: 'Long', marchSeconds: 90 },
    { name: 'Tie1', marchSeconds: 60 },
    { name: 'Tie2', marchSeconds: 60 }
  ], arrival, 300);
  assert.deepEqual(s.map((x) => x.name), ['Long', 'Tie1', 'Tie2', 'Short']);
  assert.deepEqual(s.map((x) => C.formatUTC(x.setOffMs)), ['19:53:30', '19:54:00', '19:54:00', '19:54:30']);
});

test('typed target time: next occurrence, incl. crossing midnight UTC', () => {
  assert.equal(C.parseClock('00:05'), 300);
  assert.equal(C.parseClock('21:05:30'), 21 * 3600 + 5 * 60 + 30);
  assert.equal(C.parseClock('2105'), 21 * 3600 + 5 * 60);
  assert.equal(C.parseClock('24:00'), null);
  assert.equal(C.parseClock('abc'), null);

  const now = at('2026-10-09T23:50:00Z');
  const target = C.resolveTargetMs(C.parseClock('00:05'), now);
  assert.equal(new Date(target).toISOString(), '2026-10-10T00:05:00.000Z');
  // 30 min ago still counts as "today" (shows as overdue rather than jumping a day)
  assert.equal(new Date(C.resolveTargetMs(C.parseClock('23:20'), now)).toISOString(), '2026-10-09T23:20:00.000Z');
  // just after midnight, 23:55 means 15 minutes ago, not tomorrow night
  const now2 = at('2026-10-10T00:10:00Z');
  assert.equal(new Date(C.resolveTargetMs(C.parseClock('23:55'), now2)).toISOString(), '2026-10-09T23:55:00.000Z');
});

test('copy text across midnight UTC (English) is plain, one caller per line', () => {
  const arrival = C.resolveTargetMs(C.parseClock('00:05'), at('2026-10-09T23:50:00Z'));
  const text = C.buildCopyText([
    { name: 'Bravo', marchSeconds: 55 },
    { name: 'Alpha', marchSeconds: 105 },
    { name: 'Charlie', marchSeconds: 30 }
  ], arrival, 300, LANG.en);
  assert.equal(text, [
    'Land 00:05:00',
    '23:58:15 - Alpha (march 1:45)',
    '23:59:05 - Bravo (march 0:55)',
    '23:59:30 - Charlie (march 0:30)'
  ].join('\n'));
  assert.doesNotMatch(text, /[\t*_`<>|#]/);
});

test('copy text strips < > tabs and newlines from names; empty name -> Unnamed', () => {
  const text = C.buildCopyText([
    { name: '<b>Evil</b>\tName\nTwo', marchSeconds: 60 },
    { name: '', marchSeconds: 30 }
  ], at('2026-10-09T10:00:00Z'), 600, LANG.en);
  const lines = text.split('\n');
  assert.equal(lines.length, 3);
  assert.equal(lines[1], '09:49:00 - bEvil/b Name Two (march 1:00)');
  assert.equal(lines[2], '09:49:30 - Unnamed (march 0:30)');
});

test('all 9 languages have the copy labels and the same line structure', () => {
  const expected = {
    en: ['Land 12:00:00', 'march'],
    es: ['Llegada 12:00:00', 'marcha'],
    fr: ['Arrivée 12:00:00', 'marche'],
    de: ['Ankunft 12:00:00', 'Marsch'],
    tr: ['Varış 12:00:00', 'yürüyüş'],
    pl: ['Lądowanie 12:00:00', 'marsz'],
    zh: ['到达 12:00:00', '行军'],
    ko: ['도착 12:00:00', '행군'],
    ar: ['الوصول 12:00:00', 'مسيرة']
  };
  assert.deepEqual(Object.keys(LANG).sort(), Object.keys(expected).sort());
  for (const [code, [header, word]] of Object.entries(expected)) {
    const text = C.buildCopyText([{ name: 'Alpha', marchSeconds: 105 }], at('2026-10-09T12:00:00Z'), 300, LANG[code]);
    assert.equal(text, header + '\n11:53:15 - Alpha (' + word + ' 1:45)', code);
    assert.doesNotMatch(text, /UTC/, code + ' no UTC header');
  }
});

test('every language has every key English has (no missing translations)', () => {
  const keys = Object.keys(LANG.en).sort();
  for (const code of Object.keys(LANG)) {
    assert.deepEqual(Object.keys(LANG[code]).sort(), keys, code);
    for (const k of keys) assert.notEqual(LANG[code][k], '', code + '.' + k);
  }
});

test('Garrison: hit = now + countdown + enemy march; send = hit - your march', () => {
  const now = at('2026-10-09T23:58:00Z');
  const g = C.garrisonTimes(now, 3 * 60, 45, 20); // 3:00 countdown, enemy march 0:45, you 0:20
  assert.equal(new Date(g.hitTimeMs).toISOString(), '2026-10-10T00:01:45.000Z');
  assert.equal(C.formatUTC(g.sendTimeMs), '00:01:25');
});


// ---------------- Waves ----------------

const W = (count, defaultDelay = 10, gaps = []) => ({ count, defaultDelay, gaps });
const hms = (ms) => C.formatUTC(ms);

test('waves: landing times follow the default delay and per-gap overrides', () => {
  const fixed = { mode: 'fixed', arrivalMs: at('2026-10-09T12:05:00Z') };
  assert.deepEqual(C.waveOffsetsSec(W(3)), [0, 10, 20]);
  assert.deepEqual(C.planLandingsMs(fixed, 0, [], 30, 300, W(3)).map(hms), ['12:05:00', '12:05:10', '12:05:20']);
  // gap 2 overridden to 20s; a gap equal to the default is stored as "use default"
  assert.deepEqual(C.planLandingsMs(fixed, 0, [], 30, 300, W(3, 10, [10, 20])).map(hms), ['12:05:00', '12:05:10', '12:05:30']);
  assert.deepEqual(C.normalizeWaves(W(3, 10, [10, 20])).gaps, [null, 20]);
  // changing the default moves every gap that follows it
  assert.deepEqual(C.planLandingsMs(fixed, 0, [], 30, 300, W(3, 30, [null, 20])).map(hms), ['12:05:00', '12:05:30', '12:05:50']);
  // 0s is a valid delay; bad values fall back to the default; count is clamped 1..6
  assert.deepEqual(C.normalizeWaves({ count: 9, defaultDelay: 'x', gaps: [0, -5, '7'] }),
    { count: 6, defaultDelay: 10, gaps: [0, null, 7, null, null] });
  assert.equal(C.normalizeWaves({}).count, 1);
  assert.equal(C.normalizeWaves({}).defaultDelay, 10);
});

test('waves: tapping cycles off -> 1 -> 2 -> 3 -> off; one wave is a plain toggle', () => {
  let w = 0; const seen = [];
  for (let i = 0; i < 4; i++) { w = C.nextWave(w, 3); seen.push(w); }
  assert.deepEqual(seen, [1, 2, 3, 0]);
  assert.equal(C.nextWave(0, 1), 1);
  assert.equal(C.nextWave(1, 1), 0);
});

test('waves LIVE: the earliest start across ALL waves = now + reaction (wave 2 has the longer march)', () => {
  const now = at('2026-10-09T12:00:00.400Z');
  const callers = [{ name: 'A', marchSeconds: 30, wave: 1 }, { name: 'B', marchSeconds: 120, wave: 2 }, { name: 'Off', marchSeconds: 600, wave: 0 }];
  const lands = C.planLandingsMs({ mode: 'live' }, now, callers, 30, 300, W(2));
  // lead = max(30 - 0, 120 - 10) = 110s -> wave 1 lands 12:00:30 + 5:00 + 1:50
  assert.deepEqual(lands.map(hms), ['12:07:20', '12:07:30']);
  const g = C.buildWaveSchedule(C.includedCallers(callers, W(2)), lands, 300);
  assert.deepEqual(g.map((x) => x.items.map((s) => s.name + ' ' + hms(s.setOffMs))), [['A 12:01:50'], ['B 12:00:30']]);
  assert.equal(hms(C.planFirstStartMs({ mode: 'live' }, now, callers, 30, 300, W(2))), '12:00:30');
  // anchoring on wave 1 alone would have given B an impossible start (before now)
  const naive = C.planArrivalMs({ mode: 'live' }, now, [callers[0]], 30, 300) + 10e3 - 300e3 - 120e3;
  assert.ok(naive < now);
  // the off caller is ignored, and nothing in wave 3+ exists
  assert.equal(C.leadSeconds(callers, W(2)), 110);
  // only wave 2 used: wave 2's caller starts now + reaction
  const only2 = [{ name: 'B', marchSeconds: 120, wave: 2 }];
  assert.equal(hms(C.planFirstStartMs({ mode: 'live' }, now, only2, 30, 300, W(2))), '12:00:30');
});

test('waves FROZEN: edits recompute from the frozen earliest start; passed warning uses any wave', () => {
  const t0 = at('2026-10-09T12:00:00Z');
  const plan = C.freezePlan(t0, 30); // earliest start 12:00:30
  const cs = [{ name: 'A', marchSeconds: 30, wave: 1 }, { name: 'B', marchSeconds: 120, wave: 2 }, { name: 'C', marchSeconds: 60, wave: 3 }];
  const first = (callers, waves, dur = 300) => hms(C.planFirstStartMs(plan, t0 + 9000, callers, 30, dur, waves));
  assert.equal(first(cs, W(3)), '12:00:30');
  assert.deepEqual(C.planLandingsMs(plan, t0 + 60e3, cs, 30, 300, W(3)).map(hms), ['12:07:20', '12:07:30', '12:07:40']);
  // move B out (longest lead): still 12:00:30, the rest is worked out from it
  const noB = cs.map((c) => (c.name === 'B' ? { ...c, wave: 0 } : c));
  assert.equal(first(noB, W(3)), '12:00:30');
  assert.deepEqual(C.planLandingsMs(plan, t0, noB, 30, 300, W(3)).map(hms), ['12:06:10', '12:06:20', '12:06:30']); // lead = max(30, 60 - 20) = 40s
  // change a gap and the duration: still the same earliest start
  assert.equal(first(cs, W(3, 10, [45])), '12:00:30');
  assert.equal(first(cs, W(3), 600), '12:00:30');
  // B moved to wave 3
  assert.equal(first(cs.map((c) => (c.name === 'B' ? { ...c, wave: 3 } : c)), W(3)), '12:00:30');
  // passed: once the earliest start (B in wave 2) is behind us
  assert.equal(C.firstStartPassed(plan, at('2026-10-09T12:00:30Z'), cs, 30, 300, W(3)), false);
  assert.equal(C.firstStartPassed(plan, at('2026-10-09T12:00:30.001Z'), cs, 30, 300, W(3)), true);
  assert.equal(C.firstStartPassed({ mode: 'live' }, at('2026-10-09T13:00:00Z'), cs, 30, 300, W(3)), false);
});

test('waves FIXED: several Land at times, fewer than waves follow the delays from the last one', () => {
  const p = { mode: 'fixed', arrivalMs: at('2026-10-09T12:05:00Z'), landMs: [at('2026-10-09T12:05:00Z'), at('2026-10-09T12:06:00Z')] };
  assert.deepEqual(C.planLandingsMs(p, 0, [], 30, 300, W(4, 10, [null, 25])).map(hms), ['12:05:00', '12:06:00', '12:06:25', '12:06:35']);
  // removing waves ignores the extra typed times
  assert.deepEqual(C.planLandingsMs(p, 0, [], 30, 300, W(1)).map(hms), ['12:05:00']);
  const cs = [{ name: 'A', marchSeconds: 30, wave: 1 }, { name: 'B', marchSeconds: 120, wave: 2 }];
  assert.equal(hms(C.planFirstStartMs(p, 0, cs, 30, 300, W(2))), '11:59:00'); // 12:06:00 - 5:00 - 2:00
  assert.equal(C.firstStartPassed(p, at('2026-10-09T11:59:01Z'), cs, 30, 300, W(2)), true);
});

test('Land at box: commas, spaces, HH:MM, crossing midnight, too many times, bad tokens', () => {
  const now = at('2026-10-09T12:00:00Z');
  const iso = (r) => r.times.map((t) => new Date(t).toISOString().slice(11, 19));
  assert.deepEqual(iso(C.parseLandAt('12:05:00, 12:05:10, 12:05:30', now, 3)), ['12:05:00', '12:05:10', '12:05:30']);
  assert.deepEqual(iso(C.parseLandAt('12:05 12:06', now, 3)), ['12:05:00', '12:06:00']);
  assert.deepEqual(iso(C.parseLandAt(' 12:05,12:05:10 ;12:06 ', now, 3)), ['12:05:00', '12:05:10', '12:06:00']);
  assert.deepEqual(C.parseLandAt('', now, 3), { times: [] });
  // one time keeps the old single-time formats ("21 05", "2105")
  assert.deepEqual(iso(C.parseLandAt('21 05', now, 3)), ['21:05:00']);
  assert.deepEqual(iso(C.parseLandAt('2105', now, 1)), ['21:05:00']);
  // midnight: a smaller time than the one before means the next day
  const late = at('2026-10-09T23:50:00Z');
  const r = C.parseLandAt('23:59:50, 00:00:05, 00:01', late, 3);
  assert.deepEqual(r.times.map((t) => new Date(t).toISOString()),
    ['2026-10-09T23:59:50.000Z', '2026-10-10T00:00:05.000Z', '2026-10-10T00:01:00.000Z']);
  // first time just after midnight typed at 23:50 is tomorrow; the rest follow it
  assert.deepEqual(C.parseLandAt('00:05, 00:05:10', late, 2).times.map((t) => new Date(t).toISOString()),
    ['2026-10-10T00:05:00.000Z', '2026-10-10T00:05:10.000Z']);
  // equal times are allowed (gap 0)
  assert.equal(new Set(C.parseLandAt('12:05, 12:05', now, 2).times).size, 1);
  assert.deepEqual(C.parseLandAt('12:05, 12:06, 12:07', now, 2), { error: 'too_many', max: 2 });
  assert.deepEqual(C.parseLandAt('12:05, 25:00', now, 3), { error: 'bad', token: '25:00' });
  assert.deepEqual(C.parseLandAt('soon', now, 3), { error: 'bad', token: 'soon' });
  for (const code of Object.keys(LANG)) assert.match(LANG[code].land_too_many(2), /2/, code);
});

test('copy text: one wave is identical to the pre-waves text', () => {
  const callers = [{ name: 'Bravo', marchSeconds: 55, wave: 1 }, { name: 'Alpha', marchSeconds: 105, wave: 1 },
    { name: 'Charlie', marchSeconds: 30, wave: 1 }, { name: 'Off', marchSeconds: 99, wave: 0 }];
  const arrival = C.resolveTargetMs(C.parseClock('00:05'), at('2026-10-09T23:50:00Z'));
  const expected = [
    'Land 00:05:00',
    '23:58:15 - Alpha (march 1:45)',
    '23:59:05 - Bravo (march 0:55)',
    '23:59:30 - Charlie (march 0:30)'
  ].join('\n');
  const inc = C.includedCallers(callers, W(1));
  assert.equal(C.buildWavesCopyText(inc, [arrival], 300, LANG.en), expected);
  assert.equal(C.buildCopyText(inc, arrival, 300, LANG.en), expected);
});

test('copy text: 3 waves, grouped, each wave sorted by start, empty waves left out', () => {
  const lands = [at('2026-10-09T12:05:00Z'), at('2026-10-09T12:05:10Z'), at('2026-10-09T12:05:30Z')];
  const callers = [
    { name: 'rima', marchSeconds: 34, wave: 1 }, { name: 'Bravo', marchSeconds: 65, wave: 1 },
    { name: 'Alpha', marchSeconds: 105, wave: 2 },
    { name: 'Charlie', marchSeconds: 30, wave: 3 }, { name: 'Delta', marchSeconds: 55, wave: 3 }
  ];
  const text = C.buildWavesCopyText(callers, lands, 300, LANG.en);
  assert.equal(text, [
    'Wave 1 - land 12:05:00',
    '11:58:55 - Bravo (march 1:05)',
    '11:59:26 - rima (march 0:34)',
    '',
    'Wave 2 - land 12:05:10',
    '11:58:25 - Alpha (march 1:45)',
    '',
    'Wave 3 - land 12:05:30',
    '11:59:35 - Delta (march 0:55)',
    '12:00:00 - Charlie (march 0:30)'
  ].join('\n'));
  assert.doesNotMatch(text, /[\t*_`<>|#]/);
  // wave 2 empty: no "Wave 2" line at all
  const no2 = C.buildWavesCopyText(callers.filter((c) => c.wave !== 2), lands, 300, LANG.en);
  assert.doesNotMatch(no2, /Wave 2/);
  assert.equal(no2.split('\n').length, 7);
  // every language: same line structure, no UTC header, wave lines carry the time
  for (const code of Object.keys(LANG)) {
    const L = LANG[code];
    const lines = C.buildWavesCopyText(callers, lands, 300, L).split('\n');
    assert.equal(lines.length, 10, code);
    assert.equal(lines[0], L.copy_wave(1, '12:05:00'), code);
    assert.doesNotMatch(lines.join('\n'), /UTC/, code);
    assert.equal(lines[3], '', code);
    assert.equal(lines[4], L.copy_wave(2, '12:05:10'), code);
    assert.equal(lines[5], '11:58:25 - Alpha (' + L.march_word + ' 1:45)', code);
    assert.equal(lines[6], '', code);
    assert.match(lines[7], /12:05:30/, code);
  }
  assert.equal(LANG.ar.copy_wave(2, '12:05:10'), 'الموجة 2 - الوصول 12:05:10');
});

test('saved state migration: old ticked callers become wave 1, unticked off; waves above the count become off', () => {
  assert.deepEqual(C.migrateCallers([
    { name: 'Alpha', marchSeconds: 105, selected: true },
    { name: 'Bravo', marchSeconds: 55, selected: false },
    { name: 'Charlie', marchSeconds: 30 },
    { name: 'Delta', marchSeconds: 40, selected: true, wave: 3 },
    { name: 'Echo', marchSeconds: 50, selected: false, wave: 2 },
    null, 'junk'
  ], 2), [
    { name: 'Alpha', marchSeconds: 105, wave: 1 },
    { name: 'Bravo', marchSeconds: 55, wave: 0 },
    { name: 'Charlie', marchSeconds: 30, wave: 0 },
    { name: 'Delta', marchSeconds: 40, wave: 0 },
    { name: 'Echo', marchSeconds: 50, wave: 2 }
  ]);
  assert.deepEqual(C.migrateCallers(null, 1), []);
  assert.deepEqual(C.migrateCallers([{ name: 'X' }], 1), [{ name: 'X', marchSeconds: 45, wave: 0 }]);
  // callers without a wave field (old API) count as wave 1 unless selected === false
  assert.equal(C.callerWave({ name: 'A', marchSeconds: 1 }), 1);
  assert.equal(C.callerWave({ selected: false }), 0);
});


// deterministic rng for tests (mulberry32)
function seeded(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const sizesOf = (m, k) => Array.from({ length: k }, (_, i) => Object.values(m).filter((w) => w === i + 1).length);

test('Randomise: 7 callers over 3 waves is 3-2-2 in some order; everyone assigned exactly once', () => {
  const ids = [1, 2, 3, 4, 5, 6, 7];
  for (let s = 1; s <= 50; s++) {
    const m = C.randomiseWaves(ids, 3, seeded(s));
    assert.deepEqual(Object.keys(m).map(Number).sort((a, b) => a - b), ids);
    assert.deepEqual(sizesOf(m, 3).sort(), [2, 2, 3]);
    for (const w of Object.values(m)) assert.ok(w >= 1 && w <= 3);
  }
  assert.deepEqual(sizesOf(C.randomiseWaves([1, 2, 3, 4, 5, 6], 3, seeded(9)), 3), [2, 2, 2]);
  assert.deepEqual(sizesOf(C.randomiseWaves([1, 2], 4, seeded(9)), 4).sort(), [0, 0, 1, 1]);
  assert.deepEqual(C.randomiseWaves([], 3, seeded(1)), {});
});

test('Randomise: deterministic with a seeded rng, and it does shuffle', () => {
  const ids = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  assert.deepEqual(C.randomiseWaves(ids, 3, seeded(42)), C.randomiseWaves(ids, 3, seeded(42)));
  const outs = new Set();
  for (let s = 0; s < 20; s++) outs.add(JSON.stringify(C.randomiseWaves(ids, 3, seeded(s))));
  assert.ok(outs.size > 10, 'different seeds give different splits');
});

test('Randomise: over many runs every wave gets the extra caller, and every caller visits every wave', () => {
  const rng = seeded(2026);
  const extraCount = [0, 0, 0];
  const visits = {};
  for (let r = 0; r < 3000; r++) {
    const m = C.randomiseWaves([1, 2, 3, 4, 5, 6, 7], 3, rng);
    sizesOf(m, 3).forEach((n, i) => { if (n === 3) extraCount[i]++; });
    for (const [id, w] of Object.entries(m)) visits[id + ':' + w] = (visits[id + ':' + w] || 0) + 1;
  }
  assert.equal(extraCount.reduce((a, b) => a + b), 3000);
  for (const n of extraCount) assert.ok(n > 850 && n < 1150, 'extra caller roughly 1/3 each: ' + extraCount);
  assert.equal(Object.keys(visits).length, 21);
});

test('Randomise targets: callers in a wave only (off stay off); everyone when nobody is in a wave', () => {
  const cs = [{ id: 1, wave: 1 }, { id: 2, wave: 0 }, { id: 3, wave: 2 }, { id: 4, wave: 3 }];
  assert.deepEqual(C.randomiseTargets(cs, W(3)), [1, 3, 4]);
  assert.deepEqual(C.randomiseTargets(cs, W(2)), [1, 3]); // wave 3 does not exist: off
  assert.deepEqual(C.randomiseTargets(cs.map((c) => ({ ...c, wave: 0 })), W(3)), [1, 2, 3, 4]);
  const m = C.randomiseWaves(C.randomiseTargets(cs, W(3)), 3, seeded(5));
  assert.equal(m[2], undefined);
  assert.deepEqual(sizesOf(m, 3), [1, 1, 1]);
});

// ---- Auto-reset + stale-copy guard ----
test('auto-reset: choices, default 5 min, saved values normalised', () => {
  assert.deepEqual(C.AUTO_RESET_CHOICES, [0, 1, 2, 3, 5, 10, 15]);
  assert.equal(C.DEFAULT_AUTO_RESET_MIN, 5);
  assert.equal(C.normalizeAutoReset(null), 5);       // nothing saved -> default
  assert.equal(C.normalizeAutoReset(''), 5);
  assert.equal(C.normalizeAutoReset('0'), 0);        // Off is a real choice
  assert.equal(C.normalizeAutoReset('10'), 10);
  assert.equal(C.normalizeAutoReset(15), 15);
  assert.equal(C.normalizeAutoReset('7'), 5);        // not on the menu
  assert.equal(C.normalizeAutoReset('junk'), 5);
});

test('freezePlan records the freeze time', () => {
  const t0 = at('2026-10-09T12:00:00.250Z');
  const p = C.freezePlan(t0, 30);
  assert.equal(p.frozenAtMs, t0);
  assert.equal(C.formatUTC(p.firstStartMs), '12:00:30');
});

test('autoResetDue: fires at frozenAt + minutes, not a moment before', () => {
  const t0 = at('2026-10-09T12:00:00Z');
  assert.equal(C.autoResetDue(t0, 5, t0), false);
  assert.equal(C.autoResetDue(t0, 5, t0 + 5 * 60000 - 1), false);
  assert.equal(C.autoResetDue(t0, 5, t0 + 5 * 60000), true);
  assert.equal(C.autoResetDue(t0, 1, t0 + 60000), true);
  assert.equal(C.autoResetDue(t0, 15, t0 + 14 * 60000), false);
  // reload / phone asleep long past the deadline: due straight away
  assert.equal(C.autoResetDue(t0, 5, t0 + 3 * 3600e3), true);
  assert.equal(C.autoResetDeadlineMs(t0, 10), t0 + 600000);
});

test('autoResetDue: Off (0) or no freeze time never fires', () => {
  const t0 = at('2026-10-09T12:00:00Z');
  for (const later of [0, 60000, 3600e3, 30 * 86400e3]) assert.equal(C.autoResetDue(t0, 0, t0 + later), false);
  assert.equal(C.autoResetDue(undefined, 5, t0), false);
  assert.equal(C.autoResetDue(NaN, 5, t0), false);
  assert.equal(C.autoResetDeadlineMs(t0, 0), null);
  assert.equal(C.autoResetRemainingSec(t0, 0, t0), null);
});

test('autoResetRemainingSec: the countdown shown under LOCKED', () => {
  const t0 = at('2026-10-09T12:00:00.400Z');
  assert.equal(C.autoResetRemainingSec(t0, 5, t0), 300);             // 5:00 at the moment of freezing
  assert.equal(C.formatMarch(C.autoResetRemainingSec(t0, 5, t0)), '5:00');
  assert.equal(C.autoResetRemainingSec(t0, 5, t0 + 200), 300);       // rounds up
  assert.equal(C.autoResetRemainingSec(t0, 5, t0 + 1000), 299);
  assert.equal(C.formatMarch(C.autoResetRemainingSec(t0, 5, t0 + 28000)), '4:32');
  assert.equal(C.autoResetRemainingSec(t0, 1, t0 + 59001), 1);
  assert.equal(C.autoResetRemainingSec(t0, 1, t0 + 60000), 0);
  assert.equal(C.autoResetRemainingSec(t0, 1, t0 + 120000), 0);      // never negative
});

test('copyIsStale = firstStartPassed: frozen copy is stale once the earliest start is behind us', () => {
  const t0 = at('2026-10-09T12:00:00Z');
  const callers = [{ name: 'A', marchSeconds: 105 }, { name: 'B', marchSeconds: 30 }];
  const plan = C.freezePlan(t0, 30); // first start 12:00:30
  for (const dt of [0, 15000, 30000, 30001, 31000, 600000]) {
    assert.equal(C.copyIsStale(plan, t0 + dt, callers, 30, 300), C.firstStartPassed(plan, t0 + dt, callers, 30, 300), String(dt));
  }
  assert.equal(C.copyIsStale(plan, t0 + 29000, callers, 30, 300), false); // still in the future: re-copy as before
  assert.equal(C.copyIsStale(plan, t0 + 31000, callers, 30, 300), true);
  assert.equal(C.copyIsStale({ mode: 'live' }, t0 + 3600e3, callers, 30, 300), false); // live is never stale
  // a typed Land at time whose first start has passed is stale too
  const fixed = { mode: 'fixed', arrivalMs: at('2026-10-09T12:05:00Z') }; // A starts 11:58:15
  assert.equal(C.copyIsStale(fixed, at('2026-10-09T11:58:00Z'), callers, 30, 300), false);
  assert.equal(C.copyIsStale(fixed, at('2026-10-09T11:58:16Z'), callers, 30, 300), true);
  // waves: the earliest start of ANY wave counts
  const waves = { count: 2, defaultDelay: 10, gaps: [null] };
  const wc = [{ name: 'A', marchSeconds: 30, wave: 1 }, { name: 'B', marchSeconds: 105, wave: 2 }];
  assert.equal(C.copyIsStale(plan, t0 + 31000, wc, 30, 300, waves), true);
  assert.equal(C.copyIsStale(plan, t0 + 29000, wc, 30, 300, waves), false);
});

test('every language has the auto-reset texts', () => {
  for (const code of Object.keys(LANG)) {
    const L = LANG[code];
    assert.match(L.auto_reset_in('4:32'), /4:32/, code);
    for (const k of ['auto_reset_label', 'auto_reset_off', 'auto_reset_done', 'stale_recopied']) {
      assert.equal(typeof L[k], 'string', code + ' ' + k);
      assert.ok(L[k].length > 0, code + ' ' + k);
    }
    assert.match(L.minutes_n(10), /10/, code);
  }
});
