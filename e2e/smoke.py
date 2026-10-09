"""Playwright smoke test for the stripped-back Rally Spamulator.

Runs on a desktop viewport and an iPhone 13 viewport (Chromium):
adds 3 callers, checks the computed start times (rally crossing midnight UTC),
copies and asserts the clipboard text, exercises reorder / import / export /
clear / persistence, Garrison Defense, and Arabic RTL. Saves screenshots to
e2e/out/.

Usage:  python e2e/smoke.py [base_url]     (default http://localhost:8096)
Needs:  pip install playwright && playwright install chromium
"""
import datetime as dt
import os
import sys

from playwright.sync_api import expect, sync_playwright

BASE = sys.argv[1] if len(sys.argv) > 1 else os.environ.get("BASE_URL", "http://localhost:8096")
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

    page.goto(BASE)
    page.evaluate("localStorage.clear()")
    page.reload()
    expect(page.locator("#utc-clock")).to_have_text("23:50:00")

    # --- add 3 callers (edit mode opens automatically) ---
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

    # --- reorder + export ---
    page.click("#edit-btn")
    page.locator("#caller-list li").nth(2).get_by_role("button", name="Move up").click()
    page.click("#edit-btn")
    page.locator("#import-box summary").click()
    page.click("#export-btn")
    exported = page.input_value("#import-text")
    check(f"[{label}] export reflects reorder", exported == "Bravo, 0:55\nCharlie, 0:30\nAlpha, 1:45", repr(exported))
    check(f"[{label}] export copied to clipboard", page.evaluate("navigator.clipboard.readText()") == exported)

    # --- import (replace) ---
    page.fill("#import-text", "Delta, 2:00\nEcho 1:00\nnot a caller\nFoxtrot;45")
    page.click("#import-replace-btn")
    expect(page.locator(".caller-toggle")).to_have_count(3)
    check(f"[{label}] import status", "Imported 3" in page.inner_text("#import-status") and "1" in page.inner_text("#import-status"))
    check(f"[{label}] bad line left in box", page.input_value("#import-text") == "not a caller")
    expect(page.locator(".si-name").first).to_have_text("Delta")

    # --- clear with confirm ---
    page.click("#clear-btn")
    expect(page.locator(".caller-toggle")).to_have_count(0)
    expect(page.locator("#no-callers")).to_be_visible()
    expect(page.locator("#copy-btn")).to_be_hidden()

    # restore the 3 callers for the Arabic run
    page.fill("#import-text", "Bravo, 0:55\nAlpha, 1:45\nCharlie, 0:30")
    page.click("#import-replace-btn")

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
    page.goto(url)
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


def iphone_device(pw):
    d = dict(pw.devices["iPhone 13"])
    d.pop("default_browser_type", None)
    return d


with sync_playwright() as pw:
    run(pw, "desktop", {"viewport": {"width": 1280, "height": 900}})
    run(pw, "iphone", iphone_device(pw))
    if os.environ.get("INSECURE_URL"):  # e.g. http://hannah.localdomain:8096
        insecure_copy(pw, os.environ["INSECURE_URL"])

failed = [n for n, ok in results if not ok]
print(f"\n{len(results) - len(failed)}/{len(results)} checks passed")
sys.exit(1 if failed else 0)
