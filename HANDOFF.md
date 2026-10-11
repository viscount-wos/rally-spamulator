# Rally Spamulator: handoff (2026-10-11 ~16:00 BST)

The owner is Viscount (Whiteout Survival, alliance LOV, state #2807). This is his rally-timing tool for SVS
castle fights. It's live at https://rally.hunterisadonkey.com (Cloud Run service `rally-spamulator`, GCP project
viscount-wos-tools, us-central1, behind a shared password). The tool is private: shared only with trusted
people via the one password. No public links, and it is noindexed.

## Repo and branches
- /home/bevans/ai/fun/wos/rally-spamulator; GitHub viscount-wos/rally-spamulator (PUBLIC repo).
- Git author: viscount <viscount-wos@users.noreply.github.com>.
- IGNORE the repo's CLAUDE.md: it is stale (it describes the old Discord app) and a scanner flagged it.
- `main` = cd2f30f is LIVE: the no-login strip-back, live schedule until Copy freezes, Reset, waves
  (1-6, delays, tap to cycle, Randomise), the multi-time Land at box, auto-reset (default 5 min), the
  stale-copy guard, Garrison Defense, 6 languages and the password gate.
- `counter` = the work in progress, NOT merged or deployed. On top of main it adds:
  - Attack + Counter caller lists. Counter is ONE other alliance with an editable label ("Counter: BDE"),
    a single wave fired ASAP, with its own callers, freeze, auto-reset, duration, reaction and Land at.
    Attack keeps the old storage keys, so old saved data opens as Attack.
  - A separate red Copy button. The Counter copy text starts "COUNTER - land HH:MM:SS"; the Attack copy
    text is unchanged.
  - Rally durations 1/2/3/5/10 min, default 5.
  - 9 languages: en es fr de pl ko zh tr ar (Arabic RTL).
  - The look of the owner's event app (/home/bevans/ai/fun/wos/wos-events/frontend): tokens.css, and
    3 themes Dark/Reading/Low Glare.
  - X-Robots-Tag noindex,nofollow on every response, and an ungated /robots.txt with Disallow: /.
  - BATTLE VIEW (commits c06b2a0, 310e3bd, bb94930): Attack and Counter side by side on one desktop
    screen, replacing the Attack|Counter tabs. Details are in USAGE.md "Battle view".

## Status of the battle view (unfinished)
- The owner asked for: "I need to have the whole picture in front of me at once". Desktop first; phone is low
  priority (stacked under 900px, but no horizontal scroll at 390px).
- The quality target was 8.5/10 on this rubric:
  - at-a-glance clarity of both plans 25%
  - speed and safety of the right Copy 20%
  - hierarchy 15%
  - no wasted space or overflow at 1440x900 and 1920x1080 15%
  - polish and consistency with the event app 15%
  - accessibility 10%
- The last independent score was 7.6, and the self-score about 8.4. The work stopped because the owner ran out
  of tokens.
- Remaining issues from the last review:
  - The NEXT line should outrank the landing time. A round-7 tweak did this, but it hasn't been reviewed.
  - The Attack chat text clips slightly at 1440x900 with 3 waves and 12 callers.
  - There is dead space under Counter and in the Attack roster at 1920.
- The round-7 tweaks are built but unreviewed: a bigger NEXT line, a pulsing outlined red Reset once the
  first start has passed, the hint moved into a tooltip on the status pill, and the preview filling its column.
- README.md still describes the old tabs; USAGE.md is up to date.

## Tests
- `npm test` (node --test): 65/65 pass on the final code.
- Playwright smoke: NOT yet run in full on the final code. Run:
  `INSECURE_URL=http://hannah.localdomain:8096 /home/bevans/ai/fun/wos/wos-events-wt/frontend-wiring/e2e/.venv/bin/python e2e/smoke.py http://localhost:8096`
  It logs in with the dummy password 'test-gate-pw', and `ONLY=new` runs only the new checks. The battle
  checks are `battle_flow` and `battle_layout`. If anything fails, the likely suspects are the hint moved into a
  tooltip (a live_freeze check reads the hint text) and the layout-fit checks after the round-7 CSS.
- Screenshots: `e2e/battle_shots.py <url>` writes e2e/out/battle-*.png.
  Earlier review rounds: /home/bevans/.hermes/cache/scratch/rally-review/r1..r7.

## Local test copy (LAN)
docker build -t rally-strip . && docker rm -f rally-strip && docker run -d --name rally-strip --restart unless-stopped -e GATE_PASSWORD=test-gate-pw -p 0.0.0.0:8096:8080 rally-strip
It's at http://hannah.localdomain:8096 and is currently running the `counter` head.

## Deploy (ONLY when the owner says "ship it")
git checkout main && git merge --ff-only counter && git push origin main counter
SHA=$(git rev-parse --short HEAD); D=$TMPDIR/rally-build-$SHA; rm -rf $D; mkdir -p $D; git archive HEAD | tar -x -C $D
cd $D && ~/.local/bin/gcloud builds submit --tag us-central1-docker.pkg.dev/viscount-wos-tools/cloud-run-source-deploy/rally-spamulator:$SHA .
~/.local/bin/gcloud run deploy rally-spamulator --image us-central1-docker.pkg.dev/viscount-wos-tools/cloud-run-source-deploy/rally-spamulator:$SHA --region us-central1
Then check:
- https://rally.hunterisadonkey.com/health returns ok;
- / redirects to /login (302);
- /core.js returns 401 without the cookie.
The service reads GATE_PASSWORD from the Secret Manager secret rally-gate-password. Never print, type or
commit the real password; local and test copies only ever use 'test-gate-pw'.

## Owner preferences
- Short, plain answers. Discuss ideas before building big things. Keep all languages working. Add the new
  strings in all 9 languages.
- The behaviour, copy text, maths and storage keys are guarded by the tests; don't change them without asking.
- Two people using the tool at once is fine: there is no server state and everything is per-browser.
- He watches token use closely, so keep review loops short.
