/*
 * Rally Spamulator: pure calculation + text helpers (no DOM).
 * Loaded in the browser as window.RallyCore and in Node tests via require().
 */
(function (root, factory) {
    var api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    else root.RallyCore = api;
})(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    var DAY_MS = 24 * 60 * 60 * 1000;

    function pad(n) { return String(n).padStart(2, '0'); }

    // HH:MM:SS in UTC (game time).
    function formatUTC(ms) {
        var d = new Date(ms);
        return pad(d.getUTCHours()) + ':' + pad(d.getUTCMinutes()) + ':' + pad(d.getUTCSeconds());
    }

    function formatMarch(totalSec) {
        var m = Math.floor(totalSec / 60);
        var s = totalSec % 60;
        return m + ':' + pad(s);
    }

    // "1:45" -> 105, "105" -> 105, "" -> 0
    function parseMarch(str) {
        str = String(str || '').trim();
        if (!str) return 0;
        if (str.indexOf(':') !== -1) {
            var parts = str.split(':');
            return (parseInt(parts[0], 10) || 0) * 60 + (parseInt(parts[1], 10) || 0);
        }
        return parseInt(str, 10) || 0;
    }

    // ---- Live / frozen / fixed plans ----
    // A plan is one of:
    //   { mode: 'live' }                      first start follows the clock
    //   { mode: 'frozen', firstStartMs: n }   frozen by Copy Schedule or LOCK
    //   { mode: 'fixed',  arrivalMs: n }      the user typed a "Land at" time
    // LIVE: the first (longest-march) caller starts one reaction time from
    // now, on a whole second, so every time counts up with the clock.
    function liveFirstStartMs(nowMs, reactionSeconds) {
        return Math.floor(nowMs / 1000) * 1000 + reactionSeconds * 1000;
    }

    function arrivalFromFirstStart(firstStartMs, rallyDurationSeconds, longestMarchSeconds) {
        return firstStartMs + rallyDurationSeconds * 1000 + (longestMarchSeconds || 0) * 1000;
    }

    // Freeze the live plan at this instant: the first start is kept, so
    // later edits (callers, duration) recompute around the same first start.
    // frozenAtMs records when it was frozen, for the auto-reset countdown.
    function freezePlan(nowMs, reactionSeconds) {
        return { mode: 'frozen', firstStartMs: liveFirstStartMs(nowMs, reactionSeconds), frozenAtMs: nowMs };
    }

    // ---- Auto-reset ----
    // A frozen (or typed Land at) plan goes back to LIVE by itself a set
    // number of minutes after it was frozen. 0 = Off.
    var AUTO_RESET_CHOICES = [0, 1, 2, 3, 5, 10, 15];
    var DEFAULT_AUTO_RESET_MIN = 5;

    // Saved value -> one of the choices; anything else is the default.
    function normalizeAutoReset(v) {
        var n = typeof v === 'number' ? v : parseInt(String(v === null || v === undefined ? '' : v).trim(), 10);
        return AUTO_RESET_CHOICES.indexOf(n) !== -1 ? n : DEFAULT_AUTO_RESET_MIN;
    }

    // When the plan resets itself, or null (Off, or no freeze time).
    function autoResetDeadlineMs(frozenAtMs, minutes) {
        if (!(minutes > 0) || typeof frozenAtMs !== 'number' || !isFinite(frozenAtMs)) return null;
        return frozenAtMs + minutes * 60000;
    }

    // True once the deadline has been reached (never when Off).
    function autoResetDue(frozenAtMs, minutes, nowMs) {
        var d = autoResetDeadlineMs(frozenAtMs, minutes);
        return d !== null && nowMs >= d;
    }

    // Whole seconds left before the auto-reset (rounded up, so it shows
    // 5:00 at the moment of freezing and 0:00 only when it is due), or null when Off.
    function autoResetRemainingSec(frozenAtMs, minutes, nowMs) {
        var d = autoResetDeadlineMs(frozenAtMs, minutes);
        if (d === null) return null;
        return Math.max(0, Math.ceil((d - nowMs) / 1000));
    }

    // ---- Waves ----
    // Waves are groups of callers whose arrivals are staggered: wave k lands
    // at wave 1's landing + the gaps before it. A waves config is
    //   { count: 1..MAX_WAVES, defaultDelay: s, gaps: [s | null, ...] }
    // with one gap per pair of neighbouring waves; null = use the default.
    // A caller's wave: 0 = off, 1..count. Callers without a `wave` field
    // (older code, old saved data) are wave 1, or off when selected === false.
    var MAX_WAVES = 6;
    var DEFAULT_WAVE_DELAY = 10;
    var MAX_DELAY = 3600;

    function toDelay(v) {
        if (v === null || v === undefined || v === '') return null;
        var n = typeof v === 'number' ? v : parseInt(String(v).trim(), 10);
        if (!isFinite(n) || n < 0 || n > MAX_DELAY || Math.floor(n) !== n) return null;
        return n;
    }

    function normalizeWaves(w) {
        w = w || {};
        var count = Math.max(1, Math.min(MAX_WAVES, parseInt(w.count, 10) || 1));
        var def = toDelay(w.defaultDelay);
        if (def === null) def = DEFAULT_WAVE_DELAY;
        var gaps = [];
        for (var i = 0; i < count - 1; i++) {
            var g = toDelay(w.gaps ? w.gaps[i] : null);
            gaps.push(g === def ? null : g);
        }
        return { count: count, defaultDelay: def, gaps: gaps };
    }

    // Seconds between wave i+1 and wave i+2 (i is 0-based).
    function gapSeconds(waves, i) {
        var g = waves.gaps[i];
        return g === null || g === undefined ? waves.defaultDelay : g;
    }

    // Seconds after wave 1's landing for each wave: [0, g1, g1+g2, ...].
    function waveOffsetsSec(waves) {
        var w = normalizeWaves(waves), offs = [0];
        for (var i = 0; i < w.count - 1; i++) offs.push(offs[i] + gapSeconds(w, i));
        return offs;
    }

    function callerWave(c) {
        if (typeof c.wave === 'number') return c.wave;
        return c.selected === false ? 0 : 1;
    }

    // Tapping a caller: off -> 1 -> 2 -> ... -> count -> off.
    function nextWave(wave, count) {
        return (wave + 1) % (count + 1);
    }

    // Callers taking part (wave 1..count).
    function includedCallers(callers, waves) {
        var count = normalizeWaves(waves).count;
        return callers.filter(function (c) { var k = callerWave(c); return k >= 1 && k <= count; });
    }

    // How long before wave 1 lands the earliest caller (any wave) must have
    // its rally running for its march: max(march - wave offset), 0 if nobody.
    function leadSeconds(callers, waves) {
        var offs = waveOffsetsSec(waves);
        var inc = includedCallers(callers, waves);
        if (!inc.length) return 0;
        return inc.reduce(function (m, c) {
            return Math.max(m, (c.marchSeconds || 0) - offs[callerWave(c) - 1]);
        }, -Infinity);
    }

    // Landing time of every wave. LIVE/FROZEN: the earliest start across ALL
    // waves is the (live or frozen) first start, so a later wave with long
    // marches never gets a start before that. FIXED: wave k lands at the k-th
    // typed time; waves after the last typed time follow the delays from it.
    function planLandingsMs(plan, nowMs, callers, reactionSeconds, rallyDurationSeconds, waves) {
        var w = normalizeWaves(waves);
        var out = [];
        if (plan && plan.mode === 'fixed') {
            var given = (plan.landMs && plan.landMs.length ? plan.landMs : [plan.arrivalMs]).slice(0, w.count);
            for (var k = 0; k < w.count; k++) {
                out.push(k < given.length ? given[k] : out[k - 1] + gapSeconds(w, k - 1) * 1000);
            }
            return out;
        }
        var first = plan && plan.mode === 'frozen' ? plan.firstStartMs : liveFirstStartMs(nowMs, reactionSeconds);
        var arrival1 = arrivalFromFirstStart(first, rallyDurationSeconds, leadSeconds(callers, w));
        return waveOffsetsSec(w).map(function (o) { return arrival1 + o * 1000; });
    }

    // Wave 1's landing ("the" arrival with one wave).
    function planArrivalMs(plan, nowMs, callers, reactionSeconds, rallyDurationSeconds, waves) {
        return planLandingsMs(plan, nowMs, callers, reactionSeconds, rallyDurationSeconds, waves)[0];
    }

    // Earliest start in the plan, across every wave.
    function planFirstStartMs(plan, nowMs, callers, reactionSeconds, rallyDurationSeconds, waves) {
        var lands = planLandingsMs(plan, nowMs, callers, reactionSeconds, rallyDurationSeconds, waves);
        var inc = includedCallers(callers, waves);
        if (!inc.length) return lands[0] - rallyDurationSeconds * 1000;
        return inc.reduce(function (m, c) {
            return Math.min(m, lands[callerWave(c) - 1] - rallyDurationSeconds * 1000 - (c.marchSeconds || 0) * 1000);
        }, Infinity);
    }

    // True once the first start time (of any wave) is behind us (a live plan never is).
    function firstStartPassed(plan, nowMs, callers, reactionSeconds, rallyDurationSeconds, waves) {
        if (!includedCallers(callers, waves).length || !plan || plan.mode === 'live') return false;
        return planFirstStartMs(plan, nowMs, callers, reactionSeconds, rallyDurationSeconds, waves) < nowMs;
    }

    // Stale-copy guard: copying a frozen (or typed) plan whose earliest
    // start is already behind us would paste old times into chat, so Copy
    // takes fresh times instead. Same rule as the "first start has passed" warning.
    function copyIsStale(plan, nowMs, callers, reactionSeconds, rallyDurationSeconds, waves) {
        return firstStartPassed(plan, nowMs, callers, reactionSeconds, rallyDurationSeconds, waves);
    }

    // Parse a typed UTC clock time ("21:05", "21:05:30", "2105") into
    // seconds after midnight, or null when invalid.
    function parseClock(str) {
        str = String(str || '').trim();
        var m = /^(\d{1,2})[:.h ]?(\d{2})(?:[:.](\d{2}))?$/.exec(str);
        if (!m) return null;
        var h = +m[1], mi = +m[2], s = m[3] ? +m[3] : 0;
        if (h > 23 || mi > 59 || s > 59) return null;
        return h * 3600 + mi * 60 + s;
    }

    // Pick the occurrence of a UTC time-of-day closest to "now":
    // anything up to 1 hour ago counts as today (so a rally you are
    // still fixing shows as overdue), otherwise it is the next one.
    // This makes "00:05" typed at 23:50 mean 15 minutes from now.
    function resolveTargetMs(secOfDay, nowMs) {
        var midnight = Math.floor(nowMs / DAY_MS) * DAY_MS;
        var t = midnight + secOfDay * 1000;
        if (t < nowMs - 3600 * 1000) t += DAY_MS;
        else if (t >= nowMs + 23 * 3600 * 1000) t -= DAY_MS;
        return t;
    }

    // The Land at box: one UTC time per wave, separated by commas, semicolons
    // or spaces ("12:05:00, 12:05:10" or "12:05 12:06"). The first time is
    // resolved like a single typed time; each later time is the next
    // occurrence at or after the one before it, so lists cross midnight UTC.
    // Returns { times: [ms...] } (empty box -> []) or
    // { error: 'bad', token } / { error: 'too_many', max }.
    function parseLandAt(str, nowMs, waveCount) {
        str = String(str || '').trim();
        if (!str) return { times: [] };
        var tokens = parseClock(str) !== null ? [str] : str.split(/[\s,;]+/).filter(Boolean);
        var secs = [];
        for (var i = 0; i < tokens.length; i++) {
            var sec = parseClock(tokens[i]);
            if (sec === null) return { error: 'bad', token: tokens[i] };
            secs.push(sec);
        }
        if (secs.length > (waveCount || 1)) return { error: 'too_many', max: waveCount || 1 };
        var out = [resolveTargetMs(secs[0], nowMs)];
        for (var j = 1; j < secs.length; j++) {
            var prev = out[j - 1];
            var t = Math.floor(prev / DAY_MS) * DAY_MS + secs[j] * 1000;
            if (t < prev) t += DAY_MS;
            out.push(t);
        }
        return { times: out };
    }

    function longestMarch(callers) {
        return callers.reduce(function (m, c) { return Math.max(m, c.marchSeconds || 0); }, 0);
    }

    // Longest march leaves first. Array.prototype.sort is stable, so callers
    // with equal march keep their list order.
    function buildSchedule(callers, arrivalMs, rallyDurationSeconds) {
        return callers.slice()
            .sort(function (a, b) { return b.marchSeconds - a.marchSeconds; })
            .map(function (c) {
                return {
                    name: c.name,
                    marchSeconds: c.marchSeconds,
                    setOffMs: arrivalMs - rallyDurationSeconds * 1000 - c.marchSeconds * 1000
                };
            });
    }

    // Names go into game chat: drop < > (the original escText rule) and any
    // tabs/newlines so each caller stays on one line.
    function cleanName(str) {
        return String(str || '').replace(/[<>]/g, '').replace(/[\t\r\n]+/g, ' ').replace(/\s{2,}/g, ' ').trim();
    }

    function copyLine(s, L) {
        return formatUTC(s.setOffMs) + ' - ' + (cleanName(s.name) || L.unnamed)
            + ' (' + L.march_word + ' ' + formatMarch(s.marchSeconds) + ')';
    }

    // Plain text for in-game chat. Lines are the original format
    // "HH:MM:SS - Name (march M:SS)" (times are UTC = game time); the first
    // line says when the rallies land.
    function buildCopyText(callers, arrivalMs, rallyDurationSeconds, L) {
        var lines = [L.copy_header(formatUTC(arrivalMs))];
        buildSchedule(callers, arrivalMs, rallyDurationSeconds).forEach(function (s) {
            lines.push(copyLine(s, L));
        });
        return lines.join('\n');
    }

    // One section per wave: { wave: k, landMs, items: buildSchedule(...) },
    // each wave's callers longest march (earliest start) first.
    function buildWaveSchedule(callers, landingsMs, rallyDurationSeconds) {
        return landingsMs.map(function (land, i) {
            var inWave = callers.filter(function (c) { return callerWave(c) === i + 1; });
            return { wave: i + 1, landMs: land, items: buildSchedule(inWave, land, rallyDurationSeconds) };
        });
    }

    // Copy text for any number of waves. One wave: exactly buildCopyText.
    // Two or more: per wave with callers a
    // "Wave k - land HH:MM:SS" line followed by its callers, with a blank
    // line between waves. Empty waves are left out.
    function buildWavesCopyText(callers, landingsMs, rallyDurationSeconds, L) {
        if (landingsMs.length === 1) {
            return buildCopyText(includedCallers(callers, { count: 1 }), landingsMs[0], rallyDurationSeconds, L);
        }
        var lines = [];
        buildWaveSchedule(callers, landingsMs, rallyDurationSeconds).forEach(function (w) {
            if (!w.items.length) return;
            if (lines.length) lines.push('');
            lines.push(L.copy_wave(w.wave, formatUTC(w.landMs)));
            w.items.forEach(function (s) { lines.push(copyLine(s, L)); });
        });
        return lines.join('\n');
    }

    // Randomise: spread callerIds over waves 1..waveCount as evenly as
    // possible (sizes differ by at most 1). Both the order of the callers
    // and which waves get the extra caller are random. rng() returns
    // [0, 1) like Math.random (injectable so tests can seed it).
    // Returns { id: wave }.
    function randomiseWaves(callerIds, waveCount, rng) {
        rng = rng || Math.random;
        var k = Math.max(1, Math.floor(waveCount) || 1);
        var ids = shuffle(callerIds.slice(), rng);
        var waveOrder = shuffle(Array.from({ length: k }, function (_, i) { return i + 1; }), rng);
        var base = Math.floor(ids.length / k), extra = ids.length % k;
        var sizes = {};
        waveOrder.forEach(function (w, i) { sizes[w] = base + (i < extra ? 1 : 0); });
        var out = {}, pos = 0;
        for (var w = 1; w <= k; w++) {
            for (var j = 0; j < sizes[w]; j++) out[ids[pos++]] = w;
        }
        return out;
    }

    function shuffle(a, rng) {
        for (var i = a.length - 1; i > 0; i--) {
            var j = Math.floor(rng() * (i + 1));
            var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
        }
        return a;
    }

    // Who Randomise reshuffles: everyone in a wave, or everyone when nobody is.
    function randomiseTargets(callers, waves) {
        var inc = includedCallers(callers, waves);
        return (inc.length ? inc : callers).map(function (c) { return c.id; });
    }

    // Saved callers from localStorage, old ({selected}) or new ({wave}),
    // to [{ name, marchSeconds, wave }]: old ticked = wave 1, unticked = off.
    // Waves above waveCount become off.
    function migrateCallers(data, waveCount) {
        if (!Array.isArray(data)) return [];
        var count = Math.max(1, Math.min(MAX_WAVES, waveCount || 1));
        return data.filter(function (c) { return c && typeof c === 'object'; }).map(function (c) {
            var wave = typeof c.wave === 'number' && isFinite(c.wave) ? Math.floor(c.wave) : (c.selected ? 1 : 0);
            if (wave < 0 || wave > count) wave = 0;
            return { name: String(c.name || ''), marchSeconds: c.marchSeconds || 45, wave: wave };
        });
    }

    // ---- Rally duration / reaction time choices ----
    // In-game rally timers: 1, 2, 3, 5 or 10 minutes (seconds here), default 5.
    var DURATION_CHOICES = [60, 120, 180, 300, 600];
    var DEFAULT_DURATION = 300;
    var REACTION_CHOICES = [15, 30, 45, 60, 90, 120, 180, 300];
    var DEFAULT_REACTION = 30;

    function pickChoice(v, choices, def) {
        var n = typeof v === 'number' ? v : parseInt(String(v === null || v === undefined ? '' : v).trim(), 10);
        return choices.indexOf(n) !== -1 ? n : def;
    }
    function normalizeDuration(v) { return pickChoice(v, DURATION_CHOICES, DEFAULT_DURATION); }
    function normalizeReaction(v) { return pickChoice(v, REACTION_CHOICES, DEFAULT_REACTION); }

    // ---- Caller lists: Attack and Counter ----
    // Two independent lists, each with its own callers, plan (live/frozen/
    // fixed), freeze time (auto-reset deadline), rally duration and reaction
    // time. Attack keeps the storage keys the page used before Counter
    // existed, so saved data IS the Attack list without moving anything (and
    // an older version of the page still reads it). Counter is one wave only.
    var LISTS = ['attack', 'counter'];
    var LIST_KEYS = {
        attack: {
            callers: 'rally_callers', waves: 'rally_waves', duration: 'rally_duration', reaction: 'rally_buffer',
            arrival: 'rally_arrival_ms', frozen: 'rally_frozen_ms', frozenAt: 'rally_frozen_at_ms', land: 'rally_land_ms'
        },
        counter: {
            callers: 'rally_counter_callers', duration: 'rally_counter_duration', reaction: 'rally_counter_buffer',
            arrival: 'rally_counter_arrival_ms', frozen: 'rally_counter_frozen_ms', frozenAt: 'rally_counter_frozen_at_ms',
            label: 'rally_counter_label'
        }
    };
    var MAX_LABEL = 12;

    // The counter alliance tag as typed: one line, no < >, at most 12 characters.
    function cleanLabel(str) { return cleanName(str).slice(0, MAX_LABEL); }

    function parseJSON(s) { try { return JSON.parse(s); } catch (e) { return null; } }

    // Read one list from storage. get(key) returns the stored string or null
    // (localStorage.getItem). Plans older than an hour are dropped (as before).
    // Returns { kind, callers: [{name, marchSeconds, wave}], waves, durationSec,
    // reactionSec, plan, label }.
    function loadList(get, kind, nowMs) {
        var K = LIST_KEYS[kind];
        var waves = kind === 'attack' ? normalizeWaves(parseJSON(get(K.waves))) : normalizeWaves({ count: 1 });
        var callers = migrateCallers(parseJSON(get(K.callers)), waves.count);
        var a = parseInt(get(K.arrival), 10);
        var f = parseInt(get(K.frozen), 10);
        // saved by an older version without a freeze time: count from now
        var at = parseInt(get(K.frozenAt), 10) || nowMs;
        var lands = K.land ? parseJSON(get(K.land)) : null;
        if (!Array.isArray(lands) || lands[0] !== a) lands = [a];
        var plan = { mode: 'live' };
        if (a && a > nowMs - 3600 * 1000) plan = { mode: 'fixed', arrivalMs: a, landMs: lands.slice(0, waves.count), frozenAtMs: at };
        else if (f && f > nowMs - 3600 * 1000) plan = { mode: 'frozen', firstStartMs: f, frozenAtMs: at };
        return {
            kind: kind, callers: callers, waves: waves, plan: plan,
            durationSec: normalizeDuration(get(K.duration)),
            reactionSec: normalizeReaction(get(K.reaction)),
            label: K.label ? cleanLabel(get(K.label)) : ''
        };
    }

    // What to write for a list's plan: { key: string } to set, { key: null } to remove.
    // Only that list's own keys appear, so saving one list never touches the other.
    function planStorage(kind, plan) {
        var K = LIST_KEYS[kind], out = {};
        out[K.arrival] = null; out[K.frozen] = null; out[K.frozenAt] = null;
        if (K.land) out[K.land] = null;
        if (plan.mode === 'fixed') {
            out[K.arrival] = String(plan.arrivalMs);
            if (K.land && plan.landMs && plan.landMs.length > 1) out[K.land] = JSON.stringify(plan.landMs);
        }
        if (plan.mode === 'frozen') out[K.frozen] = String(plan.firstStartMs);
        if (plan.mode !== 'live') out[K.frozenAt] = String(plan.frozenAtMs);
        return out;
    }

    // Saved form of a caller list. `selected` is kept so an older page still reads it.
    function callersStorage(callers) {
        return JSON.stringify(callers.map(function (c) {
            return { name: c.name, marchSeconds: c.marchSeconds, selected: c.wave > 0, wave: c.wave };
        }));
    }

    // Counter copy text: a "COUNTER - land HH:MM:SS" heading, then the usual
    // caller lines (one wave, longest march first).
    function buildCounterCopyText(callers, arrivalMs, rallyDurationSeconds, L) {
        var lines = [L.copy_counter(formatUTC(arrivalMs))];
        buildSchedule(includedCallers(callers, { count: 1 }), arrivalMs, rallyDurationSeconds).forEach(function (s) {
            lines.push(copyLine(s, L));
        });
        return lines.join('\n');
    }

    // Garrison Defense (unchanged maths):
    // hit = now + rally countdown left + enemy march; send = hit - your march.
    function garrisonTimes(nowMs, countdownSeconds, enemyMarchSeconds, yourMarchSeconds) {
        var hitTimeMs = nowMs + (countdownSeconds + enemyMarchSeconds) * 1000;
        return { hitTimeMs: hitTimeMs, sendTimeMs: hitTimeMs - yourMarchSeconds * 1000 };
    }

    return {
        pad: pad, formatUTC: formatUTC, formatMarch: formatMarch, parseMarch: parseMarch,
        liveFirstStartMs: liveFirstStartMs,
        arrivalFromFirstStart: arrivalFromFirstStart, freezePlan: freezePlan,
        planArrivalMs: planArrivalMs, planFirstStartMs: planFirstStartMs,
        firstStartPassed: firstStartPassed, parseClock: parseClock, resolveTargetMs: resolveTargetMs,
        longestMarch: longestMarch, buildSchedule: buildSchedule, cleanName: cleanName,
        buildCopyText: buildCopyText, garrisonTimes: garrisonTimes,
        MAX_WAVES: MAX_WAVES, DEFAULT_WAVE_DELAY: DEFAULT_WAVE_DELAY, MAX_DELAY: MAX_DELAY,
        toDelay: toDelay, normalizeWaves: normalizeWaves, gapSeconds: gapSeconds, waveOffsetsSec: waveOffsetsSec,
        callerWave: callerWave, nextWave: nextWave, includedCallers: includedCallers, leadSeconds: leadSeconds,
        planLandingsMs: planLandingsMs, parseLandAt: parseLandAt, buildWaveSchedule: buildWaveSchedule,
        buildWavesCopyText: buildWavesCopyText, migrateCallers: migrateCallers,
        randomiseWaves: randomiseWaves, randomiseTargets: randomiseTargets,
        AUTO_RESET_CHOICES: AUTO_RESET_CHOICES, DEFAULT_AUTO_RESET_MIN: DEFAULT_AUTO_RESET_MIN,
        normalizeAutoReset: normalizeAutoReset, autoResetDeadlineMs: autoResetDeadlineMs,
        autoResetDue: autoResetDue, autoResetRemainingSec: autoResetRemainingSec, copyIsStale: copyIsStale,
        DURATION_CHOICES: DURATION_CHOICES, DEFAULT_DURATION: DEFAULT_DURATION,
        REACTION_CHOICES: REACTION_CHOICES, DEFAULT_REACTION: DEFAULT_REACTION,
        normalizeDuration: normalizeDuration, normalizeReaction: normalizeReaction,
        LISTS: LISTS, LIST_KEYS: LIST_KEYS, MAX_LABEL: MAX_LABEL, cleanLabel: cleanLabel,
        loadList: loadList, planStorage: planStorage, callersStorage: callersStorage,
        buildCounterCopyText: buildCounterCopyText
    };
});
