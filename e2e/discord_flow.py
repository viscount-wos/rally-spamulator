"""Discord posting (Advanced): set up a channel, tick Post to Discord, Copy posts too.
The relay is stubbed in the browser (no real Discord). Usage: discord_flow.py <url>"""
import json, sys
from playwright.sync_api import sync_playwright

URL = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:8097'
HOOK = 'https://discord.com/api/webhooks/123456789012345678/' + 'A' * 40
fails = []
def check(name, ok, extra=''):
    print(('ok   ' if ok else 'FAIL ') + name + (' ' + str(extra) if extra and not ok else ''))
    if not ok: fails.append(name)

with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={'width': 1440, 'height': 900}, permissions=['clipboard-read', 'clipboard-write'])
    page = ctx.new_page()
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.on('console', lambda m: errors.append(m.text) if m.type == 'error' else None)
    sent = []
    mode = {'ok': True}
    def relay(route):
        sent.append(json.loads(route.request.post_data))
        route.fulfill(status=200 if mode['ok'] else 502, content_type='application/json',
                      body=json.dumps({'ok': True} if mode['ok'] else {'error': 'discord'}))
    page.route('**/api/discord', relay)
    page.add_init_script("""if (!localStorage.getItem('seeded')) { localStorage.setItem('seeded','1');
      localStorage.setItem('rally_callers', JSON.stringify([{name:'Alpha',marchSeconds:105,wave:1},{name:'Bravo',marchSeconds:55,wave:1}]));
      localStorage.setItem('rally_ui_open', JSON.stringify({attack:true,counter:true})); }""")
    page.goto(URL)
    page.wait_for_selector('#copy-btn:not([hidden])')

    check('copy label plain by default', page.inner_text('#copy-btn .copy-label').strip() == 'Copy Attack')
    check('Advanced body closed by default', page.is_hidden('#adv-body'))
    page.click('#adv-btn')
    check('Advanced opens (both panels mirror)', page.is_visible('#adv-body') and page.is_visible('#counter-adv-body'))

    page.fill('#dc-url', 'https://evil.com/x'); page.click('#dc-add')
    check('bad URL rejected with message', page.is_visible('#dc-error'))
    page.fill('#dc-name', 'LOV'); page.fill('#dc-url', HOOK); page.click('#dc-add')
    check('channel added, selected, mirrored', page.inner_text('#dc-select option:checked') == 'LOV'
          and page.inner_text('#counter-dc-select option:checked') == 'LOV')
    check('URL kept out of the page text', HOOK not in page.inner_text('body'))

    page.click('#copy-btn')
    page.wait_for_timeout(300)
    check('untick: copy does not post', len(sent) == 0)
    page.wait_for_timeout(1700)   # the button shows Copied! for 1.5 s
    page.click('#dc-on')
    check('tick mirrors on counter panel', page.is_checked('#counter-dc-on'))
    check('label shows + Discord (attack)', page.inner_text('#copy-btn .copy-label').strip().endswith('+ Discord'))
    check('label shows + Discord (counter)', page.inner_text('#counter-copy-btn .copy-label').strip().endswith('+ Discord'), page.inner_text('#counter-copy-btn .copy-label'))

    page.click('#copy-btn')
    page.wait_for_timeout(500)
    check('posted once with channel URL + same text as clipboard', len(sent) == 1 and sent[0]['url'] == HOOK
          and sent[0]['text'] == page.evaluate('navigator.clipboard.readText()'))
    check('success toast', 'Posted to Discord' in page.inner_text('#plan-toast'), page.inner_text('#plan-toast'))
    page.screenshot(path='e2e/out/discord-open.png')

    mode['ok'] = False
    page.click('#copy-btn'); page.wait_for_timeout(500)
    check('failure: toast says Discord failed, copy still done', 'Discord post failed' in page.inner_text('#plan-toast')
          and 'Alpha' in page.evaluate('navigator.clipboard.readText()'))

    page.reload(); page.wait_for_selector('#copy-btn:not([hidden])')
    check('saved across reload', page.is_checked('#dc-on') and page.inner_text('#dc-select option:checked') == 'LOV')
    page.click('#dc-list .btn')
    check('remove channel: label back to plain', page.inner_text('#copy-btn .copy-label').strip() == 'Copy Attack')
    page.click('#copy-btn'); page.wait_for_timeout(300)
    check('ticked with no channel: hint, no post', 'Advanced' in page.inner_text('#plan-toast') and len(sent) == 2, page.inner_text('#plan-toast'))
    errors = [e for e in errors if '502' not in e]   # the stubbed failure
    check('no console errors', not errors, errors)
    b.close()
sys.exit(1 if fails else 0)
