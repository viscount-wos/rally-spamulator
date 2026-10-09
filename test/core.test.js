// Unit tests for the rally maths, copy text, list import/export and Garrison maths.
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
  assert.deepEqual(plan, { mode: 'frozen', firstStartMs: at('2026-10-09T12:00:35Z') });
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
  assert.equal(text, 'Start times UTC - land 00:07:05\n00:00:20 - Alpha (march 1:45)\n00:01:10 - Bravo (march 0:55)');
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
    'Start times UTC - land 00:05:00',
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

test('all 6 languages have the copy labels and the same line structure', () => {
  const expected = {
    en: ['Start times UTC - land 12:00:00', 'march'],
    tr: ['Başlangıç saatleri UTC - varış 12:00:00', 'yürüyüş'],
    pl: ['Godziny startu UTC - lądowanie 12:00:00', 'marsz'],
    zh: ['开始时间 UTC - 到达 12:00:00', '行军'],
    ko: ['시작 시간 UTC - 도착 12:00:00', '행군'],
    ar: ['أوقات البدء UTC - الوصول 12:00:00', 'مسيرة']
  };
  assert.deepEqual(Object.keys(LANG).sort(), Object.keys(expected).sort());
  for (const [code, [header, word]] of Object.entries(expected)) {
    const text = C.buildCopyText([{ name: 'Alpha', marchSeconds: 105 }], at('2026-10-09T12:00:00Z'), 300, LANG[code]);
    assert.equal(text, header + '\n11:53:15 - Alpha (' + word + ' 1:45)', code);
    assert.match(text.split('\n')[0], /UTC/, code + ' header says UTC');
  }
});

test('every language has every key English has (no missing translations)', () => {
  const keys = Object.keys(LANG.en).sort();
  for (const code of Object.keys(LANG)) {
    assert.deepEqual(Object.keys(LANG[code]).sort(), keys, code);
    for (const k of keys) assert.notEqual(LANG[code][k], '', code + '.' + k);
  }
});

test('caller list import/export round-trips and tolerates common formats', () => {
  const res = C.parseCallerList([
    'Alpha, 1:45',
    'Bravo 0:55',
    'Big Charlie;30',
    'Delta\t2:05',
    '# comment',
    '',
    'no time here',
    'Echo, 0'
  ].join('\n'));
  assert.deepEqual(res.callers, [
    { name: 'Alpha', marchSeconds: 105 },
    { name: 'Bravo', marchSeconds: 55 },
    { name: 'Big Charlie', marchSeconds: 30 },
    { name: 'Delta', marchSeconds: 125 }
  ]);
  assert.deepEqual(res.bad, ['no time here', 'Echo, 0']);
  const exported = C.exportCallerList(res.callers);
  assert.equal(exported, 'Alpha, 1:45\nBravo, 0:55\nBig Charlie, 0:30\nDelta, 2:05');
  assert.deepEqual(C.parseCallerList(exported).callers, res.callers);
});

test('Garrison: hit = now + countdown + enemy march; send = hit - your march', () => {
  const now = at('2026-10-09T23:58:00Z');
  const g = C.garrisonTimes(now, 3 * 60, 45, 20); // 3:00 countdown, enemy march 0:45, you 0:20
  assert.equal(new Date(g.hitTimeMs).toISOString(), '2026-10-10T00:01:45.000Z');
  assert.equal(C.formatUTC(g.sendTimeMs), '00:01:25');
});
