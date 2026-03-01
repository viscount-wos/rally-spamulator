# Viscount's Rally Spamulator

A browser-based coordination tool for **Whiteout Survival** — no install, no dependencies, just open `index.html`.

## Features

### Rally Spam
Coordinate multiple rally callers so all rallies land on the same target at the same time.

- Add callers with name and march time
- Click callers in your desired arrival order
- Automatically calculates staggered departure times so everyone arrives together
- Live UTC countdown to each caller's set-off time
- Copy the full schedule to clipboard for pasting into alliance chat
- Save and load caller presets
- 5-minute or 10-minute rally duration
- Lock button to freeze the arrival time

### Garrison Defense
Track incoming enemy rallies and know exactly when to send reinforcements.

- Maintain a roster of known enemies (name, alliance, march time)
- Quick-select an enemy and enter the in-game rally countdown
- Calculates the actual hit time (rally countdown + enemy march)
- Shows when to send your reinforcements based on your march time
- Live countdown with SEND NOW and LANDED alerts
- Auto-clears rallies after landing

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

Open `index.html` in any browser. That's it — everything runs client-side with no server required.

All your callers, enemies, presets, and settings are saved to your browser's localStorage.

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
