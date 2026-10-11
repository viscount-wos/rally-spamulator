"""Battle-view screenshots for design review (not a test: prints layout facts).

Fills both lists with realistic data (Attack: 12 callers in 3 waves; Counter:
5 callers of BDE) and captures the states the layout must handle:
  battle-1440-attacklive-counterfrozen   battle-1920-attackfrozen-counterlive
  battle-1440-bothfrozen   battle-1440-ar   battle-1440-lowglare
  battle-1440-passed   battle-1440-edit   battle-1440-reading   battle-390 (full page)
Usage: python e2e/battle_shots.py [base_url]   -> e2e/out/battle-*.png
"""
import datetime as dt
import json
import os
import re
import sys

from playwright.sync_api import expect, sync_playwright

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8099"
GATE_PW = os.environ.get("GATE_PASSWORD", "test-gate-pw")
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "out")
T0 = dt.datetime(2026, 10, 9, 12, 0, 0, tzinfo=dt.timezone.utc)

ATTACK = [  # name, march s, wave
    ("Viscount", 34, 1), ("rima", 41, 1), ("Bravo", 65, 1), ("IceQueen", 52, 1),
    ("Alpha", 105, 2), ("Frosty", 47, 2), ("Kodiak", 73, 2), ("Nova", 38, 2),
    ("Charlie", 30, 3), ("Delta", 55, 3), ("Walrus", 61, 3), ("Yeti", 44, 3),
]
COUNTER = [("Kai", 48), ("Moss", 72), ("Sable", 39), ("Tundra", 57), ("Echo", 66)]


def seed(page, lang="en", theme=None):
    a = [{"name": n, "marchSeconds": m, "selected": True, "wave": w} for n, m, w in ATTACK]
    c = [{"name": n, "marchSeconds": m, "selected": True, "wave": 1} for n, m in COUNTER]
    js = (f"localStorage.clear(); localStorage.setItem('app_lang', {json.dumps(lang)});"
          f"localStorage.setItem('rally_callers', {json.dumps(json.dumps(a))});"
          f"localStorage.setItem('rally_waves', JSON.stringify({{count: 3, defaultDelay: 10, gaps: [null, 20]}}));"
          f"localStorage.setItem('rally_counter_callers', {json.dumps(json.dumps(c))});"
          "localStorage.setItem('rally_counter_label', 'BDE');")
    if theme:
        js += f"localStorage.setItem('preferred_theme', {json.dumps(theme)});"
    page.evaluate(js)
    page.reload()


def facts(page, name):
    f = page.evaluate("""(() => {
        const d = document.documentElement;
        const r = s => { const e = document.querySelector(s); if (!e) return null; const b = e.getBoundingClientRect(); return [Math.round(b.x), Math.round(b.y), Math.round(b.width), Math.round(b.height)]; };
        const sc = s => { const e = document.querySelector(s); return e ? [e.scrollHeight, e.clientHeight] : null; };
        return { vw: innerWidth, vh: innerHeight, docH: d.scrollHeight, docW: d.scrollWidth,
                 copyA: r('#copy-btn'), copyC: r('#counter-copy-btn'),
                 schedA: sc('#panel-attack .panel-schedule'), schedC: sc('#panel-counter .panel-schedule'),
                 rosterA: sc('#caller-list'), prevA: sc('#copy-preview') };
    })()""")
    print(name, json.dumps(f))


def main():
    os.makedirs(OUT, exist_ok=True)
    with sync_playwright() as pw:
        browser = pw.chromium.launch()

        def ctx_page(w, h, mobile=False):
            args = {"viewport": {"width": w, "height": h}}
            if mobile:
                args.update(device_scale_factor=2, is_mobile=True, has_touch=True)
            ctx = browser.new_context(**args, locale="en-GB")
            ctx.grant_permissions(["clipboard-read", "clipboard-write"], origin=BASE)
            page = ctx.new_page()
            page.clock.set_fixed_time(T0)
            page.goto(BASE)
            if "/login" in page.url:
                page.fill("#password", GATE_PW)
                page.click("#gate-submit")
                expect(page).to_have_url(re.compile(re.escape(BASE) + "/$"))
            return page

        def at(page, sec):
            t = T0 + dt.timedelta(seconds=sec)
            page.clock.set_fixed_time(t)
            expect(page.locator("#utc-clock")).to_have_text(t.strftime("%H:%M:%S"))

        # 1) 1440: Attack LIVE, Counter frozen 28s ago
        page = ctx_page(1440, 900)
        seed(page)
        page.click("#counter-copy-btn")
        at(page, 28)
        page.screenshot(path=f"{OUT}/battle-1440-attacklive-counterfrozen.png")
        facts(page, "1440 live/frozen")
        # 3) both frozen
        page.click("#copy-btn")
        at(page, 31)
        page.screenshot(path=f"{OUT}/battle-1440-bothfrozen.png")
        facts(page, "1440 both frozen")
        # passed: Counter's first start (30s) has passed
        at(page, 45)
        page.screenshot(path=f"{OUT}/battle-1440-passed.png")
        # edit mode on Attack
        page.click("#counter-reset-btn")
        page.click("#reset-btn")
        page.click("#edit-btn")
        page.screenshot(path=f"{OUT}/battle-1440-edit.png")
        facts(page, "1440 edit")
        page.context.close()

        # 2) 1920: Attack frozen, Counter LIVE
        page = ctx_page(1920, 1080)
        seed(page)
        page.click("#copy-btn")
        at(page, 12)
        page.screenshot(path=f"{OUT}/battle-1920-attackfrozen-counterlive.png")
        facts(page, "1920 frozen/live")
        page.context.close()

        # 4) Arabic, 5) Low Glare, Reading (Attack live, Counter frozen)
        for lang, theme, name in (("ar", None, "ar"), ("en", "low-glare", "lowglare"), ("en", "reading", "reading")):
            page = ctx_page(1440, 900)
            seed(page, lang, theme)
            page.click("#counter-copy-btn")
            at(page, 20)
            page.screenshot(path=f"{OUT}/battle-1440-{name}.png")
            facts(page, f"1440 {name}")
            page.context.close()

        # 6) 390px phone, full page
        page = ctx_page(390, 844, mobile=True)
        seed(page)
        page.click("#counter-copy-btn")
        at(page, 10)
        page.evaluate("window.scrollTo(0, 0); document.querySelector('.clock').style.position = 'static'")
        page.screenshot(path=f"{OUT}/battle-390.png", full_page=True)
        facts(page, "390")
        page.context.close()
        browser.close()


main()
