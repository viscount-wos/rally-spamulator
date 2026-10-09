# Viscount's Rally Spamulator: usage guide

Open the link your alliance shares and type the alliance password once; the phone remembers it for 30 days (*Log out* at the bottom forgets it). There are no accounts: everything you enter stays in your own browser on that phone or computer. All times are **UTC (game time)**, and the big clock at the top shows the current UTC time.

Choose your language from the menu at the top right (English, Türkçe, Polski, 中文, 한국어, العربية).

---

## 1. Rally Spam: make several rallies land together

### Set up your callers (once)
1. In **Caller Setup**, press **Add/Edit**. It adds a new caller row and opens the list for editing. Type the player's name and their march time to the target as `M:SS` (e.g. `1:45`) or in seconds (`105`).
2. Repeat for each caller, then press **Done**.

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

### Waves: rallies that land one after another
Sometimes you want groups of rallies to land a few seconds apart instead of all together. Each group is a **wave**.

1. In **Rally Settings**, press **+ Add wave** (up to 6 waves; **−** removes the last wave and sends its callers back to off).
2. **Delay between waves** is the default gap (10 s to start). Each pair of waves gets its own row (*Wave 1 → 2*, *Wave 2 → 3*, ...) prefilled with that default. Type a different number in a row to change just that gap: it turns orange and says **custom**; **↺** puts it back to the default.
3. In **Caller Setup**, tap a caller to move them along: off → 1 → 2 → ... → off. The coloured badge shows their wave number (a caller is only ever in one wave). In **Edit list** there is also a wave menu on each row.
4. The **Set-Off Schedule** shows one section per wave (*Wave 2 - lands 12:05:10*), each with its callers in start order. The big time is when wave 1 lands; the other waves' landing times are listed under it. A wave with nobody in it says so.

The timing:
- Wave 2 lands one delay after wave 1, wave 3 one more delay later, and so on.
- LIVE: whoever has to start earliest, in **any** wave, starts one Reaction time from now (a later wave with long marches can be the first to go). Everything else is worked out from that.
- Copy Schedule / LOCK / Reset and the "first start has passed" warning work the same as with one wave, using the earliest start of any wave. Edits while locked (moving callers between waves, changing a delay) keep that earliest start where it is.

**Land at (UTC)** takes one time per wave, separated by commas or spaces, e.g. `12:05:00, 12:05:10, 12:05:30` (or `12:05 12:06`):
- one time: wave 1 lands then and the other waves follow the delays;
- several times: each wave lands at its own time (the delay rows show the gap those times give you instead);
- fewer times than waves: the remaining waves follow the delays from the last time you typed;
- more times than waves: you get an error;
- a time smaller than the one before it means after midnight UTC (`23:59:50, 00:00:05`).

With two or more waves the copied text is grouped by wave (waves with nobody in them are left out):

```
Start times UTC
Wave 1 - land 12:05:00
11:58:55 - Bravo (march 1:05)
11:59:26 - rima (march 0:34)
Wave 2 - land 12:05:10
11:58:25 - Alpha (march 1:45)
Wave 3 - land 12:05:30
11:59:35 - Delta (march 0:55)
12:00:00 - Charlie (march 0:30)
```

With one wave nothing changes: the text is the same as above.

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

- Your callers, enemies, settings and language are saved in this browser only. A different phone or browser starts empty.
- Clearing your browser data clears the lists (and you'll need the password again).
- If the password changes, everyone is asked for the new one.
