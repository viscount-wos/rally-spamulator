/* Rally Spamulator UI. No server state: everything lives in localStorage. */
(function () {
    'use strict';
    var C = window.RallyCore;
    var LANG = window.RallyLang;
    var formatUTC = C.formatUTC, formatMarch = C.formatMarch, parseMarch = C.parseMarch, pad = C.pad;

    function $(id) { return document.getElementById(id); }
    function el(tag, cls, text) {
        var e = document.createElement(tag);
        if (cls) e.className = cls;
        if (text !== undefined && text !== null) e.textContent = text;
        return e;
    }
    function store(key, val) { try { localStorage.setItem(key, val); } catch (e) { /* private mode */ } }
    function read(key) { try { return localStorage.getItem(key); } catch (e) { return null; } }

    // ===== i18n =====
    var currentLang = 'en';
    function t(key) { var v = LANG[currentLang][key]; return v !== undefined ? v : (LANG.en[key] !== undefined ? LANG.en[key] : key); }

    // saved choice > supported phone/browser language > English
    function detectLang() {
        var saved = read('app_lang');
        if (saved && LANG[saved]) return saved;
        var prefs = navigator.languages || [navigator.language || 'en'];
        for (var i = 0; i < prefs.length; i++) {
            var code = String(prefs[i] || '').toLowerCase().split('-')[0];
            if (LANG[code]) return code;
        }
        return 'en';
    }

    function setLang(code, save) {
        if (!LANG[code]) code = 'en';
        currentLang = code;
        if (save) store('app_lang', code);
        $('lang-select').value = code;
        document.documentElement.lang = code;
        document.documentElement.dir = code === 'ar' ? 'rtl' : 'ltr';
        document.title = t('title');
        document.querySelectorAll('[data-i18n]').forEach(function (e) { e.textContent = t(e.dataset.i18n); });
        document.querySelectorAll('[data-i18n-ph]').forEach(function (e) { e.placeholder = t(e.dataset.i18nPh); });
        renderLock();
        $('edit-btn').textContent = editMode ? t('done_btn') : t('edit_list');
        renderCallers();
        renderEnemies();
        lastPreview = null;
        updateSchedule();
        updateActiveRallies();
    }

    // ===== Rally Spam state =====
    var callers = [];          // { id, name, marchSeconds, selected }
    var nextId = 1;
    var bufferSeconds = 30;
    var rallyDurationSeconds = 300;
    var lockedArrivalMs = null; // null = auto (next clean slot); number = fixed arrival
    var editMode = false;
    var lastPreview = null;

    function selectedCallers() { return callers.filter(function (c) { return c.selected; }); }

    function getArrivalMs() {
        if (lockedArrivalMs !== null) return lockedArrivalMs;
        return C.autoArrivalMs(Date.now(), bufferSeconds, rallyDurationSeconds, C.longestMarch(selectedCallers()));
    }

    function saveState() {
        store('rally_callers', JSON.stringify(callers.map(function (c) {
            return { name: c.name, marchSeconds: c.marchSeconds, selected: c.selected };
        })));
    }

    function loadState() {
        try {
            var data = JSON.parse(read('rally_callers'));
            if (Array.isArray(data)) {
                callers = data.map(function (c) {
                    return { id: nextId++, name: c.name || '', marchSeconds: c.marchSeconds || 45, selected: !!c.selected };
                });
            }
        } catch (e) { /* ignore */ }
        var b = parseInt(read('rally_buffer'), 10);
        if (b) { bufferSeconds = b; $('buffer-select').value = String(b); }
        var d = parseInt(read('rally_duration'), 10);
        if (d) { rallyDurationSeconds = d; $('rally-duration-select').value = String(d); }
        var a = parseInt(read('rally_arrival_ms'), 10);
        if (a && a > Date.now() - 3600 * 1000) lockedArrivalMs = a;
    }

    // ===== Callers list =====
    function renderCallers() {
        var list = $('caller-list');
        list.textContent = '';
        callers.forEach(function (c, idx) {
            var li = el('li');
            if (!editMode) {
                var b = el('button', 'caller-toggle');
                b.type = 'button';
                b.setAttribute('role', 'checkbox');
                b.setAttribute('aria-checked', c.selected ? 'true' : 'false');
                b.appendChild(el('span', 'box', c.selected ? '\u2713' : ''));
                b.appendChild(el('span', 'ct-name', c.name || t('unnamed')));
                b.appendChild(el('span', 'ct-march', formatMarch(c.marchSeconds)));
                b.addEventListener('click', function () {
                    c.selected = !c.selected;
                    saveState();
                    renderCallers();
                    updateSchedule();
                });
                li.appendChild(b);
            } else {
                li.className = 'caller-row';
                var name = el('input', 'name-input');
                name.type = 'text';
                name.value = c.name;
                name.placeholder = t('ph_name');
                name.maxLength = 40;
                name.addEventListener('input', function () { c.name = this.value; saveState(); updateSchedule(); });

                var march = el('input', 'march-input');
                march.type = 'text';
                march.inputMode = 'numeric';
                march.value = formatMarch(c.marchSeconds);
                march.placeholder = 'M:SS';
                march.setAttribute('aria-label', t('col_march'));
                march.addEventListener('change', function () {
                    var v = parseMarch(this.value);
                    if (v > 0) c.marchSeconds = v;
                    this.value = formatMarch(c.marchSeconds);
                    saveState();
                    updateSchedule();
                });

                li.appendChild(name);
                li.appendChild(march);
                li.appendChild(iconBtn('\u25B2', t('move_up'), idx === 0, function () { move(idx, -1); }));
                li.appendChild(iconBtn('\u25BC', t('move_down'), idx === callers.length - 1, function () { move(idx, 1); }));
                var del = iconBtn('\u2715', t('remove'), false, function () {
                    callers = callers.filter(function (x) { return x.id !== c.id; });
                    saveState(); renderCallers(); updateSchedule();
                });
                del.className = 'btn btn-danger';
                li.appendChild(del);
            }
            list.appendChild(li);
        });
    }

    function iconBtn(text, label, disabled, onClick) {
        var b = el('button', 'btn btn-icon', text);
        b.type = 'button';
        b.title = label;
        b.setAttribute('aria-label', label);
        b.disabled = disabled;
        b.addEventListener('click', onClick);
        return b;
    }

    function move(idx, dir) {
        var j = idx + dir;
        if (j < 0 || j >= callers.length) return;
        var tmp = callers[idx]; callers[idx] = callers[j]; callers[j] = tmp;
        saveState(); renderCallers(); updateSchedule();
    }

    function setEditMode(on) {
        editMode = on;
        $('edit-btn').textContent = on ? t('done_btn') : t('edit_list');
        $('edit-btn').classList.toggle('active', on);
        renderCallers();
    }

    function addCaller() {
        callers.push({ id: nextId++, name: '', marchSeconds: 45, selected: true });
        saveState();
        setEditMode(true);
        updateSchedule();
        var inputs = $('caller-list').querySelectorAll('.name-input');
        if (inputs.length) inputs[inputs.length - 1].focus();
    }

    // ===== Arrival lock / target =====
    function renderLock() {
        var locked = lockedArrivalMs !== null;
        var btn = $('lock-btn');
        btn.textContent = locked ? t('unlock') : t('lock');
        btn.classList.toggle('active', locked);
        btn.setAttribute('aria-pressed', locked ? 'true' : 'false');
        $('arrival-display').classList.toggle('locked', locked);
        var input = $('target-input');
        if (document.activeElement !== input) input.value = locked ? formatUTC(lockedArrivalMs) : '';
    }

    function setLocked(ms) {
        lockedArrivalMs = ms;
        if (ms === null) { try { localStorage.removeItem('rally_arrival_ms'); } catch (e) { /* ignore */ } }
        else store('rally_arrival_ms', String(ms));
        $('target-error').hidden = true;
        renderLock();
        updateSchedule();
    }

    function applyTargetInput() {
        var v = $('target-input').value.trim();
        if (!v) { setLocked(null); return; }
        var sec = C.parseClock(v);
        if (sec === null) { $('target-error').hidden = false; return; }
        setLocked(C.resolveTargetMs(sec, Date.now()));
    }

    // ===== Schedule =====
    function formatCountdown(secs) {
        if (secs <= 0) return t('now_label');
        return LANG[currentLang].fmtCountdown(Math.floor(secs / 60), pad(secs % 60));
    }

    function currentCopyText() {
        var sel = selectedCallers();
        if (!sel.length) return '';
        return C.buildCopyText(sel, getArrivalMs(), rallyDurationSeconds, LANG[currentLang]);
    }

    function updateSchedule() {
        var sel = selectedCallers();
        var listEl = $('schedule-list');
        var warningEl = $('schedule-warning');
        var empty = sel.length === 0;
        $('no-callers').hidden = !empty;
        $('copy-btn').hidden = empty;
        $('preview-wrap').hidden = empty;
        if (empty) {
            listEl.textContent = '';
            warningEl.hidden = true;
            $('arrival-time').textContent = '--:--:--';
            return;
        }

        var arrivalMs = getArrivalMs();
        var now = Date.now();
        $('arrival-time').textContent = formatUTC(arrivalMs);
        var schedule = C.buildSchedule(sel, arrivalMs, rallyDurationSeconds);

        var overdue = schedule.some(function (s) { return s.setOffMs < now; });
        warningEl.hidden = !overdue;
        if (overdue) warningEl.textContent = t('warning_overdue_1') + formatMarch(schedule[0].marchSeconds) + t('warning_overdue_2');

        listEl.textContent = '';
        schedule.forEach(function (s) {
            var secsUntil = Math.floor((s.setOffMs - now) / 1000);
            var isOverdue = secsUntil < 0;
            var isImminent = !isOverdue && secsUntil <= 10;
            var li = el('li', 'schedule-item' + (isOverdue ? ' overdue' : '') + (isImminent ? ' imminent' : ''));
            var left = el('div', 'si-left');
            left.appendChild(el('div', 'si-name', s.name || t('unnamed')));
            left.appendChild(el('div', 'si-march', t('march_prefix') + formatMarch(s.marchSeconds)));
            var right = el('div', 'si-right');
            right.appendChild(el('div', 'si-label', t('call_at')));
            right.appendChild(el('div', 'si-time', formatUTC(s.setOffMs)));
            right.appendChild(el('div', 'si-countdown',
                isOverdue ? LANG[currentLang].fmtAgo(Math.abs(secsUntil)) : formatCountdown(secsUntil)));
            li.appendChild(left);
            li.appendChild(right);
            listEl.appendChild(li);
        });

        var text = currentCopyText();
        if (text !== lastPreview) { $('copy-preview').textContent = text; lastPreview = text; }
    }

    // ===== Clipboard =====
    // navigator.clipboard only exists on https/localhost; fall back to a
    // hidden textarea + execCommand so plain-http LAN copies work too.
    function copyText(text) {
        if (navigator.clipboard && window.isSecureContext) {
            return navigator.clipboard.writeText(text).then(function () { return true; }, function () { return legacyCopy(text); });
        }
        return Promise.resolve(legacyCopy(text));
    }
    function legacyCopy(text) {
        var ta = el('textarea', 'offscreen');
        ta.value = text;
        ta.setAttribute('readonly', '');
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        ta.setSelectionRange(0, text.length);
        var ok = false;
        try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
        document.body.removeChild(ta);
        return ok;
    }
    function selectNode(node) {
        var r = document.createRange();
        r.selectNodeContents(node);
        var s = window.getSelection();
        s.removeAllRanges();
        s.addRange(r);
    }

    function copySchedule() {
        var text = currentCopyText();
        if (!text) return;
        var btn = $('copy-btn');
        copyText(text).then(function (ok) {
            if (!ok) { selectNode($('copy-preview')); return; }
            btn.textContent = t('copied');
            btn.classList.add('done');
            setTimeout(function () { btn.textContent = t('copy_schedule'); btn.classList.remove('done'); }, 1500);
        });
    }

    // ===== Import / export =====
    function importList(replace) {
        var res = C.parseCallerList($('import-text').value);
        if (!res.callers.length && !res.bad.length) return;
        var added = res.callers.map(function (c) {
            return { id: nextId++, name: c.name, marchSeconds: c.marchSeconds, selected: true };
        });
        callers = replace ? added : callers.concat(added);
        saveState();
        renderCallers();
        updateSchedule();
        $('import-status').textContent = LANG[currentLang].import_done(res.callers.length, res.bad.length);
        if (!res.bad.length) $('import-text').value = '';
        else $('import-text').value = res.bad.join('\n');
    }

    function exportList() {
        var text = C.exportCallerList(callers);
        $('import-text').value = text;
        copyText(text).then(function (ok) {
            $('import-status').textContent = ok ? t('export_done') : '';
            if (!ok) { $('import-text').focus(); $('import-text').select(); }
        });
    }

    // ===== Garrison Defense =====
    var enemies = [];
    var enemyNextId = 1;
    var selectedEnemyId = null;
    var yourMarchSeconds = 20;
    var activeRallies = []; // { id, enemyName, enemyAlliance, enemyMarch, hitTimeMs }
    var rallyTrackId = 1;

    function saveGarrisonState() {
        store('garrison_enemies', JSON.stringify(enemies.map(function (e) {
            return { name: e.name, alliance: e.alliance, marchSeconds: e.marchSeconds };
        })));
    }

    function loadGarrisonState() {
        try {
            var data = JSON.parse(read('garrison_enemies'));
            if (Array.isArray(data)) {
                enemies = data.map(function (e) {
                    return { id: enemyNextId++, name: e.name || '', alliance: e.alliance || '', marchSeconds: e.marchSeconds || 30 };
                });
            }
        } catch (e) { /* ignore */ }
        var m = parseInt(read('garrison_your_march'), 10);
        if (m) yourMarchSeconds = m;
        $('your-march-input').value = formatMarch(yourMarchSeconds);
    }

    function addEnemy() {
        enemies.push({ id: enemyNextId++, name: '', alliance: '', marchSeconds: 30 });
        renderEnemies();
        var inputs = $('enemy-list').querySelectorAll('.name-input');
        if (inputs.length) inputs[inputs.length - 1].focus();
    }

    function renderEnemies() {
        var list = $('enemy-list');
        list.textContent = '';
        enemies.forEach(function (e) {
            var li = el('li', 'enemy-row');
            var name = el('input', 'name-input');
            name.type = 'text'; name.value = e.name; name.placeholder = t('ph_enemy_name'); name.maxLength = 40;
            name.addEventListener('change', function () { e.name = this.value; renderEnemyQuickSelect(); saveGarrisonState(); });
            var ally = el('input', 'alliance-input');
            ally.type = 'text'; ally.value = e.alliance; ally.placeholder = t('ph_alliance'); ally.maxLength = 10;
            ally.addEventListener('change', function () { e.alliance = this.value; renderEnemyQuickSelect(); saveGarrisonState(); });
            var march = el('input', 'march-input');
            march.type = 'text'; march.inputMode = 'numeric'; march.value = formatMarch(e.marchSeconds); march.placeholder = 'M:SS';
            march.setAttribute('aria-label', t('col_march'));
            march.addEventListener('change', function () {
                var v = parseMarch(this.value);
                if (v > 0) e.marchSeconds = v;
                this.value = formatMarch(e.marchSeconds);
                renderEnemyQuickSelect();
                saveGarrisonState();
            });
            var del = iconBtn('\u2715', t('remove'), false, function () {
                enemies = enemies.filter(function (x) { return x.id !== e.id; });
                if (selectedEnemyId === e.id) selectedEnemyId = null;
                renderEnemies();
            });
            del.className = 'btn btn-danger';
            li.appendChild(name); li.appendChild(ally); li.appendChild(march); li.appendChild(del);
            list.appendChild(li);
        });
        renderEnemyQuickSelect();
        saveGarrisonState();
    }

    function renderEnemyQuickSelect() {
        var box = $('enemy-quick-select');
        box.textContent = '';
        enemies.forEach(function (e) {
            var b = el('button', 'qs-btn' + (selectedEnemyId === e.id ? ' selected' : ''), e.name || t('unnamed'));
            b.type = 'button';
            if (e.alliance) { b.appendChild(document.createTextNode(' ')); b.appendChild(el('span', 'tag', '[' + e.alliance + ']')); }
            b.addEventListener('click', function () {
                selectedEnemyId = selectedEnemyId === e.id ? null : e.id;
                renderEnemyQuickSelect();
            });
            box.appendChild(b);
        });
        var disp = $('selected-enemy-display');
        var sel = enemies.find(function (x) { return x.id === selectedEnemyId; });
        disp.textContent = '';
        disp.classList.toggle('empty-msg', !sel);
        if (!sel) { disp.textContent = t('tap_enemy'); return; }
        disp.appendChild(el('span', 'selected-enemy-name', (sel.name || t('unnamed')) + (sel.alliance ? ' [' + sel.alliance + ']' : '')));
        disp.appendChild(document.createTextNode(' \u2014 ' + t('march_word') + ' ' + formatMarch(sel.marchSeconds)));
    }

    function flash(node) {
        node.classList.add('flash');
        setTimeout(function () { node.classList.remove('flash'); }, 1200);
    }

    function trackRally() {
        var enemy = enemies.find(function (e) { return e.id === selectedEnemyId; });
        if (!enemy) { flash($('enemy-quick-select')); return; }
        var input = $('rally-countdown-input');
        var countdown = parseMarch(input.value);
        if (countdown <= 0) { flash(input); input.focus(); return; }
        var times = C.garrisonTimes(Date.now(), countdown, enemy.marchSeconds, yourMarchSeconds);
        activeRallies.push({
            id: rallyTrackId++,
            enemyName: enemy.name || t('unnamed'),
            enemyAlliance: enemy.alliance || '',
            enemyMarch: enemy.marchSeconds,
            hitTimeMs: times.hitTimeMs
        });
        input.value = '';
        input.focus();
        updateActiveRallies();
    }

    function mmss(secs) { return Math.floor(secs / 60) + ':' + pad(secs % 60); }

    // Cards are built once per tracked rally and then only their text and
    // classes change each tick, so the remove button stays tappable.
    var rallyCardsKey = '';
    function updateActiveRallies() {
        var box = $('active-rallies-list');
        var now = Date.now();
        // Auto-remove rallies that landed more than 60s ago
        activeRallies = activeRallies.filter(function (r) { return now - r.hitTimeMs < 60000; });
        $('no-rallies').hidden = activeRallies.length > 0;
        var sorted = activeRallies.slice().sort(function (a, b) { return a.hitTimeMs - b.hitTimeMs; });
        var key = currentLang + '|' + sorted.map(function (r) { return r.id; }).join(',');
        if (key !== rallyCardsKey) {
            rallyCardsKey = key;
            box.textContent = '';
            sorted.forEach(function (r) { r.ui = buildRallyCard(r); box.appendChild(r.ui.card); });
        }
        var L = LANG[currentLang];
        sorted.forEach(function (r) {
            var hitSecs = Math.floor((r.hitTimeMs - now) / 1000);
            var sendTimeMs = r.hitTimeMs - yourMarchSeconds * 1000;
            var sendSecs = Math.floor((sendTimeMs - now) / 1000);
            var landed = hitSecs <= 0;
            var urgent = !landed && sendSecs <= 15;
            var u = r.ui;
            u.card.className = 'rally-tracker' + (urgent ? ' urgent' : '') + (landed ? ' landed' : '');
            if (landed) { u.big.className = 'rt-send-countdown too-late'; u.big.textContent = t('landed'); }
            else if (sendSecs <= 0) { u.big.className = 'rt-send-countdown go-now'; u.big.textContent = t('send_now'); }
            else { u.big.className = 'rt-send-countdown'; u.big.textContent = t('send_in') + ' ' + mmss(sendSecs); }
            u.sendTime.textContent = formatUTC(sendTimeMs);
            u.sendCd.textContent = sendSecs <= 0 ? (landed ? '' : t('now_label')) : L.fmtInTime(mmss(sendSecs));
            u.hitTime.textContent = formatUTC(r.hitTimeMs);
            u.hitCd.textContent = landed ? t('landed_lower') : L.fmtInTime(mmss(hitSecs));
        });
    }

    function buildRallyCard(r) {
        var card = el('div', 'rally-tracker');
        var head = el('div', 'rt-header');
        var who = el('span', 'rt-enemy', r.enemyName);
        if (r.enemyAlliance) { who.appendChild(document.createTextNode(' ')); who.appendChild(el('span', 'rt-alliance', '[' + r.enemyAlliance + ']')); }
        var x = iconBtn('\u2715', t('remove'), false, function () {
            activeRallies = activeRallies.filter(function (a) { return a.id !== r.id; });
            updateActiveRallies();
        });
        x.className = 'btn btn-danger';
        head.appendChild(who); head.appendChild(x);
        var big = el('div', 'rt-send-countdown');
        var send = row(t('send_at'), 'send-label', 'send-time');
        var hit = row(t('rally_hits'), '', 'hit-time');
        card.appendChild(head); card.appendChild(big); card.appendChild(send.row); card.appendChild(hit.row);
        return { card: card, big: big, sendTime: send.time, sendCd: send.cd, hitTime: hit.time, hitCd: hit.cd };
    }

    function row(label, labelCls, timeCls) {
        var d = el('div', 'rt-row');
        d.appendChild(el('span', 'rt-label ' + labelCls, label));
        var v = el('span');
        var time = el('span', 'rt-time ' + timeCls);
        var cd = el('span', 'rt-countdown');
        v.appendChild(time); v.appendChild(cd);
        d.appendChild(v);
        return { row: d, time: time, cd: cd };
    }

    // ===== Tabs =====
    function switchTab(tab) {
        document.querySelectorAll('.tab-panel').forEach(function (p) { p.classList.toggle('active', p.id === 'tab-' + tab); });
        document.querySelectorAll('.tab-btn').forEach(function (b) {
            b.classList.toggle('active', b.dataset.tab === tab);
            b.setAttribute('aria-selected', b.dataset.tab === tab ? 'true' : 'false');
        });
        store('app_tab', tab);
    }

    // ===== Boot =====
    function init() {
        var ls = $('lang-select');
        Object.keys(LANG).forEach(function (code) {
            var o = el('option', null, LANG[code].lang_name);
            o.value = code;
            ls.appendChild(o);
        });
        ls.addEventListener('change', function () { setLang(this.value, true); });

        document.querySelectorAll('.tab-btn').forEach(function (b) {
            b.addEventListener('click', function () { switchTab(b.dataset.tab); });
        });

        $('rally-duration-select').addEventListener('change', function () {
            rallyDurationSeconds = parseInt(this.value, 10);
            store('rally_duration', rallyDurationSeconds);
            updateSchedule();
        });
        $('buffer-select').addEventListener('change', function () {
            bufferSeconds = parseInt(this.value, 10);
            store('rally_buffer', bufferSeconds);
            if (lockedArrivalMs !== null) setLocked(null); // as before: changing reaction time unlocks
            updateSchedule();
        });
        $('lock-btn').addEventListener('click', function () {
            setLocked(lockedArrivalMs === null ? getArrivalMs() : null);
        });
        $('target-input').addEventListener('change', applyTargetInput);
        $('target-input').addEventListener('keydown', function (e) { if (e.key === 'Enter') { applyTargetInput(); this.blur(); } });

        $('copy-btn').addEventListener('click', copySchedule);
        $('select-all-btn').addEventListener('click', function () {
            callers.forEach(function (c) { c.selected = true; }); saveState(); renderCallers(); updateSchedule();
        });
        $('select-none-btn').addEventListener('click', function () {
            callers.forEach(function (c) { c.selected = false; }); saveState(); renderCallers(); updateSchedule();
        });
        $('edit-btn').addEventListener('click', function () { setEditMode(!editMode); });
        $('add-caller-btn').addEventListener('click', addCaller);
        $('clear-btn').addEventListener('click', function () {
            if (!callers.length || !window.confirm(t('confirm_clear'))) return;
            callers = []; saveState(); renderCallers(); updateSchedule();
        });
        $('import-replace-btn').addEventListener('click', function () { importList(true); });
        $('import-add-btn').addEventListener('click', function () { importList(false); });
        $('export-btn').addEventListener('click', exportList);

        $('your-march-input').addEventListener('change', function () {
            var v = parseMarch(this.value);
            if (v > 0) yourMarchSeconds = v;
            store('garrison_your_march', yourMarchSeconds);
            this.value = formatMarch(yourMarchSeconds);
        });
        $('track-btn').addEventListener('click', trackRally);
        $('rally-countdown-input').addEventListener('keydown', function (e) { if (e.key === 'Enter') trackRally(); });
        $('add-enemy-btn').addEventListener('click', addEnemy);

        loadState();
        loadGarrisonState();
        if (!callers.length) setEditMode(false);
        var tab = read('app_tab');
        switchTab(tab === 'garrison' ? 'garrison' : 'rally');
        setLang(detectLang(), false);

        var tick = function () { $('utc-clock').textContent = formatUTC(Date.now()); };
        tick();
        setInterval(tick, 100);
        setInterval(function () { updateSchedule(); updateActiveRallies(); }, 250);
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
