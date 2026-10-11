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
        document.querySelectorAll('[data-i18n-aria]').forEach(function (e) { e.setAttribute('aria-label', t(e.dataset.i18nAria)); });
        $('lang-display').textContent = LANG[code].lang_name;
        $('lang-display').lang = code;
        $('lang-select').setAttribute('aria-label', t('language'));
        $('lang-chip').title = t('language');
        renderThemeSelect();
        renderDurationSelect();
        renderAutoResetSelect();
        renderListSwitch();
        renderLock();
        renderWaves();
        $('edit-btn').textContent = editMode ? t('done_btn') : t('edit_list');
        renderCallers();
        renderEnemies();
        lastPreview = null;
        updateSchedule();
        updateActiveRallies();
    }

    // ===== Theme (palettes in tokens.css; applied early by theme.js) =====
    var THEME_LABEL = { 'ministry-dark': 'theme_dark', reading: 'theme_reading', 'low-glare': 'theme_low_glare' };
    function renderThemeSelect() {
        var sel = $('theme-select');
        var cur = window.RallyTheme.saved();
        sel.textContent = '';
        window.RallyTheme.THEMES.forEach(function (id) {
            var o = el('option', null, t(THEME_LABEL[id]));
            o.value = id;
            sel.appendChild(o);
        });
        sel.value = cur;
        sel.setAttribute('aria-label', t('theme_title'));
        $('theme-chip').title = t('theme_title');
        $('theme-display').textContent = t(THEME_LABEL[cur]);
    }

    // ===== Rally Spam state =====
    // Two independent caller lists, Attack and Counter (RallyCore.LIST_KEYS).
    // The ACTIVE list lives in the variables below (callers, waves, plan,
    // bufferSeconds, rallyDurationSeconds); the other one waits in `lists`
    // until the switch swaps them. Each list saves only to its own keys, so
    // freezing, resetting or editing one never touches the other. The
    // auto-reset minutes are shared; each list counts from its own freeze time.
    var listKind = 'attack';
    var lists = { attack: null, counter: null };
    var counterLabel = '';
    function isCounter() { return listKind === 'counter'; }
    function K() { return C.LIST_KEYS[listKind]; }
    function otherKind() { return isCounter() ? 'attack' : 'counter'; }
    function listName(kind) { return kind === 'counter' ? LANG[currentLang].list_tab(counterLabel) : t('list_attack'); }
    function applyStorage(obj) {
        Object.keys(obj).forEach(function (k) {
            if (obj[k] === null) { try { localStorage.removeItem(k); } catch (e) { /* ignore */ } }
            else store(k, obj[k]);
        });
    }

    var callers = [];          // { id, name, marchSeconds, wave }  wave: 0 = off, 1..waves.count
    // Waves: { count, defaultDelay, gaps: [s | null] } (see RallyCore.normalizeWaves).
    var waves = C.normalizeWaves({});
    var targetError = null;    // parse error from the Land at box, shown translated
    var nextId = 1;
    var bufferSeconds = 30;
    var rallyDurationSeconds = 300;
    // { mode: 'live' } | { mode: 'frozen', firstStartMs, frozenAtMs }
    // | { mode: 'fixed', arrivalMs, landMs: [per wave], frozenAtMs }
    // (see RallyCore.planArrivalMs). LIVE follows the clock; Copy Schedule or
    // LOCK freezes it; a typed "Land at" time fixes it; Reset goes back to LIVE.
    // frozenAtMs = when it stopped being live: the auto-reset counts from it.
    var plan = { mode: 'live' };
    var autoResetMin = C.DEFAULT_AUTO_RESET_MIN;   // 0 = Off
    var editMode = false;
    var lastPreview = null;

    function selectedCallers() { return C.includedCallers(callers, waves); }
    function multiWave() { return waves.count > 1; }

    // Landing time of each wave (index 0 = wave 1).
    function getLandings(now) {
        return C.planLandingsMs(plan, now, callers, bufferSeconds, rallyDurationSeconds, waves);
    }

    function saveState() { store(K().callers, C.callersStorage(callers)); }

    function saveWaves() { if (!isCounter()) store(C.LIST_KEYS.attack.waves, JSON.stringify(waves)); }

    // Both lists from storage (saved data from before Counter existed is the
    // Attack list: it uses the same keys). Old {selected} lists become wave 1 / off.
    function loadState() {
        var now = Date.now();
        C.LISTS.forEach(function (kind) {
            var l = C.loadList(read, kind, now);
            if (kind === 'counter') counterLabel = l.label;
            lists[kind] = {
                callers: l.callers.map(function (c) { return { id: nextId++, name: c.name, marchSeconds: c.marchSeconds, wave: c.wave }; }),
                waves: l.waves, plan: l.plan, reaction: l.reactionSec, duration: l.durationSec
            };
        });
        autoResetMin = C.normalizeAutoReset(read('rally_auto_reset'));
        listKind = read('rally_list') === 'counter' ? 'counter' : 'attack';
        activate(lists[listKind]);
        $('counter-label-input').value = counterLabel;
    }

    // Make a stored list the active one (and the other way round).
    function activate(s) {
        callers = s.callers; waves = s.waves; plan = s.plan;
        bufferSeconds = s.reaction; rallyDurationSeconds = s.duration;
        lists[listKind] = null;
        $('buffer-select').value = String(bufferSeconds);
        $('rally-duration-select').value = String(rallyDurationSeconds);
    }
    function stash() {
        lists[listKind] = { callers: callers, waves: waves, plan: plan, reaction: bufferSeconds, duration: rallyDurationSeconds };
    }

    // Attack | Counter switch: nothing is shared between the two lists except
    // the auto-reset minutes, so switching just swaps which one is shown.
    function switchList(kind) {
        if (kind === listKind || !lists[kind]) return;
        stash();
        listKind = kind;
        store('rally_list', kind);
        activate(lists[kind]);
        editMode = false;
        clearTimeout(toastTimer);
        hideToast();               // Randomise's Undo belongs to the list it was made in
        targetError = null;
        $('target-input').value = '';
        $('edit-btn').textContent = t('edit_list');
        $('edit-btn').classList.remove('active');
        renderListSwitch();
        renderLock();
        renderWaves();
        renderCallers();
        lastPreview = null;
        scheduleKey = '';
        updateSchedule();
    }

    function renderListSwitch() {
        var counter = isCounter();
        document.body.classList.toggle('list-counter', counter);
        $('list-counter-name').textContent = LANG[currentLang].list_tab(counterLabel);
        C.LISTS.forEach(function (kind) {
            var b = $('list-' + kind);
            var on = kind === listKind;
            b.classList.toggle('active', on);
            b.setAttribute('aria-checked', on ? 'true' : 'false');
            b.tabIndex = on ? 0 : -1;
            var p = on ? plan : (lists[kind] && lists[kind].plan);
            var lock = $('list-' + kind + '-lock');
            lock.hidden = !p || p.mode === 'live';
            lock.textContent = t('locked_ind');
        });
        $('counter-box').hidden = !counter;
        var cb = $('counter-copy-btn');
        if (!cb.classList.contains('done')) cb.textContent = LANG[currentLang].copy_counter_btn(counterLabel);
    }

    function copyBtnLabel(btn) {
        return btn.id === 'counter-copy-btn' ? LANG[currentLang].copy_counter_btn(counterLabel) : t('copy_schedule');
    }

    // Rally duration: 1, 2, 3, 5 or 10 minutes (per list).
    function renderDurationSelect() {
        var sel = $('rally-duration-select');
        sel.textContent = '';
        C.DURATION_CHOICES.forEach(function (s) {
            var o = el('option', null, LANG[currentLang].dur_n(s / 60));
            o.value = String(s);
            sel.appendChild(o);
        });
        sel.value = String(rallyDurationSeconds);
    }

    // ===== Callers list =====
    function renderCallers() {
        var rb = $('randomise-btn');
        if (rb) rb.disabled = !multiWave() || callers.length < 2;
        var list = $('caller-list');
        list.textContent = '';
        callers.forEach(function (c, idx) {
            var li = el('li');
            if (!editMode) {
                var b = el('button', 'caller-toggle');
                b.type = 'button';
                if (!multiWave()) {
                    // one wave: a plain tick box, exactly as before waves
                    b.setAttribute('role', 'checkbox');
                    b.setAttribute('aria-checked', c.wave ? 'true' : 'false');
                    b.appendChild(el('span', 'box', c.wave ? '\u2713' : ''));
                } else {
                    // waves: each tap moves the caller to the next wave (off -> 1 -> ... -> n -> off)
                    b.classList.add('multi');
                    if (c.wave) b.classList.add('in-wave', 'w' + c.wave);
                    b.dataset.wave = String(c.wave);
                    b.setAttribute('aria-label', LANG[currentLang].wave_aria(c.name || t('unnamed'), c.wave));
                    b.appendChild(el('span', 'box wave-badge' + (c.wave ? ' w' + c.wave : ' off'), c.wave ? String(c.wave) : '\u2013'));
                }
                b.appendChild(el('span', 'ct-name', c.name || t('unnamed')));
                b.appendChild(el('span', 'ct-march', formatMarch(c.marchSeconds)));
                b.addEventListener('click', function () {
                    c.wave = multiWave() ? C.nextWave(c.wave, waves.count) : (c.wave ? 0 : 1);
                    saveState();
                    renderCallers();
                    updateSchedule();
                    // keep keyboard focus on the same caller after the re-render
                    var again = $('caller-list').children[idx];
                    if (again && again.firstChild && document.activeElement === document.body) again.firstChild.focus();
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
                if (multiWave()) {
                    // a non-tap way to pick the wave directly
                    var ws = el('select', 'wave-select');
                    ws.setAttribute('aria-label', t('col_wave'));
                    for (var k = 0; k <= waves.count; k++) {
                        var o = el('option', null, k ? String(k) : t('wave_off'));
                        o.value = String(k);
                        ws.appendChild(o);
                    }
                    ws.value = String(c.wave);
                    ws.addEventListener('change', function () { c.wave = parseInt(this.value, 10) || 0; saveState(); updateSchedule(); });
                    li.appendChild(ws);
                }
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
        callers.push({ id: nextId++, name: '', marchSeconds: 45, wave: 1 });
        saveState();
        setEditMode(true);
        updateSchedule();
        var inputs = $('caller-list').querySelectorAll('.name-input');
        if (inputs.length) inputs[inputs.length - 1].focus();
    }

    // ===== Live / locked plan =====
    function renderLock() {
        var live = plan.mode === 'live';
        var btn = $('lock-btn');
        btn.textContent = live ? t('lock') : t('reset_btn');
        btn.classList.toggle('active', !live);
        $('arrival-display').classList.toggle('locked', !live);
        $('arrival-display').classList.toggle('live', live);
        $('plan-status').textContent = live ? t('live_ind') : t('locked_ind');
        $('reset-btn').hidden = live;
        $('plan-hint').textContent = live ? t('hint_live') : t('hint_locked');
        renderAutoResetCd(Date.now());
        renderListSwitch();
        var input = $('target-input');
        if (document.activeElement !== input) input.value = plan.mode === 'fixed' ? fixedLandings().map(formatUTC).join(', ') : '';
        renderTargetError();
    }

    function fixedLandings() { return plan.landMs && plan.landMs.length ? plan.landMs : [plan.arrivalMs]; }

    function renderTargetError() {
        var e = $('target-error');
        e.hidden = !targetError;
        if (targetError) e.textContent = targetError.error === 'too_many' ? LANG[currentLang].land_too_many(targetError.max) : t('bad_time');
    }

    // ===== Waves =====
    function renderWaves() {
        var multi = multiWave();
        // Counter is a single wave: no wave controls at all
        $('waves-row').hidden = isCounter();
        $('wave-count').textContent = String(waves.count);
        $('remove-wave-btn').disabled = waves.count <= 1;
        $('remove-wave-btn').setAttribute('aria-label', t('remove_wave'));
        $('remove-wave-btn').title = t('remove_wave');
        var rb = $('randomise-btn');
        rb.hidden = !multi;
        rb.disabled = !multi || callers.length < 2;
        $('add-wave-btn').disabled = waves.count >= C.MAX_WAVES;
        $('wave-delay-row').hidden = !multi;
        $('wave-help').hidden = !multi;
        var d = $('wave-delay-input');
        if (document.activeElement !== d) d.value = String(waves.defaultDelay);
        var list = $('gap-list');
        list.hidden = !multi;
        list.textContent = '';
        if (!multi) return;
        var L = LANG[currentLang];
        var given = plan.mode === 'fixed' ? fixedLandings() : [];
        for (var i = 0; i < waves.count - 1; i++) list.appendChild(gapRow(i, given, L));
    }

    function gapRow(i, given, L) {
        var li = el('li', 'gap-row');
        var lab = el('span', 'gap-label');
        lab.appendChild(el('span', 'gap-text', L.gap_label(i + 1, i + 2)));
        li.appendChild(lab);
        if (given.length > i + 1) {
            // both waves have a typed Land at time: the gap is implied by them
            li.classList.add('fixed');
            li.appendChild(el('span', 'gap-fixed', L.gap_fixed(Math.round((given[i + 1] - given[i]) / 1000))));
            return li;
        }
        var custom = waves.gaps[i] !== null;
        if (custom) lab.appendChild(el('span', 'gap-custom', t('gap_custom')));
        var wrap = el('span', 'sec-wrap');
        var inp = el('input', 'sec-input' + (custom ? ' custom' : ''));
        inp.type = 'text';
        inp.inputMode = 'numeric';
        inp.maxLength = 4;
        inp.autocomplete = 'off';
        inp.value = String(C.gapSeconds(waves, i));
        inp.setAttribute('aria-label', L.gap_label(i + 1, i + 2) + ' (' + t('sec_unit') + ')' + (custom ? ', ' + t('gap_custom') : ''));
        inp.addEventListener('change', function () {
            var v = C.toDelay(this.value);
            if (v !== null) waves.gaps[i] = v === waves.defaultDelay ? null : v;
            wavesChanged();
        });
        wrap.appendChild(inp);
        wrap.appendChild(el('span', 'sec-unit', t('sec_unit')));
        li.appendChild(wrap);
        // fixed-width slot so every row's input lines up; holds the reset when custom
        var slot = el('span', 'gap-slot');
        if (custom) {
            li.classList.add('custom');
            var r = iconBtn('\u21BA', t('gap_reset') + ' (' + waves.defaultDelay + t('sec_unit') + ')', false, function () {
                waves.gaps[i] = null;
                wavesChanged();
            });
            r.classList.add('gap-reset');
            slot.appendChild(r);
        }
        li.appendChild(slot);
        return li;
    }

    // ===== Randomise (one level of undo) =====
    // Reshuffles the callers in any wave (everyone if nobody is in a wave)
    // as evenly as possible; off callers stay off. A frozen plan keeps its
    // first start like any other edit.
    var undoAssign = null;
    var toastTimer = null;
    function randomise() {
        if (!multiWave() || callers.length < 2) return;
        var map = C.randomiseWaves(C.randomiseTargets(callers, waves), waves.count);
        undoAssign = callers.map(function (c) { return [c.id, c.wave]; });
        callers.forEach(function (c) { if (map[c.id] !== undefined) c.wave = map[c.id]; });
        saveState(); renderCallers(); updateSchedule();
        $('randomise-toast').hidden = false;
        clearTimeout(toastTimer);
        toastTimer = setTimeout(hideToast, 10000);
    }
    function hideToast() { $('randomise-toast').hidden = true; undoAssign = null; }
    function undoRandomise() {
        if (!undoAssign) return;
        var prev = {};
        undoAssign.forEach(function (p) { prev[p[0]] = p[1]; });
        callers.forEach(function (c) {
            if (prev[c.id] !== undefined) c.wave = prev[c.id] <= waves.count ? prev[c.id] : 0;
        });
        clearTimeout(toastTimer);
        hideToast();
        saveState(); renderCallers(); updateSchedule();
    }

    function wavesChanged() {
        waves = C.normalizeWaves(waves);
        saveWaves();
        renderWaves();
        renderCallers();
        updateSchedule();
    }

    function addWave() {
        if (isCounter() || waves.count >= C.MAX_WAVES) return;
        waves.count += 1;
        waves.gaps.push(null);
        wavesChanged();
    }

    // Removing the last wave sends its callers to off.
    function removeWave() {
        if (waves.count <= 1) return;
        var gone = waves.count;
        callers.forEach(function (c) { if (c.wave >= gone) c.wave = 0; });
        waves.count -= 1;
        waves.gaps = waves.gaps.slice(0, waves.count - 1);
        saveState();
        if (plan.mode === 'fixed' && fixedLandings().length > waves.count) {
            var l = fixedLandings().slice(0, waves.count);
            waves = C.normalizeWaves(waves);
            saveWaves();
            setPlan({ mode: 'fixed', arrivalMs: l[0], landMs: l, frozenAtMs: plan.frozenAtMs });
        }
        wavesChanged();
    }

    function setPlan(p) {
        plan = p;
        if (p.mode !== 'live' && typeof p.frozenAtMs !== 'number') p.frozenAtMs = Date.now();
        // only this list's keys (RallyCore.planStorage): the other list is never touched
        applyStorage(C.planStorage(listKind, p));
        targetError = null;
        renderLock();
        renderWaves();
        updateSchedule();
    }

    function freezeNow() { setPlan(C.freezePlan(Date.now(), bufferSeconds)); }

    function resetPlan() {
        $('target-input').value = '';
        setPlan({ mode: 'live' });
    }

    // ===== Auto-reset =====
    // A frozen or typed plan goes back to LIVE (exactly like Reset) a set time
    // after it was frozen. Checked against the real clock on every tick, so a
    // reload or a sleeping phone resets on the next tick once it is overdue.
    function renderAutoResetSelect() {
        var sel = $('auto-reset-select');
        sel.textContent = '';
        C.AUTO_RESET_CHOICES.forEach(function (m) {
            var o = el('option', null, m ? LANG[currentLang].minutes_n(m) : t('auto_reset_off'));
            o.value = String(m);
            sel.appendChild(o);
        });
        sel.value = String(autoResetMin);
    }

    function renderAutoResetCd(now) {
        var cd = $('auto-reset-cd');
        var left = plan.mode === 'live' ? null : C.autoResetRemainingSec(plan.frozenAtMs, autoResetMin, now);
        cd.hidden = left === null;
        if (left !== null) cd.textContent = LANG[currentLang].auto_reset_in(formatMarch(left));
    }

    // true when it reset the plan
    function autoResetIfDue(now, quiet) {
        if (plan.mode === 'live' || !C.autoResetDue(plan.frozenAtMs, autoResetMin, now)) return false;
        resetPlan();
        if (!quiet) showToast(t('auto_reset_done'));
        return true;
    }

    // The list that is not on screen keeps its own deadline: it goes back to
    // LIVE at the right moment too, with a notice naming the list.
    function autoResetOtherIfDue(now) {
        var kind = otherKind(), s = lists[kind];
        if (!s || s.plan.mode === 'live' || !C.autoResetDue(s.plan.frozenAtMs, autoResetMin, now)) return;
        s.plan = { mode: 'live' };
        applyStorage(C.planStorage(kind, s.plan));
        renderListSwitch();
        showToast(LANG[currentLang].list_auto_reset(listName(kind)));
    }

    var floatTimer = null;
    function showToast(msg) {
        var box = $('plan-toast');
        box.textContent = msg;
        box.hidden = false;
        clearTimeout(floatTimer);
        floatTimer = setTimeout(function () { box.hidden = true; }, 4000);
    }

    function applyTargetInput() {
        var v = $('target-input').value.trim();
        if (!v) { if (plan.mode === 'fixed') resetPlan(); else { targetError = null; renderTargetError(); } return; }
        // one UTC time per wave, separated by commas or spaces
        var res = C.parseLandAt(v, Date.now(), waves.count);
        if (res.error) { targetError = res; renderTargetError(); return; }
        // a newly typed time is a new plan: the auto-reset counts from now
        setPlan({ mode: 'fixed', arrivalMs: res.times[0], landMs: res.times, frozenAtMs: Date.now() });
    }

    // ===== Schedule =====
    function formatCountdown(secs) {
        if (secs <= 0) return t('now_label');
        return LANG[currentLang].fmtCountdown(Math.floor(secs / 60), pad(secs % 60));
    }

    function currentCopyText(now) {
        var sel = selectedCallers();
        if (!sel.length) return '';
        return buildText(sel, getLandings(now), LANG[currentLang]);
    }

    // Attack: the usual (wave) text, unchanged. Counter: "COUNTER - land ..." heading.
    function buildText(sel, landings, L) {
        return isCounter() ? C.buildCounterCopyText(sel, landings[0], rallyDurationSeconds, L)
            : C.buildWavesCopyText(sel, landings, rallyDurationSeconds, L);
    }

    // Rows are rebuilt only when the callers, waves or language change; every
    // second only their text and classes are updated (no layout jumps).
    var scheduleKey = '';
    var scheduleRows = [];
    var waveHeads = [];
    function updateSchedule() {
        var now = Date.now();
        var sel = selectedCallers();
        var multi = multiWave();
        var L = LANG[currentLang];
        var listEl = $('schedule-list');
        var warningEl = $('schedule-warning');
        var empty = sel.length === 0;
        $('arrival-label').textContent = multi ? t('arrival_label_w1') : t('arrival_label');
        $('no-callers').hidden = !empty;
        $('copy-btn').hidden = empty || isCounter();
        $('counter-copy-btn').hidden = empty || !isCounter();
        $('plan-hint').hidden = empty;
        $('preview-wrap').hidden = empty;
        $('wave-landings').hidden = empty || !multi;
        if (empty) {
            listEl.textContent = '';
            scheduleKey = '';
            warningEl.hidden = true;
            $('reset-btn').classList.remove('attention');
            $('arrival-time').textContent = '--:--:--';
            return;
        }

        var landings = getLandings(now);
        $('arrival-time').textContent = formatUTC(landings[0]);
        if (multi) renderWaveLandings(landings);
        // one group per wave (a single group without a header with one wave)
        var groups = multi ? C.buildWaveSchedule(sel, landings, rallyDurationSeconds)
            : [{ wave: 1, landMs: landings[0], items: C.buildSchedule(sel, landings[0], rallyDurationSeconds) }];

        var passed = C.firstStartPassed(plan, now, callers, bufferSeconds, rallyDurationSeconds, waves);
        warningEl.hidden = !passed;
        if (passed) warningEl.textContent = t('passed_warning');
        $('reset-btn').classList.toggle('attention', passed);

        var key = currentLang + '|' + multi + '|' + groups.map(function (g) {
            return g.wave + ':' + g.items.map(function (s) { return s.name + '\u0000' + s.marchSeconds; }).join('|');
        }).join('#');
        if (key !== scheduleKey) {
            scheduleKey = key;
            listEl.textContent = '';
            scheduleRows = [];
            waveHeads = [];
            listEl.classList.toggle('waves', multi);
            groups.forEach(function (g) {
                var target = listEl;
                if (multi) {
                    var sec = el('li', 'wave-section w' + g.wave);
                    var head = el('div', 'wave-head');
                    head.appendChild(el('span', 'wave-badge w' + g.wave, String(g.wave)));
                    var title = el('span', 'wave-title');
                    head.appendChild(title);
                    sec.appendChild(head);
                    waveHeads.push(title);
                    if (!g.items.length) sec.appendChild(el('div', 'empty-msg wave-empty', t('empty_wave')));
                    target = el('ol', 'schedule-list');
                    sec.appendChild(target);
                    listEl.appendChild(sec);
                }
                g.items.forEach(function (s) { scheduleRows.push(scheduleRow(s, target)); });
            });
        }
        var r = 0;
        groups.forEach(function (g, gi) {
            if (multi) waveHeads[gi].textContent = L.wave_lands(g.wave, formatUTC(g.landMs));
            g.items.forEach(function (s) {
                var row = scheduleRows[r++];
                var secsUntil = Math.floor((s.setOffMs - now) / 1000);
                var isOverdue = secsUntil < 0;
                var isImminent = !isOverdue && secsUntil <= 10;
                row.li.className = 'schedule-item' + (isOverdue ? ' overdue' : '') + (isImminent ? ' imminent' : '');
                row.time.textContent = formatUTC(s.setOffMs);
                row.cd.textContent = isOverdue ? L.fmtAgo(Math.abs(secsUntil)) : formatCountdown(secsUntil);
            });
        });

        var text = buildText(sel, landings, L);
        if (text !== lastPreview) { $('copy-preview').textContent = text; lastPreview = text; }
    }

    function scheduleRow(s, parent) {
        var li = el('li', 'schedule-item');
        var left = el('div', 'si-left');
        left.appendChild(el('div', 'si-name', s.name || t('unnamed')));
        left.appendChild(el('div', 'si-march', t('march_prefix') + formatMarch(s.marchSeconds)));
        var right = el('div', 'si-right');
        right.appendChild(el('div', 'si-label', t('call_at')));
        var time = el('div', 'si-time');
        var cd = el('div', 'si-countdown');
        right.appendChild(time);
        right.appendChild(cd);
        li.appendChild(left);
        li.appendChild(right);
        parent.appendChild(li);
        return { li: li, time: time, cd: cd };
    }

    // Compact list of every wave's landing under the big wave 1 time:
    // [2] 00:05:10 +10s  [3] 00:05:30 +30s
    function renderWaveLandings(landings) {
        var box = $('wave-landings');
        box.textContent = '';
        landings.forEach(function (ms, i) {
            if (!i) return;
            var chip = el('span', 'wl-chip');
            chip.appendChild(el('span', 'wave-badge mini w' + (i + 1), String(i + 1)));
            chip.appendChild(el('span', 'wl-time', formatUTC(ms)));
            var gap = el('span', 'wl-gap');
            var num = el('span', null, '+' + Math.round((ms - landings[0]) / 1000));
            num.dir = 'ltr';
            gap.appendChild(num);
            gap.appendChild(document.createTextNode(t('sec_unit')));
            chip.appendChild(gap);
            box.appendChild(chip);
        });
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

    // Copy = freeze: a LIVE plan is frozen at this instant and the copied
    // text is built from the frozen plan, so it matches what is shown. Once
    // frozen (or fixed), copying again copies the same times, unless the
    // earliest start has already passed (stale-copy guard): then it resets,
    // freezes fresh times and copies those, with a notice.
    function copySchedule() {
        if (!selectedCallers().length) return;
        var now = Date.now();
        autoResetIfDue(now, true);   // overdue but not ticked yet (phone just woke): fresh times below
        var stale = plan.mode !== 'live' && C.copyIsStale(plan, now, callers, bufferSeconds, rallyDurationSeconds, waves);
        if (stale) resetPlan();
        if (plan.mode === 'live') freezeNow();
        else updateSchedule();
        if (stale) showToast(t('stale_recopied'));
        var text = currentCopyText(Date.now());
        var btn = isCounter() ? $('counter-copy-btn') : $('copy-btn');
        copyText(text).then(function (ok) {
            if (!ok) { selectNode($('copy-preview')); return; }
            btn.textContent = t('copied');
            btn.classList.add('done');
            setTimeout(function () { btn.textContent = copyBtnLabel(btn); btn.classList.remove('done'); }, 1500);
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
        $('theme-select').addEventListener('change', function () {
            window.RallyTheme.choose(this.value);
            renderThemeSelect();
        });
        document.querySelectorAll('.list-btn').forEach(function (b) {
            b.addEventListener('click', function () { switchList(b.dataset.list); });
        });
        // arrow keys move between Attack and Counter (radio group)
        $('list-switch').addEventListener('keydown', function (e) {
            if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].indexOf(e.key) === -1) return;
            e.preventDefault();
            switchList(otherKind());
            $('list-' + listKind).focus();
        });
        $('counter-label-input').addEventListener('input', function () {
            counterLabel = C.cleanLabel(this.value);
            store(C.LIST_KEYS.counter.label, counterLabel);
            renderListSwitch();
        });
        $('counter-label-input').addEventListener('change', function () { this.value = counterLabel; });
        renderDurationSelect();

        document.querySelectorAll('.tab-btn').forEach(function (b) {
            b.addEventListener('click', function () { switchTab(b.dataset.tab); });
        });

        $('rally-duration-select').addEventListener('change', function () {
            rallyDurationSeconds = C.normalizeDuration(this.value);
            store(K().duration, rallyDurationSeconds);
            updateSchedule();
        });
        $('buffer-select').addEventListener('change', function () {
            bufferSeconds = C.normalizeReaction(this.value);
            store(K().reaction, bufferSeconds);
            // Reaction time only decides where a LIVE plan starts, so changing
            // it releases a frozen plan (a typed Land at time is kept).
            if (plan.mode === 'frozen') setPlan({ mode: 'live' });
            updateSchedule();
        });
        $('lock-btn').addEventListener('click', function () {
            if (plan.mode === 'live') freezeNow(); else resetPlan();
        });
        $('reset-btn').addEventListener('click', resetPlan);
        $('auto-reset-select').addEventListener('change', function () {
            autoResetMin = C.normalizeAutoReset(this.value);
            store('rally_auto_reset', String(autoResetMin));
            renderAutoResetCd(Date.now());
        });
        $('target-input').addEventListener('change', applyTargetInput);
        $('add-wave-btn').addEventListener('click', addWave);
        $('remove-wave-btn').addEventListener('click', removeWave);
        $('randomise-btn').addEventListener('click', randomise);
        $('undo-btn').addEventListener('click', undoRandomise);
        $('wave-delay-input').addEventListener('change', function () {
            var v = C.toDelay(this.value);
            if (v !== null) waves.defaultDelay = v;
            this.value = String(waves.defaultDelay);
            wavesChanged();
        });
        $('target-input').addEventListener('keydown', function (e) { if (e.key === 'Enter') { applyTargetInput(); this.blur(); } });

        $('copy-btn').addEventListener('click', copySchedule);
        $('counter-copy-btn').addEventListener('click', copySchedule);
        $('select-all-btn').addEventListener('click', function () {
            callers.forEach(function (c) { if (!c.wave) c.wave = 1; }); saveState(); renderCallers(); updateSchedule();
        });
        $('select-none-btn').addEventListener('click', function () {
            callers.forEach(function (c) { c.wave = 0; }); saveState(); renderCallers(); updateSchedule();
        });
        $('edit-btn').addEventListener('click', function () { setEditMode(!editMode); });
        $('add-caller-btn').addEventListener('click', addCaller);
        $('clear-btn').addEventListener('click', function () {
            if (!callers.length || !window.confirm(t('confirm_clear'))) return;
            callers = []; saveState(); renderCallers(); updateSchedule();
        });

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

        // Clock and schedule tick together, once per second, just after each
        // second boundary, so the clock and the live times change in step.
        var tick = function () {
            var now = Date.now();
            $('utc-clock').textContent = formatUTC(now);
            autoResetIfDue(now, false);
            autoResetOtherIfDue(now);
            renderAutoResetCd(now);
            updateSchedule();
            setTimeout(tick, 1000 - (Date.now() % 1000) + 5);
        };
        tick();
        // a phone waking up: check the auto-reset straight away
        document.addEventListener('visibilitychange', function () {
            if (document.hidden) return;
            var now = Date.now();
            autoResetIfDue(now, false);
            autoResetOtherIfDue(now);
            renderAutoResetCd(now);
            updateSchedule();
        });
        setInterval(updateActiveRallies, 250); // Garrison Defense: unchanged
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
