# Viscount's Alliance Hub

An alliance management shell for **Whiteout Survival**, built around Viscount's Rally Spamulator. Players log in with Discord, land in a unified web app, and then open different **modules** (sub‑apps) for combat tools, documentation, and player information.

Current modules:

- **Combat Tools (Rally Spam + Garrison Defense)** — the original Rally Spamulator experience for synchronised rallies and defensive timing.
- **Alliance Docs & Notices** — lightweight wiki / bulletin board for rules, war plans, trap schedules, and announcements, with audience controls (All / R4+ / R5+ / Admin).
- **Player Profiles** — richer player profiles tied to Discord, including WOS name, march time, city level, timezone, main troop type, and notes.

The backend is a small Node/Express app with SQLite, and the entire frontend lives in a single, framework‑free `public/index.html`.

## Combat Tools (Rally Spam + Garrison)

### Rally Spam
Coordinate multiple rally callers so all rallies land on the same target at the same time.

- Add callers with name and march time (or one‑click from registered alliance members)
- Click callers in your desired arrival order
- Automatically calculates staggered departure times so everyone arrives together
- Live UTC countdown to each caller's set-off time
- Copy the full schedule to clipboard for pasting into alliance chat
- Save and load caller presets
- 5-minute or 10-minute rally duration
- Lock button to freeze the arrival time
- R4/R5/Admin can broadcast rally schedules to all online members via SSE, with per‑caller “YOU” highlights

### Garrison Defense
Track incoming enemy rallies and know exactly when to send reinforcements.

- Maintain a roster of known enemies (name, alliance, march time)
- Quick-select an enemy and enter the in-game rally countdown
- Calculates the actual hit time (rally countdown + enemy march)
- Shows when to send your reinforcements based on your march time
- Live countdown with SEND NOW and LANDED alerts
- Auto-clears rallies after landing

## Alliance Docs & Notices

The **Docs** module acts as a simple alliance knowledge base.

- Create documents with:
  - **Title**
  - Optional **category** (Rules, War, Events, Traps, etc.)
  - Markdown-style free‑text body (stored as plain text, rendered as pre‑wrapped text)
  - **Audience**: All members, R4+, R5+/Admin, or Admin only
  - Optional **pinned** flag to keep critical docs at the top
- Documents are filtered per user based on their role.
- R4/R5/Admin can create and edit docs; only R5/Admin can delete them.

## Player Profiles

Player information is attached to Discord accounts and can be viewed/edited in the **Profiles** module.

Fields:

- WOS name
- March time (seconds)
- City level
- Timezone (e.g. `UTC+2`)
- Main troop type (e.g. Cav / Inf / Ranged)
- Free‑form notes (gear, strengths, alt accounts, etc.)

Members can edit their own profile; R5/Admin can adjust others via the existing Users tab and server‑side APIs.

## Languages

Fully translated into 6 languages:

| Language | Code |
|----------|------|
| English | `en` |
| Turkish | `tr` |
| Polish | `pl` |
| Chinese | `zh` |
| Korean | `ko` |
| Arabic | `ar` |

Arabic includes full RTL (right-to-left) layout support.

## Usage

See `USAGE.md` for end‑user, step‑by‑step instructions. At a high level:

- Run the Node server (`node server.js`) with the required Discord OAuth env vars.
- Users log in with Discord and, once approved, see the alliance hub with module navigation.
- State is split between:
  - **Server**: users, profiles, rallies, docs.
  - **Client**: caller/enemy presets and display preferences in `localStorage`.

## How It Works

All times are in **UTC**. The tool shows a live UTC clock so everyone in your alliance is on the same page regardless of timezone.

**Rally Spam math:**
- First departure is rounded up to the next buffer interval (default 5 min) for clean times
- Arrival = first departure + rally duration + longest march time
- Each caller's set-off = arrival - rally duration - their march time

**Garrison Defense math:**
- Hit time = now + rally countdown remaining + enemy march time
- Send time = hit time - your march time

## License

Free to use. Built for the Whiteout Survival community.
