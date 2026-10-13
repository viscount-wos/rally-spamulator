# Viscount's Rally Spamulator

Rally-timing tool for **Whiteout Survival** SVS castle fights. Tick callers (name + march time) and it computes when each must start so every rally lands together; one tap copies the schedule as plain text for game chat. Owner: Viscount (alliance LOV, state #2807). Live at https://rally.hunterisadonkey.com (Cloud Run `rally-spamulator`, GCP project `viscount-wos-tools`, us-central1) behind one shared password. Private tool: noindexed, no public links.

`HANDOFF.md` has current status, open items, test/deploy commands and owner preferences. Read it first. `README.md` (features, maths, saved state) and `USAGE.md` (player guide) are current.

## Stack

- Node >= 20, Express 4 + compression. **No database, no accounts, no build step, no frameworks.** Vanilla JS/CSS served from `public/`.
- All app data lives in the browser (localStorage). Two people using it at once is fine: no server state.
- `server.js` (~220 lines): shared-password gate (cookie `rally_gate` = HMAC keyed by `GATE_PASSWORD`; changing the password logs everyone out), strict CSP (no inline script/style), `X-Robots-Tag: noindex, nofollow` on every response, open `/robots.txt` and `/health`, `/help` and `/changelog` routes. Only env: `GATE_PASSWORD` (required when `NODE_ENV=production`) and `PORT` (default 8080).
- Never print, type or commit the real password. Local and test copies use `test-gate-pw` only.

## Layout

```
server.js            gate, headers, routes
public/
  index.html app.js  Rally + Garrison UI (battle view)
  core.js            pure maths and storage helpers (planArrivalMs, planLandingsMs, autoResetDue, copyIsStale, loadList ...)
  i18n.js            UI strings, 9 languages (scripts/gen-i18n.js)
  style.css tokens.css theme.js   look; 3 themes (Dark, Reading, Low Glare)
  help.html/js/css + help-content.js              /help guide, 9 languages
  changelog.html/js + changelog-content.js        /changelog "What's new", 9 languages
  login.html/js/css
test/                node:test unit tests
e2e/                 Playwright (Python) smoke.py, battle_shots.py, help_shots.py; screenshots to e2e/out/
CHANGELOG.md         English copy of the change log
```

## Rules

- **Do not change behaviour, copy text, maths or storage keys without asking.** Tests guard them. Keys include `rally_callers`, `rally_counter_*`, `rally_show_counter`, `rally_ui_open`, `rally_auto_reset`, `rally_discord_*`, `app_lang`, `preferred_theme`.
- All times are UTC (`Date.now()` epoch ms).
- **9 languages**: en es fr de pl ko zh tr ar (Arabic is RTL). New UI text goes in every language in `public/i18n.js` (a test fails on a missing key). Guide and change-log text go in their own content files, all 9 languages. Keep RTL working for anything directional.
- **Changelog**: to add a release, edit `CHANGELOG.md` AND `public/changelog-content.js` in every language; `test/changelog.test.js` fails if they disagree.
- **Guide**: button names are written `{key}` in `help-content.js` and replaced at runtime with the app's own label. Text is rendered with `textContent` only.
- **CSP**: no inline scripts or styles, no external resources.
- **Header must stay ONE row** at 900-1599px (brand, clock, tabs, ?, Counter tick, Auto-reset, language, theme, Log out), or the battle-view panels clip. `style.css` shrinks the clock there and visually hides the "Auto-reset after" label in es/fr/de/tr. Any header change needs `e2e/help_shots.py` (checks one row in all 9 languages at 1440).
- Battle view is fitted to one screen from 1100x700. Check with `e2e/battle_shots.py` and look at `e2e/out/battle-*.png` with Read. `.ph-msg` has a fixed height so warnings never move the schedule.
- Keep the app files as they are (separate html/js/css per page); don't add frameworks or a bundler.

## Commands

```bash
npm test                                   # unit tests (72)
GATE_PASSWORD=test-gate-pw npm start       # http://localhost:8080 with gate on
PY=/home/bevans/ai/fun/wos/wos-events-wt/frontend-wiring/e2e/.venv/bin/python
INSECURE_URL=http://hannah.localdomain:8096 $PY e2e/smoke.py http://localhost:8096   # ONLY=new for new checks
$PY e2e/battle_shots.py http://localhost:8096
$PY e2e/help_shots.py   http://localhost:8096
```

LAN test copy and deploy steps are in `HANDOFF.md`. **Deploy only when the owner says "ship it"** (merge, push, deploy). The GitHub repo (viscount-wos/rally-spamulator) is public; ask what "publish" means if unclear. Git author is `viscount <viscount-wos@users.noreply.github.com>`.

## Working with the owner

- Short, plain answers. Discuss ideas before building big things. Keep all languages working.
- Use Sonnet 5.5; look at screenshots directly with Read; no `claude -p` reviewers. Parallel subagents are fine when he asks (e.g. one per language, each writing JSON to the scratchpad that you apply with a script, so there are no concurrent edits to one file).
- He watches token use closely: keep review loops short.
