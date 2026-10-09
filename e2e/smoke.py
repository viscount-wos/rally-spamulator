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
    "Start times UTC - land 00:05:00",
    "23:58:15 - Alpha (march 1:45)",
    "23:59:05 - Bravo (march 0:55)",
    "23:59:30 - Charlie (march 0:30)",
])
EXPECTED_AR = "\n".join([
    "أوقات البدء UTC - الوصول 00:05:00",
    "23:58:15 - Alpha (مسيرة 1:45)",
    "23:59:05 - Bravo (مسيرة 0:55)",
    "23:59:30 - Charlie (مسيرة 0:30)",
])

results = []


def check(name, cond, detail=""):
    results.append((name, bool(cond)))
    print(("PASS " if cond else "FAIL ") + name + (("  -- " + detail) if (detail and not cond) else ""))


def shot(page, path):
    # Full-page screenshots draw the sticky clock mid-page; unstick it for the capture.
    page.evaluate("document.querySelector('.clock').style.position = 'static'")
    page.screenshot(path=path, full_page=True)
    page.evaluate("document.querySelector('.clock').style.position = ''")


def gate_login(page, url=None):
    """Open the app; the gate redirects to /login, then sign in with the password."""
    base = url or BASE
    page.goto(base)
    expect(page).to_have_url(re.compile(re.escape(base) + r"/login\?next="))
    page.fill("#password", GATE_PW)
    page.click("#gate-submit")
    expect(page).to_have_url(base + "/")


def no_hscroll(page):
    return page.evaluate("document.documentElement.scrollWidth <= window.innerWidth + 1")


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

    # --- clear with confirm ---
    page.click("#clear-btn")
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
    page.select_option("#lang-select", "ar")
    check(f"[{label}] RTL", page.evaluate("document.documentElement.dir") == "rtl")
    expect(page.locator("#copy-btn")).to_have_text("نسخ الجدول")
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


T0 = dt.datetime(2026, 10, 9, 23, 58, 0, tzinfo=dt.timezone.utc)  # live plan lands after midnight UTC
THREE = "[{name:'Bravo',marchSeconds:55,selected:true},{name:'Alpha',marchSeconds:105,selected:true},{name:'Charlie',marchSeconds:30,selected:true}]"


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
    page.evaluate(f"localStorage.clear(); localStorage.setItem('app_lang', '{lang}'); localStorage.setItem('rally_callers', JSON.stringify({THREE}))")
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
    check(f"{tag} LOCK button becomes Reset", page.inner_text("#lock-btn") == L("reset_btn"))
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
    page.evaluate(f"localStorage.clear(); localStorage.setItem('app_lang', '{lang}'); localStorage.setItem('rally_callers', JSON.stringify({FIVE_OLD}))")
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
        L("copy_header_waves"),
        L("copy_wave", 1, "12:07:05"), f"12:01:00 - Bravo ({word} 1:05)", f"12:01:31 - rima ({word} 0:34)",
        L("copy_wave", 2, "12:07:15"), f"12:00:30 - Alpha ({word} 1:45)",
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
    ctx = browser.new_context(**ctx_args, locale="ar" if lang == "ar" else "en-GB",
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


with sync_playwright() as pw:
    for lang in ("en", "ar"):
        gate_page(pw, "desktop", {"viewport": {"width": 1280, "height": 900}}, lang)
        gate_page(pw, "iphone", iphone_device(pw), lang)
    run(pw, "desktop", {"viewport": {"width": 1280, "height": 900}})
    run(pw, "iphone", iphone_device(pw))
    for lang in ("en", "ar"):
        live_freeze(pw, "desktop", {"viewport": {"width": 1280, "height": 900}}, lang)
        live_freeze(pw, "iphone", iphone_device(pw), lang)
        waves(pw, "desktop", {"viewport": {"width": 1280, "height": 900}}, lang)
        waves(pw, "iphone", iphone_device(pw), lang)
    if os.environ.get("INSECURE_URL"):  # e.g. http://hannah.localdomain:8096
        insecure_copy(pw, os.environ["INSECURE_URL"])

failed = [n for n, ok in results if not ok]
print(f"\n{len(results) - len(failed)}/{len(results)} checks passed")
sys.exit(1 if failed else 0)
