"""Playwright smoke test for the stripped-back Rally Spamulator.

Runs on a desktop viewport and an iPhone 13 viewport (Chromium):
adds 3 callers, checks the computed start times (rally crossing midnight UTC),
copies and asserts the clipboard text, exercises reorder / clear /
persistence, Garrison Defense, and Arabic RTL. Then, in English and
Arabic, the LIVE -> Copy (freeze) -> Reset cycle with a controlled clock: times
count up while live, Copy freezes them (clipboard == shown times), countdowns
keep falling, the "first start passed" warning appears, Reset resumes live,
LOCK freezes without copying, edits while frozen keep the first start.
Waves (en + ar, desktop + iPhone): tap cycling, gap edits, grouped copy text,
freeze/Reset, several Land at times, Randomise + Undo, remove wave.
Battle view: Attack and Counter side by side, each Copy copies its own list,
freezing one leaves the other LIVE, per-list auto-reset, folded settings;
layout: no page scroll at 1440x900 / 1920x1080 with 12 + 5 callers, no
sideways scroll at 390px.
Everything sits behind the shared-password gate: each run logs in first, and
the login page itself is checked in English and Arabic on desktop and iPhone
(redirect with next, translated wrong-password error, RTL, log out).
Saves screenshots to e2e/out/.

Usage:  python e2e/smoke.py [base_url]     (default http://localhost:8096)
        GATE_PASSWORD=<the server's password> (default: the dummy 'test-gate-pw')
Needs:  pip install playwright && playwright install chromium
"""
import datetime as dt
import os
import random
import re
import sys

from playwright.sync_api import expect, sync_playwright

BASE = sys.argv[1] if len(sys.argv) > 1 else os.environ.get("BASE_URL", "http://localhost:8096")
GATE_PW = os.environ.get("GATE_PASSWORD", "test-gate-pw")  # dummy for local/test servers only
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "out")
NOW = dt.datetime(2026, 10, 9, 23, 50, 0, tzinfo=dt.timezone.utc)  # 10 min before midnight UTC

EXPECTED_EN = "\n".join([
    "Land 00:05:00",
    "23:58:15 - Alpha (march 1:45)",
    "23:59:05 - Bravo (march 0:55)",
    "23:59:30 - Charlie (march 0:30)",
])
EXPECTED_AR = "\n".join([
    "الوصول 00:05:00",
    "23:58:15 - Alpha (مسيرة 1:45)",
    "23:59:05 - Bravo (مسيرة 0:55)",
    "23:59:30 - Charlie (مسيرة 0:30)",
])

results = []


def check(name, cond, detail=""):
    results.append((name, bool(cond)))
    print(("PASS " if cond else "FAIL ") + name + (("  -- " + detail) if (detail and not cond) else ""))


UNSTICK = "document.querySelectorAll('.clock-bar, .clock').forEach(e => e.style.position = '%s')"


def shot(page, path):
    # Full-page screenshots draw the sticky clock bar mid-page; unstick it for the capture.
    page.evaluate(UNSTICK % "static")
    page.screenshot(path=path, full_page=True)
    page.evaluate(UNSTICK % "")


def gate_login(page, url=None):
    """Open the app; the gate redirects to /login, then sign in with the password."""
    base = url or BASE
    page.goto(base)
    expect(page).to_have_url(re.compile(re.escape(base) + r"/login\?next="))
    page.fill("#password", GATE_PW)
    page.click("#gate-submit")
    expect(page).to_have_url(base + "/")


def menu(page, on=True):
    """Open (or close) the header menu, where Counter, auto-reset, language, theme and Log out live now."""
    if page.is_visible("#menu-panel") != on:
        page.click("#menu-btn")

def hsel(page, sel_id, value):
    """select_option on a menu <select>, then close the menu again."""
    menu(page)
    page.select_option(sel_id, value)
    menu(page, False)

def no_hscroll(page):
    # clientWidth, not innerWidth: a mobile browser zooms out to fit overflowing content, which
    # widens innerWidth too and would hide the overflow
    return page.evaluate("document.documentElement.scrollWidth <= Math.min(window.innerWidth, document.documentElement.clientWidth) + 1")


def run(pw, label, ctx_args):
    browser = pw.chromium.launch()
    ctx = browser.new_context(**ctx_args, locale="en-GB")
    ctx.grant_permissions(["clipboard-read", "clipboard-write"], origin=BASE)
    page = ctx.new_page()
    errors = []
    page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.on("dialog", lambda d: d.accept())
    external = []
    page.on("request", lambda r: external.append(r.url) if not r.url.startswith(BASE) else None)
    page.clock.set_fixed_time(NOW)

    gate_login(page)
    page.evaluate("localStorage.clear()")
    page.reload()
    expect(page.locator("#utc-clock")).to_have_text("23:50:00")

    # --- add 3 callers with Add/Edit (edit mode opens automatically) ---
    expect(page.locator("#add-caller-btn")).to_have_text("Add/Edit")
    for name, march in [("Bravo", "0:55"), ("Alpha", "1:45"), ("Charlie", "30")]:
        page.click("#add-caller-btn")
        row = page.locator("#caller-list li").last
        row.locator(".name-input").fill(name)
        row.locator(".march-input").fill(march)
        row.locator(".march-input").press("Tab")
    page.click("#edit-btn")  # Done
    expect(page.locator(".caller-toggle[aria-checked=true]")).to_have_count(3)

    # --- auto arrival (original rule): 23:50:00 + 30s reaction -> first departure 23:50:30 ---
    expect(page.locator("#arrival-time")).to_have_text("23:57:15")
    expect(page.locator(".si-time").first).to_have_text("23:50:30")

    # --- fixed target that crosses midnight UTC ---
    page.fill("#target-input", "00:05")
    page.press("#target-input", "Enter")
    expect(page.locator("#arrival-time")).to_have_text("00:05:00")
    times = page.locator(".si-time").all_inner_texts()
    names = page.locator(".si-name").all_inner_texts()
    check(f"[{label}] start times", times == ["23:58:15", "23:59:05", "23:59:30"], str(times))
    check(f"[{label}] longest march first", names == ["Alpha", "Bravo", "Charlie"], str(names))
    check(f"[{label}] LOCK shows as active", "active" in (page.get_attribute("#lock-btn", "class") or ""))

    # --- copy ---
    copy_btn = page.locator("#copy-btn")
    box = copy_btn.bounding_box()
    check(f"[{label}] copy button is big (>=56px tall)", box and box["height"] >= 55, str(box))
    copy_btn.click()
    expect(copy_btn).to_have_text("Copied!")
    clip = page.evaluate("navigator.clipboard.readText()")
    check(f"[{label}] clipboard text (en)", clip == EXPECTED_EN, repr(clip))
    check(f"[{label}] preview matches clipboard", page.inner_text("#copy-preview") == EXPECTED_EN)
    check(f"[{label}] no horizontal scroll (en)", no_hscroll(page))
    os.makedirs(OUT, exist_ok=True)
    shot(page, f"{OUT}/{label}-en.png")

    # --- tick a caller out and back in ---
    page.locator(".caller-toggle", has_text="Bravo").click()
    expect(page.locator(".si-name")).to_have_count(2)
    page.locator(".caller-toggle", has_text="Bravo").click()
    expect(page.locator(".si-name")).to_have_count(3)

    # --- persistence across reload ---
    page.reload()
    expect(page.locator(".caller-toggle")).to_have_count(3)
    expect(page.locator("#arrival-time")).to_have_text("00:05:00")

    # --- reorder (Edit list) ---
    page.click("#edit-btn")
    page.locator("#caller-list li").nth(2).get_by_role("button", name="Move up").click()
    page.click("#edit-btn")
    order = page.locator(".caller-toggle .ct-name").all_inner_texts()
    check(f"[{label}] reorder", order == ["Bravo", "Charlie", "Alpha"], str(order))
    check(f"[{label}] no import/export box", page.locator("#import-box, #import-text, #export-btn").count() == 0)

    # --- clear with confirm (Clear list only shows while editing) ---
    check(f"[{label}] Clear list hidden outside edit mode", page.locator("#clear-btn").is_hidden())
    page.click("#edit-btn")
    page.click("#clear-btn")
    page.click("#edit-btn")
    expect(page.locator(".caller-toggle")).to_have_count(0)
    expect(page.locator("#no-callers")).to_be_visible()
    expect(page.locator("#copy-btn")).to_be_hidden()

    # restore the 3 callers for the Arabic run
    page.evaluate("localStorage.setItem('rally_callers', JSON.stringify([{name:'Bravo',marchSeconds:55,selected:true},{name:'Alpha',marchSeconds:105,selected:true},{name:'Charlie',marchSeconds:30,selected:true}]))")
    page.reload()
    expect(page.locator(".caller-toggle")).to_have_count(3)

    # --- Garrison Defense ---
    page.click(".tab-btn[data-tab=garrison]")
    page.fill("#your-march-input", "0:20")
    page.press("#your-march-input", "Tab")
    page.click("#add-enemy-btn")
    row = page.locator("#enemy-list li").last
    row.locator(".name-input").fill("BadGuy")
    row.locator(".name-input").press("Tab")
    row.locator(".alliance-input").fill("XYZ")
    row.locator(".alliance-input").press("Tab")
    row.locator(".march-input").fill("0:45")
    row.locator(".march-input").press("Tab")
    page.locator("#enemy-quick-select .qs-btn", has_text="BadGuy").click()
    expect(page.locator("#selected-enemy-display")).to_contain_text("BadGuy [XYZ]")
    page.fill("#rally-countdown-input", "3:00")
    page.press("#rally-countdown-input", "Enter")
    expect(page.locator(".rally-tracker")).to_have_count(1)
    check(f"[{label}] garrison hit time", page.inner_text(".rt-time.hit-time") == "23:53:45")
    check(f"[{label}] garrison send time", page.inner_text(".rt-time.send-time") == "23:53:25")
    check(f"[{label}] garrison countdown", page.inner_text(".rt-send-countdown") == "SEND in 3:25")
    check(f"[{label}] no horizontal scroll (garrison)", no_hscroll(page))
    shot(page, f"{OUT}/{label}-garrison-en.png")
    page.locator(".rally-tracker .btn-danger").click()
    expect(page.locator(".rally-tracker")).to_have_count(0)
    page.reload()
    expect(page.locator("#enemy-quick-select .qs-btn")).to_have_count(1)  # roster persisted

    # --- Arabic / RTL ---
    page.click(".tab-btn[data-tab=rally]")
    hsel(page, "#lang-select", "ar")
    check(f"[{label}] RTL", page.evaluate("document.documentElement.dir") == "rtl")
    expect(page.locator("#copy-btn")).to_have_text("نسخ الهجوم")
    expect(page.locator("#add-caller-btn")).to_have_text("إضافة/تعديل")
    page.click("#copy-btn")
    expect(page.locator("#copy-btn")).to_have_text("تم النسخ!")
    clip_ar = page.evaluate("navigator.clipboard.readText()")
    check(f"[{label}] clipboard text (ar)", clip_ar == EXPECTED_AR, repr(clip_ar))
    check(f"[{label}] no horizontal scroll (ar)", no_hscroll(page))
    shot(page, f"{OUT}/{label}-ar.png")
    page.click(".tab-btn[data-tab=garrison]")
    shot(page, f"{OUT}/{label}-garrison-ar.png")
    page.reload()
    check(f"[{label}] language remembered", page.evaluate("document.documentElement.lang") == "ar")

    # --- small tap targets on the rally tab ---
    page.click(".tab-btn[data-tab=rally]")
    small = page.evaluate("""[...document.querySelectorAll('#tab-rally button, #tab-rally select, #tab-rally input, .tab-btn')]
        .filter(e => e.offsetParent).map(e => [e.id || e.className, Math.round(e.getBoundingClientRect().height)])
        .filter(([, h]) => h < 44)""")
    check(f"[{label}] tap targets >= 44px", not small, str(small))

    check(f"[{label}] no console/CSP errors", not errors, str(errors))
    check(f"[{label}] no external requests", not external, str(external))
    browser.close()


def insecure_copy(pw, url):
    """Plain-http LAN URL: no navigator.clipboard there, so the fallback must copy."""
    browser = pw.chromium.launch()
    ctx = browser.new_context(**iphone_device(pw))
    ctx.grant_permissions(["clipboard-read", "clipboard-write"], origin=BASE)
    page = ctx.new_page()
    gate_login(page, url)
    page.evaluate("localStorage.setItem('rally_callers', JSON.stringify([{name:'Alpha',marchSeconds:105,selected:true}]))")
    page.reload()
    check("[http] page is not a secure context", page.evaluate("!window.isSecureContext"))
    page.click("#copy-btn")
    expect(page.locator("#copy-btn")).to_have_text("Copied!")
    reader = ctx.new_page()
    reader.goto(BASE + "/health")
    clip = reader.evaluate("navigator.clipboard.readText()")
    check("[http] fallback copy reached the clipboard", clip == page.inner_text("#copy-preview"), repr(clip))
    browser.close()


DESKTOP = {"viewport": {"width": 1440, "height": 900}}  # primary: leaders use a desktop
T0 = dt.datetime(2026, 10, 9, 23, 58, 0, tzinfo=dt.timezone.utc)  # live plan lands after midnight UTC
THREE = "[{name:'Bravo',marchSeconds:55,selected:true},{name:'Alpha',marchSeconds:105,selected:true},{name:'Charlie',marchSeconds:30,selected:true}]"
OPEN = "localStorage.setItem('rally_ui_open', JSON.stringify({attack: true, counter: true}))"  # settings unfolded


def at(sec):
    return T0 + dt.timedelta(seconds=sec)


def live_freeze(pw, label, ctx_args, lang):
    tag = f"[{label}/{lang}]"
    browser = pw.chromium.launch()
    ctx = browser.new_context(**ctx_args, locale="en-GB")
    ctx.grant_permissions(["clipboard-read", "clipboard-write"], origin=BASE)
    page = ctx.new_page()
    errors = []
    page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.clock.set_fixed_time(T0)
    gate_login(page)
    page.evaluate(f"localStorage.clear(); localStorage.setItem('app_lang', '{lang}'); localStorage.setItem('rally_callers', JSON.stringify({THREE})); {OPEN}")
    page.reload()

    def L(key, *args):
        if args:
            return page.evaluate(f"RallyLang['{lang}']['{key}'](...{list(args)!r})")
        return page.evaluate(f"RallyLang['{lang}']['{key}']")

    def times():
        return page.locator(".si-time").all_inner_texts()

    def expected_text(land, starts):
        word = L("march_word")
        rows = [f"{t} - {n} (" + word + f" {m})" for t, n, m in zip(starts, ["Alpha", "Bravo", "Charlie"], ["1:45", "0:55", "0:30"])]
        return "\n".join([L("copy_header", land)] + rows)

    status, arrival, reset = page.locator("#plan-status"), page.locator("#arrival-time"), page.locator("#reset-btn")

    # --- LIVE: first start = now + 30s reaction, everything else derived ---
    expect(status).to_have_text(L("live_ind"))
    expect(arrival).to_have_text("00:05:15")
    check(f"{tag} live start times", times() == ["23:58:30", "23:59:20", "23:59:45"], str(times()))
    check(f"{tag} live: no Reset button", reset.is_hidden())
    check(f"{tag} live: hint", page.inner_text("#plan-hint") == L("hint_live"))
    os.makedirs(OUT, exist_ok=True)
    shot(page, f"{OUT}/{label}-live-{lang}.png")

    # --- the clock moves 5s: every time counts up, so does the chat preview ---
    page.clock.set_fixed_time(at(5))
    expect(page.locator("#utc-clock")).to_have_text("23:58:05")
    expect(arrival).to_have_text("00:05:20")
    check(f"{tag} live times advanced", times() == ["23:58:35", "23:59:25", "23:59:50"], str(times()))
    frozen_text = expected_text("00:05:20", ["23:58:35", "23:59:25", "23:59:50"])
    check(f"{tag} live preview advanced", page.inner_text("#copy-preview") == frozen_text, page.inner_text("#copy-preview"))
    doc_y = "document.querySelector('#schedule-list').getBoundingClientRect().top + window.scrollY"
    list_y = page.evaluate(doc_y)

    # --- Copy freezes at this instant; clipboard == shown times ---
    page.click("#copy-btn")
    expect(status).to_have_text(L("locked_ind"))
    expect(reset).to_be_visible()
    clip = page.evaluate("navigator.clipboard.readText()")
    check(f"{tag} clipboard == frozen times", clip == frozen_text, repr(clip))
    check(f"{tag} clipboard == preview", clip == page.inner_text("#copy-preview"))
    check(f"{tag} shown times == copied times", times() == ["23:58:35", "23:59:25", "23:59:50"] and arrival.inner_text() == "00:05:20")
    y2 = page.evaluate(doc_y)
    check(f"{tag} no layout jump on freeze", abs(y2 - list_y) < 1, f"{list_y} -> {y2}")
    rb = reset.bounding_box()
    check(f"{tag} Reset is a big tap target", rb and rb["height"] >= 48 and rb["width"] >= 100, str(rb))
    cd_first = page.locator(".si-countdown").first
    check(f"{tag} countdown at freeze", cd_first.inner_text() == L("fmtCountdown", 0, "30"), cd_first.inner_text())

    # --- 10s later: times unchanged, countdowns lower ---
    page.clock.set_fixed_time(at(15))
    expect(page.locator("#utc-clock")).to_have_text("23:58:15")
    expect(cd_first).to_have_text(L("fmtCountdown", 0, "20"))
    check(f"{tag} frozen times unchanged after 10s", times() == ["23:58:35", "23:59:25", "23:59:50"] and arrival.inner_text() == "00:05:20", str(times()))
    check(f"{tag} frozen preview unchanged", page.inner_text("#copy-preview") == frozen_text)
    page.evaluate("navigator.clipboard.writeText('x')")
    page.click("#copy-btn")  # re-copy: same frozen text, no re-freeze
    expect(page.locator("#copy-btn")).to_have_text(L("copied"))
    check(f"{tag} re-copy gives the same text", page.evaluate("navigator.clipboard.readText()") == frozen_text)
    check(f"{tag} frozen hint", page.inner_text("#plan-hint") == L("hint_locked"))
    check(f"{tag} no horizontal scroll (frozen)", no_hscroll(page))
    shot(page, f"{OUT}/{label}-frozen-{lang}.png")
    page.reload()  # a frozen plan survives a reload
    expect(status).to_have_text(L("locked_ind"))
    check(f"{tag} frozen after reload", times() == ["23:58:35", "23:59:25", "23:59:50"], str(times()))

    # --- first start passes: warning + Reset highlighted ---
    page.clock.set_fixed_time(at(36))
    expect(page.locator("#schedule-warning")).to_have_text(L("passed_warning"))
    check(f"{tag} Reset highlighted after first start", "attention" in (reset.get_attribute("class") or ""))
    shot(page, f"{OUT}/{label}-passed-{lang}.png")

    # --- Reset: live again, times move ---
    reset.click()
    expect(status).to_have_text(L("live_ind"))
    expect(page.locator("#schedule-warning")).to_be_hidden()
    check(f"{tag} reset: new live first start", times()[0] == "23:59:06", str(times()))
    page.clock.set_fixed_time(at(40))
    expect(page.locator(".si-time").first).to_have_text("23:59:10")

    # --- LOCK freezes without copying ---
    page.evaluate("navigator.clipboard.writeText('sentinel')")
    page.click("#lock-btn")
    expect(status).to_have_text(L("locked_ind"))
    check(f"{tag} LOCK does not copy", page.evaluate("navigator.clipboard.readText()") == "sentinel")
    check(f"{tag} LOCK makes way for Reset (same place)", page.locator("#lock-btn").is_hidden() and page.locator("#reset-btn").is_visible())
    # edits while frozen recompute from the frozen FIRST start
    page.locator(".caller-toggle", has_text="Alpha").click()   # remove the longest march
    check(f"{tag} frozen edit keeps first start", times() == ["23:59:10", "23:59:35"], str(times()))
    page.locator(".caller-toggle", has_text="Alpha").click()
    page.select_option("#rally-duration-select", "600")
    check(f"{tag} frozen duration change keeps first start", times()[0] == "23:59:10" and arrival.inner_text() == "00:10:55",
          str(times()) + arrival.inner_text())
    page.clock.set_fixed_time(at(45))
    expect(page.locator("#utc-clock")).to_have_text("23:58:45")
    check(f"{tag} still frozen after edits", times()[0] == "23:59:10")
    # reaction time only shapes a live plan: changing it goes back to LIVE
    page.select_option("#buffer-select", "60")
    expect(status).to_have_text(L("live_ind"))
    check(f"{tag} reaction change -> live", times()[0] == "23:59:45", str(times()))

    # --- typed Land at time: fixed; Reset clears it ---
    page.fill("#target-input", "00:15")
    page.press("#target-input", "Enter")
    expect(status).to_have_text(L("locked_ind"))
    expect(arrival).to_have_text("00:15:00")
    page.click("#copy-btn")
    check(f"{tag} fixed copy keeps typed land time", page.evaluate("navigator.clipboard.readText()").split("\n")[0] == L("copy_header", "00:15:00"))
    reset.click()
    expect(status).to_have_text(L("live_ind"))
    check(f"{tag} Reset clears the typed time", page.input_value("#target-input") == "")
    check(f"{tag} no console errors (live)", not errors, str(errors))
    browser.close()


A0 = dt.datetime(2026, 10, 9, 12, 0, 0, tzinfo=dt.timezone.utc)


def auto_reset(pw, label, ctx_args, lang):
    """Auto-reset (default 5 min after Copy/LOCK) with its countdown, 1 min, Off,
    typed Land at, reload while frozen, and the stale-copy guard."""
    tag = f"[autoreset/{label}/{lang}]"
    browser = pw.chromium.launch()
    ctx = browser.new_context(**ctx_args, locale="en-GB")
    ctx.grant_permissions(["clipboard-read", "clipboard-write"], origin=BASE)
    page = ctx.new_page()
    errors = []
    page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.clock.set_fixed_time(A0)
    gate_login(page)
    page.evaluate(f"localStorage.clear(); localStorage.setItem('app_lang', '{lang}'); localStorage.setItem('rally_callers', JSON.stringify({THREE})); {OPEN}")
    page.reload()

    def L(key, *args):
        if args:
            return page.evaluate(f"RallyLang['{lang}']['{key}'](...{list(args)!r})")
        return page.evaluate(f"RallyLang['{lang}']['{key}']")

    def go(sec):
        t = A0 + dt.timedelta(seconds=sec)
        page.clock.set_fixed_time(t)
        expect(page.locator("#utc-clock")).to_have_text(t.strftime("%H:%M:%S"))

    def clip():
        return page.evaluate("navigator.clipboard.readText()")

    def hhmmss(sec):
        return (A0 + dt.timedelta(seconds=sec)).strftime("%H:%M:%S")

    status, cd, toast = page.locator("#plan-status"), page.locator("#auto-reset-cd"), page.locator("#plan-toast")
    menu(page)
    sel = page.locator("#auto-reset-select")
    doc_y = "document.querySelector('#schedule-list').getBoundingClientRect().top + window.scrollY"

    # --- the setting: 7 choices, default 5 min, translated ---
    opts = sel.locator("option").evaluate_all("os => os.map(o => [o.value, o.textContent])")
    check(f"{tag} choices Off,1,2,3,5,10,15", [v for v, _ in opts] == ["0", "1", "2", "3", "5", "10", "15"], str(opts))
    check(f"{tag} default is 5 min", sel.input_value() == "5")
    check(f"{tag} option labels translated", opts[0][1] == L("auto_reset_off") and opts[4][1] == L("minutes_n", 5), str(opts))
    check(f"{tag} label translated", page.inner_text("label[for=auto-reset-select]") == L("auto_reset_label"))
    menu(page, False)
    check(f"{tag} live: no countdown", cd.is_hidden())

    # reaction 3 min, so the first start is still ahead when re-copying a minute later
    page.select_option("#buffer-select", "180")

    # --- Copy: frozen, countdown from 5:00 ---
    y0 = page.evaluate(doc_y)
    page.click("#copy-btn")
    expect(status).to_have_text(L("locked_ind"))
    expect(cd).to_have_text(L("auto_reset_in", "5:00"))
    check(f"{tag} countdown does not move the list", abs(page.evaluate(doc_y) - y0) < 1)
    first_clip = clip()
    check(f"{tag} copy starts at now + 3 min", first_clip.split("\n")[1].startswith(hhmmss(180)), first_clip)
    go(28)
    expect(cd).to_have_text(L("auto_reset_in", "4:32"))
    check(f"{tag} no horizontal scroll (countdown)", no_hscroll(page))
    os.makedirs(OUT, exist_ok=True)
    shot(page, f"{OUT}/{label}-autoreset-{lang}.png")

    # --- re-copy and edits while frozen don't restart it ---
    go(60)
    page.evaluate("navigator.clipboard.writeText('x')")
    page.click("#copy-btn")
    expect(page.locator("#copy-btn")).to_have_text(L("copied"))
    check(f"{tag} re-copy: same frozen text", clip() == first_clip)
    expect(cd).to_have_text(L("auto_reset_in", "4:00"))
    page.locator(".caller-toggle", has_text="Charlie").click()
    page.locator(".caller-toggle", has_text="Charlie").click()
    page.select_option("#rally-duration-select", "600")
    page.select_option("#rally-duration-select", "300")
    check(f"{tag} edits keep the countdown", cd.inner_text() == L("auto_reset_in", "4:00"), cd.inner_text())
    check(f"{tag} no toast yet", toast.is_hidden())

    # --- 5 minutes after the freeze: LIVE again, with the toast ---
    go(299)
    expect(cd).to_have_text(L("auto_reset_in", "0:01"))
    check(f"{tag} still locked at 4:59", status.inner_text() == L("locked_ind"))
    go(300)
    expect(status).to_have_text(L("live_ind"))
    expect(toast).to_have_text(L("auto_reset_done"))
    expect(toast).to_be_visible()
    check(f"{tag} auto-reset: countdown gone, Reset hidden", cd.is_hidden() and page.locator("#reset-btn").is_hidden())
    check(f"{tag} auto-reset: times live again", page.locator(".si-time").first.inner_text() == hhmmss(480))
    check(f"{tag} toast floats (position fixed)",
          page.evaluate("getComputedStyle(document.querySelector('#plan-toast')).position") == "fixed")
    y_with_toast = page.evaluate(doc_y)
    page_h = page.evaluate("document.documentElement.scrollHeight")
    tb = toast.bounding_box()
    vw = page.evaluate("window.innerWidth")
    check(f"{tag} toast inside the screen", tb and tb["x"] >= 0 and tb["x"] + tb["width"] <= vw + 1, str(tb))
    shot(page, f"{OUT}/{label}-autoreset-toast-{lang}.png")
    expect(toast).to_be_hidden(timeout=7000)
    check(f"{tag} the toast did not move the layout", abs(page.evaluate(doc_y) - y_with_toast) < 1
          and page.evaluate("document.documentElement.scrollHeight") == page_h)

    # --- 1 minute; LOCK starts it too; the choice is remembered ---
    menu(page); sel.select_option("1"); menu(page, False)
    page.reload()
    check(f"{tag} setting saved", sel.input_value() == "1")
    go(310)
    page.click("#lock-btn")
    expect(cd).to_have_text(L("auto_reset_in", "1:00"))
    go(369)
    expect(cd).to_have_text(L("auto_reset_in", "0:01"))
    go(370)
    expect(status).to_have_text(L("live_ind"))
    expect(toast).to_have_text(L("auto_reset_done"))

    # --- a typed Land at time is reset too (cleared like Reset) ---
    page.fill("#target-input", hhmmss(1800)[:5])
    page.press("#target-input", "Enter")
    expect(status).to_have_text(L("locked_ind"))
    expect(cd).to_have_text(L("auto_reset_in", "1:00"))
    go(430)
    expect(status).to_have_text(L("live_ind"))
    check(f"{tag} auto-reset clears the typed Land at", page.input_value("#target-input") == "")

    # --- reload while frozen: the countdown carries on; overdue -> reset on load ---
    menu(page); sel.select_option("5"); menu(page, False)
    go(500)
    page.click("#copy-btn")
    expect(cd).to_have_text(L("auto_reset_in", "5:00"))
    go(600)
    expect(cd).to_have_text(L("auto_reset_in", "3:20"))
    page.reload()
    expect(status).to_have_text(L("locked_ind"))
    expect(cd).to_have_text(L("auto_reset_in", "3:20"))
    go(610)
    expect(cd).to_have_text(L("auto_reset_in", "3:10"))
    page.clock.set_fixed_time(A0 + dt.timedelta(seconds=900))  # phone asleep past the deadline, then reopened
    page.reload()
    expect(status).to_have_text(L("live_ind"))
    expect(toast).to_have_text(L("auto_reset_done"))

    # --- Off: no countdown, never resets ---
    menu(page); sel.select_option("0"); menu(page, False)
    go(1000)
    page.click("#lock-btn")
    expect(status).to_have_text(L("locked_ind"))
    check(f"{tag} Off: no countdown", cd.is_hidden())
    go(1000 + 20 * 60)
    check(f"{tag} Off: still locked 20 min later", status.inner_text() == L("locked_ind") and cd.is_hidden())
    page.click("#reset-btn")
    expect(status).to_have_text(L("live_ind"))

    # --- stale-copy guard (auto-reset Off): Copy after the first start passed gives NEW times ---
    page.select_option("#buffer-select", "30")
    go(3000)
    page.click("#copy-btn")
    expect(status).to_have_text(L("locked_ind"))
    old = clip()
    go(3040)  # first start (3030) has passed
    expect(page.locator("#schedule-warning")).to_have_text(L("passed_warning"))
    page.click("#copy-btn")
    expect(toast).to_have_text(L("stale_recopied"))
    new = clip()
    check(f"{tag} stale copy: new times, not the old ones", new != old and new.split("\n")[1].startswith(hhmmss(3070)), repr(old) + " -> " + repr(new))
    check(f"{tag} stale copy: clipboard == preview", new == page.inner_text("#copy-preview"))
    check(f"{tag} stale copy: frozen again, warning gone", status.inner_text() == L("locked_ind") and page.locator("#schedule-warning").is_hidden())
    go(3050)  # first start still ahead: plain re-copy, no notice
    page.evaluate("document.querySelector('#plan-toast').hidden = true")
    page.click("#copy-btn")
    expect(page.locator("#copy-btn")).to_have_text(L("copied"))
    check(f"{tag} fresh frozen plan re-copies the same text", clip() == new and toast.is_hidden())
    # a typed Land at time whose first start passed: fresh live times, typed time cleared
    page.fill("#target-input", hhmmss(3600))  # 13:00:00: first start 12:53:15
    page.press("#target-input", "Enter")
    page.click("#copy-btn")
    typed_clip = clip()
    go(3700)
    page.click("#copy-btn")
    expect(toast).to_have_text(L("stale_recopied"))
    check(f"{tag} stale typed plan: new live times, box cleared",
          clip() != typed_clip and clip().split("\n")[1].startswith(hhmmss(3730)) and page.input_value("#target-input") == "", repr(clip()))

    # --- 320px wide, frozen with the countdown: no sideways scroll ---
    menu(page); sel.select_option("5"); menu(page, False)
    page.set_viewport_size({"width": 320, "height": 700})
    expect(cd).to_be_visible()
    check(f"{tag} no horizontal scroll at 320px", no_hscroll(page))
    pr = page.evaluate("(() => { const r = document.querySelector('.plan-row').getBoundingClientRect(); return [r.height, r.right <= window.innerWidth + 1]; })()")
    check(f"{tag} plan row keeps its height at 320px", pr[0] == 56 and pr[1], str(pr))
    check(f"{tag} no console errors", not errors, str(errors))
    browser.close()


FIVE_OLD = "[{name:'rima',marchSeconds:34,selected:true},{name:'Bravo',marchSeconds:65,selected:true},{name:'Alpha',marchSeconds:105,selected:true},{name:'Charlie',marchSeconds:30,selected:true},{name:'Delta',marchSeconds:55,selected:true}]"
W0 = dt.datetime(2026, 10, 9, 12, 0, 0, tzinfo=dt.timezone.utc)


def waves(pw, label, ctx_args, lang):
    """Waves: tap cycling, gaps (default + custom), earliest-start anchoring, grouped
    copy text, freeze/edit/Reset, multi-time Land at, Randomise + Undo, remove wave."""
    tag = f"[waves/{label}/{lang}]"
    browser = pw.chromium.launch()
    ctx = browser.new_context(**ctx_args, locale="en-GB")
    ctx.grant_permissions(["clipboard-read", "clipboard-write"], origin=BASE)
    page = ctx.new_page()
    errors = []
    page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.clock.set_fixed_time(W0)
    gate_login(page)
    # an OLD saved list (selected flags, no waves): migrates to wave 1
    page.evaluate(f"localStorage.clear(); localStorage.setItem('app_lang', '{lang}'); localStorage.setItem('rally_callers', JSON.stringify({FIVE_OLD})); {OPEN}")
    page.reload()

    def L(key, *args):
        if args:
            return page.evaluate(f"RallyLang['{lang}']['{key}'](...{list(args)!r})")
        return page.evaluate(f"RallyLang['{lang}']['{key}']")

    def times():
        return page.locator(".si-time").all_inner_texts()

    def toggle(name):
        return page.locator(".caller-toggle", has_text=name)

    def wave_of(name):
        return toggle(name).get_attribute("data-wave")

    def wave_sizes():
        ws = page.locator(".caller-toggle").evaluate_all("bs => bs.map(b => +b.dataset.wave)")
        return ws

    status = page.locator("#plan-status")
    check(f"{tag} old list migrated: 5 ticked, 1 wave", page.locator(".caller-toggle[aria-checked=true]").count() == 5)
    check(f"{tag} one wave: no wave sections, no delay row", page.locator(".wave-section").count() == 0 and page.locator("#wave-delay-row").is_hidden())
    check(f"{tag} one wave: Randomise hidden", page.locator("#randomise-btn").is_hidden())

    # --- 3 waves ---
    page.click("#add-wave-btn")
    page.click("#add-wave-btn")
    expect(page.locator("#wave-count")).to_have_text("3")
    check(f"{tag} delay row + 2 gap rows", page.locator("#wave-delay-row").is_visible() and page.locator(".gap-row").count() == 2)
    check(f"{tag} gaps prefilled with the default", page.locator(".gap-row .sec-input").evaluate_all("i => i.map(x => x.value)") == ["10", "10"])

    # --- tap cycling: off -> 1 -> 2 -> 3 -> off ---
    seq = []
    for _ in range(4):
        toggle("rima").click()
        seq.append(wave_of("rima"))
    check(f"{tag} tap cycles 1 -> 2 -> 3 -> off -> 1", seq == ["2", "3", "0", "1"], str(seq))
    toggle("Alpha").click()
    for n in ("Charlie", "Delta"):
        toggle(n).click()
        toggle(n).click()
    check(f"{tag} assignments", [wave_of(n) for n in ("rima", "Bravo", "Alpha", "Charlie", "Delta")] == ["1", "1", "2", "3", "3"])
    badge = toggle("Alpha").locator(".wave-badge")
    check(f"{tag} badge shows the number", badge.inner_text() == "2" and "w2" in (badge.get_attribute("class") or ""))
    check(f"{tag} badge aria-label", toggle("Alpha").get_attribute("aria-label") == L("wave_aria", "Alpha", 2))
    colours = page.evaluate("[1,2,3].map(k => getComputedStyle(document.querySelector('.caller-toggle .wave-badge.w' + k)).backgroundColor)")
    check(f"{tag} distinct wave colours", len(set(colours)) == 3, str(colours))

    # --- edit one gap (wave 2 -> 3 = 20s): marked custom ---
    gap2 = page.locator(".gap-row").nth(1)
    gap2.locator(".sec-input").fill("20")
    gap2.locator(".sec-input").press("Tab")
    gap2 = page.locator(".gap-row").nth(1)
    check(f"{tag} custom gap marked", "custom" in (gap2.get_attribute("class") or "") and gap2.locator(".gap-custom").text_content() == L("gap_custom"))
    check(f"{tag} default gap not marked", "custom" not in (page.locator(".gap-row").nth(0).get_attribute("class") or ""))

    # --- LIVE times: Alpha (wave 2, longest lead) starts at now + 30s ---
    expect(page.locator("#arrival-time")).to_have_text("12:07:05")
    check(f"{tag} live start times per wave", times() == ["12:01:00", "12:01:31", "12:00:30", "12:01:40", "12:02:05"], str(times()))
    heads = page.locator(".wave-title").all_inner_texts()
    check(f"{tag} wave headers", heads == [L("wave_lands", 1, "12:07:05"), L("wave_lands", 2, "12:07:15"), L("wave_lands", 3, "12:07:35")], str(heads))
    check(f"{tag} arrival label says wave 1", page.text_content("#arrival-label") == L("arrival_label_w1"))
    check(f"{tag} other landings listed", page.locator(".wl-chip").count() == 2 and "12:07:35" in page.inner_text("#wave-landings"))

    # --- Copy: freeze; clipboard grouped by wave ---
    word = L("march_word")
    expected = "\n".join([
        L("copy_wave", 1, "12:07:05"), f"12:01:00 - Bravo ({word} 1:05)", f"12:01:31 - rima ({word} 0:34)", "",
        L("copy_wave", 2, "12:07:15"), f"12:00:30 - Alpha ({word} 1:45)", "",
        L("copy_wave", 3, "12:07:35"), f"12:01:40 - Delta ({word} 0:55)", f"12:02:05 - Charlie ({word} 0:30)",
    ])
    page.click("#copy-btn")
    expect(status).to_have_text(L("locked_ind"))
    clip = page.evaluate("navigator.clipboard.readText()")
    check(f"{tag} clipboard (3 waves)", clip == expected, repr(clip))
    check(f"{tag} preview == clipboard", page.inner_text("#copy-preview") == clip)
    check(f"{tag} no horizontal scroll (3 waves)", no_hscroll(page))
    os.makedirs(OUT, exist_ok=True)
    shot(page, f"{OUT}/{label}-waves-{lang}.png")

    # --- edits while frozen keep the earliest start (Alpha 12:00:30) ---
    page.locator(".gap-row").nth(1).locator(".gap-reset").click()
    check(f"{tag} gap back to default", page.locator(".gap-row").nth(1).locator(".sec-input").input_value() == "10"
          and "custom" not in (page.locator(".gap-row").nth(1).get_attribute("class") or ""))
    check(f"{tag} frozen: wave 3 moved, earliest start kept",
          times()[2] == "12:00:30" and page.locator(".wave-title").nth(2).inner_text() == L("wave_lands", 3, "12:07:25"), str(times()))
    toggle("Alpha").click()  # Alpha -> wave 3
    check(f"{tag} frozen: moving a caller keeps the earliest start", min(times()) == "12:00:30", str(times()))
    check(f"{tag} empty wave shows a hint", page.locator(".wave-section.w2 .wave-empty").inner_text() == L("empty_wave"))
    check(f"{tag} empty wave left out of the copy text", L("copy_wave", 2, "12:07:15") not in page.inner_text("#copy-preview")
          and "\n" + L("wave_n", 2) not in page.inner_text("#copy-preview"))
    toggle("Alpha").click()  # off
    toggle("Alpha").click()  # wave 1
    toggle("Alpha").click()  # wave 2 again

    # --- the earliest start passes: warning; Reset -> live ---
    page.clock.set_fixed_time(W0 + dt.timedelta(seconds=31))
    expect(page.locator("#schedule-warning")).to_have_text(L("passed_warning"))
    page.click("#reset-btn")
    expect(status).to_have_text(L("live_ind"))
    check(f"{tag} reset: earliest start = now + 30s", min(times()) == "12:01:01", str(times()))

    # --- several Land at times ---
    page.fill("#target-input", "12:10, 12:10:20")
    page.press("#target-input", "Enter")
    expect(page.locator("#arrival-time")).to_have_text("12:10:00")
    heads = page.locator(".wave-title").all_inner_texts()
    check(f"{tag} land at: per-wave times, wave 3 follows the delay", heads == [L("wave_lands", 1, "12:10:00"), L("wave_lands", 2, "12:10:20"), L("wave_lands", 3, "12:10:30")], str(heads))
    check(f"{tag} land at: implied gap shown", page.locator(".gap-row").nth(0).locator(".gap-fixed").inner_text() == L("gap_fixed", 20))
    check(f"{tag} land at: box shows the times", page.input_value("#target-input") == "12:10:00, 12:10:20")
    page.fill("#target-input", "12:10, 12:11, 12:12, 12:13")
    page.press("#target-input", "Enter")
    expect(page.locator("#target-error")).to_have_text(L("land_too_many", 3))
    page.fill("#target-input", "12:10, soon")
    page.press("#target-input", "Enter")
    expect(page.locator("#target-error")).to_have_text(L("bad_time"))
    check(f"{tag} land at: plan kept after an error", page.inner_text("#arrival-time") == "12:10:00")
    page.fill("#target-input", "23:59:55, 00:00:10")
    page.press("#target-input", "Enter")
    check(f"{tag} land at: across midnight", page.locator(".wave-title").nth(1).inner_text() == L("wave_lands", 2, "00:00:10"))
    page.click("#reset-btn")
    expect(status).to_have_text(L("live_ind"))

    # --- Randomise: evenly, off callers stay off; Undo restores ---
    toggle("rima").click(); toggle("rima").click(); toggle("rima").click()  # rima: 1 -> 2 -> 3 -> off
    before = wave_sizes()
    check(f"{tag} rima off before Randomise", wave_of("rima") == "0")
    rb = page.locator("#randomise-btn")
    check(f"{tag} Randomise visible + enabled", rb.is_visible() and rb.is_enabled())
    rb.click()
    expect(page.locator("#randomise-toast")).to_be_visible()
    after = wave_sizes()
    counts = sorted(after.count(k) for k in (1, 2, 3))
    check(f"{tag} Randomise: 4 callers over 3 waves = 2-1-1", counts == [1, 1, 2], str(after))
    check(f"{tag} Randomise: off caller untouched", wave_of("rima") == "0")
    page.click("#undo-btn")
    expect(page.locator("#randomise-toast")).to_be_hidden()
    check(f"{tag} Undo restores the previous waves", wave_sizes() == before, f"{before} vs {wave_sizes()}")

    # --- tap targets, edit-mode wave select ---
    small = page.evaluate("""[...document.querySelectorAll('#tab-rally button, #tab-rally select, #tab-rally input')]
        .filter(e => e.offsetParent).map(e => [e.id || e.className, Math.round(e.getBoundingClientRect().height)])
        .filter(([, h]) => h < 44)""")
    check(f"{tag} tap targets >= 44px", not small, str(small))
    page.click("#edit-btn")
    check(f"{tag} Edit list has a wave menu per caller", page.locator(".wave-select").count() == 5)
    page.locator("#caller-list li").nth(0).locator(".wave-select").select_option("3")
    page.click("#edit-btn")
    check(f"{tag} wave menu sets the wave", wave_of("rima") == "3")
    check(f"{tag} no horizontal scroll (edit)", no_hscroll(page))

    # --- remove a wave: its callers go off; persistence ---
    in3 = [n for n in ("rima", "Bravo", "Alpha", "Charlie", "Delta") if wave_of(n) == "3"]
    page.click("#remove-wave-btn")
    expect(page.locator("#wave-count")).to_have_text("2")
    check(f"{tag} removed wave's callers are off", all(wave_of(n) == "0" for n in in3) and page.locator(".gap-row").count() == 1, str(in3))
    page.reload()
    expect(page.locator("#wave-count")).to_have_text("2")
    check(f"{tag} waves persisted", all(wave_of(n) == "0" for n in in3))
    check(f"{tag} no console errors", not errors, str(errors))
    browser.close()


def gate_page(pw, label, ctx_args, lang):
    """Login page: phone language, RTL, wrong password, next redirect, log out."""
    tag = f"[gate/{label}/{lang}]"
    browser = pw.chromium.launch()
    # A made-up client IP per run (right-most X-Forwarded-For, trust proxy 1), so repeated
    # runs' wrong passwords don't add up to the server's per-IP login limit.
    fake_ip = f"198.18.{random.randint(0, 255)}.{random.randint(1, 254)}"
    ctx = browser.new_context(**ctx_args, locale={"ar": "ar", "es": "es-ES", "fr": "fr-FR", "de": "de-DE"}.get(lang, "en-GB"),
                              extra_http_headers={"X-Forwarded-For": fake_ip})
    page = ctx.new_page()
    errors = []
    # The browser logs the deliberate 401 (wrong password) as a failed resource.
    page.on("console", lambda m: errors.append(m.text) if m.type == "error" and "status of 401" not in m.text else None)
    page.on("pageerror", lambda e: errors.append(str(e)))
    external = []
    page.on("request", lambda r: external.append(r.url) if not r.url.startswith(BASE) else None)

    page.goto(BASE + "/?from=e2e")
    expect(page).to_have_url(BASE + "/login?next=" + "%2F%3Ffrom%3De2e")
    T = page.evaluate(f"window.RallyGateLang['{lang}']")
    check(f"{tag} language follows the phone", page.evaluate("document.documentElement.lang") == lang)
    check(f"{tag} direction", page.evaluate("document.documentElement.dir") == ("rtl" if lang == "ar" else "ltr"))
    expect(page.locator(".gate-title")).to_have_text(T["title"])
    expect(page.locator(".gate-label")).to_have_text(T["prompt"])
    expect(page.locator("#gate-submit")).to_have_text(T["enter"])
    check(f"{tag} no error shown at first", page.locator("#gate-error").is_hidden())
    check(f"{tag} password field is masked", page.get_attribute("#password", "type") == "password")
    small = page.evaluate("""[...document.querySelectorAll('#password, #gate-submit')]
        .map(e => [e.id, Math.round(e.getBoundingClientRect().height)]).filter(([, h]) => h < 44)""")
    check(f"{tag} tap targets >= 44px", not small, str(small))
    check(f"{tag} no horizontal scroll", no_hscroll(page))
    os.makedirs(OUT, exist_ok=True)
    page.screenshot(path=f"{OUT}/{label}-login-{lang}.png", full_page=True)

    # --- wrong password: translated error, still gated ---
    page.fill("#password", "definitely-wrong")
    page.click("#gate-submit")
    expect(page.locator("#gate-error")).to_have_text(T["bad"])
    check(f"{tag} wrong password stays on the login page", page.locator("#password").count() == 1)
    check(f"{tag} next survives a wrong password", page.input_value("input[name=next]") == "/?from=e2e")
    check(f"{tag} no gate cookie after a wrong password", not [c for c in ctx.cookies() if c["name"] == "rally_gate"])
    page.screenshot(path=f"{OUT}/{label}-login-wrong-{lang}.png", full_page=True)

    # --- right password: back to the page asked for; cookie is HttpOnly ---
    page.fill("#password", GATE_PW)
    page.click("#gate-submit")
    expect(page).to_have_url(BASE + "/?from=e2e")
    expect(page.locator("#copy-btn")).to_be_attached()
    cookie = [c for c in ctx.cookies() if c["name"] == "rally_gate"]
    check(f"{tag} gate cookie is HttpOnly + Lax", cookie and cookie[0]["httpOnly"] and cookie[0]["sameSite"] == "Lax", str(cookie))
    check(f"{tag} script cannot read the cookie", "rally_gate" not in page.evaluate("document.cookie"))

    # --- Log out in the footer: back to the login, app gated again ---
    menu(page)
    link = page.locator(".logout-link")
    expect(link).to_have_text(page.evaluate(f"RallyLang['{lang}'].log_out"))
    link.click()
    expect(page).to_have_url(re.compile(re.escape(BASE) + r"/login$"))
    check(f"{tag} logged out: app.js is 401", page.request.get(BASE + "/app.js").status == 401)
    page.goto(BASE + "/")
    expect(page).to_have_url(BASE + "/login?next=%2F")
    check(f"{tag} no console errors", not errors, str(errors))
    check(f"{tag} no external requests", not external, str(external))
    browser.close()


def iphone_device(pw):
    d = dict(pw.devices["iPhone 13"])
    d.pop("default_browser_type", None)
    return d


C0 = dt.datetime(2026, 10, 9, 18, 0, 0, tzinfo=dt.timezone.utc)
LANGS9 = ["en", "es", "fr", "de", "pl", "ko", "zh", "tr", "ar"]


def new_page(pw, ctx_args, lang_locale="en-GB"):
    browser = pw.chromium.launch()
    ctx = browser.new_context(**ctx_args, locale=lang_locale)
    ctx.grant_permissions(["clipboard-read", "clipboard-write"], origin=BASE)
    page = ctx.new_page()
    errors = []
    # console errors include CSP violations ("Refused to apply/execute ...")
    page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.on("dialog", lambda d: d.accept())
    return browser, page, errors


def battle_flow(pw, label, ctx_args, lang):
    """Battle view: Attack and Counter on screen together. Build a Counter list
    (tag BDE) through the UI, copy each list with its own button, and prove the
    two never mix: own callers, own frozen plan, own auto-reset deadline, own
    duration; folded settings with a summary; reload."""
    tag = f"[battle/{label}/{lang}]"
    browser, page, errors = new_page(pw, ctx_args)
    page.clock.set_fixed_time(C0)
    gate_login(page)
    page.evaluate(f"localStorage.clear(); localStorage.setItem('app_lang', '{lang}'); localStorage.setItem('rally_callers', JSON.stringify({THREE}))")
    page.reload()

    def L(key, *args):
        if args:
            return page.evaluate(f"RallyLang['{lang}']['{key}'](...{list(args)!r})")
        return page.evaluate(f"RallyLang['{lang}']['{key}']")

    def go(sec):
        t = C0 + dt.timedelta(seconds=sec)
        page.clock.set_fixed_time(t)
        expect(page.locator("#utc-clock")).to_have_text(t.strftime("%H:%M:%S"))

    def clip():
        return page.evaluate("navigator.clipboard.readText()")

    def a_times():
        return page.locator("#panel-attack .si-time").all_inner_texts()

    def c_times():
        return page.locator("#panel-counter .si-time").all_inner_texts()

    a_status, a_cd = page.locator("#plan-status"), page.locator("#auto-reset-cd")
    c_status, c_cd = page.locator("#counter-plan-status"), page.locator("#counter-auto-reset-cd")
    toast = page.locator("#plan-toast")
    abtn, cbtn = page.locator("#copy-btn"), page.locator("#counter-copy-btn")
    word = L("march_word")
    desktop = page.viewport_size["width"] >= 900

    # --- both lists on screen at once (side by side on desktop, stacked on a phone) ---
    pa, pc = page.locator("#panel-attack").bounding_box(), page.locator("#panel-counter").bounding_box()
    check(f"{tag} both panels visible", page.locator("#panel-attack").is_visible() and page.locator("#panel-counter").is_visible())
    if desktop:
        first = (pa["x"] >= pc["x"] + pc["width"] - 1) if lang == "ar" else (pa["x"] + pa["width"] <= pc["x"] + 1)  # Attack leads the reading direction
        check(f"{tag} side by side (same top, Attack first)", abs(pa["y"] - pc["y"]) < 1 and first, f"{pa} {pc}")
        check(f"{tag} both panels start inside the first screen", pa["y"] < 200 and pc["y"] < 200)
    else:
        check(f"{tag} phone: Attack above Counter", pa["y"] + pa["height"] <= pc["y"] + 1, f"{pa} {pc}")
    check(f"{tag} no tab switch any more", page.locator("#list-switch, .list-btn").count() == 0)
    check(f"{tag} titles", page.inner_text("#list-name") == L("list_attack") and page.inner_text("#counter-list-name") == L("list_counter"))
    check(f"{tag} old saved list is the Attack list", page.locator("#panel-attack .caller-toggle[aria-checked=true]").count() == 3)
    check(f"{tag} Counter starts empty", page.locator("#panel-counter .caller-toggle").count() == 0 and page.locator("#counter-no-callers").is_visible())
    check(f"{tag} each panel has its own Copy", abtn.is_visible() and cbtn.is_hidden() and abtn.inner_text() == L("copy_attack_btn"))
    check(f"{tag} Counter has no wave controls", page.locator("#counter-waves-row, #counter-randomise-btn, #counter-gap-list").count() == 0)

    # --- settings fold away behind a summary; Land at stays in view ---
    check(f"{tag} settings folded by default", page.locator("#settings-body").is_hidden()
          and page.get_attribute("#settings-btn", "aria-expanded") == "false" and page.locator("#target-input").is_visible())
    react = page.evaluate("document.querySelector('#buffer-select').selectedOptions[0].textContent")
    want_sum = " \u00b7 ".join([L("sum_rally", L("minutes_n", 5)), L("sum_reaction", react), L("sum_waves", 1)])
    check(f"{tag} summary shows the state", page.inner_text("#settings-sum") == want_sum, page.inner_text("#settings-sum"))
    page.click("#settings-btn")
    expect(page.locator("#settings-body")).to_be_visible()
    check(f"{tag} settings open: aria-expanded", page.get_attribute("#settings-btn", "aria-expanded") == "true")
    opts = page.locator("#rally-duration-select option").evaluate_all("os => os.map(o => [o.value, o.textContent])")
    check(f"{tag} durations 1,2,3,5,10 min", [v for v, _ in opts] == ["60", "120", "180", "300", "600"], str(opts))
    check(f"{tag} duration labels translated", [x for _, x in opts] == [L("dur_n", n) for n in (1, 2, 3, 5, 10)], str(opts))
    check(f"{tag} default duration 5 min", page.input_value("#rally-duration-select") == "300")

    # --- build the Counter list through the UI (Attack stays on screen) ---
    page.click("#counter-settings-btn")
    page.fill("#counter-label-input", "BDE")
    expect(page.locator("#counter-list-name")).to_have_text(L("list_tab", "BDE"))
    for name, march in [("Kai", "0:48"), ("Moss", "1:12")]:
        page.click("#counter-add-caller-btn")
        row = page.locator("#counter-caller-list li").last
        row.locator(".name-input").fill(name)
        row.locator(".march-input").fill(march)
        row.locator(".march-input").press("Tab")
        check(f"{tag} Counter edit row has no wave menu", row.locator(".wave-select").count() == 0)
    page.click("#counter-edit-btn")
    expect(page.locator("#panel-counter .caller-toggle[aria-checked=true]")).to_have_count(2)
    check(f"{tag} Counter copy button carries the tag", cbtn.is_visible() and cbtn.inner_text() == L("copy_counter_btn", "BDE"), cbtn.inner_text())
    ba, bc = abtn.bounding_box(), cbtn.bounding_box()
    check(f"{tag} both Copy buttons big", ba["height"] >= 55 and bc["height"] >= 55, f"{ba} {bc}")
    if desktop:
        check(f"{tag} both Copy buttons at the same height", abs(ba["y"] - bc["y"]) < 1, f"{ba} {bc}")
    check(f"{tag} Copy colours differ (Attack accent, Counter red)",
          page.evaluate("getComputedStyle(document.querySelector('#copy-btn')).backgroundColor")
          != page.evaluate("getComputedStyle(document.querySelector('#counter-copy-btn')).backgroundColor"))

    # --- LIVE: both lists tick; Counter Copy copies the Counter only ---
    expect(page.locator("#counter-arrival-time")).to_have_text("18:06:42")
    check(f"{tag} Counter live times", c_times() == ["18:00:30", "18:00:54"], str(c_times()))
    check(f"{tag} Attack live times", a_times() == ["18:00:30", "18:01:20", "18:01:45"], str(a_times()))
    counter_text = "\n".join([L("copy_counter", "18:06:42"), f"18:00:30 - Moss ({word} 1:12)", f"18:00:54 - Kai ({word} 0:48)"])
    cbtn.click()
    expect(cbtn).to_have_text(L("copied"))
    expect(c_status).to_have_text(L("locked_ind"))
    check(f"{tag} Counter Copy -> Counter text only", clip() == counter_text, repr(clip()))
    check(f"{tag} Counter preview == clipboard", page.inner_text("#counter-copy-preview") == counter_text)
    check(f"{tag} freezing Counter leaves Attack LIVE", a_status.inner_text() == L("live_ind") and a_cd.is_hidden()
          and page.locator("#reset-btn").is_hidden() and page.locator("#lock-btn").is_visible())
    check(f"{tag} Attack preview has no Counter text", L("copy_counter", "18:06:42") not in page.inner_text("#copy-preview"))
    expect(c_cd).to_have_text(L("auto_reset_in", "5:00"))
    expect(cbtn).to_have_text(L("copy_counter_btn", "BDE"), timeout=4000)
    check(f"{tag} no horizontal scroll (counter frozen)", no_hscroll(page))
    os.makedirs(OUT, exist_ok=True)
    shot(page, f"{OUT}/{label}-battle-counter-frozen-{lang}.png")

    # --- 10s later: Attack follows the clock, Counter stays frozen ---
    go(10)
    check(f"{tag} Attack times follow the clock", a_times() == ["18:00:40", "18:01:30", "18:01:55"], str(a_times()))
    check(f"{tag} Counter times frozen", c_times() == ["18:00:30", "18:00:54"], str(c_times()))
    abtn.click()
    expect(a_status).to_have_text(L("locked_ind"))
    attack_text = "\n".join([L("copy_header", "18:07:25"), f"18:00:40 - Alpha ({word} 1:45)", f"18:01:30 - Bravo ({word} 0:55)", f"18:01:55 - Charlie ({word} 0:30)"])
    check(f"{tag} Attack Copy -> Attack text only (format unchanged)", clip() == attack_text, repr(clip()))
    expect(a_cd).to_have_text(L("auto_reset_in", "5:00"))
    expect(c_cd).to_have_text(L("auto_reset_in", "4:50"))
    check(f"{tag} Counter kept its frozen times", c_times() == ["18:00:30", "18:00:54"] and c_status.inner_text() == L("locked_ind"))
    shot(page, f"{OUT}/{label}-battle-both-frozen-{lang}.png")
    page.evaluate("navigator.clipboard.writeText('x')")
    cbtn.click()
    expect(cbtn).to_have_text(L("copied"))
    check(f"{tag} Counter re-copy = same text", clip() == counter_text)
    # a Counter duration change stays in Counter
    page.select_option("#counter-rally-duration-select", "60")
    check(f"{tag} Counter 1 min rally keeps the first start", c_times()[0] == "18:00:30" and page.inner_text("#counter-arrival-time") == "18:02:42",
          str(c_times()) + page.inner_text("#counter-arrival-time"))
    check(f"{tag} Attack duration unchanged (5 min)", page.input_value("#rally-duration-select") == "300"
          and page.inner_text("#arrival-time") == "18:07:25")
    check(f"{tag} Counter summary follows its duration", page.inner_text("#counter-settings-sum").startswith(L("sum_rally", L("minutes_n", 1))))
    page.select_option("#counter-rally-duration-select", "300")

    # --- reload: both lists, both freezes, the tag and the open settings survive ---
    page.reload()
    expect(a_status).to_have_text(L("locked_ind"))
    check(f"{tag} reload: Counter still locked", c_status.inner_text() == L("locked_ind"))
    check(f"{tag} reload: tag kept", page.inner_text("#counter-list-name") == L("list_tab", "BDE"))
    check(f"{tag} reload: unfolded settings remembered", page.locator("#settings-body").is_visible() and page.locator("#counter-settings-body").is_visible())

    # --- auto-reset per list: Counter (frozen at 0) resets at 5:00, Attack (frozen at 10) 10s later ---
    go(299)
    expect(c_cd).to_have_text(L("auto_reset_in", "0:01"))
    go(300)
    expect(toast).to_have_text(L("list_auto_reset", L("list_tab", "BDE")))
    expect(c_status).to_have_text(L("live_ind"))
    check(f"{tag} Attack still locked at 5:00", a_status.inner_text() == L("locked_ind") and a_cd.inner_text() == L("auto_reset_in", "0:10"), a_cd.inner_text())
    check(f"{tag} Counter is live after its auto-reset", c_times()[0] == "18:05:30", str(c_times()))
    go(310)
    expect(a_status).to_have_text(L("live_ind"))
    expect(toast).to_have_text(L("auto_reset_done"))

    # --- LOCK one, Reset the other: never touches the neighbour ---
    page.click("#lock-btn")
    page.click("#counter-lock-btn")
    page.click("#counter-reset-btn")
    expect(c_status).to_have_text(L("live_ind"))
    check(f"{tag} Counter Reset leaves Attack locked", a_status.inner_text() == L("locked_ind"))
    page.click("#reset-btn")
    expect(a_status).to_have_text(L("live_ind"))

    # --- Attack waves never leak into Counter ---
    page.click("#add-wave-btn")
    check(f"{tag} Counter stays single-wave when Attack has 2", page.locator("#panel-counter .wave-section").count() == 0
          and page.locator("#panel-counter .caller-toggle[role=checkbox]").count() == 2 and page.locator("#panel-attack .wave-section").count() == 2)
    check(f"{tag} Attack summary counts its waves", page.inner_text("#settings-sum").endswith(L("sum_waves", 2)))
    page.click("#remove-wave-btn")

    # --- folding the settings again is remembered too ---
    page.click("#settings-btn")
    page.reload()
    check(f"{tag} folded settings remembered", page.locator("#settings-body").is_hidden() and page.locator("#counter-settings-body").is_visible())

    small = page.evaluate("""[...document.querySelectorAll('#tab-rally button, #tab-rally select, #tab-rally input, .tab-btn, .chip')]
        .filter(e => e.offsetParent).map(e => [e.id || e.className, Math.round(e.getBoundingClientRect().height)])
        .filter(([, h]) => h < 44)""")
    check(f"{tag} tap targets >= 44px", not small, str(small))
    check(f"{tag} no horizontal scroll", no_hscroll(page))
    check(f"{tag} no console/CSP errors", not errors, str(errors))
    browser.close()


# the standard battle data: Attack 12 callers in 3 waves, Counter 5 callers of BDE
STD_ATTACK = [("Viscount", 34, 1), ("rima", 41, 1), ("Bravo", 65, 1), ("IceQueen", 52, 1), ("Alpha", 105, 2), ("Frosty", 47, 2),
              ("Kodiak", 73, 2), ("Nova", 38, 2), ("Charlie", 30, 3), ("Delta", 55, 3), ("Walrus", 61, 3), ("Yeti", 44, 3)]
STD_COUNTER = [("Kai", 48), ("Moss", 72), ("Sable", 39), ("Tundra", 57), ("Echo", 66)]


def seed_standard(page, lang="en"):
    import json
    a = [{"name": n, "marchSeconds": m, "selected": True, "wave": w} for n, m, w in STD_ATTACK]
    c = [{"name": n, "marchSeconds": m, "selected": True, "wave": 1} for n, m in STD_COUNTER]
    page.evaluate(f"localStorage.clear(); localStorage.setItem('app_lang', {json.dumps(lang)});"
                  f"localStorage.setItem('rally_callers', {json.dumps(json.dumps(a))});"
                  "localStorage.setItem('rally_waves', JSON.stringify({count: 3, defaultDelay: 10, gaps: [null, 20]}));"
                  f"localStorage.setItem('rally_counter_callers', {json.dumps(json.dumps(c))}); localStorage.setItem('rally_counter_label', 'BDE')")
    page.reload()


def battle_layout(pw, label, ctx_args, lang="en"):
    """The whole picture on one screen: no page scroll at 1440x900 / 1920x1080 with
    the standard data, every schedule row and roster chip in view, both Copy
    buttons in the first screen; no sideways scroll on a 390px phone."""
    tag = f"[layout/{label}/{lang}]"
    browser, page, errors = new_page(pw, ctx_args)
    page.clock.set_fixed_time(W0)
    gate_login(page)
    seed_standard(page, lang)
    page.click("#counter-copy-btn")   # one frozen, one live
    expect(page.locator("#counter-plan-status")).to_have_text(page.evaluate(f"RallyLang['{lang}'].locked_ind"))
    vw, vh = page.viewport_size["width"], page.viewport_size["height"]
    check(f"{tag} 12 + 5 rows in the schedules", page.locator("#panel-attack .schedule-item").count() == 12
          and page.locator("#panel-counter .schedule-item").count() == 5)
    check(f"{tag} no horizontal scroll", no_hscroll(page))
    if vw >= 1100:
        m = page.evaluate("""(() => {
            const d = document.documentElement, fits = s => [...document.querySelectorAll(s)].every(e => e.scrollHeight <= e.clientHeight + 1);
            const inView = s => [...document.querySelectorAll(s)].every(e => { const r = e.getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight + 1; });
            return { pageH: d.scrollHeight, schedFit: fits('.panel-schedule'), rosterFit: fits('.caller-list'),
                     rowsInView: inView('.schedule-item'), chipsInView: inView('.caller-toggle'), copyInView: inView('.btn-copy') };
        })()""")
        check(f"{tag} no page scroll", m["pageH"] <= vh, str(m))
        check(f"{tag} every schedule row in view (no inner scroll)", m["schedFit"] and m["rowsInView"], str(m))
        check(f"{tag} every roster chip in view", m["rosterFit"] and m["chipsInView"], str(m))
        check(f"{tag} both Copy buttons in view", m["copyInView"], str(m))
        # the passed warning takes the hint's place: nothing below it moves
        y0 = page.evaluate("document.querySelector('#counter-schedule-list').getBoundingClientRect().top")
        page.clock.set_fixed_time(W0 + dt.timedelta(seconds=31))
        expect(page.locator("#counter-schedule-warning")).to_be_visible()
        check(f"{tag} passed warning does not move the schedule", abs(page.evaluate("document.querySelector('#counter-schedule-list').getBoundingClientRect().top") - y0) < 1)
        check(f"{tag} still no page scroll when passed", page.evaluate("document.documentElement.scrollHeight") <= vh)
    page.screenshot(path=f"{OUT}/{label}-layout-{lang}.png", full_page=vw < 900)
    check(f"{tag} no console/CSP errors", not errors, str(errors))
    browser.close()


def themes_langs(pw, label, ctx_args):
    """3 themes render without console/CSP errors and are remembered; es/fr/de
    are in the language list and change the UI; Arabic RTL with both lists."""
    tag = f"[look/{label}]"
    browser, page, errors = new_page(pw, {**ctx_args, "reduced_motion": "reduce"})
    page.clock.set_fixed_time(C0)
    gate_login(page)
    page.evaluate(f"localStorage.clear(); localStorage.setItem('rally_callers', JSON.stringify({FIVE_OLD})); localStorage.setItem('rally_waves', JSON.stringify({{count: 3}}));"
                  "localStorage.setItem('rally_counter_callers', JSON.stringify([{name:'Kai',marchSeconds:48,wave:1},{name:'Moss',marchSeconds:72,wave:1}])); localStorage.setItem('rally_counter_label', 'BDE')")
    page.reload()
    os.makedirs(OUT, exist_ok=True)

    # --- themes ---
    opts = page.locator("#theme-select option").evaluate_all("os => os.map(o => o.value)")
    check(f"{tag} 3 themes offered", opts == ["ministry-dark", "reading", "low-glare"], str(opts))
    check(f"{tag} default theme stamps nothing", page.evaluate("document.documentElement.getAttribute('data-theme')") is None)
    bgs = {}
    for th in opts:
        hsel(page, "#theme-select", th)
        want = None if th == "ministry-dark" else th
        check(f"{tag} theme {th} applied", page.evaluate("document.documentElement.getAttribute('data-theme')") == want)
        bgs[th] = page.evaluate("getComputedStyle(document.body).backgroundColor")
        check(f"{tag} theme {th}: chip shows its name", page.inner_text("#theme-display") == page.evaluate(f"RallyLang.en[{{'ministry-dark':'theme_dark',reading:'theme_reading','low-glare':'theme_low_glare'}}['{th}']]"))
        shot(page, f"{OUT}/{label}-theme-{th}-live.png")
        page.click("#counter-copy-btn")
        expect(page.locator("#counter-plan-status")).to_have_text("LOCKED")
        check(f"{tag} theme {th}: Attack still LIVE beside the frozen Counter", page.inner_text("#plan-status") == "LIVE")
        shot(page, f"{OUT}/{label}-theme-{th}-counter-frozen.png")
        page.click("#counter-reset-btn")
        check(f"{tag} theme {th}: no horizontal scroll", no_hscroll(page))
    check(f"{tag} the 3 themes look different", len(set(bgs.values())) == 3, str(bgs))
    hsel(page, "#theme-select", "reading")
    page.reload()
    check(f"{tag} theme remembered", page.evaluate("document.documentElement.getAttribute('data-theme')") == "reading"
          and page.input_value("#theme-select") == "reading")
    hsel(page, "#theme-select", "ministry-dark")

    # --- languages ---
    langs = page.locator("#lang-select option").evaluate_all("os => os.map(o => o.value)")
    check(f"{tag} 9 languages listed", langs == LANGS9, str(langs))
    for code in ("es", "fr", "de"):
        hsel(page, "#lang-select", code)
        T = page.evaluate(f"RallyLang['{code}']")
        check(f"{tag} {code}: UI changes", page.evaluate("document.documentElement.lang") == code
              and page.inner_text("#copy-btn") == T["copy_attack_btn"] and page.inner_text(".tab-btn[data-tab=garrison]") == T["tab_garrison"]
              and page.inner_text("#list-name") == T["list_attack"] and page.inner_text("#lang-display") == T["lang_name"]
              and page.inner_text("#settings-btn") == T["settings_btn"],
              page.inner_text("#copy-btn"))
        check(f"{tag} {code}: left-to-right", page.evaluate("document.documentElement.dir") == "ltr")
        check(f"{tag} {code}: Counter labels", page.inner_text("#counter-list-name") == page.evaluate(f"RallyLang['{code}'].list_tab('BDE')")
              and page.inner_text("#counter-copy-btn") == page.evaluate(f"RallyLang['{code}'].copy_counter_btn('BDE')"))
        check(f"{tag} {code}: Counter preview heading", page.inner_text("#counter-copy-preview").split("\n")[0] == page.evaluate(f"RallyLang['{code}'].copy_counter('18:06:42')"),
              page.inner_text("#counter-copy-preview"))
        check(f"{tag} {code}: no horizontal scroll", no_hscroll(page))
        if code == "de":
            shot(page, f"{OUT}/{label}-battle-de.png")

    # --- Arabic: RTL, Counter heading in Arabic, Attack on the right ---
    hsel(page, "#lang-select", "ar")
    check(f"{tag} ar: RTL", page.evaluate("document.documentElement.dir") == "rtl")
    page.click("#counter-copy-btn")
    clip = page.evaluate("navigator.clipboard.readText()")
    check(f"{tag} ar: Counter clipboard heading", clip.split("\n")[0] == "هجوم مضاد - الوصول 18:06:42", repr(clip))
    if page.viewport_size["width"] >= 900:
        check(f"{tag} ar: Attack panel on the right", page.locator("#panel-attack").bounding_box()["x"] > page.locator("#panel-counter").bounding_box()["x"])
    check(f"{tag} ar: no horizontal scroll", no_hscroll(page))
    shot(page, f"{OUT}/{label}-battle-ar.png")
    page.click("#counter-reset-btn")
    hsel(page, "#lang-select", "en")
    check(f"{tag} no console/CSP errors", not errors, str(errors))
    browser.close()


ONLY_NEW = os.environ.get("ONLY") == "new"   # quick loop: just the Counter/look runs

with sync_playwright() as pw:
    if os.environ.get("ONLY") == "run":   # quick loop: the two basic runs only
        run(pw, "desktop", DESKTOP)
        run(pw, "iphone", iphone_device(pw))
    elif not ONLY_NEW:
        for lang in ("en", "ar"):
            gate_page(pw, "desktop", DESKTOP, lang)
            gate_page(pw, "iphone", iphone_device(pw), lang)
        for lang in ("es", "fr", "de"):
            gate_page(pw, "desktop", DESKTOP, lang)
        run(pw, "desktop", DESKTOP)
        run(pw, "iphone", iphone_device(pw))
        for lang in ("en", "ar"):
            live_freeze(pw, "desktop", DESKTOP, lang)
            live_freeze(pw, "iphone", iphone_device(pw), lang)
            waves(pw, "desktop", DESKTOP, lang)
            waves(pw, "iphone", iphone_device(pw), lang)
            auto_reset(pw, "desktop", DESKTOP, lang)
            auto_reset(pw, "iphone", iphone_device(pw), lang)
    # Battle view (both lists at once), layout, themes, languages (desktop 1440x900 primary + 390px phone)
    for lang in ("en", "ar"):
        battle_flow(pw, "desktop", DESKTOP, lang)
    battle_flow(pw, "iphone", iphone_device(pw), "en")
    battle_layout(pw, "desktop", DESKTOP, "en")
    battle_layout(pw, "desktop", DESKTOP, "ar")
    battle_layout(pw, "fullhd", {"viewport": {"width": 1920, "height": 1080}}, "en")
    battle_layout(pw, "iphone", iphone_device(pw), "en")
    themes_langs(pw, "desktop", DESKTOP)
    themes_langs(pw, "iphone", iphone_device(pw))
    if os.environ.get("INSECURE_URL") and not ONLY_NEW:  # e.g. http://hannah.localdomain:8096
        insecure_copy(pw, os.environ["INSECURE_URL"])

failed = [n for n, ok in results if not ok]
print(f"\n{len(results) - len(failed)}/{len(results)} checks passed")
sys.exit(1 if failed else 0)
