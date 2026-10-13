# Rally Spamulator: handoff (2026-10-12)

The owner is Viscount (Whiteout Survival, alliance LOV, state #2807). This is his rally-timing tool for SVS
castle fights. It's live at https://rally.hunterisadonkey.com (Cloud Run service `rally-spamulator`, GCP project
viscount-wos-tools, us-central1, behind one shared password). The tool is private: shared only with trusted
people via the password. No public links, and it is noindexed.

## State: everything is shipped, nothing is in progress
- Latest: Advanced > Post to Discord (webhook channels kept in the browser, `rally_discord_*`; server relay
  `POST /api/discord`). Deliberately NOT in the guide, USAGE, README or change log (the owner wants it low-key).
  Tests: `npm test` 80/80, smoke 783/783, `e2e/discord_flow.py` (run against a gate-off server).
- `main` = `guide` = 716c286 is LIVE (Cloud Run revision `rally-spamulator-00011-n9z`), pushed to GitHub
  (viscount-wos/rally-spamulator, PUBLIC repo; git author viscount <viscount-wos@users.noreply.github.com>).
- Tests on 716c286: `npm test` 72/72; Playwright smoke 783/783; `e2e/help_shots.py` all passed.
- Live checks done after deploy: /health ok; /, /help, /changelog redirect to /login for browsers; /core.js,
  /help-content.js, /changelog-content.js return 401 without the cookie. I did not log in on the live site.
- The local test copy (LAN) runs the same code: http://hannah.localdomain:8096 (container `rally-strip`).
- CLAUDE.md was rewritten (2026-10-13) to match the current app; the old Discord-app version is gone.
  README.md and USAGE.md are current too.

## What the tool is now
- One Rally screen: **Attack** and **Counter** panels side by side on desktop (stacked under 900px). Counter is
  ONE other alliance (editable tag), one wave fired ASAP, own callers/lock/reset/auto-reset/Copy; its copy text
  starts "COUNTER - land HH:MM:SS". Attack has waves (1-6), Randomise, Land at (one time per wave).
- A **Counter** tick box in the header hides the Counter panel so Attack runs full width (`rally_show_counter`,
  display only; Counter keeps its state).
- Live schedule until Copy freezes it; Reset; auto-reset (default 5 min); stale-copy guard; NEXT line per panel.
- Rally durations 1/2/3/5/10 min. Garrison Defense tab. 3 themes (Dark, Reading, Low Glare). 9 languages:
  en es fr de pl ko zh tr ar (Arabic RTL).
- **Guide** (`/help`): a **?** button in the header opens it. Quick start, timing, waves, battle view, reset,
  Garrison, a strategy guide (tool-based tactics only, no game rules) and tips, in all 9 languages.
  Text: `public/help-content.js`; page: `help.html`, `help.js`, `help.css`. Button names in the text are written
  `{key}` and replaced at runtime by the app's own label from `i18n.js`, so they always match the UI.
- **What's new** (`/changelog`): linked from the Guide footer. Text in `public/changelog-content.js` (9
  languages); English copy in `CHANGELOG.md`. To add a release, edit BOTH and every language;
  `test/changelog.test.js` fails if the languages or `CHANGELOG.md` disagree.
- Server: password gate (cookie `rally_gate`, HMAC of the password), CSP with no inline script/style,
  `X-Robots-Tag: noindex,nofollow` everywhere, open `/robots.txt` (Disallow: /), `/health`. `/help` and
  `/changelog` are routes in `server.js`, behind the gate like everything else.

## Things worth knowing before you change anything
- **Do not change behaviour, copy text, maths or storage keys without asking**: the tests guard them.
  Storage keys include `rally_callers`, `rally_counter_*`, `rally_show_counter`, `rally_ui_open`,
  `app_lang`, `preferred_theme`.
- **New UI text goes in all 9 languages** (`public/i18n.js`; a test fails on a missing key). Guide and
  change-log text go in their own content files, all 9 languages.
- **Header is brand, clock, tabs, ? and Menu.** Counter tick, Auto-reset, Sound cues, language, theme, keys and
  Log out are in the Menu popover (`#menu-panel`), so the header fits on one row at any width/language (still
  checked by `e2e/help_shots.py`). Don't put controls back in the header. In e2e, open the menu first
  (`menu(page)`, `hsel(...)` in smoke.py). `ONLY=run` runs just the two basic smoke runs.
- The battle view is fitted to one screen from 1100x700 (panels fill the height, only their insides scroll).
  Check it with `e2e/battle_shots.py <url>` (prints scroll/client heights; clipped = scrollHeight > clientHeight)
  and look at `e2e/out/battle-*.png` yourself.
- The message line under the head (`.ph-msg`) has a FIXED height so the "passed" warning and the NEXT line never
  move the schedule (a smoke check guards this).

## Open items (none blocking)
- **Native-speaker review** of the guide and change-log translations (especially ko, tr, ar). They were written
  by Claude and proof-read by one agent per language against the UI wording. Quirk: a few UI labels end with a
  colon or "+" (the guide strips these), and the tr/pl/ko text avoids suffixes/particles after a button name.
- The strategy guide is deliberately tool-based. If the owner supplies his own tactics, add them to the
  `strategy` section of every language in `help-content.js`.
- Phone is low priority (no horizontal scroll at 390px is tested, not polished).

## Tests and screenshots
```
npm test
# Playwright (venv from the owner's event app; it logs in with the dummy password 'test-gate-pw'):
PY=/home/bevans/ai/fun/wos/wos-events-wt/frontend-wiring/e2e/.venv/bin/python
INSECURE_URL=http://hannah.localdomain:8096 $PY e2e/smoke.py http://localhost:8096   # full smoke; ONLY=new = new checks only
$PY e2e/battle_shots.py http://localhost:8096   # battle view, no-counter, passed, edit, ar, themes -> e2e/out/battle-*.png
$PY e2e/help_shots.py   http://localhost:8096   # guide + what's new in 9 languages at 1440 and 390 -> e2e/out/help-*.png, changelog-*.png
```

## Local test copy (LAN)
docker build -t rally-strip . && docker rm -f rally-strip && docker run -d --name rally-strip --restart unless-stopped -e GATE_PASSWORD=test-gate-pw -p 0.0.0.0:8096:8080 rally-strip

## Deploy (ONLY when the owner says "ship it")
git checkout main && git merge --ff-only <branch> && git push origin main <branch>
SHA=$(git rev-parse --short HEAD); D=$TMPDIR/rally-build-$SHA; rm -rf $D; mkdir -p $D; git archive HEAD | tar -x -C $D
cd $D && ~/.local/bin/gcloud builds submit --tag us-central1-docker.pkg.dev/viscount-wos-tools/cloud-run-source-deploy/rally-spamulator:$SHA .
~/.local/bin/gcloud run deploy rally-spamulator --image us-central1-docker.pkg.dev/viscount-wos-tools/cloud-run-source-deploy/rally-spamulator:$SHA --region us-central1
Then check: /health returns ok; a browser request to / (Accept: text/html) is a 302 to /login (a bare curl gets 401,
that is normal); /core.js returns 401 without the cookie.
The service reads GATE_PASSWORD from the Secret Manager secret rally-gate-password. Never print, type or commit
the real password; local and test copies only ever use 'test-gate-pw'.

## Owner preferences
- Works with either Claude Code or Codex. In Claude Code: use Sonnet 5.5 (`claude-sonnet-5-5`) and look at
  screenshots directly with the Read tool. Don't spawn `claude -p` reviewers (~25k tokens of overhead each).
  Parallel Agent subagents are fine when he asks (he asked for them for translations: one agent per language,
  each writing a fixes/translation JSON to the scratchpad that you apply with a script, so there are no
  concurrent edits to one file).
- Short, plain answers. Discuss ideas before building big things. Keep all languages working.
- He says "ship it" to mean merge, push and deploy. Don't do any of those before he says it, and ask what
  "publish" means if it's unclear (the GitHub repo is public).
- Two people using the tool at once is fine: there is no server state and everything is per-browser.
- He watches token use closely, so keep review loops short.
