# Viscount's Rally Spamulator

A single-file HTML web tool for the game **Whiteout Survival**. Everything (CSS, HTML, JS) lives in `index.html` (~1740 lines). There are no dependencies, no build step, no frameworks.

## What It Does

Two tabs:

### Tab 1 — Rally Spam (حشد الهجوم)
Coordinates multiple rally callers so all rallies arrive at the same target simultaneously.

- Users add **callers** with name + march time, then click them in desired arrival order.
- Math: `firstDeparture = ceil((now + bufferMs) / bufferMs) * bufferMs` (rounds up to next buffer interval).
- `arrival = firstDeparture + rallyDuration + longestMarch`
- Each caller's set-off: `setOff = arrival - rallyDuration - marchTime`
- Displays a live departure schedule with countdowns, copy-to-clipboard.
- Supports caller presets saved to localStorage.
- Rally duration toggle: 5 min or 10 min.
- Buffer/rounding on first departure (default 5 min).
- Lock button freezes the arrival time so the schedule doesn't drift.

### Tab 2 — Garrison Defense (دفاع الحامية)
Tracks incoming enemy rallies and tells defenders when to send reinforcements.

- Users maintain an **enemy roster** (name, alliance, march time).
- Quick-select an enemy, enter the in-game rally countdown (M:SS), hit Track.
- Math: `hitTime = now + rallyCountdown + enemyMarch`; `sendTime = hitTime - yourMarch`
- Shows live countdowns for each tracked rally with "SEND NOW" / "LANDED" states.
- Auto-removes rallies 30s after landing.

## Architecture

- **State variables**: `callers[]`, `enemies[]`, `activeRallies[]`, `selectedEnemyId`, `locked`, `lockedArrivalMs`, etc.
- **Persistence**: All state saved to localStorage (`rally_callers`, `rally_enemies`, `garrison_enemies`, `garrison_your_march`, `rally_settings`, `rally_presets`, `app_lang`).
- **Live updates**: Three `setInterval` loops at 100ms (clock) and 250ms (schedule + active rallies).
- **Tab switching**: Uses `data-tab` attributes on tab buttons (not text content), so it works across all languages.
- **Click-to-order**: Callers are selected by clicking; each gets a numbered badge for arrival order.
- **Validation feedback**: `flashElement()` shows a red outline flash when Track is clicked without selecting an enemy or entering a countdown.

## i18n System

Six languages: English (`en`), Turkish (`tr`), Polish (`pl`), Chinese (`zh`), Korean (`ko`), Arabic (`ar`).

- Static HTML uses `data-i18n` attributes; placeholders use `data-i18n-ph`.
- Dynamic JS uses `t(key)` helper: `function t(key) { return LANG[currentLang][key] || LANG.en[key] || key; }`
- `setLang(code)` updates all `[data-i18n]` elements, re-renders callers/enemies/presets, sets `document.title`.
- Each language entry in `LANG` object includes format functions: `fmtCountdown(m, s)`, `fmtAgo(s)`, `fmtInTime(t)` to handle word-order differences (e.g., "in 5m 30s" vs "5分30秒后" vs "بعد 5د 30ث").
- Language preference persisted in localStorage as `app_lang`.

## RTL Support (Arabic)

- `setLang()` sets `document.documentElement.dir = 'rtl'` for Arabic, `'ltr'` for others.
- CSS `[dir="rtl"]` selectors flip: border-left to border-right on schedule items and rally trackers, margin-left/right and padding-left/right on countdown and info elements.

## Dev Server

Preview with any static server, e.g.:

```bash
python3 -m http.server 8080
```

Launch config is in `.claude/launch.json` (name: `rally-spamulator`, port 8080).

## Key Patterns to Preserve

- **Single file**: Do not split into multiple files. Everything stays in `index.html`.
- **No frameworks**: Vanilla JS only.
- **All times are UTC**: The clock shows UTC, all calculations use `Date.now()` (UTC epoch ms).
- **Buffer rounding**: First departure is always rounded up to the next buffer interval — this is intentional so callers have clean departure times.
- **i18n keys**: When adding new UI text, add a key to every language in the `LANG` object, add `data-i18n` to the HTML element, and use `t('key')` in any JS that renders that text dynamically.
- **RTL**: If adding new styled elements with directional borders/margins/padding, add corresponding `[dir="rtl"]` CSS overrides.
