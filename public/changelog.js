/* "What's new": renders RallyChangelog[lang] (changelog-content.js), newest first.
 * Text goes in with textContent only. The language is the one saved in the tool (app_lang). */
(function () {
    'use strict';
    var LANG = window.RallyLang, CL = window.RallyChangelog, HELP = window.RallyHelp;
    var $ = function (id) { return document.getElementById(id); };
    function read(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
    function store(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* private mode */ } }

    function detectLang() {
        var saved = read('app_lang');
        if (saved && CL[saved]) return saved;
        var prefs = navigator.languages || [navigator.language || 'en'];
        for (var i = 0; i < prefs.length; i++) {
            var code = String(prefs[i] || '').toLowerCase().split('-')[0];
            if (CL[code]) return code;
        }
        return 'en';
    }

    function fmtDate(iso, lang) {
        try {
            return new Intl.DateTimeFormat(lang, { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' })
                .format(new Date(iso + 'T00:00:00Z'));
        } catch (e) { return iso; }
    }

    function render(lang) {
        var C = CL[lang];
        document.documentElement.lang = lang;
        document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
        document.title = C.whats_new + ' - ' + LANG[lang].title;
        $('help-back').textContent = (lang === 'ar' ? '→ ' : '← ') + HELP[lang].back;
        $('help-title').textContent = C.whats_new;
        $('cl-guide').textContent = HELP[lang].page_title;
        $('help-lang').value = lang;
        $('help-lang').setAttribute('aria-label', LANG[lang].language || 'Language');
        var body = $('cl-body');
        body.textContent = '';
        C.releases.forEach(function (r) {
            var sec = document.createElement('section');
            sec.className = 'release';
            sec.setAttribute('aria-labelledby', 'r-' + r.id);
            var h2 = document.createElement('h2');
            h2.id = 'r-' + r.id;
            h2.appendChild(document.createTextNode(r.title));
            var time = document.createElement('time');
            time.dateTime = r.date;
            time.textContent = fmtDate(r.date, lang);
            h2.appendChild(time);
            sec.appendChild(h2);
            var ul = document.createElement('ul');
            r.items.forEach(function (t) {
                var li = document.createElement('li');
                li.textContent = t;
                ul.appendChild(li);
            });
            sec.appendChild(ul);
            body.appendChild(sec);
        });
    }

    var sel = $('help-lang');
    Object.keys(CL).forEach(function (code) {
        var o = document.createElement('option');
        o.value = code;
        o.textContent = LANG[code].lang_name;
        o.lang = code;
        sel.appendChild(o);
    });
    sel.addEventListener('change', function () { store('app_lang', sel.value); render(sel.value); });
    render(detectLang());
})();
