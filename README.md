# Viscount's Rally Spamulator

A small web tool for **Whiteout Survival** rally leaders. Tick your callers and it works out when each one must start their rally so every rally lands at the same moment. The Rally Spam screen is a **battle view**: the Attack and Counter plans sit side by side on one desktop screen, so you see the whole picture at once. Each plan has its own Copy button and live/frozen state, and one tap copies its schedule as plain text to paste into game chat. A Garrison Defense tab tells defenders when to send reinforcements.

Live: https://rally.hunterisadonkey.com (Cloud Run service `rally-spamulator`). Player guide: [USAGE.md](USAGE.md). The site sits behind one shared alliance password (see [Password gate](#password-gate)); players have no accounts.

## What it does

**Rally Spam**
- **Battle view:** on desktop (from 900px wide, fitted to one screen from 1100 x 700), *Attack* and *Counter* are side by side with no tabs between them, so both plans remain visible together; on narrower screens they stack with Attack first. Both panels have the same head: name, LIVE/LOCKED status with the auto-reset countdown, LOCK (Reset in its place once frozen), the landing time(s), a large **NEXT** line (who starts next, and in how many seconds) and a full-width Copy button (Attack gold, Counter red). Settings fold behind a one-line summary with *Land at* always visible; below are the schedule (waves as columns), the caller chips and the chat text. The header's **Counter** tick box hides the Counter panel so Attack runs full width (display only; saved in `rally_show_counter`, Counter keeps its state). The only things shared between the panels are the header (UTC clock, tabs, *Auto-reset after*, language, theme, Log out). *Attack* is the normal list (waves included; this is also the counter-counter, planned ahead). *Counter* is ONE separate list for a counter by another alliance: an editable alliance tag (*Counter alliance*, max 12 characters; its panel then reads *Counter: BDE*), a single wave fired as soon as possible (wave controls hidden), its own **Copy Counter: BDE** button. Each list has its own callers, rally duration, reaction time, Land at, LOCK/frozen plan, auto-reset countdown and stale-copy guard; freezing, resetting or editing one never touches the other. Only the *Auto-reset after* minutes are shared (each list counts from its own freeze time). Both lists persist independently across a reload.
- Callers (name + march time) are remembered in your browser (localStorage). Tap a caller to tick them in or out of this rally.
- *Add/Edit* adds a caller row and opens the list for editing; *Edit list* opens it without adding: rename, change march time, move up/down, remove. *Clear list* asks first.
- Rally duration 1, 2, 3, **5** (default) or 10 minutes, per list.
- **LIVE** by default: the first start is now + reaction time and every time counts up with the clock once a second (the chat preview too).
- **Copy Schedule freezes** the plan at that instant (box shows LOCKED); the copied text is exactly the frozen times, countdowns keep running down, and copying again re-copies the same text. **Reset** returns to LIVE; it turns red with a warning once the first start time has passed. **LOCK** freezes without copying.
- **Stale-copy guard**: Copy on a frozen (or typed) plan whose earliest start has already passed doesn't copy the old times: it resets, freezes fresh times, copies those and shows *Old times had passed: copied new times* (with auto-reset on or off).
- **Auto-reset** (Rally Settings, *Auto-reset after*: Off / 1 / 2 / 3 / **5** / 10 / 15 min, saved): a frozen or typed plan returns to LIVE exactly like Reset that long after it was frozen, with an *Auto-reset in M:SS* countdown under LOCKED and a floating *Auto-reset: times are live again* notice. Re-copying and edits don't restart it; manual Reset cancels it; a newly typed Land at restarts it. It is measured from the freeze time stored with the plan, so it survives a reload and fires on the next tick after a phone sleeps past it.
- *Land at (UTC)* fixes the landing time instead (e.g. `21:05`; `00:05` typed at 23:50 means 15 minutes from now); Reset clears it.
- Edits while frozen (callers, march times, duration) keep the frozen **first start** and recompute the rest; changing the reaction time goes back to LIVE. A frozen plan or typed time survives a reload (for up to an hour after it).
- **Waves** (up to 6): groups of callers whose landings are staggered. A default *Delay between waves* (10 s) plus an optional override per gap; tapping a caller cycles off → 1 → … → n → off (numbered, colour-blind-safe badges); *Randomise* spreads the callers in a wave (or everyone, if nobody is) over the waves as evenly as possible, with one-level Undo; the schedule and the copied text are grouped by wave. *Land at* takes one time per wave (`12:05:00, 12:05:10, 12:05:30`). With one wave everything is exactly as before.
- Live UTC clock and a countdown for each caller.
- **Copy Schedule** copies plain text, one caller per line, in game time (UTC). The exact text is previewed under the button:

  ```
  Land 00:05:00
  23:58:15 - Alpha (march 1:45)
  23:59:05 - Bravo (march 0:55)
  23:59:30 - Charlie (march 0:30)
  ```

  The Attack text is unchanged by the Counter work. The Counter text starts with its own heading (translated, e.g. es `CONTRAATAQUE - llegada …`):

  ```
  COUNTER - land 18:06:42
  18:00:30 - Moss (march 1:12)
  18:00:54 - Kai (march 0:48)
  ```

**Guide**: the **?** button in the header opens `/help` (behind the same password gate): a quick start, how the timing works, waves, the battle view, reset and auto-reset, Garrison Defense, a strategy guide (tool-based tactics only, no game rules) and tips, in all 9 languages. The text lives in `public/help-content.js` and is drawn by `help.js` with `textContent` only; button names are written as `{key}` and replaced with the app's own label from `i18n.js`, so the guide always uses the words on the buttons. It follows the language saved in the tool (`app_lang`) and has its own language menu. Translations were written by Claude and proof-read by one reviewer per language against the UI wording; a native speaker's check is still welcome.

**What's new**: the guide's footer links to `/changelog` (also behind the gate), a newest-first list of releases in all 9 languages (`public/changelog-content.js`, drawn by `changelog.js`). The English text is also kept in [CHANGELOG.md](CHANGELOG.md); `test/changelog.test.js` checks that every language has the same releases and that `CHANGELOG.md` matches the English. To add a release, edit both and every language in the content file.

**Garrison Defense**
- Keep a roster of enemies (name, alliance, march time) and your own march time. All of it is stored in the browser.
- Pick an enemy, type the in-game rally countdown and press Track. It shows when the rally hits and when to send reinforcements, with SEND NOW / LANDED alerts.

**Languages**: English, Español, Français, Deutsch, Polski, 한국어, 中文, Türkçe, العربية (Arabic is right-to-left), on the app and the login page. The phone's language is used unless you pick another one.

**Look**: the event app's theme tokens ported to plain CSS custom properties (`public/tokens.css`, no framework or build step) with its three themes, *Dark* (`ministry-dark`, default), *Reading* and *Low Glare*, picked from a compact chip in the header next to the language (saved in `preferred_theme`; `theme.js` applies it before first paint). Desktop first: the Rally tab is the battle view with Attack and Counter panels side by side from 900px (Attack gets more room for waves from 1200px), scaled up on 1920 x 1080 screens; each panel puts status, the next start, landing time, Copy, settings, schedule, callers and chat text in one plan. Below 900px the panels stack without sideways scroll down to 320px. There are no links to or from the event app.

## How the maths works

All times are UTC (game time).
- LIVE: first start = now (whole second) + reaction time. FROZEN: first start = the value at the moment of Copy/LOCK. Arrival = first start + rally duration + longest march. FIXED: arrival = the typed time. (`planArrivalMs` in `core.js`.)
  The old auto rule rounded the first start up to the next reaction-time slot; live mode replaces it.
- Each caller's start = arrival − rally duration − their march. Longest march goes first; equal marches keep list order.
- Waves (`planLandingsMs`): wave k lands at wave 1's landing + the gaps before it (each gap = its override or the default delay). LIVE/FROZEN anchor the **earliest start across all waves** on the (live or frozen) first start, so wave 1 lands at first start + duration + max over callers of (march − their wave's offset). FIXED: wave k lands at the k-th typed time; waves after the last typed time follow the delays; later typed times never go backwards (a smaller time = next day UTC).
- Auto-reset (`autoResetDue`, `autoResetRemainingSec`): due when now ≥ frozenAt + minutes; 0 (Off) never fires; the countdown is the whole seconds left, rounded up (5:00 at the freeze). The stale-copy check is `copyIsStale` = `firstStartPassed`.
- Lists (`LIST_KEYS`, `loadList`, `planStorage` in `core.js`): Attack keeps the original keys below, so data saved before the switch existed simply is the Attack list. Counter uses `rally_counter_callers`, `rally_counter_duration`, `rally_counter_buffer`, `rally_counter_arrival_ms`, `rally_counter_frozen_ms`, `rally_counter_frozen_at_ms` and `rally_counter_label`; `rally_list` remembers the selected list.
- Saved state: `rally_auto_reset` holds the minutes (0 = Off); `rally_frozen_at_ms` the freeze time of a frozen or typed plan. `rally_callers` items carry `wave` (0 = off) next to the old `selected` flag; old lists migrate as ticked = wave 1. `rally_waves` holds `{count, defaultDelay, gaps}`; several typed land times go in `rally_land_ms`.
- Garrison: hit = now + rally countdown + enemy march; send = hit − your march.

## Running it

```bash
npm ci
npm start                                      # http://localhost:8080, gate OFF (warning logged)
GATE_PASSWORD=test-gate-pw npm start           # gate ON with a dummy password
```

Docker (same image as Cloud Run; the image sets `NODE_ENV=production`, so it needs a password):

```bash
docker build -t rally-spamulator .
docker run -p 8080:8080 -e GATE_PASSWORD=test-gate-pw rally-spamulator
```

There is no database and no `.env`. The only setting is `GATE_PASSWORD` (plus `PORT`, default 8080). The server (`server.js`) serves `public/` with:
- the password gate (below);
- security headers (strict CSP, nosniff, frame-deny);
- gzip compression;
- `Cache-Control: no-cache` with ETags;
- `X-Robots-Tag: noindex, nofollow` on every response (incl. the login page, `/health` and 401s);
- an open `GET /robots.txt` (`User-agent: *` / `Disallow: /`);
- `GET /health`.

The page makes no external requests (no fonts or CDNs).

## Password gate

The whole site (page, scripts, styles) needs one shared password. Only `/health`, `/robots.txt` and the login page with its own `login.css` / `login.js` / `tokens.css` / `theme.js` / icon are open. Unknown visitors are sent to `/login?next=<page>`; other requests without the cookie get `401`.

- **Where the password lives**: only in the `GATE_PASSWORD` environment variable. In production Cloud Run fills it from the Secret Manager secret **`rally-gate-password`** (project `viscount-wos-tools`), e.g. `--set-secrets GATE_PASSWORD=rally-gate-password:latest`. It is never in this repo, the image or the logs. Locally and in tests use a dummy such as `test-gate-pw`.
- **Unset**: with `NODE_ENV=production` (the Docker image) the server refuses to start. Otherwise (dev) it runs with the gate **disabled** and logs a warning.
- **Changing it**: add a new secret version, then redeploy (or force a new revision) so `:latest` is re-read. Type it without echo so it stays out of shell history:
  ```bash
  read -rsp "New password: " P; echo; printf %s "$P" | gcloud secrets versions add rally-gate-password --data-file=- --project viscount-wos-tools; unset P
  gcloud run services update rally-spamulator --region us-central1 --update-labels gate-rotated=$(date +%s)
  ```
  **Changing the password logs everyone out**: the cookie is `HMAC-SHA256(key = password, "rally-gate-v1")`, so old cookies stop matching. No server state.
- **Cookie** `rally_gate`: HttpOnly, SameSite=Lax, Path=/, 30 days, Secure over https (`trust proxy 1` reads Cloud Run's `X-Forwarded-Proto`). *Log out* in the footer clears it.
- **Login**: the password is compared in constant time (SHA-256 digests + `timingSafeEqual`). After login you go back to `next` if it is a same-site path, else `/`.
- **Rate limit**: 10 wrong passwords per client IP per 15 minutes, then `429` with a translated message (in memory, per instance; right-most `X-Forwarded-For`).
- The login page follows the phone's language like the app (9 languages, Arabic right-to-left) and the saved theme.

## Code layout

| File | What |
|------|------|
| `public/index.html` | Markup only |
| `public/core.js` | Pure maths and text (schedule, copy text, garrison), shared with the tests |
| `public/i18n.js` | All translations |
| `public/help.html`, `help.js`, `help.css`, `help-content.js` | The guide page (`/help`) and its 9-language text |
| `public/changelog.html`, `changelog.js`, `changelog-content.js` | The What's new page (`/changelog`) and its 9-language text; English copy in `CHANGELOG.md` |
| `public/app.js` | UI, localStorage, clipboard |
| `public/tokens.css` | Theme tokens (the event app's 3 palettes) + base styles, shared with the login page |
| `public/theme.js` | Theme picker (applied before first paint) |
| `public/style.css` | Styles (desktop first: battle view with two panels from 900px, fitted to one screen from 1100 x 700, stacked below 900px) |
| `public/login.html`, `login.js`, `login.css` | Password page (own small translations) |
| `server.js` | Static server + password gate |

## Tests

```bash
npm test                                    # node --test: maths, live/frozen/fixed plans, auto-reset + stale-copy helpers, midnight UTC, waves (delays, earliest-start anchoring, multi-time Land at, grouped copy text, migration), Attack/Counter lists (independence, migration, Counter heading in 9 languages), durations, no missing i18n keys, theme contrast, copy text, garrison, server headers (incl. X-Robots-Tag, robots.txt), password gate (off/on, redirect/401, cookie, tampering, open redirect, rate limit, prod refusal)
GATE_PASSWORD=test-gate-pw npm start &      # then:
python3 e2e/smoke.py http://localhost:8080  # Playwright (Chromium): logs in first (GATE_PASSWORD env, default test-gate-pw); login page en + ar; desktop + iPhone 13, clipboard, Arabic RTL, live -> copy/freeze -> reset with a controlled clock, auto-reset + stale-copy guard, waves (tap cycling, gaps, multi Land at, copy text), battle view (Attack + Counter side by side: flow, layout fit, clipboard), per-list auto-reset, 3 themes, es/fr/de, Arabic RTL, CSP/console errors; screenshots in e2e/out/. `ONLY=new` runs just the Counter/look checks. `python3 e2e/help_shots.py <url>` checks the guide in all 9 languages at 1440 and 390 wide (header stays one row, no sideways scroll, no raw `{tokens}`) and writes `e2e/out/help-*.png`. `python3 e2e/battle_shots.py <url>` writes the battle-view screenshots (`e2e/out/battle-*.png`) for a design review
INSECURE_URL=http://<lan-host>:8080 python3 e2e/smoke.py http://localhost:8080   # also checks copying over plain http
```

## Removed in the strip-back (branch `strip-back`)

This branch removed:
- Discord login, roles and user management (a single shared password gate was added back later);
- the live rally broadcast (SSE and the rallies API);
- Alliance Docs & Notices;
- server-side player profiles;
- saved presets (a caller import/export list replaced them for a while; it was removed later at the owner's request, see git history);
- the SQLite database.

Rally Spam and Garrison Defense were kept. The removed code lives in git history before the strip-back (commit `21acd7f`).
