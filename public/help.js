/* The guide page: renders RallyHelp[lang] (help-content.js). Text goes in with
 * textContent only. {key} in a sentence becomes the app's own label for that button
 * or menu (from i18n.js), in bold, so the guide always uses the words on screen. */
(function () {
    'use strict';
    var LANG = window.RallyLang, HELP = window.RallyHelp;
    var $ = function (id) { return document.getElementById(id); };

    function read(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
    function store(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* private mode */ } }

    function detectLang() {
        var saved = read('app_lang');
        if (saved && HELP[saved]) return saved;
        var prefs = navigator.languages || [navigator.language || 'en'];
        for (var i = 0; i < prefs.length; i++) {
            var code = String(prefs[i] || '').toLowerCase().split('-')[0];
            if (HELP[code]) return code;
        }
        return 'en';
    }

    // the button's own label, without a trailing colon or a leading "+" / "−"
    function label(lang, key) {
        var v = (LANG[lang] && LANG[lang][key]);
        if (typeof v !== 'string') v = LANG.en[key];
        return String(v == null ? key : v).replace(/^[+−]\s*/, '').replace(/\s*[:：]\s*$/, '');
    }

    function inline(parent, text, lang) {
        text.split(/(\{[a-z_0-9]+\})/i).forEach(function (part) {
            var m = /^\{([a-z_0-9]+)\}$/i.exec(part);
            if (m) {
                var s = document.createElement('strong');
                s.className = 'ui-label';
                s.textContent = label(lang, m[1]);
                parent.appendChild(s);
            } else if (part) {
                parent.appendChild(document.createTextNode(part));
            }
        });
    }

    function el(tag, parent, text, lang) {
        var e = document.createElement(tag);
        if (text != null) inline(e, text, lang);
        parent.appendChild(e);
        return e;
    }

    function render(lang) {
        var H = HELP[lang];
        document.documentElement.lang = lang;
        document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
        document.title = H.page_title + ' - ' + LANG[lang].title;
        $('help-back').textContent = (lang === 'ar' ? '→ ' : '← ') + H.back;
        $('help-title').textContent = H.page_title;
        $('help-toc-title').textContent = H.contents;
        $('help-lang').value = lang;
        if (window.RallyChangelog) $('help-changelog').textContent = window.RallyChangelog[lang].whats_new;
        $('help-lang').setAttribute('aria-label', LANG[lang].language || 'Language');

        var toc = $('help-toc-list'), body = $('help-body');
        toc.textContent = '';
        body.textContent = '';
        H.sections.forEach(function (sec) {
            var li = el('li', toc);
            var a = document.createElement('a');
            a.href = '#' + sec[0];
            a.textContent = sec[1];
            li.appendChild(a);

            var section = document.createElement('section');
            section.id = sec[0];
            section.setAttribute('aria-labelledby', 'h-' + sec[0]);
            var h2 = el('h2', section);
            h2.id = 'h-' + sec[0];
            h2.textContent = sec[1];
            sec[2].forEach(function (b) {
                var kind = b[0], v = b[1];
                if (kind === 'p') el('p', section, v, lang);
                else if (kind === 'h') el('h3', section, v, lang);
                else if (kind === 'pre') {
                    var pre = el('pre', section);
                    pre.textContent = v;
                    pre.dir = 'ltr';
                } else {
                    var list = el(kind, section);
                    v.forEach(function (item) { el('li', list, item, lang); });
                }
            });
            body.appendChild(section);
        });
    }

    var sel = $('help-lang');
    Object.keys(HELP).forEach(function (code) {
        var o = document.createElement('option');
        o.value = code;
        o.textContent = LANG[code].lang_name;
        o.lang = code;
        sel.appendChild(o);
    });
    sel.addEventListener('change', function () {
        store('app_lang', sel.value);
        render(sel.value);
    });
    render(detectLang());
    window.RallyHelpPage = { render: render, label: label };
})();
