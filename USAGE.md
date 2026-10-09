# Viscount's Rally Spamulator: usage guide

Open the link your alliance shares. There is no login: everything you enter stays in your own browser on that phone or computer. All times are **UTC (game time)**, and the big clock at the top shows the current UTC time.

Choose your language from the menu at the top right (English, Türkçe, Polski, 中文, 한국어, العربية).

---

## 1. Rally Spam: make several rallies land together

### Set up your callers (once)
1. In **Caller Setup**, press **+ Add Caller**. Type the player's name and their march time to the target as `M:SS` (e.g. `1:45`) or in seconds (`105`).
2. Repeat for each caller, then press **Done**.

Faster: open **Import / export list**, paste one caller per line and press **Replace list** (or **Add to list**):

```
Alpha, 1:45
Bravo, 0:55
Charlie, 0:30
```

Lines the tool can't read stay in the box so you can fix them.

To share your list with another leader, press **Export list**. It is copied in the same format; they paste it into their own Import box.

**Edit list** lets you rename, change march times, move callers up or down, or remove them. **Clear list** empties the list (it asks first).

### Run a rally
1. Tap callers to tick (✓) the ones in this rally. **All** / **None** tick or untick everyone.
2. Pick the **Rally duration** (5 or 10 minutes, as in game).
3. The **Set-Off Schedule** lists each caller's start time ("Call at") with a countdown. The longest march starts first.
   - **LIVE** (green, the default): the first caller starts one **Reaction time** from now, and every time counts up with the clock, second by second, so the plan is always fresh. The chat text under the button moves with it.
4. Press **Copy Schedule** and paste into game chat. Copying **locks** the times at that instant: the box shows **LOCKED**, the times stop moving and are exactly what you copied, and each caller's countdown keeps counting down to their start. Pressing Copy Schedule again copies the same text (it does not pick new times). The text looks like this:

```
Start times UTC - land 00:05:00
23:58:15 - Alpha (march 1:45)
23:59:05 - Bravo (march 0:55)
23:59:30 - Charlie (march 0:30)
```

5. Press **Reset** (next to LOCKED) to go back to LIVE and get new times. When the first start time has passed you'll see *First start time has passed: reset for new times* and Reset turns red.

Other ways to lock:
- **LOCK** (in Rally Settings) locks the current times without copying. While locked that button also reads **Reset**.
- **Land at (UTC)**: type a landing time, e.g. `21:05` or `21:05:30`, to plan for a fixed moment. A time just after midnight works as you'd expect: `00:05` typed at 23:50 means 15 minutes from now. **Reset** clears it and goes back to LIVE.

Changing things while locked:
- Ticking callers in or out, editing march times or changing the rally duration keeps the **first start time** where it was and works the other times out from it (the arrival time moves if the longest march or the duration changes). Copy again afterwards so chat has the new times.
- Changing the **Reaction time** goes back to LIVE, because the reaction time only decides where a live plan starts.
- With a typed *Land at* time the landing time stays fixed instead.

Orange means a caller is about to start; red means their start time has passed.

The same text is shown under the button. If your browser blocks copying, long-press that text to copy it by hand.

---

## 2. Garrison Defense: when to send reinforcements

1. **Your March Time**: your march to the building you are defending.
2. **Enemy Roster**: press **+ Add Enemy** and enter the name, alliance tag and march time of enemies who rally you.
3. When an enemy rally starts, tap that enemy under **Select Enemy**, type the rally countdown shown in game (e.g. `3:00`) and press **Track** (or Enter).
4. Under **Incoming Rallies** you see:
   - **SEND in M:SS**, counting down to **SEND NOW!**;
   - **Send at**: the UTC time to send;
   - **Rally hits**: the UTC time the rally lands.

   Tracked rallies clear themselves a minute after they land, or press ✕.

The maths: hit time = now + rally countdown + enemy march; send time = hit time − your march.

---

## 3. Good to know

- Your callers, enemies, settings and language are saved in this browser only. A different phone or browser starts empty: use **Export list** / **Import** to move a caller list.
- Clearing your browser data clears the lists.
