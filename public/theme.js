/* Colour theme (same three palettes as the event app, see tokens.css).
 * Loaded without defer in <head> so a saved theme is applied before the first
 * paint. The default (dark) stamps nothing; the others set data-theme on <html>.
 * The choice stays in this browser (localStorage), like the event app. */
(function () {
    'use strict';
    var THEMES = ['ministry-dark', 'reading', 'low-glare'];
    var DEFAULT = 'ministry-dark';
    var KEY = 'preferred_theme';
    // browser chrome colour per theme (= --c-dark-bg)
    var CHROME = { 'ministry-dark': '#0f1923', reading: '#f7f3e8', 'low-glare': '#1b2229' };

    function saved() {
        try {
            var v = localStorage.getItem(KEY);
            if (THEMES.indexOf(v) !== -1) return v;
        } catch (e) { /* private mode */ }
        return DEFAULT;
    }

    function apply(id) {
        if (THEMES.indexOf(id) === -1) id = DEFAULT;
        var root = document.documentElement;
        if (id === DEFAULT) root.removeAttribute('data-theme');
        else root.setAttribute('data-theme', id);
        var meta = document.querySelector('meta[name="theme-color"]');
        if (meta) meta.setAttribute('content', CHROME[id]);
        return id;
    }

    function choose(id) {
        id = apply(id);
        try { localStorage.setItem(KEY, id); } catch (e) { /* not saved; still applied */ }
        return id;
    }

    apply(saved());
    window.RallyTheme = { THEMES: THEMES, DEFAULT: DEFAULT, saved: saved, apply: apply, choose: choose };
})();
