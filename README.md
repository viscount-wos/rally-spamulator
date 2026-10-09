# Viscount's Rally Spamulator

A small web tool for **Whiteout Survival** rally leaders. Tick your callers and it works out when each one must start their rally so every rally lands at the same moment. One tap copies the schedule as plain text to paste into game chat. A Garrison Defense tab tells defenders when to send reinforcements.

Live: https://rally.hunterisadonkey.com (Cloud Run service `rally-spamulator`). Player guide: [USAGE.md](USAGE.md). The site sits behind one shared alliance password (see [Password gate](#password-gate)); players have no accounts.

## What it does

**Rally Spam**
- Callers (name + march time) are remembered in your browser (localStorage). Tap a caller to tick them in or out of this rally.
- *Edit list*: rename, change march time, move up/down, remove. *Clear list* asks first.
- *Import / export list*: paste one caller per line (`Alpha, 1:45`, `Alpha 1:45`, `Alpha;105` all work) to replace or add to the list. *Export list* copies the list back out in the same format, so leaders can share caller lists.
- Rally duration 5 or 10 minutes.
- **LIVE** by default: the first start is now + reaction time and every time counts up with the clock once a second (the chat preview too).
- **Copy Schedule freezes** the plan at that instant (box shows LOCKED); the copied text is exactly the frozen times, countdowns keep running down, and copying again re-copies the same text. **Reset** returns to LIVE; it turns red with a warning once the first start time has passed. **LOCK** freezes without copying.
- *Land at (UTC)* fixes the landing time instead (e.g. `21:05`; `00:05` typed at 23:50 means 15 minutes from now); Reset clears it.
- Edits while frozen (callers, march times, duration) keep the frozen **first start** and recompute the rest; changing the reaction time goes back to LIVE. A frozen plan or typed time survives a reload (for up to an hour after it).
- Live UTC clock and a countdown for each caller.
- **Copy Schedule** copies plain text, one caller per line, in game time (UTC). The exact text is previewed under the button:

  ```
  Start times UTC - land 00:05:00
  23:58:15 - Alpha (march 1:45)
  23:59:05 - Bravo (march 0:55)
  23:59:30 - Charlie (march 0:30)
  ```

**Garrison Defense**
- Keep a roster of enemies (name, alliance, march time) and your own march time. All of it is stored in the browser.
- Pick an enemy, type the in-game rally countdown and press Track. It shows when the rally hits and when to send reinforcements, with SEND NOW / LANDED alerts.

**Languages**: English, Türkçe, Polski, 中文, 한국어, العربية (Arabic is right-to-left). The phone's language is used unless you pick another one.

## How the maths works

All times are UTC (game time).
- LIVE: first start = now (whole second) + reaction time. FROZEN: first start = the value at the moment of Copy/LOCK. Arrival = first start + rally duration + longest march. FIXED: arrival = the typed time. (`planArrivalMs` in `core.js`.)
  The old auto rule rounded the first start up to the next reaction-time slot; live mode replaces it.
- Each caller's start = arrival − rally duration − their march. Longest march goes first; equal marches keep list order.
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
- `GET /health`.

The page makes no external requests (no fonts or CDNs).

## Password gate

The whole site (page, scripts, styles) needs one shared password. Only `/health` and the login page with its own `login.css` / `login.js` / icon are open. Unknown visitors are sent to `/login?next=<page>`; other requests without the cookie get `401`.

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
- The login page follows the phone's language like the app (6 languages, Arabic right-to-left).

## Code layout

| File | What |
|------|------|
| `public/index.html` | Markup only |
| `public/core.js` | Pure maths and text (schedule, copy text, import/export, garrison), shared with the tests |
| `public/i18n.js` | All translations |
| `public/app.js` | UI, localStorage, clipboard |
| `public/style.css` | Styles (phone first, two columns from 900px) |
| `public/login.html`, `login.js`, `login.css` | Password page (own small translations) |
| `server.js` | Static server + password gate |

## Tests

```bash
npm test                                    # node --test: maths, live/frozen/fixed plans, midnight UTC, copy text in 6 languages, import/export, garrison, server headers, password gate (off/on, redirect/401, cookie, tampering, open redirect, rate limit, prod refusal)
GATE_PASSWORD=test-gate-pw npm start &      # then:
python3 e2e/smoke.py http://localhost:8080  # Playwright (Chromium): logs in first (GATE_PASSWORD env, default test-gate-pw); login page en + ar; desktop + iPhone 13, clipboard, Arabic RTL, live -> copy/freeze -> reset with a controlled clock; screenshots in e2e/out/
INSECURE_URL=http://<lan-host>:8080 python3 e2e/smoke.py http://localhost:8080   # also checks copying over plain http
```

## Removed in the strip-back (branch `strip-back`)

This branch removed:
- Discord login, roles and user management (a single shared password gate was added back later);
- the live rally broadcast (SSE and the rallies API);
- Alliance Docs & Notices;
- server-side player profiles;
- saved presets (replaced by import/export);
- the SQLite database.

Rally Spam and Garrison Defense were kept. The removed code lives in git history before the strip-back (commit `21acd7f`).
