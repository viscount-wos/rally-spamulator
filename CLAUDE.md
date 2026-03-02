# Viscount's Rally Spamulator

A web tool for the game **Whiteout Survival**. The frontend (CSS, HTML, JS) lives in `public/index.html` (~1900 lines). Served by an Express server (`server.js`) with Discord OAuth2 authentication and role-based access control. Deployed to Google Cloud Run via Docker.

## Project Structure

```
rally-spamulator/
  .claude/launch.json     # Dev server config (node server.js, port 8080)
  .dockerignore
  .env                    # Local env vars (not committed)
  .env.example            # Template for env vars
  .gitignore
  CLAUDE.md
  Dockerfile
  README.md
  package.json
  package-lock.json
  db.js                   # SQLite database layer (users, roles)
  server.js               # Express server with auth + API routes (~170 lines)
  data/                   # SQLite database files (not committed)
    rally.db
    sessions.db
  public/
    index.html            # The entire frontend application
    login.html            # Discord OAuth login page
```

## What It Does

Three tabs (third only visible to R5/Admin):

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

### Tab 3 — Users (R5/Admin only)
User management panel. Only visible to users with R5 or Admin role.

- View all registered users with Discord avatar, name, role, join date.
- Change user roles via dropdown (Pending, Member, Captain, R5, Admin).
- Only Admin can assign the Admin role. R5 can assign up to R5.
- Cannot change your own role.

## Authentication & Roles

### Discord OAuth2 Flow
1. User visits app → redirected to `/login` (login.html)
2. Clicks "Login with Discord" → redirected to Discord OAuth2 authorize endpoint
3. User authorizes → Discord redirects to `/auth/discord/callback` with auth code
4. Server exchanges code for access token, fetches user profile from Discord API
5. User upserted in SQLite database, session created
6. Redirected to `/` → frontend calls `/auth/status` to get user info + role

### Roles
- **Pending** (role=null) — new users, can see "Waiting for Approval" screen only
- **R1/2/3** (role='r123') — Members, can use Rally Spam + Garrison Defense
- **R4** (role='r4') — Captains, same as member (future features may differentiate)
- **R5** (role='r5') — Alliance Leader, full access + user management
- **Admin** (role='admin') — Full access to everything

### Admin Bootstrap
Set `ADMIN_DISCORD_ID` in `.env` to auto-promote that Discord user to admin on first login.

## Architecture

### Frontend (`public/index.html`)
- **Auth boot**: `authBoot()` runs first, calls `/auth/status`. If 401 → redirect to login. If pending → show pending screen. If approved → show app via `initApp()`.
- **State variables**: `currentUser`, `callers[]`, `enemies[]`, `activeRallies[]`, `selectedEnemyId`, `locked`, `lockedArrivalMs`, etc.
- **Persistence**: All state saved to localStorage (`rally_callers`, `rally_enemies`, `garrison_enemies`, `garrison_your_march`, `rally_settings`, `rally_presets`, `app_lang`).
- **Live updates**: Three `setInterval` loops at 100ms (clock) and 250ms (schedule + active rallies).
- **Tab switching**: Uses `data-tab` attributes on tab buttons (not text content), so it works across all languages.
- **Click-to-order**: Callers are selected by clicking; each gets a numbered badge for arrival order.
- **Validation feedback**: `flashElement()` shows a red outline flash when Track is clicked without selecting an enemy or entering a countdown.
- **Admin tab**: Dynamically added by `renderAdminTab()` only for R5/Admin users.

### Server (`server.js`)
- Discord OAuth2 routes: `/auth/discord`, `/auth/discord/callback`, `/auth/status`, `/auth/logout`
- User management API: `GET /api/users`, `PUT /api/users/:id/role` (R5/Admin only)
- Auth middleware gates all static files — unauthenticated requests redirect to `/login`
- Session management via `express-session` + `better-sqlite3-session-store`
- Reads `PORT` from environment variable (default 8080) for Cloud Run compatibility.

### Database (`db.js`)
- SQLite via `better-sqlite3` (synchronous, fast)
- `users` table: `discord_id` (PK), `username`, `global_name`, `avatar`, `email`, `role`, `created_at`, `last_login`
- Functions: `upsertUser()`, `getUser()`, `getAllUsers()`, `setUserRole()`, `bootstrapAdmin()`
- DB file at `data/rally.db` (configurable via `DB_PATH` env var)

### Environment Variables
- `DISCORD_CLIENT_ID` — from Discord Developer Portal
- `DISCORD_CLIENT_SECRET` — from Discord Developer Portal
- `DISCORD_REDIRECT_URI` — callback URL (e.g. `http://localhost:8080/auth/discord/callback`)
- `SESSION_SECRET` — random string for signing session cookies
- `ADMIN_DISCORD_ID` — (optional) Discord user ID to auto-promote as first admin
- `DB_PATH` — (optional) path to SQLite file, defaults to `./data/rally.db`

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

```bash
npm install
cp .env.example .env  # Fill in Discord credentials
node server.js
```

Then open `http://localhost:8080`. Launch config is in `.claude/launch.json`.

## Docker

```bash
docker build -t rally-spamulator .
docker run --rm -p 8080:8080 \
  -e DISCORD_CLIENT_ID=... \
  -e DISCORD_CLIENT_SECRET=... \
  -e SESSION_SECRET=... \
  rally-spamulator
```

## Cloud Run Deployment

```bash
gcloud run deploy rally-spamulator \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --port 8080 \
  --memory 256Mi \
  --min-instances 0 \
  --max-instances 3 \
  --set-env-vars DISCORD_CLIENT_ID=...,DISCORD_CLIENT_SECRET=...,DISCORD_REDIRECT_URI=https://hunterisadonkey.com/auth/discord/callback,SESSION_SECRET=...
```

Note: SQLite requires persistent storage. For Cloud Run, use a GCS FUSE volume mount for the `/data` directory.

## Key Patterns to Preserve

- **Single frontend file**: Do not split `public/index.html` into multiple files. All CSS, HTML, and JS stay in one file.
- **No frameworks**: Vanilla JS only on the frontend.
- **All times are UTC**: The clock shows UTC, all calculations use `Date.now()` (UTC epoch ms).
- **Buffer rounding**: First departure is always rounded up to the next buffer interval — this is intentional so callers have clean departure times.
- **i18n keys**: When adding new UI text, add a key to every language in the `LANG` object, add `data-i18n` to the HTML element, and use `t('key')` in any JS that renders that text dynamically.
- **RTL**: If adding new styled elements with directional borders/margins/padding, add corresponding `[dir="rtl"]` CSS overrides.
- **Server routes**: API routes in `server.js` must be added **before** the auth gate middleware and wildcard catch-all.
- **Auth middleware**: The auth gate in server.js protects all static files. Public paths (`/login`, `/login.html`, `/auth/*`) are whitelisted.
- **Role checks**: Use `requireRole('r5', 'admin')` middleware for admin-only API routes.
