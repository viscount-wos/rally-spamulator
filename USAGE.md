## Viscount's Alliance Hub — Usage Guide

This guide explains how alliance members use **Viscount's Alliance Hub** (built around Viscount's Rally Spamulator) for Whiteout Survival. It assumes the app is already deployed and reachable at a URL your alliance shares.

---

## 1. Logging in and roles

- **Open the app** in your browser using your alliance’s link.
- If you are not logged in, you will be redirected to the **Discord login page**.
- Click **“Login with Discord”** and authorize the app.
- The app links your Discord account to an in‑game profile and assigns you a **role**:
  - **Pending**: waiting for approval (you will see a waiting screen).
  - **R1/2/3 (Members)**: can fully use **Rally Spam** and **Garrison Defense**.
  - **R4 (Captains)**: can use everything members can, plus **broadcast rallies** to everyone.
  - **R5 (Leader)** and **Admin**: full access, including the **Users** tab to manage roles.

If you are stuck on the pending screen, ask an R5/Admin in your alliance to approve your role.

---

## 2. Setting up your WOS profile and player info

Your personal WOS profile and player info are used everywhere the hub needs your march time or basic player context.

1. After logging in, open the **profile section** at the top of the Combat / Rally tab, or switch to the **Profiles** module.
2. Enter:
   - **In‑game name** (WOS name).
   - **Your usual march time** in seconds (for a standard rally march).
   - Optionally: **City level**, **timezone** (e.g. `UTC+2`), **main troop type**, and a short **notes** field about your role/strengths.
3. Click **Save**.

Once saved:

- You appear in the **Alliance Members / Registered Callers** list so coordinators can add you with one click.
- Your profile is stored on the server and can be updated anytime from either the Rally profile bar or the Profiles module.

---

## 3. Combat module — Rally Spam tab (حشد الهجوم)

The Rally Spam tab helps coordinate multiple callers so all rallies **land at the same time**.

### 3.1 Key concepts

- **Caller**: A player starting a rally, with a known march time.
- **Arrival order**: The sequence in which rallies should **land** on the target.
- **Rally duration**: 5 or 10 minutes (in‑game rally timer).
- **Buffer / rounding**: The first caller’s departure is rounded up to the next time slice (buffer) so all departure times are clean and easy to read.

The app calculates:

- `arrival = firstDeparture + rallyDuration + longestMarch`
- For each caller: `setOff = arrival - rallyDuration - callerMarch`

### 3.2 Building the caller list

You can add callers in two main ways:

- **From alliance members (recommended)**:
  - Use the **Alliance Members / Registered Callers** area on the Rally tab.
  - Click a member’s button to add them as a caller; their **name + march time** are filled automatically.
  - They stay linked to their Discord ID, so broadcasts can highlight **“YOU”** for that player.
- **Manual callers**:
  - Use the **Caller Setup** area.
  - For each row, fill in:
    - **Name**: player’s in‑game name.
    - **March (s)**: their march time in seconds.
  - Add or remove rows as needed.

You can also:

- **Save presets** of callers for commonly used teams.
- **Load presets** to reuse the same group quickly.

### 3.3 Choosing arrival order

1. With all callers added, click each caller **in the order you want their rallies to land**.
2. Each click gives that caller an **arrival badge** (1, 2, 3, …).
3. To change the order, click again to re‑select; the list will re‑number.

The **arrival order** is what the tool uses to stagger departure times.

### 3.4 Configuring rally duration and buffer

In the Rally settings area:

- Choose **Rally duration**: **5 minutes** or **10 minutes**, matching your in‑game rally.
- Adjust the **buffer / rounding interval** (e.g., 30 seconds) if your alliance wants different spacing.
- Optionally use the **Lock** button:
  - **Unlocked**: arrival time moves as real time advances.
  - **Locked**: arrival time is frozen; the app adjusts departure times so rallies still land at that exact moment.

### 3.5 Reading the schedule

The schedule section shows:

- **Arrival time (UTC)** at the top.
- One **schedule row per caller**, including:
  - Caller name and march time.
  - **Departure time (UTC)**.
  - **Countdown** until they must start.
  - Visual cues:
    - Green = normal.
    - Orange = imminent.
    - Red / faded = departure time has passed.

You can also:

- Use **Copy schedule** to copy a nicely formatted version for alliance chat.
- Scroll as needed; the **UTC clock** stays visible at the top.

### 3.6 Broadcasting a rally (R4/R5/Admin only)

If your role is **R4, R5, or Admin**, you can **broadcast** the rally to all online users:

1. Configure callers, arrival order, and rally duration as above.
2. Click the **Broadcast** button.
3. The current rally snapshot (callers, march times, arrival time) is saved to the server and pushed via **SSE** to all connected users.

On everyone’s screen:

- A new **Live Broadcast** appears at the top of the Rally tab.
- For each user whose WOS profile matches a caller, their own row is highlighted with a **“YOU”** badge and personalized countdown.
- A small **notification dot** appears on the Rally tab if they are on another tab when the broadcast arrives.

You (or an authorized role) can also **cancel** a broadcasted rally; it disappears for everyone.

---

## 4. Combat module — Garrison Defense tab (دفاع الحامية)

The Garrison Defense tab tells you exactly when to send reinforcements to defend against incoming enemy rallies.

### 4.1 Enemy roster

Create a roster of known enemy players:

1. For each enemy, fill in:
  - **Enemy name**.
  - **Alliance tag** (optional, for clarity).
  - **March time** (how long their march usually takes in seconds).
2. Save each enemy entry.

This roster is saved in your browser and can be edited anytime.

### 4.2 Tracking an incoming rally

When an enemy starts a rally on your city or fortress:

1. In game, note the **rally countdown** (e.g., `4:30` remaining).
2. In the Garrison tab:
  - Select the enemy from your roster.
  - Enter the **rally countdown** in minutes and seconds.
  - Make sure **your march time** (to the target) is set correctly in the app.
3. Click **Track**.

The tool calculates:

- `hitTime = now + rallyCountdown + enemyMarch`
- `sendTime = hitTime - yourMarch`

### 4.3 Reading the defense tracker

Each tracked rally shows:

- **Enemy and alliance**.
- **Hit time (UTC)** — when their rally is expected to land.
- **Send timer**:
  - Counts down to when you must **SEND NOW**.
  - Shows **LANDED** after it hits.
- Status color and labels help you see which rally needs attention next.

Rallies automatically disappear **about 30 seconds** after landing to keep the list clean.

---

## 5. Profiles module

The **Profiles** module gives a richer view of player information.

### 5.1 Your profile

- Shows the same WOS name and march time as the Rally profile bar, plus:
  - **City level**
  - **Timezone**
  - **Main troop type**
  - **Notes**
- Saving here also updates the Rally profile bar and refreshes how you appear in alliance lists.

### 5.2 Alliance profiles

- A second panel lists **all alliance members** (subject to your role’s visibility rules).
- This view is primarily for R4/R5/Admin to understand march times, city levels, and roles when planning events.

---

## 6. Users tab (R5/Admin only)

The **Users** tab is only visible to **R5** and **Admin** roles.

From here you can:

- See all registered users with:
  - Discord avatar and name.
  - Current role.
  - WOS / profile info, if set.
- Change roles:
  - **Pending → Member (R1/2/3)** to approve new players.
  - Promote to **R4** or **R5** as needed.
  - Only **Admin** can assign or remove the **Admin** role.
- Edit someone’s profile fields (for fixing typos or helping new users).
- Delete users when they leave the alliance:
  - Their active rallies are cancelled.
  - Their entry disappears from lists.

You **cannot** change your own role, and non‑admins cannot edit Admins.

---

## 7. Docs module — Alliance Docs & Notices

The **Docs** module is a simple in‑game handbook / notice board.

### 7.1 Reading docs

- Everyone sees docs whose **audience** includes their role:
  - **All members**.
  - **R4+ only**.
  - **R5+ / Admin**.
  - **Admins only**.
- Pinned docs (e.g. key rules, mandatory war plans) appear at the very top.

### 7.2 Creating and editing docs (R4/R5/Admin)

If you are **R4, R5, or Admin**:

- You can create or edit docs with:
  - **Title**
  - Optional **category** (Rules, War, Events, Traps, etc.)
  - **Audience** (who should see it)
  - **Pinned** toggle
  - **Body text** for the actual content.
- Only **R5/Admin** can delete docs, to prevent accidental loss of important rules.

---

## 8. Languages and layout

- Use the **language selector** in the UI to choose:
  - English (`en`), Turkish (`tr`), Polish (`pl`), Chinese (`zh`), Korean (`ko`), or Arabic (`ar`).
- All labels, buttons, and dynamic text use the chosen language.
- For **Arabic**, the layout switches to **RTL** (right‑to‑left), including borders, padding, and alignment.
- Your language choice is remembered in your browser.

---

## 9. Tips and best practices

- **Always check UTC**: The in‑app clock is UTC so everyone can coordinate regardless of real‑world timezone.
- **Standardize march times**: Ask your alliance to use consistent “standard” march times for each player to keep schedules accurate.
- **Use presets** for common teams and targets to save time during hectic wars.
- **Keep WOS profiles updated** when players change gear, troops, or formations that significantly affect march time.
- **Encourage members to stay logged in** during big operations so they receive live rally broadcasts instantly.

