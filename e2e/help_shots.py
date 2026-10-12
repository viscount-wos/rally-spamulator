"""Guide page: screenshots + checks. Usage: python e2e/help_shots.py [base_url] -> e2e/out/help-*.png"""
import os, re, sys
from playwright.sync_api import expect, sync_playwright

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8096"
GATE_PW = os.environ.get("GATE_PASSWORD", "test-gate-pw")
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "out")
CODES = ["en", "es", "fr", "de", "pl", "ko", "zh", "tr", "ar"]
bad = []


def check(name, ok, extra=""):
    print(("PASS " if ok else "FAIL ") + name, extra if not ok else "")
    if not ok:
        bad.append(name)


def main():
    os.makedirs(OUT, exist_ok=True)
    with sync_playwright() as pw:
        b = pw.chromium.launch()
        for w, h, tag in ((1440, 900, "1440"), (390, 844, "390")):
            ctx = b.new_context(viewport={"width": w, "height": h}, locale="en-GB")
            page = ctx.new_page()
            errors = []
            page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
            page.goto(BASE)
            if "/login" in page.url:
                page.fill("#password", GATE_PW)
                page.click("#gate-submit")
                expect(page).to_have_url(re.compile(re.escape(BASE) + "/$"))
            for code in CODES:
                page.evaluate(f"localStorage.setItem('app_lang', '{code}')")
                page.goto(BASE + "/")
                hdr = page.evaluate("document.querySelector('#site-header').getBoundingClientRect().height")
                if w >= 1100:
                    check(f"[{tag}/{code}] header stays one row", hdr < 80, str(hdr))
                page.click("#guide-link")
                expect(page).to_have_url(re.compile("/help$"))
                page.wait_for_selector("#help-body section")
                check(f"[{tag}/{code}] guide lang", page.evaluate("document.documentElement.lang") == code)
                check(f"[{tag}/{code}] 8 sections", page.locator("#help-body section").count() == 8)
                check(f"[{tag}/{code}] no raw {{tokens}}", "{" not in page.inner_text("#help-body"))
                check(f"[{tag}/{code}] no sideways scroll", page.evaluate("document.documentElement.scrollWidth <= innerWidth"))
                check(f"[{tag}/{code}] rtl only for ar", (page.evaluate("document.documentElement.dir") == "rtl") == (code == "ar"))
                if code in ("en", "ar", "ko", "de"):
                    page.screenshot(path=f"{OUT}/help-{tag}-{code}.png")
                page.go_back()
            # language switch on the page is remembered by the tool
            page.goto(BASE + "/help")
            page.select_option("#help-lang", "fr")
            page.goto(BASE + "/")
            check(f"[{tag}] language shared with the tool", page.evaluate("document.documentElement.lang") == "fr")
            page.goto(BASE + "/help")
            page.click("#help-back")
            expect(page).to_have_url(re.compile(re.escape(BASE) + "/$"))
            check(f"[{tag}] no console errors", not errors, str(errors))
            ctx.close()
        b.close()
    print(f"{'FAILED ' + str(len(bad)) if bad else 'all passed'}")
    sys.exit(1 if bad else 0)


main()
