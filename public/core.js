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
    function freezePlan(nowMs, reactionSeconds) {
        return { mode: 'frozen', firstStartMs: liveFirstStartMs(nowMs, reactionSeconds) };
    }

    function planArrivalMs(plan, nowMs, callers, reactionSeconds, rallyDurationSeconds) {
        if (plan && plan.mode === 'fixed') return plan.arrivalMs;
        var first = plan && plan.mode === 'frozen' ? plan.firstStartMs : liveFirstStartMs(nowMs, reactionSeconds);
        return arrivalFromFirstStart(first, rallyDurationSeconds, longestMarch(callers));
    }

    // Earliest start in the plan (the longest march caller).
    function planFirstStartMs(plan, nowMs, callers, reactionSeconds, rallyDurationSeconds) {
        return planArrivalMs(plan, nowMs, callers, reactionSeconds, rallyDurationSeconds)
            - rallyDurationSeconds * 1000 - longestMarch(callers) * 1000;
    }

    // True once the first start time is behind us (a live plan never is).
    function firstStartPassed(plan, nowMs, callers, reactionSeconds, rallyDurationSeconds) {
        if (!callers.length || !plan || plan.mode === 'live') return false;
        return planFirstStartMs(plan, nowMs, callers, reactionSeconds, rallyDurationSeconds) < nowMs;
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

    // Plain text for in-game chat. Lines are the original format
    // "HH:MM:SS - Name (march M:SS)"; the first line says the times are
    // UTC and when the rallies land.
    function buildCopyText(callers, arrivalMs, rallyDurationSeconds, L) {
        var lines = [L.copy_header(formatUTC(arrivalMs))];
        buildSchedule(callers, arrivalMs, rallyDurationSeconds).forEach(function (s) {
            lines.push(formatUTC(s.setOffMs) + ' - ' + (cleanName(s.name) || L.unnamed)
                + ' (' + L.march_word + ' ' + formatMarch(s.marchSeconds) + ')');
        });
        return lines.join('\n');
    }

    // One caller per line: "Name, 1:45" (also "Name 1:45", "Name;105", tabs).
    // Returns { callers: [{name, marchSeconds}], bad: [lines] }.
    function parseCallerList(text) {
        var out = [], bad = [];
        String(text || '').split(/\r?\n/).forEach(function (raw) {
            var line = raw.trim();
            if (!line || line.charAt(0) === '#') return;
            var m = /^(.*?)[\s,;]+(\d+:\d{1,2}|\d+)\s*s?$/i.exec(line);
            var name = m ? cleanName(m[1].replace(/[,;]+$/, '')) : '';
            var march = m ? parseMarch(m[2]) : 0;
            if (!name || march <= 0) { bad.push(line); return; }
            out.push({ name: name, marchSeconds: march });
        });
        return { callers: out, bad: bad };
    }

    function exportCallerList(callers) {
        return callers.map(function (c) {
            return (cleanName(c.name) || '?') + ', ' + formatMarch(c.marchSeconds);
        }).join('\n');
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
        buildCopyText: buildCopyText, parseCallerList: parseCallerList,
        exportCallerList: exportCallerList, garrisonTimes: garrisonTimes
    };
});
