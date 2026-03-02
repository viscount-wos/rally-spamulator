# Viscount's Rally Spamulator

A web tool for the game **Whiteout Survival**. The frontend (CSS, HTML, JS) lives in `public/index.html` (~2200 lines). Served by an Express server (`server.js`) with Discord OAuth2 authentication, role-based access control, and Server-Sent Events for real-time rally broadcasting. Deployed to Google Cloud Run via Docker.

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
  db.js                   # SQLite database layer (users, roles, rallies)
  server.js               # Express server with auth + API routes + SSE (~280 lines)
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
- **WOS Profile**: Each user can register their in-game name and march time (saved server-side, linked to Discord account).
- **Alliance Members**: Registered users appear as quick-add buttons in Caller Setup so coordinators can add them as callers with one click.
- Math: `firstDeparture = ceil((now + bufferMs) / bufferMs) * bufferMs` (rounds up to next buffer interval).
- `arrival = firstDeparture + rallyDuration + longestMarch`
- Each caller's set-off: `setOff = arrival - rallyDuration - marchTime`
- Displays a live departure schedule with countdowns, copy-to-clipboard.
- **Broadcast Rally**: R4/R5/Admin can broadcast the rally schedule to all connected users via SSE. Each user sees the schedule with their own departure time highlighted ("YOU" badge).
- **Live Broadcasts section**: Shows active broadcasted rallies at the top of the Rally tab with live countdowns.
- **Notification dot**: Red dot on Rally tab button when a new broadcast arrives while on another tab.
- Supports caller presets saved to localStorage.
- Rally duration toggle: 5 min or 10 min.
- Buffer/rounding on first departure (default 30s).
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
6. Redirected to `/` → frontend calls `/auth/status` to get user info + role + WOS profile

### Roles
- **Pending** (role=null) — new users, can see "Waiting for Approval" screen only
- **R1/2/3** (role='r123') — Members, can use Rally Spam + Garrison Defense
- **R4** (role='r4') — Captains, can broadcast rallies + all member features
- **R5** (role='r5') — Alliance Leader, full access + user management + broadcast
- **Admin** (role='admin') — Full access to everything

### Admin Bootstrap
Set `ADMIN_DISCORD_ID` in `.env` to auto-promote that Discord user to admin on first login.

## Architecture

### Frontend (`public/index.html`)
- **Auth boot**: `authBoot()` runs first, calls `/auth/status`. If 401 → redirect to login. If pending → show pending screen. If approved → show app via `initApp()`.
- **State variables**: `currentUser`, `callers[]`, `enemies[]`, `activeRallies[]`, `registeredCallers[]`, `activeBroadcasts[]`, `sseSource`, `hasNewBroadcast`, `selectedEnemyId`, `locked`, `lockedArrivalMs`, etc.
- **Caller objects**: `{ id, name, marchSeconds, selected, arrivalOrder, wosDiscordId }` — `wosDiscordId` links to a Discord user account (null for manual callers).
- **Persistence**: All state saved to localStorage (`rally_callers`, `rally_enemies`, `garrison_enemies`, `garrison_your_march`, `rally_settings`, `rally_presets`, `app_lang`).
- **Live updates**: Three `setInterval` loops at 100ms (clock) and 250ms (schedule/broadcasts + active rallies).
- **Tab switching**: Uses `data-tab` attributes on tab buttons (not text content), so it works across all languages. Clears notification dot when switching to rally tab.
- **Click-to-order**: Callers are selected by clicking; each gets a numbered badge for arrival order.
- **SSE connection**: `connectSSE()` opens an EventSource to `/api/events` for real-time rally broadcast notifications. Auto-reconnects on drop.
- **Broadcast rendering**: `renderBroadcasts()` runs every 250ms to update live countdowns. Highlights the current user's row with "YOU" badge.
- **Admin tab**: Dynamically added by `renderAdminTab()` only for R5/Admin users.

### Server (`server.js`)
- Discord OAuth2 routes: `/auth/discord`, `/auth/discord/callback`, `/auth/status`, `/auth/logout`
- WOS Profile API: `GET /api/profile`, `PUT /api/profile`
- Registered Callers API: `GET /api/callers`
- Rally Broadcasting API: `POST /api/rallies` (R4/R5/Admin), `GET /api/rallies`, `DELETE /api/rallies/:id`
- SSE endpoint: `GET /api/events` — streams rally_created/rally_cancelled events to all connected clients
- User management API: `GET /api/users`, `PUT /api/users/:id/role` (R5/Admin only)
- Auth middleware gates all static files — unauthenticated requests redirect to `/login`
- Session management via `express-session` + `better-sqlite3-session-store`
- `broadcastSSE(data)` sends JSON messages to all connected SSE clients via `sseClients` Map.
- Reads `PORT` from environment variable (default 8080) for Cloud Run compatibility.

### Database (`db.js`)
- SQLite via `better-sqlite3` (synchronous, fast)
- **`users` table**: `discord_id` (PK), `username`, `global_name`, `avatar`, `email`, `role`, `wos_name`, `march_seconds`, `created_at`, `last_login`
- **`rallies` table**: `id` (PK), `creator_id`, `arrival_ms`, `rally_duration_seconds`, `status`, `created_at`
- **`rally_callers` table**: `id` (PK), `rally_id`, `discord_id` (nullable), `caller_name`, `march_seconds`, `arrival_order`
- User functions: `upsertUser()`, `getUser()`, `getAllUsers()`, `setUserRole()`, `bootstrapAdmin()`
- Profile functions: `setWosProfile()`, `getRegisteredCallers()`
- Rally functions: `createRally()`, `getActiveRallies()`, `getRallyWithCallers()`, `getRallyCallers()`, `cancelRally()`, `cleanupExpiredRallies()`
- DB file at `data/rally.db` (configurable via `DB_PATH` env var)
- Safe migrations for adding WOS columns via ALTER TABLE with try/catch

### SSE (Server-Sent Events)
- **Why SSE**: Unidirectional server→client push is all that's needed. No extra dependencies (works natively with Express + EventSource API). Auto-reconnects.
- **Connection**: `GET /api/events` with 30s heartbeat to keep alive.
- **Events**: `rally_created` (includes full rally object), `rally_cancelled` (includes rally_id).
- **Cloud Run**: SSE connections may drop after ~300s timeout. EventSource auto-reconnects and the client refetches active rallies on reconnection.
- **Client tracking**: `sseClients` Map keyed by userId. Cleaned up on disconnect.

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
- CSS `[dir="rtl"]` selectors flip: border-left to border-right on schedule items, rally trackers, and broadcast highlight items; margin-left/right and padding-left/right on countdown and info elements; notification dot position.

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
- **Role checks**: Use `requireRole('r5', 'admin')` middleware for admin-only API routes. R4/R5/Admin for broadcast routes.
- **Caller objects**: Include `wosDiscordId` field when linked to a registered user (null for manual callers). This field is persisted in localStorage and presets.
- **Broadcast snapshots**: Broadcasted rallies store a snapshot of caller names and march times at broadcast time. Profile changes do not retroactively modify existing broadcasts.
- **SSE resilience**: EventSource auto-reconnects. On reconnection, the client fetches full state via `GET /api/rallies`. Expired rallies are cleaned up server-side (>10min past arrival) and client-side (>60s past arrival).
