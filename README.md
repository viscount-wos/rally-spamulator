# Viscount's Rally Spamulator

A small, no-login web tool for **Whiteout Survival** rally leaders. Tick your callers and it works out when each one must start their rally so every rally lands at the same moment. One tap copies the schedule as plain text to paste into game chat. A Garrison Defense tab tells defenders when to send reinforcements.

Live: https://rally.hunterisadonkey.com (Cloud Run service `rally-spamulator`). Player guide: [USAGE.md](USAGE.md).

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
npm start                      # http://localhost:8080  (PORT env var, default 8080)
```

Docker (same image as Cloud Run):

```bash
docker build -t rally-spamulator .
docker run -p 8080:8080 rally-spamulator
```

No environment variables, secrets or database are needed, so there is no `.env` any more. The server (`server.js`) only serves `public/` with:
- security headers (strict CSP, nosniff, frame-deny);
- gzip compression;
- `Cache-Control: no-cache` with ETags;
- `GET /health`.

The page makes no external requests (no fonts or CDNs).

## Code layout

| File | What |
|------|------|
| `public/index.html` | Markup only |
| `public/core.js` | Pure maths and text (schedule, copy text, import/export, garrison), shared with the tests |
| `public/i18n.js` | All translations |
| `public/app.js` | UI, localStorage, clipboard |
| `public/style.css` | Styles (phone first, two columns from 900px) |
| `server.js` | Static server |

## Tests

```bash
npm test                                    # node --test: maths, live/frozen/fixed plans, midnight UTC, copy text in 6 languages, import/export, garrison, server headers
python3 e2e/smoke.py http://localhost:8080  # Playwright (Chromium): desktop + iPhone 13, clipboard, Arabic RTL, live -> copy/freeze -> reset with a controlled clock; screenshots in e2e/out/
INSECURE_URL=http://<lan-host>:8080 python3 e2e/smoke.py http://localhost:8080   # also checks copying over plain http
```

## Removed in the strip-back (branch `strip-back`)

This branch removed:
- Discord login, roles and user management;
- the live rally broadcast (SSE and the rallies API);
- Alliance Docs & Notices;
- server-side player profiles;
- saved presets (replaced by import/export);
- the SQLite database.

Rally Spam and Garrison Defense were kept. The removed code lives in git history before the strip-back (commit `21acd7f`).
