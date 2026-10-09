/* Login page for the shared-password gate. Language follows the phone like the
 * app: saved app choice > supported phone/browser language > English. */
(function () {
    'use strict';
    var T = {
        en: { title: "Viscount's Rally Spamulator", prompt: 'Enter the password', enter: 'Enter',
              bad: 'Wrong password. Try again.', rate: 'Too many attempts. Wait 15 minutes and try again.' },
        tr: { title: "Viscount'un Rally Spamulator'ı", prompt: 'Şifreyi girin', enter: 'Giriş',
              bad: 'Yanlış şifre. Tekrar deneyin.', rate: 'Çok fazla deneme. 15 dakika bekleyip tekrar deneyin.' },
        pl: { title: 'Rally Spamulator Viscounta', prompt: 'Wpisz hasło', enter: 'Wejdź',
              bad: 'Błędne hasło. Spróbuj ponownie.', rate: 'Za dużo prób. Odczekaj 15 minut i spróbuj ponownie.' },
        zh: { title: 'Viscount 的集结工具', prompt: '请输入密码', enter: '进入',
              bad: '密码错误，请重试。', rate: '尝试次数过多，请等待 15 分钟后再试。' },
        ko: { title: 'Viscount의 랠리 스패뮬레이터', prompt: '비밀번호를 입력하세요', enter: '입장',
              bad: '비밀번호가 틀렸습니다. 다시 시도하세요.', rate: '시도 횟수가 너무 많습니다. 15분 후에 다시 시도하세요.' },
        ar: { title: 'أداة تنسيق الحشد لـ Viscount', prompt: 'أدخل كلمة المرور', enter: 'دخول',
              bad: 'كلمة المرور خاطئة. حاول مرة أخرى.', rate: 'محاولات كثيرة جداً. انتظر 15 دقيقة ثم حاول مرة أخرى.' }
    };

    function detectLang() {
        var saved = null;
        try { saved = localStorage.getItem('app_lang'); } catch (e) { /* private mode */ }
        if (saved && T[saved]) return saved;
        var prefs = navigator.languages || [navigator.language || 'en'];
        for (var i = 0; i < prefs.length; i++) {
            var code = String(prefs[i] || '').toLowerCase().split('-')[0];
            if (T[code]) return code;
        }
        return 'en';
    }

    var lang = detectLang();
    var t = T[lang];
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.title = t.title;
    document.querySelectorAll('[data-t]').forEach(function (e) { e.textContent = t[e.getAttribute('data-t')]; });

    var code = document.body.getAttribute('data-error');
    var box = document.getElementById('gate-error');
    if (code && t[code]) {
        box.textContent = t[code];
        box.hidden = false;
    }
    window.RallyGateLang = T; // for the e2e test
})();
