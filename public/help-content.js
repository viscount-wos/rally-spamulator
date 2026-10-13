/* User guide + strategy guide, all 9 languages (en es fr de pl ko zh tr ar).
 * Plain data, rendered by help.js with textContent only. Button and menu names are
 * written as {key} and replaced by the app's own label from i18n.js, so the guide
 * always uses the words the player sees on the buttons.
 * A section is [id, title, blocks]; a block is ['p', text] | ['h', text] |
 * ['ul', [text...]] | ['ol', [text...]] | ['pre', text]. */
(function (root, factory) {
    var api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    else root.RallyHelp = api;
})(typeof self !== 'undefined' ? self : this, function () {
    'use strict';
    var SAMPLE = 'Land 00:05:00\n23:58:15 - Alpha (march 1:45)\n23:59:05 - Bravo (march 0:55)\n23:59:30 - Charlie (march 0:30)';
    var WAVE_SAMPLE = '12:05:00, 12:05:10, 12:05:30';
    var HELP = {};

    HELP.en = {
        page_title: 'Guide', back: 'Back to the tool', contents: 'Contents',
        sections: [
            ['start', 'Quick start', [
                ['ol', [
                    'Open {tab_rally}. Press {add_caller} and type each caller\'s name and march time (M:SS, e.g. 1:45, or seconds). Press {done_btn}.',
                    'Tap the callers who are in this rally to tick them. {all} and {none_btn} tick or untick everyone.',
                    'Choose the rally duration to match the rally you open in the game.',
                    'Read each caller\'s start time in the schedule. The longest march starts first. Everything is in UTC (game time).',
                    'Press {copy_attack_btn} and paste into game chat. The times lock at that moment, so what you copied is what happens.',
                    'Press {reset_btn} for new times next time (or let Auto-reset do it).'
                ]],
                ['p', 'Everything you enter stays in this browser. Nothing is shared between people: each person has their own lists.']
            ]],
            ['timing', 'How the timing works', [
                ['p', 'A caller\'s start time is: landing time − rally duration − their march time. So every rally lands on the same second. The landing time is the first start + rally duration + the longest march.'],
                ['ul', [
                    '{live_ind} (green): the first start is now + the {reaction_time} setting, and the times move with the clock. Use it while you are still planning.',
                    '{copy_attack_btn} or {lock} freeze the times ({locked_ind}). The countdowns keep running to each start.',
                    '{land_at} lets you type a landing time (21:05 or 21:05:30) to plan for a fixed moment. A time just after midnight works: 00:05 typed at 23:50 means 15 minutes from now.',
                    'Orange means a caller is about to start; red means the start has passed.'
                ]],
                ['p', 'The copied text looks like this:'],
                ['pre', SAMPLE],
                ['p', 'If your browser blocks copying, long-press the chat text under the button and copy it by hand.']
            ]],
            ['waves', 'Waves', [
                ['p', 'A wave is a group of rallies that land together. Waves land a few seconds apart, one after another.'],
                ['ol', [
                    'In {rally_settings}, press {add_wave} (up to 6 waves).',
                    'Set {wave_delay} (10 seconds to start). Each gap (Wave 1 → 2, …) can have its own number: it turns orange and says custom.',
                    'Tap a caller to cycle off → 1 → 2 … → off. {randomise} shares callers out over the waves; {undo} reverts the last shuffle.',
                    'In {land_at} you can type one time per wave:'
                ]],
                ['pre', WAVE_SAMPLE],
                ['p', 'The schedule and the copied text are grouped by wave. With one wave everything works as in the quick start.']
            ]],
            ['battle', 'Battle view: Attack and Counter', [
                ['p', 'On a computer the Attack and Counter plans sit side by side, so you see both at once. On a phone they stack, Attack first.'],
                ['ul', [
                    'Attack is your own plan (waves included). Counter is one separate list for a counter-rally by another alliance: one wave, as soon as possible. Type that alliance\'s tag in the Counter title (e.g. BDE).',
                    'Each list has its own callers, duration, reaction time, Land at, LIVE/LOCKED state, Copy button and Auto-reset. Copying or resetting one never touches the other.',
                    'Each panel has a {next_label} line: who has to start next, and in how many seconds.',
                    'Untick {show_counter} in {menu_btn} to hide Counter and give Attack the full width. Counter keeps its state, and your choice is remembered.',
                    'The Counter text starts with its own heading, so it can\'t be mixed up with the Attack text.'
                ]]
            ]],
            ['reset', 'Reset, Auto-reset and old times', [
                ['ul', [
                    '{reset_btn} goes back to {live_ind}. Once the first start has passed it turns red with a warning.',
                    'Forgot to reset? Copy never sends old times: it resets, locks fresh times, copies them and tells you the old times had passed.',
                    '{auto_reset_label} (in {menu_btn}): Off, 1, 2, 3, 5 (default), 10 or 15 minutes. A locked plan goes back to LIVE by itself, with a countdown under {locked_ind}. Each list counts from its own lock time. Copying again or editing does not restart it.',
                    'Editing while locked keeps the first start where it is. Changing the {reaction_time} goes back to {live_ind}.'
                ]]
            ]],
            ['garrison', 'Garrison Defense', [
                ['ol', [
                    'Open {tab_garrison} and enter {your_march_time}: your march to the building you defend.',
                    'Keep an {enemy_roster}: press {add_enemy} and enter the name, alliance and march time of enemies who rally you.',
                    'When an enemy rally starts, tap that enemy under {select_enemy}, type the rally countdown shown in the game (e.g. 3:00) and press {track_btn}.',
                    '{incoming_rallies} shows a countdown to {send_now}, the UTC time to send, and when the rally hits.'
                ]],
                ['p', 'The maths: hit time = now + rally countdown + enemy march; send time = hit time − your march. Tracked rallies clear a minute after they land.']
            ]],
            ['strategy', 'Strategy guide', [
                ['p', 'Practical ways to get the most from the tool. This is about using the tool well; the game\'s own rules are for you and your alliance to decide.'],
                ['h', 'Before the fight'],
                ['ul', [
                    'Fill in callers and march times beforehand and check them in the game. March times change when speed bonuses or troops change, so re-check after any change.',
                    'Agree on one leader who copies and pastes. Everyone else only needs to start at the time next to their name.',
                    'Set the rally duration to match the rally you open in the game.'
                ]],
                ['h', 'During the fight'],
                ['ul', [
                    'Keep the plan LIVE while you are still choosing callers. Copy only when they are ready, because copying locks the times.',
                    'Set the reaction time to how long the leader needs from copying to the first caller starting, chat delay included. If it is too short, the first start has passed before anyone reads it (you get a warning, and Copy gives fresh times).',
                    'Use Land at when the landing moment is fixed, for example to land together with another group.',
                    'Use waves when you want landings one after another instead of all together. Start with the 10 second default and change single gaps only where needed.',
                    'Use Counter for a quick answer by another alliance: put their tag in the title, tick their callers and copy. Attack and Counter are independent, so one can stay frozen while the other is live.',
                    'Watch the {next_label} line: it is the first thing to say out loud.'
                ]],
                ['h', 'Defending'],
                ['ul', [
                    'Fill in the enemy roster in advance so tracking takes seconds: tap the enemy, type the countdown, press {track_btn}.',
                    'If your connection is slow, send a second or two before {send_now}.'
                ]],
                ['h', 'After the fight'],
                ['ul', [
                    'Press {reset_btn} (or wait for Auto-reset) before planning the next rally, so old times can never be copied by mistake.',
                    'All times are UTC, the same as the clock at the top of the tool.'
                ]]
            ]],
            ['tips', 'Good to know', [
                ['ul', [
                    'Lists, enemies, settings, language and theme are saved in this browser only. A different phone or browser starts empty, and clearing browser data clears them.',
                    'Language and theme are chosen from the two menus at the top right. Themes: Dark (default), Reading (light) and Low Glare.',
                    'The tool asks for the alliance password once; Log out forgets it. If the password changes, everyone is asked for the new one.'
                ]]
            ]]
        ]
    };

    HELP.es = {
        page_title: 'Guía', back: 'Volver a la herramienta', contents: 'Contenido',
        sections: [
            ['start', 'Inicio rápido', [
                ['ol', [
                    'Abre {tab_rally}. Pulsa {add_caller} y escribe el nombre y el tiempo de marcha de cada llamador (M:SS, p. ej. 1:45, o en segundos). Pulsa {done_btn}.',
                    'Toca a los llamadores que participan en este rally para marcarlos. {all} y {none_btn} marcan o desmarcan a todos.',
                    'Elige la duración del rally para que coincida con el rally que abres en el juego.',
                    'Lee la hora de salida de cada llamador en el horario. Sale primero el de marcha más larga. Todo está en UTC (hora del juego).',
                    'Pulsa {copy_attack_btn} y pega en el chat del juego. Las horas se bloquean en ese momento: lo que copiaste es lo que ocurre.',
                    'Pulsa {reset_btn} para obtener horas nuevas la próxima vez (o deja que lo haga el reinicio automático).'
                ]],
                ['p', 'Todo lo que escribes se queda en este navegador. Nada se comparte entre personas: cada uno tiene sus propias listas.']
            ]],
            ['timing', 'Cómo funcionan los tiempos', [
                ['p', 'La hora de salida de un llamador es: hora de llegada − duración del rally − su tiempo de marcha. Así todos los rallies llegan en el mismo segundo. La hora de llegada es la primera salida + duración del rally + la marcha más larga.'],
                ['ul', [
                    '{live_ind} (verde): la primera salida es ahora + el ajuste {reaction_time}, y las horas avanzan con el reloj. Úsalo mientras aún planificas.',
                    '{copy_attack_btn} o {lock} congelan las horas ({locked_ind}). Las cuentas atrás siguen corriendo hasta cada salida.',
                    '{land_at} te permite escribir una hora de llegada (21:05 o 21:05:30) para planificar un momento fijo. Una hora justo después de medianoche funciona: 00:05 escrito a las 23:50 significa dentro de 15 minutos.',
                    'Naranja significa que un llamador está a punto de salir; rojo, que su hora ya pasó.'
                ]],
                ['p', 'El texto copiado tiene este aspecto:'],
                ['pre', SAMPLE],
                ['p', 'Si el navegador bloquea la copia, mantén pulsado el texto de chat bajo el botón y cópialo a mano.']
            ]],
            ['waves', 'Oleadas', [
                ['p', 'Una oleada es un grupo de rallies que llegan juntos. Las oleadas llegan con unos segundos de diferencia, una tras otra.'],
                ['ol', [
                    'En {rally_settings}, pulsa {add_wave} (hasta 6 oleadas).',
                    'Ajusta {wave_delay} (10 segundos al empezar). Cada intervalo (Oleada 1 → 2, …) puede tener su propio número: se vuelve naranja e indica personalizada.',
                    'Toca a un llamador para recorrer: fuera → 1 → 2 … → fuera. {randomise} reparte a los llamadores entre las oleadas; {undo} deshace el último reparto.',
                    'En {land_at} puedes escribir una hora por oleada:'
                ]],
                ['pre', WAVE_SAMPLE],
                ['p', 'El horario y el texto copiado se agrupan por oleada. Con una sola oleada todo funciona como en el inicio rápido.']
            ]],
            ['battle', 'Vista de batalla: Ataque y Contraataque', [
                ['p', 'En un ordenador, los planes de Ataque y Contraataque aparecen uno al lado del otro para verlos a la vez. En el móvil se apilan, con Ataque primero.'],
                ['ul', [
                    'Ataque es tu propio plan (con oleadas). Contraataque es una lista aparte para un rally de contraataque de otra alianza: una oleada, lo antes posible. Escribe la etiqueta de esa alianza en el título de Contraataque (p. ej. BDE).',
                    'Cada lista tiene sus propios llamadores, duración, tiempo de reacción, hora de llegada, estado EN VIVO/BLOQUEADO, botón de copiar y reinicio automático. Copiar o reiniciar una nunca afecta a la otra.',
                    'Cada panel tiene una línea {next_label}: quién debe salir a continuación y en cuántos segundos.',
                    'Desmarca {show_counter} en {menu_btn} para ocultar el Contraataque y dar todo el ancho al Ataque. El Contraataque conserva su estado y se recuerda tu elección.',
                    'El texto del Contraataque empieza con su propio encabezado, así no se confunde con el del Ataque.'
                ]]
            ]],
            ['reset', 'Reinicio, reinicio automático y horas antiguas', [
                ['ul', [
                    '{reset_btn} vuelve a {live_ind}. Cuando ya ha pasado la primera salida, se pone rojo con un aviso.',
                    '¿Olvidaste reiniciar? Copiar nunca envía horas antiguas: reinicia, bloquea horas nuevas, las copia y te avisa de que las antiguas habían pasado.',
                    '{auto_reset_label} (en {menu_btn}): No, 1, 2, 3, 5 (por defecto), 10 o 15 minutos. Un plan bloqueado vuelve a EN VIVO solo, con una cuenta atrás bajo {locked_ind}. Cada lista cuenta desde su propio bloqueo. Copiar de nuevo o editar no lo reinicia.',
                    'Editar con el plan bloqueado mantiene la primera salida donde está. Cambiar el {reaction_time} vuelve a {live_ind}.'
                ]]
            ]],
            ['garrison', 'Defensa de guarnición', [
                ['ol', [
                    'Abre {tab_garrison} e introduce {your_march_time}: tu marcha hasta el edificio que defiendes.',
                    'Mantén una {enemy_roster}: pulsa {add_enemy} e introduce el nombre, la alianza y el tiempo de marcha de los enemigos que te lanzan rallies.',
                    'Cuando empiece un rally enemigo, toca a ese enemigo en {select_enemy}, escribe la cuenta atrás del rally que muestra el juego (p. ej. 3:00) y pulsa {track_btn}.',
                    '{incoming_rallies} muestra una cuenta atrás hasta {send_now}, la hora UTC de envío y cuándo llega el rally.'
                ]],
                ['p', 'El cálculo: hora de impacto = ahora + cuenta atrás del rally + marcha del enemigo; hora de envío = hora de impacto − tu marcha. Los rallies en seguimiento se borran un minuto después de llegar.']
            ]],
            ['strategy', 'Guía de estrategia', [
                ['p', 'Formas prácticas de sacar el máximo a la herramienta. Esto trata de usar bien la herramienta; las reglas del juego las decides tú junto con tu alianza.'],
                ['h', 'Antes del combate'],
                ['ul', [
                    'Rellena de antemano los llamadores y sus tiempos de marcha y compruébalos en el juego. Los tiempos de marcha cambian al cambiar bonos de velocidad o tropas, así que revísalos tras cualquier cambio.',
                    'Acuerda un líder que copie y pegue. El resto solo tiene que salir a la hora junto a su nombre.',
                    'Ajusta la duración del rally para que coincida con el rally que abres en el juego.'
                ]],
                ['h', 'Durante el combate'],
                ['ul', [
                    'Deja el plan EN VIVO mientras eliges llamadores. Copia solo cuando estén listos, porque copiar bloquea las horas.',
                    'Ajusta el tiempo de reacción a lo que necesita el líder desde copiar hasta que sale el primer llamador, incluido el retraso del chat. Si es demasiado corto, la primera salida pasa antes de que nadie la lea (verás un aviso y Copiar dará horas nuevas).',
                    'Usa «Llegada a las» cuando el momento de llegada esté fijado, por ejemplo para llegar junto con otro grupo.',
                    'Usa oleadas cuando quieras llegadas una tras otra en lugar de todas juntas. Empieza con los 10 segundos por defecto y cambia intervalos sueltos solo donde haga falta.',
                    'Usa Contraataque para una respuesta rápida contra otra alianza: pon su etiqueta en el título, marca a sus llamadores y copia. Ataque y Contraataque son independientes: uno puede seguir congelado mientras el otro está EN VIVO.',
                    'Mira la línea {next_label}: es lo primero que hay que decir en voz alta.'
                ]],
                ['h', 'Defendiendo'],
                ['ul', [
                    'Rellena la lista de enemigos de antemano para que el seguimiento lleve segundos: toca al enemigo, escribe la cuenta atrás y pulsa {track_btn}.',
                    'Si tu conexión es lenta, envía uno o dos segundos antes de {send_now}.'
                ]],
                ['h', 'Después del combate'],
                ['ul', [
                    'Pulsa {reset_btn} (o espera al reinicio automático) antes de planificar el siguiente rally, para no copiar horas antiguas por error.',
                    'Todas las horas son UTC, igual que el reloj de la parte superior de la herramienta.'
                ]]
            ]],
            ['tips', 'Conviene saber', [
                ['ul', [
                    'Listas, enemigos, ajustes, idioma y tema se guardan solo en este navegador. Otro móvil u otro navegador empieza vacío, y borrar los datos del navegador los borra.',
                    'El idioma y el tema se eligen en los dos menús de arriba a la derecha. Temas: Oscuro (por defecto), Lectura (claro) y Brillo Suave.',
                    'La herramienta pide la contraseña de la alianza una vez; Cerrar sesión la olvida. Si cambia la contraseña, se pide la nueva a todos.'
                ]]
            ]]
        ]
    };

    HELP.fr = {
        page_title: 'Guide', back: 'Retour à l\'outil', contents: 'Sommaire',
        sections: [
            ['start', 'Démarrage rapide', [
                ['ol', [
                    'Ouvrez {tab_rally}. Appuyez sur {add_caller} et saisissez le nom et le temps de marche de chaque lanceur (M:SS, p. ex. 1:45, ou en secondes). Appuyez sur {done_btn}.',
                    'Touchez les lanceurs qui participent à ce rally pour les cocher. {all} et {none_btn} cochent ou décochent tout le monde.',
                    'Choisissez la durée du rally pour qu\'elle corresponde à celui que vous ouvrez dans le jeu.',
                    'Lisez l\'heure de départ de chaque lanceur dans le planning. La marche la plus longue part en premier. Tout est en UTC (heure du jeu).',
                    'Appuyez sur {copy_attack_btn} et collez dans le chat du jeu. Les heures sont verrouillées à cet instant : ce que vous avez copié est ce qui se passera.',
                    'Appuyez sur {reset_btn} pour obtenir de nouvelles heures la fois suivante (ou laissez la réinitialisation auto le faire).'
                ]],
                ['p', 'Tout ce que vous saisissez reste dans ce navigateur. Rien n\'est partagé entre les personnes : chacun a ses propres listes.']
            ]],
            ['timing', 'Comment fonctionne le calcul des heures', [
                ['p', 'L\'heure de départ d\'un lanceur est : heure d\'arrivée − durée du rally − son temps de marche. Tous les rallies arrivent donc à la même seconde. L\'heure d\'arrivée est le premier départ + durée du rally + la marche la plus longue.'],
                ['ul', [
                    '{live_ind} (vert) : le premier départ est maintenant + le réglage {reaction_time}, et les heures suivent l\'horloge. Utilisez-le tant que vous préparez.',
                    '{copy_attack_btn} ou {lock} verrouillent les horaires ({locked_ind}). Les comptes à rebours continuent jusqu\'à chaque départ.',
                    '{land_at} permet de saisir une heure d\'arrivée (21:05 ou 21:05:30) pour viser un moment précis. Une heure juste après minuit fonctionne : 00:05 saisi à 23:50 signifie dans 15 minutes.',
                    'L\'orange signifie qu\'un lanceur est sur le point de partir ; le rouge, que son départ est passé.'
                ]],
                ['p', 'Le texte copié ressemble à ceci :'],
                ['pre', SAMPLE],
                ['p', 'Si le navigateur bloque la copie, appuyez longuement sur le texte du chat sous le bouton et copiez-le à la main.']
            ]],
            ['waves', 'Vagues', [
                ['p', 'Une vague est un groupe de rallies qui arrivent ensemble. Les vagues arrivent à quelques secondes d\'intervalle, l\'une après l\'autre.'],
                ['ol', [
                    'Dans {rally_settings}, appuyez sur {add_wave} (jusqu\'à 6 vagues).',
                    'Réglez {wave_delay} (10 secondes au départ). Chaque écart (Vague 1 → 2, …) peut avoir son propre nombre : il devient orange et affiche perso.',
                    'Touchez un lanceur pour changer sa vague : hors → 1 → 2 … → hors. {randomise} répartit les lanceurs entre les vagues ; {undo} annule la dernière répartition.',
                    'Dans {land_at}, vous pouvez saisir une heure par vague :'
                ]],
                ['pre', WAVE_SAMPLE],
                ['p', 'Le planning et le texte copié sont regroupés par vague. Avec une seule vague, tout fonctionne comme dans le démarrage rapide.']
            ]],
            ['battle', 'Vue de bataille : Attaque et Contre-attaque', [
                ['p', 'Sur ordinateur, les plans Attaque et Contre-attaque sont côte à côte pour voir les deux à la fois. Sur téléphone, ils sont empilés, Attaque en premier.'],
                ['ul', [
                    'Attaque est votre propre plan (vagues comprises). Contre-attaque est une liste séparée pour un contre-rally d\'une autre alliance : une vague, dès que possible. Saisissez le tag de cette alliance dans le titre Contre-attaque (p. ex. BDE).',
                    'Chaque liste a ses propres lanceurs, durée, temps de réaction, heure d\'arrivée, état EN DIRECT/VERROUILLÉ, bouton Copier et réinitialisation auto. Copier ou réinitialiser l\'une ne touche jamais l\'autre.',
                    'Chaque panneau a une ligne {next_label} : qui doit partir ensuite, et dans combien de secondes.',
                    'Décochez {show_counter} dans {menu_btn} pour masquer la Contre-attaque et donner toute la largeur à l\'Attaque. La Contre-attaque garde son état et votre choix est mémorisé.',
                    'Le texte de la Contre-attaque commence par son propre intitulé, pour ne jamais le confondre avec celui de l\'Attaque.'
                ]]
            ]],
            ['reset', 'Réinitialisation, réinitialisation auto et anciennes heures', [
                ['ul', [
                    '{reset_btn} revient à {live_ind}. Une fois le premier départ passé, il devient rouge avec un avertissement.',
                    'Vous avez oublié de réinitialiser ? Copier n\'envoie jamais d\'anciennes heures : il réinitialise, fige de nouvelles heures, les copie et indique que les anciennes étaient passées.',
                    '{auto_reset_label} (dans {menu_btn}) : Désactivée, 1, 2, 3, 5 (par défaut), 10 ou 15 minutes. Un plan verrouillé revient tout seul en direct, avec un compte à rebours sous {locked_ind}. Chaque liste compte depuis son propre verrouillage. Copier à nouveau ou modifier ne le relance pas.',
                    'Modifier pendant le verrouillage garde le premier départ en place. Changer le {reaction_time} revient à {live_ind}.'
                ]]
            ]],
            ['garrison', 'Défense de garnison', [
                ['ol', [
                    'Ouvrez {tab_garrison} et saisissez {your_march_time} : votre marche vers le bâtiment que vous défendez.',
                    'Tenez une {enemy_roster} : appuyez sur {add_enemy} et saisissez nom, alliance et temps de marche des ennemis qui vous lancent des rallies.',
                    'Quand un rally ennemi démarre, touchez cet ennemi sous {select_enemy}, saisissez le compte à rebours affiché dans le jeu (p. ex. 3:00) et appuyez sur {track_btn}.',
                    '{incoming_rallies} affiche un compte à rebours jusqu\'à {send_now}, l\'heure UTC d\'envoi et l\'heure d\'impact du rally.'
                ]],
                ['p', 'Le calcul : heure d\'impact = maintenant + compte à rebours + marche de l\'ennemi ; heure d\'envoi = heure d\'impact − votre marche. Les rallies suivis disparaissent une minute après leur arrivée.']
            ]],
            ['strategy', 'Guide de stratégie', [
                ['p', 'Des façons pratiques de tirer le meilleur de l\'outil. Il s\'agit de bien utiliser l\'outil ; les règles du jeu, c\'est à vous et à votre alliance de les décider.'],
                ['h', 'Avant le combat'],
                ['ul', [
                    'Renseignez à l\'avance les lanceurs et leurs temps de marche et vérifiez-les dans le jeu. Les temps de marche changent avec les bonus de vitesse ou les troupes ; revérifiez après tout changement.',
                    'Convenez d\'un chef qui copie et colle. Les autres n\'ont qu\'à partir à l\'heure indiquée à côté de leur nom.',
                    'Réglez la durée du rally pour qu\'elle corresponde à celui que vous ouvrez dans le jeu.'
                ]],
                ['h', 'Pendant le combat'],
                ['ul', [
                    'Laissez le plan en direct tant que vous choisissez les lanceurs. Ne copiez que lorsqu\'ils sont prêts, car copier fige les heures.',
                    'Réglez le temps de réaction sur le temps qu\'il faut au chef entre la copie et le départ du premier lanceur, délai du chat compris. S\'il est trop court, le premier départ est passé avant que quiconque le lise (vous avez un avertissement et Copier donne de nouvelles heures).',
                    'Utilisez l\'heure d\'arrivée quand le moment est fixé, par exemple pour arriver en même temps qu\'un autre groupe.',
                    'Utilisez les vagues quand vous voulez des arrivées l\'une après l\'autre plutôt que toutes ensemble. Commencez avec les 10 secondes par défaut et ne changez que les écarts nécessaires.',
                    'Utilisez Contre-attaque pour une réponse rapide d\'une autre alliance : mettez son tag dans le titre, cochez ses lanceurs et copiez. Attaque et Contre-attaque sont indépendantes : l\'une peut rester figée pendant que l\'autre est en direct.',
                    'Surveillez la ligne {next_label} : c\'est la première chose à dire à voix haute.'
                ]],
                ['h', 'En défense'],
                ['ul', [
                    'Remplissez la liste des ennemis à l\'avance pour que le suivi prenne quelques secondes : touchez l\'ennemi, saisissez le compte à rebours, appuyez sur {track_btn}.',
                    'Si votre connexion est lente, envoyez une ou deux secondes avant {send_now}.'
                ]],
                ['h', 'Après le combat'],
                ['ul', [
                    'Appuyez sur {reset_btn} (ou attendez la réinitialisation auto) avant de planifier le rally suivant, pour ne jamais copier d\'anciennes heures par erreur.',
                    'Toutes les heures sont en UTC, comme l\'horloge en haut de l\'outil.'
                ]]
            ]],
            ['tips', 'Bon à savoir', [
                ['ul', [
                    'Listes, ennemis, réglages, langue et thème sont enregistrés dans ce navigateur uniquement. Un autre téléphone ou navigateur démarre vide, et effacer les données du navigateur les efface.',
                    'La langue et le thème se choisissent dans les deux menus en haut à droite. Thèmes : Sombre (par défaut), Lecture (clair) et Éclat Réduit.',
                    'L\'outil demande une fois le mot de passe de l\'alliance ; Se déconnecter l\'oublie. Si le mot de passe change, tout le monde doit saisir le nouveau.'
                ]]
            ]]
        ]
    };

    HELP.de = {
        page_title: 'Anleitung', back: 'Zurück zum Tool', contents: 'Inhalt',
        sections: [
            ['start', 'Schnellstart', [
                ['ol', [
                    'Öffne {tab_rally}. Tippe auf {add_caller} und gib Name und Marschzeit jedes Rufers ein (M:SS, z. B. 1:45, oder in Sekunden). Tippe auf {done_btn}.',
                    'Tippe die Rufer an, die bei diesem Rally dabei sind, um sie anzuhaken. {all} und {none_btn} haken alle an oder ab.',
                    'Wähle die Rally-Dauer passend zum Rally, das du im Spiel öffnest.',
                    'Lies im Zeitplan die Startzeit jedes Rufers ab. Der längste Marsch startet zuerst. Alles ist in UTC (Spielzeit).',
                    'Tippe auf {copy_attack_btn} und füge den Text in den Spiel-Chat ein. Die Zeiten werden in diesem Moment gesperrt: Was du kopiert hast, passiert auch.',
                    'Tippe auf {reset_btn} für neue Zeiten beim nächsten Mal (oder lass den Auto-Reset das erledigen).'
                ]],
                ['p', 'Alles, was du eingibst, bleibt in diesem Browser. Zwischen Personen wird nichts geteilt: Jeder hat seine eigenen Listen.']
            ]],
            ['timing', 'So funktioniert die Zeitberechnung', [
                ['p', 'Die Startzeit eines Rufers ist: Landezeit − Rally-Dauer − seine Marschzeit. So landen alle Rallys in derselben Sekunde. Die Landezeit ist der erste Start + Rally-Dauer + der längste Marsch.'],
                ['ul', [
                    '{live_ind} (grün): Der erste Start ist jetzt + die Einstellung {reaction_time}, und die Zeiten laufen mit der Uhr mit. Nutze das, solange du noch planst.',
                    '{copy_attack_btn} oder {lock} sperren die Zeiten ({locked_ind}). Die Countdowns laufen bis zu jedem Start weiter.',
                    'Im Feld {land_at} kannst du eine Landezeit eingeben (21:05 oder 21:05:30), um einen festen Zeitpunkt zu planen. Eine Zeit kurz nach Mitternacht funktioniert: 00:05, um 23:50 eingegeben, bedeutet in 15 Minuten.',
                    'Orange bedeutet, dass ein Rufer gleich startet; rot, dass der Start vorbei ist.'
                ]],
                ['p', 'Der kopierte Text sieht so aus:'],
                ['pre', SAMPLE],
                ['p', 'Wenn dein Browser das Kopieren blockiert, halte den Chat-Text unter der Schaltfläche gedrückt und kopiere ihn von Hand.']
            ]],
            ['waves', 'Wellen', [
                ['p', 'Eine Welle ist eine Gruppe von Rallys, die gemeinsam landen. Wellen landen im Abstand weniger Sekunden nacheinander.'],
                ['ol', [
                    'Tippe in {rally_settings} auf {add_wave} (bis zu 6 Wellen).',
                    'Stelle {wave_delay} ein (zunächst 10 Sekunden). Jeder Abstand (Welle 1 → 2, …) kann eine eigene Zahl haben: Sie wird orange und zeigt „eigener“.',
                    'Tippe einen Rufer an, um durchzuschalten: aus → 1 → 2 … → aus. {randomise} verteilt die Rufer auf die Wellen; {undo} macht das letzte Mischen rückgängig.',
                    'Im Feld {land_at} kannst du pro Welle eine Zeit eingeben:'
                ]],
                ['pre', WAVE_SAMPLE],
                ['p', 'Zeitplan und kopierter Text sind nach Wellen gruppiert. Mit einer Welle funktioniert alles wie im Schnellstart.']
            ]],
            ['battle', 'Kampfansicht: Angriff und Konter', [
                ['p', 'Am Computer stehen Angriff und Konter nebeneinander, sodass du beides gleichzeitig siehst. Am Handy werden sie untereinander gestapelt, Angriff zuerst.'],
                ['ul', [
                    'Angriff ist dein eigener Plan (mit Wellen). Konter ist eine eigene Liste für ein Konter-Rally einer anderen Allianz: eine Welle, so schnell wie möglich. Gib das Kürzel dieser Allianz im Konter-Titel ein (z. B. BDE).',
                    'Jede Liste hat eigene Rufer, Dauer, Reaktionszeit, Landezeit, LIVE/GESPERRT-Zustand, Kopieren-Schaltfläche und Auto-Reset. Kopieren oder Zurücksetzen der einen Liste berührt die andere nie.',
                    'Jedes Panel hat eine Zeile {next_label}: wer als Nächstes starten muss und in wie vielen Sekunden.',
                    'Entferne den Haken bei {show_counter} im {menu_btn}, um den Konter auszublenden und dem Angriff die volle Breite zu geben. Der Konter behält seinen Zustand, und deine Wahl wird gemerkt.',
                    'Der Konter-Text beginnt mit einer eigenen Überschrift, damit er nicht mit dem Angriffstext verwechselt wird.'
                ]]
            ]],
            ['reset', 'Reset, Auto-Reset und alte Zeiten', [
                ['ul', [
                    '{reset_btn} geht zurück auf {live_ind}. Sobald der erste Start vorbei ist, wird es rot und warnt.',
                    'Reset vergessen? Kopieren sendet nie alte Zeiten: Es setzt zurück, sperrt neue Zeiten, kopiert sie und meldet, dass die alten vorbei waren.',
                    '{auto_reset_label} (im {menu_btn}): Aus, 1, 2, 3, 5 (Standard), 10 oder 15 Minuten. Ein gesperrter Plan geht von allein zurück auf LIVE, mit einem Countdown unter {locked_ind}. Jede Liste zählt ab ihrem eigenen Sperrzeitpunkt. Erneutes Kopieren oder Bearbeiten startet den Countdown nicht neu.',
                    'Bearbeiten im gesperrten Zustand lässt den ersten Start, wo er ist. Eine Änderung bei {reaction_time} geht zurück auf {live_ind}.'
                ]]
            ]],
            ['garrison', 'Garnisonsverteidigung', [
                ['ol', [
                    'Öffne {tab_garrison} und gib {your_march_time} ein: deinen Marsch zum Gebäude, das du verteidigst.',
                    'Pflege die {enemy_roster}: Tippe auf {add_enemy} und gib Name, Allianz und Marschzeit der Gegner ein, die dich mit Rallys angreifen.',
                    'Wenn ein gegnerisches Rally startet, tippe unter {select_enemy} diesen Gegner an, gib den im Spiel angezeigten Rally-Countdown ein (z. B. 3:00) und tippe auf {track_btn}.',
                    '{incoming_rallies} zeigt einen Countdown bis {send_now}, die UTC-Sendezeit und wann das Rally einschlägt.'
                ]],
                ['p', 'Die Rechnung: Einschlagzeit = jetzt + Rally-Countdown + Marsch des Gegners; Sendezeit = Einschlagzeit − dein Marsch. Verfolgte Rallys verschwinden eine Minute nach der Landung.']
            ]],
            ['strategy', 'Strategie-Leitfaden', [
                ['p', 'Praktische Tipps, um das Beste aus dem Tool herauszuholen. Es geht um den guten Umgang mit dem Tool; die Spielregeln legt ihr als Allianz selbst fest.'],
                ['h', 'Vor dem Kampf'],
                ['ul', [
                    'Trage Rufer und Marschzeiten vorher ein und prüfe sie im Spiel. Marschzeiten ändern sich, wenn sich Geschwindigkeitsboni oder Truppen ändern; prüfe sie nach jeder Änderung neu.',
                    'Einigt euch auf eine Person, die kopiert und einfügt. Alle anderen müssen nur zu der Zeit neben ihrem Namen starten.',
                    'Stelle die Rally-Dauer passend zum Rally ein, das du im Spiel öffnest.'
                ]],
                ['h', 'Während des Kampfes'],
                ['ul', [
                    'Lass den Plan auf LIVE, solange du noch Rufer auswählst. Kopiere erst, wenn sie bereit sind, denn Kopieren sperrt die Zeiten.',
                    'Stelle die Reaktionszeit auf die Zeit, die die kopierende Person vom Kopieren bis zum Start des ersten Rufers braucht, Chat-Verzögerung eingeschlossen. Ist sie zu kurz, ist der erste Start vorbei, bevor ihn jemand liest (du bekommst eine Warnung, und Kopieren liefert neue Zeiten).',
                    'Nutze „Ankunft um“, wenn der Zeitpunkt feststeht, z. B. um zusammen mit einer anderen Gruppe zu landen.',
                    'Nutze Wellen, wenn die Landungen nacheinander statt alle gemeinsam erfolgen sollen. Beginne mit den 10 Sekunden Standard und ändere einzelne Abstände nur dort, wo es nötig ist.',
                    'Nutze Konter für eine schnelle Antwort auf eine andere Allianz: Kürzel in den Titel, deren Rufer anhaken und kopieren. Angriff und Konter sind unabhängig: Einer kann gesperrt bleiben, während der andere LIVE ist.',
                    'Behalte die Zeile {next_label} im Blick: Das ist das Erste, was du laut ansagst.'
                ]],
                ['h', 'Beim Verteidigen'],
                ['ul', [
                    'Trage die Gegnerliste vorher ein, damit das Verfolgen nur Sekunden dauert: Gegner antippen, Countdown eingeben, {track_btn} drücken.',
                    'Bei langsamer Verbindung sende ein, zwei Sekunden vor {send_now}.'
                ]],
                ['h', 'Nach dem Kampf'],
                ['ul', [
                    'Drücke {reset_btn} (oder warte auf den Auto-Reset), bevor du das nächste Rally planst, damit nie versehentlich alte Zeiten kopiert werden.',
                    'Alle Zeiten sind UTC, genau wie die Uhr oben im Tool.'
                ]]
            ]],
            ['tips', 'Gut zu wissen', [
                ['ul', [
                    'Listen, Gegner, Einstellungen, Sprache und Design werden nur in diesem Browser gespeichert. Ein anderes Handy oder ein anderer Browser startet leer, und das Löschen der Browserdaten löscht sie.',
                    'Sprache und Design wählst du in den beiden Menüs oben rechts. Designs: Dark (Standard), Reading (hell) und Low Glare.',
                    'Das Tool fragt einmal nach dem Allianz-Passwort; Abmelden vergisst es. Ändert sich das Passwort, wird jeder nach dem neuen gefragt.'
                ]]
            ]]
        ]
    };

    HELP.pl = {
        page_title: 'Poradnik', back: 'Wróć do narzędzia', contents: 'Spis treści',
        sections: [
            ['start', 'Szybki start', [
                ['ol', [
                    'Otwórz {tab_rally}. Naciśnij {add_caller} i wpisz imię oraz czas marszu każdego zwołującego (M:SS, np. 1:45, lub w sekundach). Naciśnij {done_btn}.',
                    'Dotknij zwołujących biorących udział w tym zwołaniu, aby ich zaznaczyć. {all} i {none_btn} zaznaczają lub odznaczają wszystkich.',
                    'Wybierz czas trwania zwołania zgodny ze zwołaniem, które otwierasz w grze.',
                    'Odczytaj w harmonogramie godzinę startu każdego zwołującego. Najdłuższy marsz startuje pierwszy. Wszystko jest w UTC (czas gry).',
                    'Naciśnij {copy_attack_btn} i wklej na czat w grze. Godziny blokują się w tej chwili: dzieje się dokładnie to, co skopiowano.',
                    'Naciśnij {reset_btn}, aby następnym razem dostać nowe godziny (albo pozwól zrobić to automatycznemu resetowi).'
                ]],
                ['p', 'Wszystko, co wpiszesz, zostaje w tej przeglądarce. Nic nie jest współdzielone między osobami: każdy ma własne listy.']
            ]],
            ['timing', 'Jak działa wyliczanie czasu', [
                ['p', 'Godzina startu zwołującego to: godzina lądowania − czas trwania zwołania − jego czas marszu. Dzięki temu wszystkie zwołania lądują w tej samej sekundzie. Godzina lądowania to pierwszy start + czas trwania zwołania + najdłuższy marsz.'],
                ['ul', [
                    '{live_ind} (zielony): pierwszy start to teraz + ustawienie {reaction_time}, a godziny idą razem z zegarem. Używaj, gdy jeszcze planujesz.',
                    '{copy_attack_btn} lub {lock} zamrażają godziny ({locked_ind}). Odliczania biegną dalej do każdego startu.',
                    'W polu {land_at} możesz wpisać godzinę lądowania (21:05 lub 21:05:30), aby zaplanować ustalony moment. Godzina tuż po północy działa: 00:05 wpisane o 23:50 oznacza za 15 minut.',
                    'Pomarańczowy oznacza, że zwołujący zaraz startuje; czerwony, że start już minął.'
                ]],
                ['p', 'Skopiowany tekst wygląda tak:'],
                ['pre', SAMPLE],
                ['p', 'Jeśli przeglądarka blokuje kopiowanie, przytrzymaj tekst czatu pod przyciskiem i skopiuj go ręcznie.']
            ]],
            ['waves', 'Fale', [
                ['p', 'Fala to grupa zwołań, które lądują razem. Fale lądują w odstępie kilku sekund, jedna po drugiej.'],
                ['ol', [
                    'W sekcji {rally_settings} naciśnij {add_wave} (do 6 fal).',
                    'Ustaw {wave_delay} (na początek 10 sekund). Każdy odstęp (Fala 1 → 2, …) może mieć własną liczbę: robi się pomarańczowy i pokazuje „własny”.',
                    'Dotknij zwołującego, aby przełączać: wył. → 1 → 2 … → wył. {randomise} rozdziela zwołujących po falach; {undo} cofa ostatnie losowanie.',
                    'W polu {land_at} możesz wpisać po jednej godzinie na falę:'
                ]],
                ['pre', WAVE_SAMPLE],
                ['p', 'Harmonogram i skopiowany tekst są pogrupowane według fal. Przy jednej fali wszystko działa jak w szybkim starcie.']
            ]],
            ['battle', 'Widok bitwy: Atak i Kontra', [
                ['p', 'Na komputerze plany Ataku i Kontry są obok siebie, więc widzisz oba naraz. Na telefonie są ułożone jeden pod drugim, Atak pierwszy.'],
                ['ul', [
                    'Atak to twój własny plan (z falami). Kontra to osobna lista na kontrzwołanie innego sojuszu: jedna fala, jak najszybciej. Wpisz tag tego sojuszu w tytule Kontry (np. BDE).',
                    'Każda lista ma własnych zwołujących, czas trwania, czas reakcji, godzinę lądowania, stan NA ŻYWO/ZABLOKOWANY, przycisk kopiowania i automatyczny reset. Kopiowanie lub reset jednej nigdy nie rusza drugiej.',
                    'Każdy panel ma linię {next_label}: kto ma wystartować jako następny i za ile sekund.',
                    'Odznacz {show_counter} w {menu_btn}, aby ukryć Kontrę i dać Atakowi całą szerokość. Kontra zachowuje swój stan, a twój wybór jest zapamiętywany.',
                    'Tekst Kontry zaczyna się własnym nagłówkiem, więc nie pomylisz go z tekstem Ataku.'
                ]]
            ]],
            ['reset', 'Reset, automatyczny reset i stare godziny', [
                ['ul', [
                    '{reset_btn} wraca do {live_ind}. Gdy pierwszy start minie, robi się czerwony z ostrzeżeniem.',
                    'Zapomniałeś o resecie? Kopiowanie nigdy nie wysyła starych godzin: resetuje, blokuje świeże godziny, kopiuje je i informuje, że stare minęły.',
                    '{auto_reset_label} (w {menu_btn}): Wył., 1, 2, 3, 5 (domyślnie), 10 lub 15 minut. Zablokowany plan sam wraca do stanu NA ŻYWO, z odliczaniem pod {locked_ind}. Każda lista liczy od własnego zablokowania. Ponowne kopiowanie lub edycja go nie restartują.',
                    'Edycja przy zablokowanym planie zostawia pierwszy start na miejscu. Zmiana {reaction_time} wraca do {live_ind}.'
                ]]
            ]],
            ['garrison', 'Obrona Garnizonu', [
                ['ol', [
                    'Otwórz zakładkę {tab_garrison} i wypełnij pole {your_march_time}: twój marsz do budynku, którego bronisz.',
                    'Uzupełnij sekcję {enemy_roster}: naciśnij {add_enemy} i wpisz imię, sojusz i czas marszu wrogów, którzy zwołują na ciebie ataki.',
                    'Gdy zacznie się wrogie zwołanie, dotknij tego wroga w sekcji {select_enemy}, wpisz odliczanie zwołania pokazane w grze (np. 3:00) i naciśnij {track_btn}.',
                    '{incoming_rallies} pokazuje odliczanie do {send_now}, godzinę wysłania w UTC oraz kiedy zwołanie uderzy.'
                ]],
                ['p', 'Obliczenia: godzina uderzenia = teraz + odliczanie zwołania + marsz wroga; godzina wysłania = godzina uderzenia − twój marsz. Śledzone zwołania znikają minutę po uderzeniu.']
            ]],
            ['strategy', 'Poradnik strategiczny', [
                ['p', 'Praktyczne sposoby, by wycisnąć z narzędzia jak najwięcej. Chodzi o dobre używanie narzędzia; zasady samej gry ustalasz razem ze swoim sojuszem.'],
                ['h', 'Przed walką'],
                ['ul', [
                    'Wpisz zwołujących i czasy marszu wcześniej i sprawdź je w grze. Czasy marszu zmieniają się wraz z bonusami do prędkości lub wojskiem, więc sprawdź ponownie po każdej zmianie.',
                    'Ustalcie jednego lidera, który kopiuje i wkleja. Reszta musi tylko wystartować o godzinie podanej obok swojego imienia.',
                    'Ustaw czas trwania zwołania zgodny ze zwołaniem, które otwierasz w grze.'
                ]],
                ['h', 'W trakcie walki'],
                ['ul', [
                    'Zostaw plan w stanie NA ŻYWO, dopóki wybierasz zwołujących. Kopiuj dopiero, gdy są gotowi, bo kopiowanie blokuje godziny.',
                    'Ustaw czas reakcji na tyle, ile lider potrzebuje od skopiowania do startu pierwszego zwołującego, wliczając opóźnienie czatu. Jeśli jest za krótki, pierwszy start minie, zanim ktokolwiek to przeczyta (dostaniesz ostrzeżenie, a kopiowanie da świeże godziny).',
                    'Użyj pola {land_at}, gdy moment jest ustalony, np. by wylądować razem z inną grupą.',
                    'Użyj fal, gdy chcesz lądowań jedno po drugim zamiast wszystkich naraz. Zacznij od domyślnych 10 sekund i zmieniaj pojedyncze odstępy tylko tam, gdzie trzeba.',
                    'Użyj Kontry do szybkiej kontry innego sojuszu: wpisz jego tag w tytule, zaznacz jego zwołujących i skopiuj. Atak i Kontra są niezależne, więc jedno może zostać zablokowane, gdy drugie jest NA ŻYWO.',
                    'Patrz na linię {next_label}: to pierwsza rzecz do powiedzenia na głos.'
                ]],
                ['h', 'W obronie'],
                ['ul', [
                    'Wpisz listę wrogów wcześniej, aby śledzenie zajmowało sekundy: dotknij wroga, wpisz odliczanie, naciśnij {track_btn}.',
                    'Jeśli masz wolne łącze, wysyłaj sekundę lub dwie przed {send_now}.'
                ]],
                ['h', 'Po walce'],
                ['ul', [
                    'Naciśnij {reset_btn} (lub poczekaj na automatyczny reset) przed planowaniem następnego zwołania, by nigdy nie skopiować starych godzin przez pomyłkę.',
                    'Wszystkie godziny są w UTC, tak jak zegar na górze narzędzia.'
                ]]
            ]],
            ['tips', 'Warto wiedzieć', [
                ['ul', [
                    'Listy, wrogowie, ustawienia, język i motyw są zapisywane tylko w tej przeglądarce. Inny telefon lub inna przeglądarka zaczyna od zera, a wyczyszczenie danych przeglądarki je usuwa.',
                    'Język i motyw wybierasz w dwóch menu w prawym górnym rogu. Motywy: Dark (domyślny), Reading (jasny) i Low Glare.',
                    'Narzędzie raz prosi o hasło sojuszu; Wylogowanie je usuwa. Gdy hasło się zmieni, każdy zostanie poproszony o nowe.'
                ]]
            ]]
        ]
    };

    HELP.ko = {
        page_title: '가이드', back: '도구로 돌아가기', contents: '목차',
        sections: [
            ['start', '빠른 시작', [
                ['ol', [
                    '{tab_rally} 탭을 엽니다. {add_caller} 버튼을 누르고 각 소환자의 이름과 행군 시간(M:SS, 예: 1:45 또는 초 단위)을 입력한 뒤 {done_btn} 버튼을 누릅니다.',
                    '이번 랠리에 참여하는 소환자를 눌러 체크합니다. {all} 버튼은 모두 체크하고, {none_btn} 버튼은 모두 해제합니다.',
                    '게임에서 여는 랠리에 맞게 랠리 지속시간을 고릅니다.',
                    '일정표에서 각 소환자의 출발 시간을 확인합니다. 행군 시간이 가장 긴 사람이 먼저 출발합니다. 모든 시간은 UTC(게임 시간)입니다.',
                    '{copy_attack_btn} 버튼을 누르고 게임 채팅에 붙여넣습니다. 그 순간 시간이 고정되므로 복사한 내용 그대로 진행됩니다.',
                    '다음에 새 시간을 받으려면 {reset_btn} 버튼을 누릅니다(또는 자동 초기화에 맡깁니다).'
                ]],
                ['p', '입력한 내용은 이 브라우저에만 저장됩니다. 사람끼리 공유되지 않으며, 각자 자신의 목록을 가집니다.']
            ]],
            ['timing', '시각 계산 방식', [
                ['p', '소환자의 출발 시간 = 도착 시간 − 랠리 지속시간 − 그 사람의 행군 시간입니다. 그래서 모든 랠리가 같은 초에 도착합니다. 도착 시간은 첫 출발 + 랠리 지속시간 + 가장 긴 행군 시간입니다.'],
                ['ul', [
                    '{live_ind}(녹색): 첫 출발은 지금 + {reaction_time} 설정값이며, 시간이 시계와 함께 움직입니다. 아직 계획 중일 때 사용합니다.',
                    '{copy_attack_btn} 또는 {lock}을 누르면 시간이 고정됩니다({locked_ind}). 각 출발까지의 카운트다운은 계속 진행됩니다.',
                    '{land_at} 칸에 도착 시간(21:05 또는 21:05:30)을 입력하면 정해진 시점에 맞춰 계획할 수 있습니다. 자정 직후 시간도 가능합니다. 23:50에 00:05를 입력하면 15분 뒤입니다.',
                    '주황색은 소환자가 곧 출발한다는 뜻이고, 빨간색은 출발 시간이 지났다는 뜻입니다.'
                ]],
                ['p', '복사된 텍스트는 다음과 같습니다.'],
                ['pre', SAMPLE],
                ['p', '브라우저가 복사를 막으면 버튼 아래 채팅 텍스트를 길게 눌러 직접 복사하세요.']
            ]],
            ['waves', '웨이브', [
                ['p', '웨이브는 함께 도착하는 랠리 묶음입니다. 웨이브는 몇 초 간격으로 차례로 도착합니다.'],
                ['ol', [
                    '{rally_settings}에서 {add_wave} 버튼을 누릅니다(최대 6개).',
                    '{wave_delay} 항목을 설정합니다(기본 10초). 각 간격(웨이브 1 → 2, …)에 따로 값을 줄 수 있으며, 그러면 주황색으로 바뀌고 사용자 지정으로 표시됩니다.',
                    '소환자를 누를 때마다 제외 → 1 → 2 … → 제외 순으로 바뀝니다. {randomise} 버튼은 소환자를 웨이브에 나눠 배정하고, {undo} 버튼은 마지막 배정을 되돌립니다.',
                    '{land_at} 칸에 웨이브마다 시간을 하나씩 입력할 수 있습니다.'
                ]],
                ['pre', WAVE_SAMPLE],
                ['p', '일정표와 복사된 텍스트는 웨이브별로 묶입니다. 웨이브가 하나면 빠른 시작과 똑같이 동작합니다.']
            ]],
            ['battle', '전투 화면: 공격과 카운터', [
                ['p', '컴퓨터에서는 공격과 카운터 계획이 나란히 놓여 둘을 동시에 볼 수 있습니다. 휴대폰에서는 공격이 위, 카운터가 아래로 쌓입니다.'],
                ['ul', [
                    '공격은 내 계획(웨이브 포함)입니다. 카운터는 다른 연맹의 카운터 랠리를 위한 별도 목록으로, 웨이브 하나를 최대한 빨리 보냅니다. 카운터 제목에 그 연맹의 태그를 입력하세요(예: BDE).',
                    '각 목록은 자신만의 소환자, 랠리 지속시간, 반응 시간, 도착 시간, {live_ind}/{locked_ind} 상태, 복사 버튼, 자동 초기화를 가집니다. 한쪽을 복사하거나 초기화해도 다른 쪽에는 영향이 없습니다.',
                    '각 패널에는 {next_label} 줄이 있어, 다음에 누가 출발해야 하는지와 몇 초 뒤인지를 보여 줍니다.',
                    '{menu_btn}에서 {show_counter} 체크를 해제하면 카운터가 숨겨지고 공격이 전체 너비를 씁니다. 카운터의 상태는 유지되며, 이 선택도 기억됩니다.',
                    '카운터 텍스트는 자체 제목으로 시작하므로 공격 텍스트와 헷갈리지 않습니다.'
                ]]
            ]],
            ['reset', '초기화, 자동 초기화, 지난 시각', [
                ['ul', [
                    '{reset_btn} 버튼을 누르면 {live_ind} 상태로 돌아갑니다. 첫 출발 시간이 지나면 빨간색으로 바뀌며 경고가 표시됩니다.',
                    '초기화를 잊었나요? 복사해도 지난 시간은 절대 나가지 않습니다. 초기화하고 새 시간을 고정해 복사한 뒤, 이전 시간이 지났다고 알려 줍니다.',
                    '{auto_reset_label}({menu_btn}): 끔, 1, 2, 3, 5(기본), 10, 15분. 잠긴 계획은 저절로 {live_ind} 상태로 돌아가며, {locked_ind} 아래에 카운트다운이 표시됩니다. 각 목록은 자신이 잠긴 시점부터 계산합니다. 다시 복사하거나 편집해도 카운트다운은 다시 시작되지 않습니다.',
                    '잠긴 상태에서 편집해도 첫 출발은 그대로입니다. {reaction_time} 설정을 바꾸면 {live_ind} 상태로 돌아갑니다.'
                ]]
            ]],
            ['garrison', '수비대 방어', [
                ['ol', [
                    '{tab_garrison} 탭을 열고 {your_march_time}을 입력합니다. 방어하는 건물까지의 내 행군 시간입니다.',
                    '{enemy_roster} 항목을 관리합니다. {add_enemy} 버튼을 누르고 나에게 랠리를 거는 적의 이름, 연맹, 행군 시간을 입력합니다.',
                    '적의 랠리가 시작되면 {select_enemy}에서 해당 적을 누르고, 게임에 표시된 랠리 카운트다운(예: 3:00)을 입력한 뒤 {track_btn} 버튼을 누릅니다.',
                    '{incoming_rallies} 목록에는 {send_now} 표시까지의 카운트다운, 보낼 UTC 시간, 랠리가 도착하는 시간이 표시됩니다.'
                ]],
                ['p', '계산: 도착 시간 = 지금 + 랠리 카운트다운 + 적의 행군 시간, 발송 시간 = 도착 시간 − 내 행군 시간. 추적한 랠리는 도착 1분 뒤에 사라집니다.']
            ]],
            ['strategy', '전략 가이드', [
                ['p', '도구를 최대한 활용하는 실용적인 방법입니다. 도구 사용법에 관한 내용이며, 게임 자체의 규칙은 여러분과 연맹이 정할 일입니다.'],
                ['h', '전투 전'],
                ['ul', [
                    '소환자와 행군 시간을 미리 입력하고 게임에서 확인하세요. 행군 시간은 속도 보너스나 병력이 바뀌면 달라지므로, 변경이 있을 때마다 다시 확인하세요.',
                    '복사해서 붙여넣을 리더를 한 명 정하세요. 나머지는 자기 이름 옆의 시간에 출발하기만 하면 됩니다.',
                    '게임에서 여는 랠리에 맞게 랠리 지속시간을 설정하세요.'
                ]],
                ['h', '전투 중'],
                ['ul', [
                    '소환자를 고르는 동안에는 계획을 {live_ind} 상태로 두세요. 복사하면 시간이 고정되므로 준비가 끝났을 때만 복사하세요.',
                    '반응 시간은 리더가 복사한 뒤 첫 소환자가 출발하기까지 걸리는 시간(채팅 지연 포함)으로 설정하세요. 너무 짧으면 아무도 읽기 전에 첫 출발 시간이 지나갑니다(경고가 뜨고, 복사하면 새 시간이 나옵니다).',
                    '다른 그룹과 함께 도착하는 등 도착 시점이 정해져 있으면 도착 시간 입력란을 사용하세요.',
                    '한꺼번에가 아니라 차례로 도착시키고 싶다면 웨이브를 사용하세요. 기본값 10초로 시작하고, 필요한 간격만 개별로 바꾸세요.',
                    '다른 연맹이 빠르게 대응해야 할 때는 카운터를 사용하세요. 제목에 태그를 넣고, 그쪽 소환자를 체크한 뒤 복사합니다. 공격과 카운터는 독립적이어서 한쪽을 잠가 둔 채 다른 쪽을 {live_ind} 상태로 쓸 수 있습니다.',
                    '{next_label} 줄을 보세요. 가장 먼저 소리 내어 알려야 할 내용입니다.'
                ]],
                ['h', '방어할 때'],
                ['ul', [
                    '적 명단을 미리 채워 두면 추적이 몇 초면 끝납니다. 적을 누르고, 카운트다운을 입력하고, {track_btn} 버튼을 누르세요.',
                    '연결이 느리다면 {send_now} 표시보다 1~2초 일찍 보내세요.'
                ]],
                ['h', '전투 후'],
                ['ul', [
                    '다음 랠리를 계획하기 전에 {reset_btn} 버튼을 누르세요(또는 자동 초기화를 기다리세요). 그러면 지난 시간을 실수로 복사할 일이 없습니다.',
                    '모든 시간은 도구 상단의 시계와 같은 UTC입니다.'
                ]]
            ]],
            ['tips', '알아두기', [
                ['ul', [
                    '소환자 목록, 적 명단, 설정, 언어, 테마는 이 브라우저에만 저장됩니다. 다른 휴대폰이나 브라우저는 비어 있는 상태로 시작하며, 브라우저 데이터를 지우면 함께 지워집니다.',
                    '언어와 테마는 오른쪽 위의 두 메뉴에서 고릅니다. 테마: 다크(기본), 읽기(밝음), 눈부심 감소.',
                    '도구는 연맹 비밀번호를 한 번 묻습니다. 로그아웃하면 저장된 비밀번호가 지워집니다. 비밀번호가 바뀌면 모두에게 새 비밀번호를 다시 묻습니다.'
                ]]
            ]]
        ]
    };

    HELP.zh = {
        page_title: '指南', back: '返回工具', contents: '目录',
        sections: [
            ['start', '快速入门', [
                ['ol', [
                    '打开{tab_rally}。点击{add_caller}，输入每位召唤者的名字和行军时间（M:SS，例如 1:45，或以秒为单位）。点击{done_btn}。',
                    '点击参加本次集结的召唤者进行勾选。{all}和{none_btn}可全选或全不选。',
                    '选择与你在游戏中发起的集结相符的集结时长。',
                    '在时间表中查看每位召唤者的出发时间。行军最长的先出发。所有时间均为 UTC（游戏时间）。',
                    '点击{copy_attack_btn}并粘贴到游戏聊天。时间在此刻锁定，所以你复制的就是实际发生的。',
                    '下次想要新的时间时点击{reset_btn}（或让自动重置来完成）。'
                ]],
                ['p', '你输入的内容只保存在此浏览器中。人与人之间不共享任何内容：每个人都有自己的列表。']
            ]],
            ['timing', '时间如何计算', [
                ['p', '召唤者的出发时间 = 到达时间 − 集结时长 − 其行军时间。因此所有集结在同一秒到达。到达时间 = 首次出发 + 集结时长 + 最长行军。'],
                ['ul', [
                    '{live_ind}（绿色）：首次出发时间 = 现在 + {reaction_time}设置，时间随时钟变化。仍在规划时使用它。',
                    '{copy_attack_btn}或{lock}会冻结时间（{locked_ind}）。各出发时间的倒计时继续运行。',
                    '在{land_at}中可输入到达时间（21:05 或 21:05:30），按固定时刻规划。跨过午夜也可以：在 23:50 输入 00:05 表示 15 分钟后。',
                    '橙色表示召唤者即将出发；红色表示出发时间已过。'
                ]],
                ['p', '复制的文本如下：'],
                ['pre', SAMPLE],
                ['p', '如果浏览器阻止复制，请长按按钮下方的聊天文本，手动复制。']
            ]],
            ['waves', '波次', [
                ['p', '波次是一组同时到达的集结。各波次相隔几秒，依次到达。'],
                ['ol', [
                    '在{rally_settings}中点击{add_wave}（最多 6 波）。',
                    '设置{wave_delay}（初始为 10 秒）。每个间隔（第 1 波 → 第 2 波，…）可单独设置数值：它会变成橙色并显示“自定义”。',
                    '点击召唤者循环切换：关 → 1 → 2 … → 关。{randomise}把召唤者分配到各波次；{undo}撤销上一次随机。',
                    '在{land_at}中可为每个波次输入一个时间：'
                ]],
                ['pre', WAVE_SAMPLE],
                ['p', '时间表和复制的文本按波次分组。只有一个波次时，一切与快速入门相同。']
            ]],
            ['battle', '战斗视图：进攻与反击', [
                ['p', '在电脑上，进攻和反击计划并排显示，可同时查看。在手机上上下堆叠，进攻在前。'],
                ['ul', [
                    '进攻是你自己的计划（含波次）。反击是用于应对其他联盟的独立列表（反击集结）：一个波次，尽快发出。在反击标题中输入该联盟的标签（例如 BDE）。',
                    '每个列表都有自己的召唤者、时长、反应时间、到达时间、实时/已锁定状态、复制按钮和自动重置。复制或重置其中一个不会影响另一个。',
                    '每个面板都有一行{next_label}：下一个该出发的人，以及还有多少秒。',
                    '在{menu_btn}中取消勾选{show_counter}可隐藏反击，让进攻占满整个宽度。反击保留其状态，你的选择会被记住。',
                    '反击文本以自己的标题开头，因此不会与进攻文本混淆。'
                ]]
            ]],
            ['reset', '重置、自动重置与过期时间', [
                ['ul', [
                    '{reset_btn}返回{live_ind}。首次出发时间过去后，它会变红并发出警告。',
                    '忘记重置了？复制绝不会发送旧时间：它会重置、锁定新时间、复制，并告知旧时间已过。',
                    '{auto_reset_label}（{menu_btn}）：关闭、1、2、3、5（默认）、10 或 15 分钟。已锁定的计划会自动回到{live_ind}，并在{locked_ind}下方显示倒计时。每个列表从各自的锁定时间开始计时。再次复制或编辑不会重新计时。',
                    '锁定状态下编辑会保持首次出发不变。更改{reaction_time}会回到{live_ind}。'
                ]]
            ]],
            ['garrison', '驻防防御', [
                ['ol', [
                    '打开{tab_garrison}，输入{your_march_time}：你到所防守建筑的行军时间。',
                    '维护一份{enemy_roster}：点击{add_enemy}，输入对你发起集结的敌人的名字、联盟和行军时间。',
                    '敌方集结开始时，在{select_enemy}下点选该敌人，输入游戏中显示的集结倒计时（例如 3:00），然后点击{track_btn}。',
                    '{incoming_rallies}显示距{send_now}的倒计时、应发送的 UTC 时间，以及集结命中的时间。'
                ]],
                ['p', '算法：命中时间 = 现在 + 集结倒计时 + 敌人行军；发送时间 = 命中时间 − 你的行军时间。已追踪的集结在到达一分钟后清除。']
            ]],
            ['strategy', '策略指南', [
                ['p', '充分发挥工具作用的实用方法。这里讲的是如何用好工具；游戏本身的规则由你和你的联盟决定。'],
                ['h', '战斗前'],
                ['ul', [
                    '提前填好召唤者和行军时间，并在游戏中核对。加速加成或兵力变化会改变行军时间，所以每次变动后都要重新核对。',
                    '约定一位负责复制粘贴的领队。其他人只需在自己名字旁的时间出发。',
                    '把集结时长设置为与你在游戏中发起的集结一致。'
                ]],
                ['h', '战斗中'],
                ['ul', [
                    '还在挑选召唤者时保持{live_ind}。准备好后再复制，因为复制会锁定时间。',
                    '把反应时间设为领队从复制到第一位召唤者出发所需的时间（含聊天延迟）。太短的话，第一次出发在有人看到之前就已过去（会出现警告，复制会给出新时间）。',
                    '到达时刻固定时使用到达时间，例如要与另一组同时到达。',
                    '想让集结依次到达而不是同时到达时，使用波次。先用默认的 10 秒，只在需要时单独调整某个间隔。',
                    '用反击快速回应其他联盟：把其标签填入标题，勾选其召唤者并复制。进攻与反击相互独立，所以可以让一个保持已锁定，另一个保持实时。',
                    '盯住{next_label}这一行：它是第一个要喊出来的内容。'
                ]],
                ['h', '防守时'],
                ['ul', [
                    '提前填好敌人名单，追踪只需几秒：点选敌人、输入倒计时、点击{track_btn}。',
                    '如果网络较慢，请在{send_now}出现前一两秒发送。'
                ]],
                ['h', '战斗后'],
                ['ul', [
                    '规划下一次集结前先点击{reset_btn}（或等待自动重置），这样就不会误复制旧时间。',
                    '所有时间均为 UTC，与工具顶部的时钟一致。'
                ]]
            ]],
            ['tips', '须知', [
                ['ul', [
                    '列表、敌人、设置、语言和主题只保存在此浏览器中。换一部手机或浏览器会是空的，清除浏览器数据也会清除它们。',
                    '语言和主题在右上角的两个菜单中选择。主题：深色（默认）、阅读（浅色）和低眩光。',
                    '工具只会询问一次联盟密码；退出登录会忘记它。如果密码更改，所有人都会被要求输入新密码。'
                ]]
            ]]
        ]
    };

    HELP.tr = {
        page_title: 'Rehber', back: 'Araca dön', contents: 'İçindekiler',
        sections: [
            ['start', 'Hızlı başlangıç', [
                ['ol', [
                    '{tab_rally} sekmesini aç. {add_caller} düğmesine bas ve her çağrıcının adını ve yürüyüş süresini yaz (M:SS, örn. 1:45, veya saniye). {done_btn} düğmesine bas.',
                    'Bu ralliye katılan çağrıcılara dokunarak işaretle. {all} ve {none_btn} herkesi işaretler veya işareti kaldırır.',
                    'Oyunda açtığın ralliyle aynı ralli süresini seç.',
                    'Çizelgede her çağrıcının çıkış saatini oku. En uzun yürüyüş süresi olan ilk çıkar. Tüm saatler UTC (oyun saati) cinsindendir.',
                    '{copy_attack_btn} düğmesine bas ve oyun sohbetine yapıştır. Saatler o anda kilitlenir; yani kopyaladığın saatler geçerli olur.',
                    'Bir dahaki sefere yeni saatler için {reset_btn} düğmesine bas (ya da otomatik sıfırlamaya bırak).'
                ]],
                ['p', 'Girdiğin her şey bu tarayıcıda kalır. Kişiler arasında hiçbir şey paylaşılmaz: herkesin kendi listeleri vardır.']
            ]],
            ['timing', 'Zamanlama nasıl çalışır', [
                ['p', 'Bir çağrıcının çıkış saati: varış saati − ralli süresi − yürüyüş süresi. Böylece tüm ralliler aynı saniyede varır. Varış saati, ilk çıkış + ralli süresi + en uzun yürüyüş süresidir.'],
                ['ul', [
                    '{live_ind} (yeşil): ilk çıkış şimdi + {reaction_time} ayarıdır ve saatler zamanla birlikte ilerler. Hâlâ plan yaparken kullan.',
                    '{copy_attack_btn} veya {lock} saatleri dondurur ({locked_ind}). Geri sayımlar her çıkışa doğru akmaya devam eder.',
                    '{land_at} ile sabit bir an için varış saati yazabilirsin (21:05 veya 21:05:30). Gece yarısından hemen sonraki saat de çalışır: 23:50\'de yazılan 00:05, 15 dakika sonra demektir.',
                    'Turuncu, çağrıcının çıkmak üzere olduğunu; kırmızı, çıkış saatinin geçtiğini gösterir.'
                ]],
                ['p', 'Kopyalanan metin şöyle görünür:'],
                ['pre', SAMPLE],
                ['p', 'Tarayıcı kopyalamayı engellerse, düğmenin altındaki sohbet metnine uzun basıp elle kopyala.']
            ]],
            ['waves', 'Dalgalar', [
                ['p', 'Dalga, aynı anda varan ralli grubudur. Dalgalar birkaç saniye arayla, art arda varır.'],
                ['ol', [
                    '{rally_settings} içinde {add_wave} düğmesine bas (en fazla 6 dalga).',
                    '{wave_delay} ayarını yap (başlangıçta 10 saniye). Her aralık (Dalga 1 → 2, …) kendi değerine sahip olabilir: turuncuya döner ve özel yazar.',
                    'Bir çağrıcıya dokundukça sırayla değişir: kapalı → 1 → 2 … → kapalı. {randomise} çağrıcıları dalgalara paylaştırır; {undo} son dağıtımı geri alır.',
                    '{land_at} alanına dalga başına bir saat yazabilirsin:'
                ]],
                ['pre', WAVE_SAMPLE],
                ['p', 'Çizelge ve kopyalanan metin dalgalara göre gruplanır. Tek dalgayla her şey hızlı başlangıçtaki gibi çalışır.']
            ]],
            ['battle', 'Savaş görünümü: Saldırı ve Karşı saldırı', [
                ['p', 'Bilgisayarda Saldırı ve Kontra planları yan yana durur, böylece ikisini birden görürsün. Telefonda üst üste dizilir, Saldırı önce gelir.'],
                ['ul', [
                    'Saldırı kendi planındır (dalgalar dahil). Kontra, başka bir ittifakın karşı ralli açması için ayrı bir listedir: tek dalga, mümkün olan en kısa sürede. O ittifakın etiketini Kontra başlığına yaz (örn. BDE).',
                    'Her listenin kendi çağrıcıları, ralli süresi, tepki süresi, varış saati, CANLI/KİLİTLİ durumu, kopyalama düğmesi ve otomatik sıfırlaması vardır. Birini kopyalamak veya sıfırlamak diğerini asla etkilemez.',
                    'Her panelde bir {next_label} satırı vardır: sıradaki kimin, kaç saniye sonra çıkması gerektiğini gösterir.',
                    '{menu_btn} içinde {show_counter} işaretini kaldırırsan Kontra gizlenir ve Saldırı tüm genişliği kullanır. Kontra durumunu korur ve seçimin hatırlanır.',
                    'Kontra metni kendi başlığıyla başlar, böylece Saldırı metniyle karışmaz.'
                ]]
            ]],
            ['reset', 'Sıfırlama, otomatik sıfırlama ve eski saatler', [
                ['ul', [
                    '{reset_btn}, {live_ind} durumuna döner. İlk çıkış saati geçince kırmızıya döner ve uyarı verir.',
                    'Sıfırlamayı mı unuttun? Kopyalama asla eski saatleri göndermez: sıfırlar, yeni saatleri kilitler, kopyalar ve eski saatlerin geçtiğini söyler.',
                    '{auto_reset_label} ({menu_btn} içinde): Kapalı, 1, 2, 3, 5 (varsayılan), 10 veya 15 dakika. Kilitli plan kendiliğinden CANLI durumuna döner; {locked_ind} altında geri sayım görünür. Her liste kendi kilitlenme anından saymaya başlar. Yeniden kopyalamak veya düzenlemek sayacı yeniden başlatmaz.',
                    'Kilitliyken düzenleme yapmak ilk çıkışı yerinde bırakır. {reaction_time} değiştirilirse plan {live_ind} durumuna döner.'
                ]]
            ]],
            ['garrison', 'Garnizon Savunması', [
                ['ol', [
                    '{tab_garrison} sekmesini aç ve {your_march_time} alanını doldur: savunduğun binaya yürüyüş süren.',
                    'Bir {enemy_roster} tut: {add_enemy} düğmesine bas ve sana ralli açan düşmanların adını, ittifakını ve yürüyüş süresini yaz.',
                    'Bir düşman rallisi başlayınca, {select_enemy} altında o düşmana dokun, oyunda görünen ralli geri sayımını (örn. 3:00) yaz ve {track_btn} düğmesine bas.',
                    '{incoming_rallies}, {send_now} anına geri sayımı, göndereceğin UTC saatini ve rallinin vuracağı saati gösterir.'
                ]],
                ['p', 'Hesap: vuruş saati = şimdi + ralli geri sayımı + düşmanın yürüyüş süresi; gönderme saati = vuruş saati − senin yürüyüş süren. Takip edilen ralliler vurduktan bir dakika sonra silinir.']
            ]],
            ['strategy', 'Strateji rehberi', [
                ['p', 'Araçtan en iyi şekilde yararlanmanın pratik yolları. Burada konu aracı iyi kullanmak; oyunun kendi kuralları konusunda karar sana ve ittifakına ait.'],
                ['h', 'Savaştan önce'],
                ['ul', [
                    'Çağrıcıları ve yürüyüş sürelerini önceden gir ve oyunda kontrol et. Yürüyüş süreleri hız bonusları veya birlikler değişince değişir; her değişiklikten sonra yeniden kontrol et.',
                    'Kopyalayıp yapıştıracak tek bir lider belirleyin. Diğerlerinin yalnızca adlarının yanındaki saatte yola çıkması yeterli.',
                    'Ralli süresini oyunda açtığın ralliye uyacak şekilde ayarla.'
                ]],
                ['h', 'Savaş sırasında'],
                ['ul', [
                    'Çağrıcıları seçerken planı CANLI bırak. Yalnızca hazır olduklarında kopyala, çünkü kopyalamak saatleri kilitler.',
                    'Tepki süresini, liderin kopyalamadan ilk çağrıcının çıkışına kadar ihtiyaç duyduğu süreye ayarla; sohbet gecikmesi dahil. Çok kısaysa, ilk çıkış kimse okumadan geçer (uyarı alırsın ve kopyalama yeni saatler verir).',
                    'Varış anı sabitse Varış alanını kullan; örneğin başka bir grupla birlikte varmak için.',
                    'Varışların hepsi birlikte değil de art arda olmasını istiyorsan dalgaları kullan. 10 saniyelik varsayılanla başla ve yalnızca gereken aralıkları tek tek değiştir.',
                    'Başka bir ittifakın hızlı karşılığı için Kontra\'yı kullan: etiketini başlığa yaz, çağrıcılarını işaretle ve kopyala. Saldırı ve Kontra bağımsızdır; biri kilitliyken diğeri CANLI olabilir.',
                    '{next_label} satırını izle: sesli söylenmesi gereken ilk şey odur.'
                ]],
                ['h', 'Savunurken'],
                ['ul', [
                    'Takip saniyeler sürsün diye düşman listesini önceden doldur: düşmana dokun, geri sayımı yaz, {track_btn} düğmesine bas.',
                    'Bağlantın yavaşsa {send_now} anından bir iki saniye önce gönder.'
                ]],
                ['h', 'Savaştan sonra'],
                ['ul', [
                    'Bir sonraki ralliyi planlamadan önce {reset_btn} düğmesine bas (ya da otomatik sıfırlamayı bekle); böylece eski saatler yanlışlıkla kopyalanmaz.',
                    'Tüm saatler UTC\'dir, aracın üstündeki saatle aynı.'
                ]]
            ]],
            ['tips', 'Bilmekte fayda var', [
                ['ul', [
                    'Listeler, düşmanlar, ayarlar, dil ve tema yalnızca bu tarayıcıda saklanır. Başka bir telefon veya tarayıcı boş başlar; tarayıcı verilerini silmek bunları da siler.',
                    'Dil ve tema sağ üstteki iki menüden seçilir. Temalar: Koyu (varsayılan), Okuma (açık) ve Düşük Parlama.',
                    'Araç ittifak şifresini bir kez sorar; Çıkış yap onu unutturur. Şifre değişirse herkesten yenisi istenir.'
                ]]
            ]]
        ]
    };

    HELP.ar = {
        page_title: 'الدليل', back: 'العودة إلى الأداة', contents: 'المحتويات',
        sections: [
            ['start', 'بداية سريعة', [
                ['ol', [
                    'افتح {tab_rally}. اضغط {add_caller} واكتب اسم كل منادٍ ووقت مسيرته (M:SS مثل 1:45، أو بالثواني). اضغط {done_btn}.',
                    'المس المنادين المشاركين في هذا الحشد لتحديدهم. {all} و{none_btn} يحددان الجميع أو يلغيان تحديدهم.',
                    'اختر مدة الحشد المطابقة للحشد الذي تفتحه في اللعبة.',
                    'اقرأ وقت انطلاق كل منادٍ في الجدول. صاحب أطول مسيرة ينطلق أولاً. كل الأوقات بتوقيت UTC (وقت اللعبة).',
                    'اضغط {copy_attack_btn} والصق النص في دردشة اللعبة. تُقفل الأوقات في تلك اللحظة، فما نسخته هو ما سيحدث.',
                    'اضغط {reset_btn} للحصول على أوقات جديدة في المرة القادمة (أو دع إعادة الضبط التلقائي تفعل ذلك).'
                ]],
                ['p', 'كل ما تدخله يبقى في هذا المتصفح. لا شيء يُشارَك بين الأشخاص: لكل شخص قوائمه الخاصة.']
            ]],
            ['timing', 'كيف يعمل حساب الوقت', [
                ['p', 'وقت انطلاق المنادي = وقت الوصول − مدة الحشد − وقت مسيرته. وهكذا تصل كل الحشود في الثانية نفسها. وقت الوصول = أول انطلاق + مدة الحشد + أطول مسيرة.'],
                ['ul', [
                    '{live_ind} (أخضر): أول انطلاق هو الآن + إعداد {reaction_time}، وتتحرك الأوقات مع الساعة. استخدمه وأنت لا تزال تخطط.',
                    '{copy_attack_btn} أو {lock} يجمّدان الأوقات ({locked_ind}). تستمر العدّادات التنازلية حتى موعد كل انطلاق.',
                    'في {land_at} يمكنك كتابة وقت وصول (21:05 أو 21:05:30) للتخطيط للحظة ثابتة. ويعمل ذلك عبر منتصف الليل أيضاً: كتابة 00:05 عند 23:50 تعني بعد 15 دقيقة.',
                    'البرتقالي يعني أن المنادي على وشك الانطلاق؛ والأحمر يعني أن وقت الانطلاق قد فات.'
                ]],
                ['p', 'يبدو النص المنسوخ هكذا:'],
                ['pre', SAMPLE],
                ['p', 'إذا منع المتصفح النسخ، اضغط مطولاً على نص الدردشة تحت الزر وانسخه يدوياً.']
            ]],
            ['waves', 'الموجات', [
                ['p', 'الموجة مجموعة حشود تصل معاً. تصل الموجات بفارق بضع ثوانٍ، الواحدة تلو الأخرى.'],
                ['ol', [
                    'في {rally_settings} اضغط {add_wave} (حتى 6 موجات).',
                    'اضبط {wave_delay} (10 ثوانٍ في البداية). يمكن لكل فاصل (الموجة 1 → 2، …) أن يكون له رقمه الخاص: يتحول إلى البرتقالي ويظهر «مخصص».',
                    'المس المنادي للتنقل بين: إيقاف → 1 → 2 … → إيقاف. {randomise} يوزّع المنادين على الموجات؛ {undo} يتراجع عن آخر خلط.',
                    'في {land_at} يمكنك كتابة وقت واحد لكل موجة:'
                ]],
                ['pre', WAVE_SAMPLE],
                ['p', 'يُجمَّع الجدول والنص المنسوخ حسب الموجات. مع موجة واحدة يعمل كل شيء كما في البداية السريعة.']
            ]],
            ['battle', 'عرض المعركة: الهجوم والهجوم المضاد', [
                ['p', 'على الحاسوب تظهر خطتا الهجوم والهجوم المضاد جنباً إلى جنب لترى الاثنتين معاً. وعلى الهاتف تُرتَّبان فوق بعضهما، الهجوم أولاً.'],
                ['ul', [
                    'الهجوم هو خطتك (مع الموجات). الهجوم المضاد قائمة منفصلة لحشد مضاد من تحالف آخر: موجة واحدة، في أسرع وقت. اكتب رمز ذلك التحالف في عنوان الهجوم المضاد (مثل BDE).',
                    'لكل قائمة منادوها ومدتها ووقت تفاعلها ووقت وصولها وحالة مباشر/مقفل وزر النسخ وإعادة الضبط التلقائي الخاصة بها. نسخ إحداهما أو إعادة ضبطها لا يمس الأخرى أبداً.',
                    'في كل لوحة سطر {next_label}: من يجب أن ينطلق بعد ذلك، وبعد كم ثانية.',
                    'ألغِ تحديد {show_counter} في {menu_btn} لإخفاء الهجوم المضاد ومنح الهجوم العرض كاملاً. يحتفظ الهجوم المضاد بحالته ويُحفظ اختيارك.',
                    'يبدأ نص الهجوم المضاد بعنوانه الخاص، فلا يختلط بنص الهجوم.'
                ]]
            ]],
            ['reset', 'إعادة الضبط والتلقائية والأوقات القديمة', [
                ['ul', [
                    '{reset_btn} يعود إلى {live_ind}. وعندما يفوت أول انطلاق يتحول إلى الأحمر مع تحذير.',
                    'نسيت إعادة الضبط؟ النسخ لا يرسل أوقاتاً قديمة أبداً: يعيد الضبط، ويقفل أوقاتاً جديدة، وينسخها، ويخبرك أن الأوقات القديمة فاتت.',
                    '{auto_reset_label} (في {menu_btn}): Off أو 1 أو 2 أو 3 أو 5 (الافتراضي) أو 10 أو 15 دقيقة. تعود الخطة المقفلة إلى مباشر من تلقاء نفسها، مع عدّ تنازلي تحت {locked_ind}. تحسب كل قائمة من وقت قفلها. النسخ مجدداً أو التعديل لا يعيدان تشغيله.',
                    'التعديل أثناء القفل يُبقي أول انطلاق في مكانه. وتغيير {reaction_time} يعيد إلى {live_ind}.'
                ]]
            ]],
            ['garrison', 'دفاع الحامية', [
                ['ol', [
                    'افتح {tab_garrison} وأدخل {your_march_time}: مسيرك إلى المبنى الذي تدافع عنه.',
                    'احتفظ بـ {enemy_roster}: اضغط {add_enemy} وأدخل اسم الأعداء الذين يحشدون عليك وتحالفهم ووقت مسيرتهم.',
                    'عند بدء حشد معادٍ، المس ذلك العدو تحت {select_enemy}، واكتب العدّ التنازلي للحشد الظاهر في اللعبة (مثل 3:00) واضغط {track_btn}.',
                    'يعرض {incoming_rallies} عدّاً تنازلياً حتى {send_now}، ووقت الإرسال بتوقيت UTC، ووقت وصول الحشد.'
                ]],
                ['p', 'الحساب: وقت الإصابة = الآن + عدّ الحشد التنازلي + مسير العدو؛ وقت الإرسال = وقت الإصابة − مسيرك. تُمسح الحشود المتتبعة بعد دقيقة من وصولها.']
            ]],
            ['strategy', 'دليل الاستراتيجية', [
                ['p', 'طرق عملية للاستفادة القصوى من الأداة. الموضوع هو حسن استخدام الأداة؛ أما قواعد اللعبة نفسها فأنت وتحالفك من يقررها.'],
                ['h', 'قبل المعركة'],
                ['ul', [
                    'أدخل المنادين وأوقات المسير مسبقاً وتحقق منها في اللعبة. تتغير أوقات المسير عند تغير مكافآت السرعة أو القوات، فأعد التحقق بعد أي تغيير.',
                    'اتفقوا على قائد واحد ينسخ ويلصق. وعلى الباقين فقط الانطلاق في الوقت المكتوب بجانب أسمائهم.',
                    'اضبط مدة الحشد لتطابق الحشد الذي تفتحه في اللعبة.'
                ]],
                ['h', 'أثناء المعركة'],
                ['ul', [
                    'أبقِ الخطة في وضع {live_ind} ما دمت تختار المنادين. انسخ فقط عندما يكونون جاهزين، لأن النسخ يقفل الأوقات.',
                    'اضبط وقت التفاعل على الوقت الذي يحتاجه القائد من النسخ حتى انطلاق أول منادٍ، بما فيه تأخر الدردشة. إن كان قصيراً جداً يفوت أول انطلاق قبل أن يقرأه أحد (تظهر لك رسالة تحذير، ويعطيك النسخ أوقاتاً جديدة).',
                    'استخدم وقت الوصول عندما تكون لحظة الوصول ثابتة، مثلاً للوصول مع مجموعة أخرى.',
                    'استخدم الموجات عندما تريد وصولاً متتابعاً بدلاً من الوصول معاً. ابدأ بالافتراضي 10 ثوانٍ وغيّر فواصل بعينها فقط عند الحاجة.',
                    'استخدم الهجوم المضاد لرد سريع من تحالف آخر: ضع رمزه في العنوان، وحدد منادِيه وانسخ. الهجوم والهجوم المضاد مستقلان، فيمكن أن يبقى أحدهما مجمداً والآخر مباشر.',
                    'راقب سطر {next_label}: فهو أول ما يُقال بصوت عالٍ.'
                ]],
                ['h', 'عند الدفاع'],
                ['ul', [
                    'املأ قائمة الأعداء مسبقاً ليستغرق التتبع ثوانيَ معدودة: المس العدو، اكتب العدّ التنازلي، اضغط {track_btn}.',
                    'إذا كان اتصالك بطيئاً فأرسل قبل {send_now} بثانية أو ثانيتين.'
                ]],
                ['h', 'بعد المعركة'],
                ['ul', [
                    'اضغط {reset_btn} (أو انتظر إعادة الضبط التلقائي) قبل التخطيط للحشد التالي، حتى لا تُنسخ أوقات قديمة بالخطأ.',
                    'كل الأوقات بتوقيت UTC، مثل الساعة أعلى الأداة.'
                ]]
            ]],
            ['tips', 'معلومات مفيدة', [
                ['ul', [
                    'تُحفظ القوائم والأعداء والإعدادات واللغة والمظهر في هذا المتصفح فقط. الهاتف أو المتصفح المختلف يبدأ فارغاً، ومسح بيانات المتصفح يمسحها.',
                    'تُختار اللغة والمظهر من القائمتين في أعلى اليمين. المظاهر: Dark (الافتراضي) وReading (فاتح) وLow Glare.',
                    'تسأل الأداة عن كلمة مرور التحالف مرة واحدة؛ وتسجيل الخروج ينساها. وإذا تغيرت كلمة المرور يُطلب من الجميع الجديدة.'
                ]]
            ]]
        ]
    };

    return HELP;
});
