/* "What's new", all 9 languages (en es fr de pl ko zh tr ar), newest release first.
 * Plain data, drawn by changelog.js with textContent only. The English text is also in CHANGELOG.md:
 * add a release to both (and to every language here). */
(function (root, factory) {
    var api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    else root.RallyChangelog = api;
})(typeof self !== 'undefined' ? self : this, function () {
    'use strict';
    return {
    "en": {
        "whats_new": "What's new",
        "releases": [
            {
                "id": "guide",
                "date": "2026-10-12",
                "title": "Guide",
                "items": [
                    "New Guide: press the ? button at the top right for a quick start, how the timing works, waves, the battle view, Garrison Defense and a strategy guide, in all 9 languages.",
                    "New What's new page (this one) lists what changed, newest first.",
                    "The header stays on one row on 1440 pixel wide screens in every language."
                ]
            },
            {
                "id": "battle",
                "date": "2026-10-11",
                "title": "Battle view and Counter",
                "items": [
                    "Attack and Counter now sit side by side on one screen on a computer, so you see both plans at once. On a phone they stack, Attack first.",
                    "Counter is its own list for a counter-rally by another alliance: one wave fired as soon as possible, with its own callers, Copy button, lock, reset and auto-reset. Its copied text starts with its own heading.",
                    "Each plan has a NEXT line showing who starts next and in how many seconds.",
                    "A new Counter tick box in the header hides Counter so Attack uses the full width. The choice is remembered.",
                    "Rally durations of 1, 2, 3, 5 (default) and 10 minutes.",
                    "Auto-reset after 1 to 15 minutes (default 5) puts a locked plan back to LIVE by itself, with a countdown. Copy never sends old times: it locks fresh ones and tells you.",
                    "Three new languages: Español, Français and Deutsch (nine in all).",
                    "Three colour themes, Dark, Reading and Low Glare, chosen from the header.",
                    "The site asks search engines to stay out."
                ]
            },
            {
                "id": "waves",
                "date": "2026-10-09",
                "title": "Waves, live schedule and password",
                "items": [
                    "Waves: up to 6 groups of rallies that land a few seconds apart, with a default delay and a custom delay per gap. Tap a caller to cycle their wave, press Randomise to spread callers over the waves (with Undo), and type one Land at time per wave.",
                    "Live schedule: the times count up with the clock until Copy Schedule locks them. Reset goes back to LIVE, and LOCK locks without copying.",
                    "Cleaner copied text: Land HH:MM:SS first, then one line per caller, and with waves one block per wave.",
                    "One shared alliance password instead of accounts, with a Log out link.",
                    "The + Add Caller button is now Add/Edit, and the caller import and export was removed."
                ]
            },
            {
                "id": "earlier",
                "date": "2026-03-27",
                "title": "Earlier versions",
                "items": [
                    "The first versions had Discord login, roles, live rally broadcasts, player profiles and Alliance Docs. All of that was removed on 2026-10-09 for a simpler tool with no accounts."
                ]
            }
        ]
    },
    "es": {
        "whats_new": "Novedades",
        "releases": [
            {
                "id": "guide",
                "date": "2026-10-12",
                "title": "Guía",
                "items": [
                    "Nueva Guía: pulsa el botón ? arriba a la derecha para ver el inicio rápido, cómo funcionan los tiempos, las oleadas, la vista de batalla, la Defensa de guarnición y una guía de estrategia, en los 9 idiomas.",
                    "Nueva página de Novedades (esta) con los cambios, de más reciente a más antiguo.",
                    "La cabecera se mantiene en una sola fila en pantallas de 1440 píxeles de ancho, en todos los idiomas."
                ]
            },
            {
                "id": "battle",
                "date": "2026-10-11",
                "title": "Vista de batalla y Contraataque",
                "items": [
                    "Ataque y Contraataque ahora aparecen lado a lado en una sola pantalla en ordenador, así ves los dos planes a la vez. En el móvil se apilan, con Ataque primero.",
                    "Contraataque es una lista aparte para responder al rally de otra alianza: una sola oleada lanzada cuanto antes, con sus propios llamadores, botón de copiar, BLOQUEAR, Reiniciar y reinicio automático. Su texto copiado empieza con su propio encabezado.",
                    "Cada plan tiene una línea Siguiente que muestra quién sale después y en cuántos segundos.",
                    "Una nueva casilla Contra en la cabecera oculta Contraataque para que Ataque ocupe todo el ancho. Se recuerda tu elección.",
                    "Duraciones de rally de 1, 2, 3, 5 (por defecto) y 10 minutos.",
                    "El reinicio automático tras 1 a 15 minutos (5 por defecto) devuelve un plan bloqueado a EN VIVO por sí solo, con cuenta atrás. Copiar nunca envía horas antiguas: bloquea horas nuevas y te avisa.",
                    "Tres idiomas nuevos: Español, Français y Deutsch (nueve en total).",
                    "Tres temas de color, Oscuro, Lectura y Brillo Suave, que se eligen en la cabecera.",
                    "El sitio pide a los buscadores que no lo indexen."
                ]
            },
            {
                "id": "waves",
                "date": "2026-10-09",
                "title": "Oleadas, horario en vivo y contraseña",
                "items": [
                    "Oleadas: hasta 6 grupos de rallies que llegan con unos segundos de diferencia, con una pausa por defecto y una pausa personalizada en cada intervalo. Toca un llamador para cambiar su oleada, pulsa Aleatorio para repartir los llamadores entre las oleadas (con Deshacer) y escribe una hora de Llegada a las por oleada.",
                    "Horario en vivo: las horas avanzan con el reloj hasta que Copiar horario las fija. Reiniciar vuelve a EN VIVO, y BLOQUEAR las fija sin copiar.",
                    "Texto copiado más limpio: primero Llegada HH:MM:SS, luego una línea por llamador y, con oleadas, un bloque por oleada.",
                    "Una contraseña compartida de la alianza en lugar de cuentas, con un enlace para Cerrar sesión.",
                    "El botón + Añadir llamador ahora es Añadir/Editar, y se quitó la importación y exportación de llamadores."
                ]
            },
            {
                "id": "earlier",
                "date": "2026-03-27",
                "title": "Versiones anteriores",
                "items": [
                    "Las primeras versiones tenían inicio de sesión con Discord, roles, difusión de rallies en vivo, perfiles de jugador y Alliance Docs. Todo eso se quitó el 2026-10-09 para tener una herramienta más sencilla y sin cuentas."
                ]
            }
        ]
    },
    "fr": {
        "whats_new": "Nouveautés",
        "releases": [
            {
                "id": "guide",
                "date": "2026-10-12",
                "title": "Guide",
                "items": [
                    "Nouveau Guide : appuyez sur le bouton ? en haut à droite pour un démarrage rapide, le fonctionnement des horaires, les vagues, la vue de bataille, la Défense de garnison et un guide de stratégie, dans les 9 langues.",
                    "Nouvelle page Nouveautés (celle-ci) : elle liste les changements, du plus récent au plus ancien.",
                    "L'en-tête reste sur une seule ligne sur les écrans de 1440 pixels de large, dans toutes les langues."
                ]
            },
            {
                "id": "battle",
                "date": "2026-10-11",
                "title": "Vue de bataille et Contre-attaque",
                "items": [
                    "Sur ordinateur, Attaque et Contre-attaque sont désormais côte à côte sur un seul écran pour voir les deux plans à la fois. Sur téléphone, ils sont empilés, Attaque en premier.",
                    "Contre-attaque est une liste à part pour un contre-rally d'une autre alliance : une seule vague, lancée au plus vite, avec ses propres lanceurs, son bouton Copier, son verrouillage, sa réinitialisation et sa réinitialisation auto. Son texte copié commence par son propre intitulé.",
                    "Chaque plan a une ligne Suivant : qui part ensuite, et dans combien de secondes.",
                    "Une nouvelle case Contre dans l'en-tête masque la Contre-attaque pour donner toute la largeur à l'Attaque. Votre choix est mémorisé.",
                    "Durées de rally de 1, 2, 3, 5 (par défaut) et 10 minutes.",
                    "La réinitialisation auto, de 1 à 15 minutes (5 par défaut), remet toute seule un plan verrouillé en EN DIRECT, avec un compte à rebours. Copier n'envoie jamais d'anciennes heures : il verrouille de nouvelles heures et vous le signale.",
                    "Trois nouvelles langues : Español, Français et Deutsch (neuf au total).",
                    "Trois thèmes de couleurs, Sombre, Lecture et Éclat Réduit, à choisir dans l'en-tête.",
                    "Le site demande aux moteurs de recherche de ne pas l'indexer."
                ]
            },
            {
                "id": "waves",
                "date": "2026-10-09",
                "title": "Vagues, horaires en direct et mot de passe",
                "items": [
                    "Vagues : jusqu'à 6 groupes de rallies qui arrivent à quelques secondes d'intervalle, avec un écart par défaut et un écart personnalisé pour chaque intervalle. Touchez un lanceur pour changer sa vague, appuyez sur Aléatoire pour répartir les lanceurs entre les vagues (avec Annuler) et saisissez une heure Arrivée à (UTC) par vague.",
                    "Horaires en direct : les heures suivent l'horloge jusqu'à ce que Copier les horaires les verrouille. Réinitialiser revient à EN DIRECT, et VERROUILLER verrouille sans copier.",
                    "Texte copié plus propre : Arrivée HH:MM:SS d'abord, puis une ligne par lanceur, et avec des vagues, un bloc par vague.",
                    "Un seul mot de passe d'alliance partagé à la place des comptes, avec un lien Se déconnecter.",
                    "Le bouton + Ajouter un lanceur devient Ajouter/Modifier, et l'import et l'export des lanceurs ont été supprimés."
                ]
            },
            {
                "id": "earlier",
                "date": "2026-03-27",
                "title": "Versions précédentes",
                "items": [
                    "Les premières versions avaient une connexion Discord, des rôles, des diffusions de rallies en direct, des profils de joueurs et des Alliance Docs. Tout cela a été retiré le 2026-10-09 pour un outil plus simple, sans comptes."
                ]
            }
        ]
    },
    "de": {
        "whats_new": "Neuigkeiten",
        "releases": [
            {
                "id": "guide",
                "date": "2026-10-12",
                "title": "Anleitung",
                "items": [
                    "Neue Anleitung: Der Button ? oben rechts öffnet Schnellstart, Timing, Wellen, Kampfansicht, Garnisonsverteidigung und einen Strategieleitfaden, in allen 9 Sprachen.",
                    "Die neue Seite Neuigkeiten (diese hier) listet die Änderungen auf, die neuesten zuerst.",
                    "Die Kopfzeile bleibt auf Bildschirmen mit 1440 Pixel Breite in jeder Sprache einzeilig."
                ]
            },
            {
                "id": "battle",
                "date": "2026-10-11",
                "title": "Kampfansicht und Konter",
                "items": [
                    "Angriff und Konter stehen am Computer jetzt nebeneinander auf einem Bildschirm, sodass du beide Pläne gleichzeitig siehst. Am Handy werden sie untereinander angezeigt, Angriff zuerst.",
                    "Konter ist eine eigene Liste für ein Gegen-Rally einer anderen Allianz: eine Welle, so schnell wie möglich, mit eigenen Rufern, eigenem Kopieren-Button, SPERREN, Zurücksetzen und Auto-Reset. Der kopierte Text beginnt mit einer eigenen Überschrift.",
                    "Jeder Plan hat eine Zeile „Als Nächstes“, die zeigt, wer als Nächstes startet und in wie vielen Sekunden.",
                    "Ein neues Kontrollkästchen „Konter“ in der Kopfzeile blendet Konter aus, sodass Angriff die volle Breite nutzt. Die Auswahl wird gespeichert.",
                    "Rally-Dauern von 1, 2, 3, 5 (Standard) und 10 Minuten.",
                    "Auto-Reset nach 1 bis 15 Minuten (Standard 5) setzt einen gesperrten Plan mit Countdown von selbst zurück auf LIVE. Kopieren sendet nie alte Zeiten: Es sperrt neue Zeiten und sagt dir Bescheid.",
                    "Drei neue Sprachen: Español, Français und Deutsch (insgesamt neun).",
                    "Drei Farbschemata, Dunkel, Lesemodus und Blendarm, wählbar in der Kopfzeile.",
                    "Die Seite bittet Suchmaschinen, sie nicht zu indexieren."
                ]
            },
            {
                "id": "waves",
                "date": "2026-10-09",
                "title": "Wellen, Live-Plan und Passwort",
                "items": [
                    "Wellen: bis zu 6 Gruppen von Rallys, die wenige Sekunden nacheinander landen, mit einem Standardabstand und einem eigenen Abstand pro Lücke. Tippe auf einen Rufer, um seine Welle zu wechseln, nutze Zufällig, um die Rufer auf die Wellen zu verteilen (mit Rückgängig), und gib pro Welle eine Zeit bei Ankunft um ein.",
                    "Live-Plan: Die Zeiten laufen mit der Uhr mit, bis Plan kopieren sie sperrt. Zurücksetzen bringt dich zurück auf LIVE, und SPERREN sperrt ohne zu kopieren.",
                    "Übersichtlicherer kopierter Text: zuerst die Ankunft HH:MM:SS, dann eine Zeile pro Rufer, und bei Wellen ein Block pro Welle.",
                    "Ein gemeinsames Allianz-Passwort statt Konten, mit einem Link zum Abmelden.",
                    "Der Button „+ Rufer hinzufügen“ heißt jetzt Hinzufügen/Bearbeiten, und Import und Export der Rufer wurden entfernt."
                ]
            },
            {
                "id": "earlier",
                "date": "2026-03-27",
                "title": "Frühere Versionen",
                "items": [
                    "Die ersten Versionen hatten Discord-Login, Rollen, Live-Rally-Übertragungen, Spielerprofile und Allianz-Dokumente. All das wurde am 2026-10-09 für ein einfacheres Tool ohne Konten entfernt."
                ]
            }
        ]
    },
    "pl": {
        "whats_new": "Co nowego",
        "releases": [
            {
                "id": "guide",
                "date": "2026-10-12",
                "title": "Poradnik",
                "items": [
                    "Nowy Poradnik: przycisk ? w prawym górnym rogu otwiera szybki start, wyjaśnienie czasów, fale, widok bitwy, Obronę Garnizonu i poradnik strategii we wszystkich 9 językach.",
                    "Nowa strona Co nowego (ta, którą czytasz) wylicza zmiany, od najnowszych.",
                    "Nagłówek mieści się w jednym wierszu na ekranach o szerokości 1440 pikseli w każdym języku."
                ]
            },
            {
                "id": "battle",
                "date": "2026-10-11",
                "title": "Widok bitwy i Kontra",
                "items": [
                    "Atak i Kontra są teraz obok siebie na jednym ekranie komputera, więc widzisz oba plany naraz. Na telefonie układają się jeden pod drugim, Atak na górze.",
                    "Kontra to osobna lista na kontr-rally innego sojuszu: jedna fala wysyłana jak najszybciej, z własnymi graczami, przyciskiem Kopiuj, blokadą, resetem i autoresetem. Skopiowany tekst zaczyna się własnym nagłówkiem.",
                    "Każdy plan ma linię Następny: pokazuje, kto startuje jako następny i za ile sekund.",
                    "Nowe pole wyboru Kontra w nagłówku ukrywa Kontrę, dzięki czemu Atak zajmuje całą szerokość. Wybór jest zapamiętywany.",
                    "Czas trwania rally: 1, 2, 3, 5 (domyślnie) i 10 minut.",
                    "Autoreset po 1-15 minutach (domyślnie 5) sam przywraca zablokowany plan do trybu NA ŻYWO i pokazuje odliczanie. Kopiowanie nigdy nie wysyła starych godzin: blokuje nowe i informuje o tym.",
                    "Trzy nowe języki: Español, Français i Deutsch (razem dziewięć).",
                    "Trzy motywy kolorystyczne, Ciemny, Do czytania i Przygaszony, wybierane w nagłówku.",
                    "Strona prosi wyszukiwarki, aby jej nie indeksowały."
                ]
            },
            {
                "id": "waves",
                "date": "2026-10-09",
                "title": "Fale, harmonogram na żywo i hasło",
                "items": [
                    "Fale: do 6 grup rally, które lądują co kilka sekund, z domyślnym odstępem i własnym odstępem dla każdej przerwy. Dotknij gracza, aby zmienić jego falę, naciśnij Losuj, aby rozrzucić graczy po falach (z opcją Cofnij), i wpisz jedną godzinę Lądowanie (UTC) dla każdej fali.",
                    "Harmonogram na żywo: godziny idą razem z zegarem, dopóki Kopiuj Harmonogram ich nie zablokuje. Resetuj wraca do trybu NA ŻYWO, a ZABLOKUJ blokuje bez kopiowania.",
                    "Czytelniejszy skopiowany tekst: najpierw Lądowanie GG:MM:SS, potem po jednej linii na gracza, a przy falach jeden blok na falę.",
                    "Jedno wspólne hasło sojuszu zamiast kont, z linkiem Wyloguj.",
                    "Przycisk + Dodaj gracza zmienił się w Dodaj/Edytuj, a import i eksport graczy usunięto."
                ]
            },
            {
                "id": "earlier",
                "date": "2026-03-27",
                "title": "Wcześniejsze wersje",
                "items": [
                    "Pierwsze wersje miały logowanie przez Discord, role, transmisje rally na żywo, profile graczy i Dokumenty Sojuszu. Wszystko to usunięto 2026-10-09, aby narzędzie było prostsze i bez kont."
                ]
            }
        ]
    },
    "ko": {
        "whats_new": "새로운 기능",
        "releases": [
            {
                "id": "guide",
                "date": "2026-10-12",
                "title": "가이드",
                "items": [
                    "새 가이드가 생겼습니다. 오른쪽 위의 ? 버튼을 누르면 빠른 시작, 시간 계산 방식, 웨이브, 전투 화면, 수비대 방어, 전략 가이드를 9개 언어로 볼 수 있습니다.",
                    "변경 내용을 최신순으로 보여 주는 '새로운 기능' 페이지(지금 보는 페이지)가 추가되었습니다.",
                    "너비 1440픽셀 화면에서는 어떤 언어에서도 헤더가 한 줄로 유지됩니다."
                ]
            },
            {
                "id": "battle",
                "date": "2026-10-11",
                "title": "전투 화면과 카운터",
                "items": [
                    "컴퓨터에서는 공격과 카운터가 한 화면에 나란히 표시되어 두 계획을 한눈에 볼 수 있습니다. 휴대폰에서는 공격이 위, 카운터가 아래로 쌓입니다.",
                    "카운터는 다른 연맹의 카운터 랠리를 위한 별도 목록입니다. 웨이브 하나를 최대한 빨리 보내며, 자체 소환자, 복사 버튼, 잠금, 초기화, 자동 초기화를 가집니다. 복사한 텍스트도 카운터 전용 제목으로 시작합니다.",
                    "각 계획에 다음 출발자와 남은 시간(초)을 알려 주는 '다음' 줄이 생겼습니다.",
                    "헤더의 새 카운터 체크 상자로 카운터를 숨기고 공격을 전체 너비로 쓸 수 있습니다. 선택은 기억됩니다.",
                    "랠리 지속시간을 1분, 2분, 3분, 5분(기본), 10분 중에서 고를 수 있습니다.",
                    "자동 초기화(1~15분, 기본 5분)를 켜면 잠긴 계획이 카운트다운 후 스스로 실시간 상태로 돌아갑니다. 복사는 지난 시간을 절대 내보내지 않고, 새 시간을 고정해 복사한 뒤 알려 줍니다.",
                    "에스파냐어, 프랑스어, 독일어 3개 언어가 추가되어 모두 9개 언어를 지원합니다.",
                    "헤더에서 다크, 읽기, 눈부심 감소 3가지 색상 테마를 고를 수 있습니다.",
                    "검색 엔진이 이 사이트를 수집하지 않도록 요청합니다."
                ]
            },
            {
                "id": "waves",
                "date": "2026-10-09",
                "title": "웨이브, 실시간 일정, 비밀번호",
                "items": [
                    "웨이브: 몇 초 간격으로 도착하는 랠리 그룹을 최대 6개까지 만들 수 있고, 기본 간격과 구간별 사용자 지정 간격을 설정할 수 있습니다. 소환자를 누르면 웨이브가 바뀌고, 무작위 배정 버튼으로 소환자를 웨이브에 나눠 넣을 수 있으며(실행 취소 가능), 웨이브마다 도착 시간을 따로 입력할 수 있습니다.",
                    "실시간 일정: 일정 복사 또는 잠금 버튼으로 고정하기 전까지 시간이 시계를 따라 움직입니다. 초기화 버튼을 누르면 실시간으로 돌아갑니다.",
                    "복사되는 텍스트가 더 깔끔해졌습니다. 맨 위에 도착 HH:MM:SS, 그 아래 소환자별 한 줄이며, 웨이브가 있으면 웨이브마다 한 블록으로 나뉩니다.",
                    "계정 대신 연맹 공용 비밀번호 하나를 사용하며, 로그아웃 링크가 생겼습니다.",
                    "'+ 소환자 추가' 버튼이 추가/편집 버튼으로 바뀌었고, 소환자 가져오기·내보내기는 삭제되었습니다."
                ]
            },
            {
                "id": "earlier",
                "date": "2026-03-27",
                "title": "이전 버전",
                "items": [
                    "초기 버전에는 Discord 로그인, 역할, 실시간 랠리 방송, 플레이어 프로필, 연맹 문서가 있었습니다. 계정이 없는 더 단순한 도구를 위해 2026-10-09에 모두 제거되었습니다."
                ]
            }
        ]
    },
    "zh": {
        "whats_new": "更新内容",
        "releases": [
            {
                "id": "guide",
                "date": "2026-10-12",
                "title": "指南",
                "items": [
                    "新增指南：点击右上角的 ? 按钮，即可查看快速入门、时间如何计算、波次、战斗视图、驻防和策略指南，支持全部 9 种语言。",
                    "新增“更新内容”页面（就是本页），按时间从新到旧列出所有改动。",
                    "在 1440 像素宽的屏幕上，所有语言的页眉都保持在一行。"
                ]
            },
            {
                "id": "battle",
                "date": "2026-10-11",
                "title": "战斗视图与反击",
                "items": [
                    "在电脑上，进攻和反击现在并排显示在同一屏幕，两份计划一目了然。在手机上则上下排列，进攻在前。",
                    "反击是为其他联盟的反击集结准备的独立名单：只有一波，尽快发出，有自己的召唤者、复制按钮、锁定、重置和自动重置。复制出的文本以它自己的标题开头。",
                    "每份计划都有“NEXT”一行，显示下一位出发的人以及还有多少秒。",
                    "页眉新增“反击”勾选框，可隐藏反击，让进攻占满整个宽度。该选择会被记住。",
                    "集结时长可选 1、2、3、5（默认）和 10 分钟。",
                    "自动重置（1 到 15 分钟，默认 5 分钟）会自动把已锁定的计划恢复为实时，并显示倒计时。复制绝不会发出旧时间：它会锁定新的时间并提示你。",
                    "新增三种语言：Español、Français 和 Deutsch（共九种）。",
                    "三种配色主题：深色、阅读和低眩光，可在页眉中选择。",
                    "网站现在要求搜索引擎不要收录。"
                ]
            },
            {
                "id": "waves",
                "date": "2026-10-09",
                "title": "波次、实时时间表与密码",
                "items": [
                    "波次：最多 6 组集结，相隔几秒依次到达，可设置默认间隔，每个间隔也可单独设置。点击召唤者可切换其波次，点击“随机分配”可把召唤者分配到各波次（可“撤销”），每个波次还可单独输入一个“到达时间 (UTC)：”。",
                    "实时时间表：时间随时钟走动，直到“复制时间表”将其锁定。“重置”恢复为实时，“锁定”则只锁定不复制。",
                    "复制的文本更简洁：先是到达 HH:MM:SS，然后每位召唤者一行；有波次时每个波次一段。",
                    "不再使用账号，改为全联盟共用一个密码，并新增“退出”链接。",
                    "“+ 添加召唤者”按钮改为“添加/编辑”，召唤者的导入和导出功能已移除。"
                ]
            },
            {
                "id": "earlier",
                "date": "2026-03-27",
                "title": "早期版本",
                "items": [
                    "最初的版本有 Discord 登录、角色、实时集结广播、玩家资料和联盟文档。这些功能已于 2026-10-09 全部移除，换成无需账号的更简单工具。"
                ]
            }
        ]
    },
    "tr": {
        "whats_new": "Yenilikler",
        "releases": [
            {
                "id": "guide",
                "date": "2026-10-12",
                "title": "Rehber",
                "items": [
                    "Yeni Rehber: sağ üstteki ? düğmesine basın. Hızlı başlangıç, zamanlamanın işleyişi, dalgalar, savaş görünümü, Garnizon Savunması ve strateji rehberi 9 dilde burada.",
                    "Yeni Yenilikler sayfası (şu an okuduğunuz) değişenleri en yeniden eskiye doğru listeler.",
                    "Üst bilgi, 1440 piksel genişliğindeki ekranlarda her dilde tek satırda kalır."
                ]
            },
            {
                "id": "battle",
                "date": "2026-10-11",
                "title": "Savaş görünümü ve Kontra",
                "items": [
                    "Bilgisayarda Saldırı ve Kontra artık tek ekranda yan yana durur, iki planı birden görürsünüz. Telefonda üst üste dizilir, Saldırı önce gelir.",
                    "Kontra, başka bir ittifakın karşı rallisi için ayrı bir listedir: mümkün olan en kısa sürede çıkan tek dalga. Kendi çağrıcıları, Kontrayı Kopyala düğmesi, kilidi, sıfırlaması ve otomatik sıfırlaması vardır. Kopyalanan metin kendi başlığıyla başlar.",
                    "Her planda, sıradaki kişinin kaç saniye sonra çıkacağını gösteren bir Sıradaki satırı bulunur.",
                    "Üst bilgideki yeni Karşı kutusu Kontra'yı gizler ve Saldırı tüm genişliği kullanır. Seçiminiz hatırlanır.",
                    "Ralli süreleri artık 1, 2, 3, 5 (varsayılan) ve 10 dakika.",
                    "Otomatik sıfırlama (1 ile 15 dakika arası, varsayılan 5) kilitli planı geri sayımla kendiliğinden CANLI durumuna döndürür. Kopyalama eski saatleri asla göndermez: yeni saatleri kilitler ve size söyler.",
                    "Üç yeni dil: Español, Français ve Deutsch (toplam dokuz).",
                    "Üst bilgiden seçilen üç renk teması: Koyu, Okuma ve Düşük Parlama.",
                    "Site, arama motorlarından uzak durmalarını ister."
                ]
            },
            {
                "id": "waves",
                "date": "2026-10-09",
                "title": "Dalgalar, canlı çizelge ve parola",
                "items": [
                    "Dalgalar: birkaç saniye arayla varan en fazla 6 ralli grubu; varsayılan gecikme ve her aralık için özel gecikme ayarlanabilir. Dalgasını değiştirmek için çağrıcıya dokunun, Rastgele dağıt düğmesi çağrıcıları dalgalara paylaştırır (Geri al ile geri alınır) ve her dalga için ayrı bir Varış saati yazabilirsiniz.",
                    "Canlı çizelge: saatler, kopyalayana kadar zamanla birlikte ilerler. Kopyalamak ya da KİLİTLE düğmesi onları sabitler, Sıfırla düğmesi CANLI durumuna döndürür.",
                    "Daha temiz kopyalanan metin: önce varış saati, sonra çağrıcı başına bir satır; dalgalarda her dalga için ayrı bir blok.",
                    "Hesaplar yerine herkesin paylaştığı tek bir ittifak parolası ve bir Çıkış yap bağlantısı geldi.",
                    "+ Çağrıcı Ekle düğmesi artık Ekle/Düzenle oldu; çağrıcı içe ve dışa aktarma kaldırıldı."
                ]
            },
            {
                "id": "earlier",
                "date": "2026-03-27",
                "title": "Eski sürümler",
                "items": [
                    "İlk sürümlerde Discord girişi, roller, canlı ralli yayınları, oyuncu profilleri ve İttifak Belgeleri vardı. Hesapsız, daha basit bir araç için bunların hepsi 2026-10-09 tarihinde kaldırıldı."
                ]
            }
        ]
    },
    "ar": {
        "whats_new": "الجديد",
        "releases": [
            {
                "id": "guide",
                "date": "2026-10-12",
                "title": "الدليل",
                "items": [
                    "دليل جديد: اضغط زر ؟ في أعلى الصفحة لتجد بداية سريعة وشرحًا للتوقيت والموجات وعرض المعركة ودفاع الحامية ودليل الاستراتيجية، بجميع اللغات التسع.",
                    "صفحة «الجديد» (هذه الصفحة) تعرض ما تغيّر، الأحدث أولًا.",
                    "يبقى الشريط العلوي في صف واحد على الشاشات بعرض 1440 بكسل في كل اللغات."
                ]
            },
            {
                "id": "battle",
                "date": "2026-10-11",
                "title": "عرض المعركة والهجوم المضاد",
                "items": [
                    "يظهر «هجوم» و«هجوم مضاد» جنبًا إلى جنب في شاشة واحدة على الحاسوب لترى الخطتين معًا، وعلى الهاتف يتراكبان والهجوم أولًا.",
                    "«هجوم مضاد» قائمة مستقلة لحشد مضاد من تحالف آخر: موجة واحدة تُرسل بأسرع ما يمكن، ولها منادوها وزر النسخ والقفل وإعادة الضبط والإعادة التلقائية. ويبدأ نصها المنسوخ بعنوانه الخاص.",
                    "في كل خطة سطر «التالي:» يبيّن من سيبدأ بعد ذلك وبعد كم ثانية.",
                    "خيار جديد «المضاد» في الشريط العلوي يخفي الهجوم المضاد ليأخذ الهجوم العرض كاملًا، ويُحفظ اختيارك.",
                    "مدد الحشد: 1 و2 و3 و5 (الافتراضية) و10 دقائق.",
                    "الإعادة التلقائية بعد 1 إلى 15 دقيقة (الافتراضية 5) تعيد الخطة المقفلة إلى «مباشر» تلقائيًا مع عدّ تنازلي. ولا ينسخ النسخ أوقاتًا قديمة أبدًا: يقفل أوقاتًا جديدة ويخبرك بذلك.",
                    "ثلاث لغات جديدة: Español وFrançais وDeutsch (تسع لغات في المجموع).",
                    "ثلاثة مظاهر ألوان: داكن وقراءة وإضاءة منخفضة، تختارها من الشريط العلوي.",
                    "يطلب الموقع من محركات البحث عدم فهرسته."
                ]
            },
            {
                "id": "waves",
                "date": "2026-10-09",
                "title": "الموجات والجدول المباشر وكلمة المرور",
                "items": [
                    "الموجات: حتى 6 مجموعات من الحشود تصل بفارق ثوانٍ قليلة، مع فاصل افتراضي وفاصل مخصص لكل فجوة. اضغط على المنادي لتغيير موجته، واضغط «توزيع عشوائي» لتوزيع المنادين على الموجات (مع «تراجع»)، واكتب وقت «الوصول (UTC):» واحدًا لكل موجة.",
                    "الجدول المباشر: تتحرك الأوقات مع الساعة إلى أن يقفلها «نسخ الجدول». «إعادة ضبط» يعيدها إلى «مباشر»، و«قفل» يقفلها دون نسخ.",
                    "نص منسوخ أنظف: يبدأ بسطر الوصول HH:MM:SS ثم سطر لكل منادٍ، ومع الموجات كتلة لكل موجة.",
                    "كلمة مرور واحدة مشتركة للتحالف بدل الحسابات، مع رابط «تسجيل الخروج».",
                    "أصبح زر «+ إضافة منادٍ» باسم «إضافة/تعديل»، وأُزيل استيراد المنادين وتصديرهم."
                ]
            },
            {
                "id": "earlier",
                "date": "2026-03-27",
                "title": "الإصدارات السابقة",
                "items": [
                    "كانت الإصدارات الأولى تضم تسجيل الدخول عبر Discord والأدوار والبث المباشر للحشود وملفات اللاعبين ووثائق التحالف. أُزيل كل ذلك في 2026-10-09 للحصول على أداة أبسط بلا حسابات."
                ]
            }
        ]
    }
};
});
