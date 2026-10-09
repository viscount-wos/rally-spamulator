// Generates public/i18n.js from the original LANG table (commit 21acd7f),
// keeping only the keys the stripped-back app uses, plus new keys.
const fs = require('fs');
const { execSync } = require('child_process');
const repo = '/home/bevans/ai/fun/wos/rally-spamulator';
const html = execSync('git show 21acd7f:public/index.html', { cwd: repo, maxBuffer: 1e8 }).toString();
const start = html.indexOf('const LANG = {');
const end = html.indexOf('};', html.indexOf("ar: {", start)) + 2;
const LANG = eval('(' + html.slice(start + 'const LANG = '.length, end - 1) + ')');

const KEEP = `title clock_label tab_rally tab_garrison select_callers all none_btn rally_settings
rally_duration reaction_time dur_5min dur_10min buf_15s buf_30s buf_45s buf_1m buf_1m30s buf_2m buf_3m buf_5m
lock unlock setoff_schedule arrival_label locked_ind no_callers copy_schedule copied caller_setup add_caller
your_march_time your_march_label select_enemy tap_enemy track_rally_title rally_countdown track_btn
incoming_rallies no_rallies enemy_roster col_name col_alliance col_march add_enemy unnamed march_prefix
march_word ph_name ph_enemy_name ph_alliance send_in send_now landed rally_hits send_at landed_lower now_label
warning_overdue_1 warning_overdue_2 call_at fmtCountdown fmtAgo fmtInTime`.split(/\s+/);

const NEW = {
  en: {
    edit_list: 'Edit list', done_btn: 'Done',
    copy_header: "function(t) { return 'Start times UTC - land ' + t; }",
    land_at: 'Land at (UTC):', land_at_ph: 'auto',
    in_rally: 'In this rally', move_up: 'Move up', move_down: 'Move down', remove: 'Remove',
    clear_list: 'Clear list', confirm_clear: 'Remove all callers from the list?',
    import_export: 'Import / export list',
    import_help: 'One caller per line: name, march time (e.g. Alpha, 1:45)',
    import_replace: 'Replace list', import_add: 'Add to list', export_btn: 'Export list',
    import_done: "function(n, bad) { return 'Imported ' + n + (bad ? ', skipped ' + bad + ' line(s)' : ''); }",
    export_done: 'List copied', chat_preview: 'Chat text (UTC)', bad_time: 'Use HH:MM or HH:MM:SS (UTC)'
  },
  tr: {
    edit_list: 'Listeyi düzenle', done_btn: 'Bitti',
    copy_header: "function(t) { return 'Başlangıç saatleri UTC - varış ' + t; }",
    land_at: 'Varış (UTC):', land_at_ph: 'otomatik',
    in_rally: 'Bu rallide', move_up: 'Yukarı taşı', move_down: 'Aşağı taşı', remove: 'Kaldır',
    clear_list: 'Listeyi temizle', confirm_clear: 'Tüm çağrıcılar listeden silinsin mi?',
    import_export: 'Listeyi içe / dışa aktar',
    import_help: 'Her satıra bir çağrıcı: isim, yürüyüş süresi (örn. Alpha, 1:45)',
    import_replace: 'Listeyi değiştir', import_add: 'Listeye ekle', export_btn: 'Listeyi dışa aktar',
    import_done: "function(n, bad) { return n + ' içe aktarıldı' + (bad ? ', ' + bad + ' satır atlandı' : ''); }",
    export_done: 'Liste kopyalandı', chat_preview: 'Sohbet metni (UTC)', bad_time: 'SS:DD veya SS:DD:ss kullanın (UTC)'
  },
  pl: {
    edit_list: 'Edytuj listę', done_btn: 'Gotowe',
    copy_header: "function(t) { return 'Godziny startu UTC - lądowanie ' + t; }",
    land_at: 'Lądowanie (UTC):', land_at_ph: 'auto',
    in_rally: 'W tym rally', move_up: 'W górę', move_down: 'W dół', remove: 'Usuń',
    clear_list: 'Wyczyść listę', confirm_clear: 'Usunąć wszystkich graczy z listy?',
    import_export: 'Import / eksport listy',
    import_help: 'Jeden gracz w linii: nazwa, czas marszu (np. Alpha, 1:45)',
    import_replace: 'Zastąp listę', import_add: 'Dodaj do listy', export_btn: 'Eksportuj listę',
    import_done: "function(n, bad) { return 'Zaimportowano ' + n + (bad ? ', pominięto linii: ' + bad : ''); }",
    export_done: 'Lista skopiowana', chat_preview: 'Tekst na czat (UTC)', bad_time: 'Użyj GG:MM lub GG:MM:SS (UTC)'
  },
  zh: {
    edit_list: '编辑列表', done_btn: '完成',
    copy_header: "function(t) { return '开始时间 UTC - 到达 ' + t; }",
    land_at: '到达时间 (UTC)：', land_at_ph: '自动',
    in_rally: '参加本次集结', move_up: '上移', move_down: '下移', remove: '移除',
    clear_list: '清空列表', confirm_clear: '确定从列表中移除所有召唤者？',
    import_export: '导入 / 导出列表',
    import_help: '每行一个召唤者：名称, 行军时间（例如 Alpha, 1:45）',
    import_replace: '替换列表', import_add: '添加到列表', export_btn: '导出列表',
    import_done: "function(n, bad) { return '已导入 ' + n + (bad ? '，跳过 ' + bad + ' 行' : ''); }",
    export_done: '列表已复制', chat_preview: '聊天文本 (UTC)', bad_time: '请使用 HH:MM 或 HH:MM:SS (UTC)'
  },
  ko: {
    edit_list: '목록 편집', done_btn: '완료',
    copy_header: "function(t) { return '시작 시간 UTC - 도착 ' + t; }",
    land_at: '도착 시간 (UTC):', land_at_ph: '자동',
    in_rally: '이번 랠리 참여', move_up: '위로', move_down: '아래로', remove: '삭제',
    clear_list: '목록 비우기', confirm_clear: '목록에서 모든 소환자를 삭제할까요?',
    import_export: '목록 가져오기 / 내보내기',
    import_help: '한 줄에 한 명: 이름, 행군 시간 (예: Alpha, 1:45)',
    import_replace: '목록 바꾸기', import_add: '목록에 추가', export_btn: '목록 내보내기',
    import_done: "function(n, bad) { return n + '명 가져옴' + (bad ? ', ' + bad + '줄 건너뜀' : ''); }",
    export_done: '목록 복사됨', chat_preview: '채팅 텍스트 (UTC)', bad_time: 'HH:MM 또는 HH:MM:SS (UTC) 형식'
  },
  ar: {
    edit_list: 'تعديل القائمة', done_btn: 'تم',
    copy_header: "function(t) { return 'أوقات البدء UTC - الوصول ' + t; }",
    land_at: 'الوصول (UTC):', land_at_ph: 'تلقائي',
    in_rally: 'في هذا الحشد', move_up: 'تحريك لأعلى', move_down: 'تحريك لأسفل', remove: 'إزالة',
    clear_list: 'مسح القائمة', confirm_clear: 'إزالة جميع المنادين من القائمة؟',
    import_export: 'استيراد / تصدير القائمة',
    import_help: 'منادٍ واحد في كل سطر: الاسم، وقت المسيرة (مثلاً Alpha, 1:45)',
    import_replace: 'استبدال القائمة', import_add: 'إضافة إلى القائمة', export_btn: 'تصدير القائمة',
    import_done: "function(n, bad) { return 'تم استيراد ' + n + (bad ? '، تم تخطي ' + bad + ' سطر' : ''); }",
    export_done: 'تم نسخ القائمة', chat_preview: 'نص الدردشة (UTC)', bad_time: 'استخدم HH:MM أو HH:MM:SS (UTC)'
  }
};

// Wording that referred to removed features / the old chip selector.
const OVERRIDE = {
  en: { no_callers: 'Tick callers below to see the schedule' },
  tr: { no_callers: 'Programı görmek için aşağıdan çağrıcı işaretleyin' },
  pl: { no_callers: 'Zaznacz graczy poniżej, aby zobaczyć harmonogram' },
  zh: { no_callers: '请在下方勾选召唤者以查看时间表' },
  ko: { no_callers: '일정을 보려면 아래에서 소환자를 체크하세요' },
  ar: { no_callers: 'حدد المنادين أدناه لعرض الجدول' }
};

const NAMES = { en: 'English', tr: 'Türkçe', pl: 'Polski', zh: '中文', ko: '한국어', ar: 'العربية' };
let out = `/* Translations (en tr pl zh ko ar). Generated from the original LANG table by
 * scripts/gen-i18n.js; edit this file directly from now on. */
(function (root, factory) {
    var api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    else root.RallyLang = api;
})(typeof self !== 'undefined' ? self : this, function () {
    'use strict';
    var LANG = {\n`;
const langs = Object.keys(NAMES);
langs.forEach((code, i) => {
  out += `        ${code}: {\n            lang_name: ${JSON.stringify(NAMES[code])},\n`;
  const entries = [];
  for (const k of KEEP) {
    let v = (OVERRIDE[code] && OVERRIDE[code][k]) || LANG[code][k];
    if (v === undefined) throw new Error(code + ' missing ' + k);
    entries.push(`            ${k}: ${typeof v === 'function' ? v.toString() : JSON.stringify(v)}`);
  }
  for (const [k, v] of Object.entries(NEW[code])) {
    entries.push(`            ${k}: ${v.startsWith('function(') ? v : JSON.stringify(v)}`);
  }
  out += entries.join(',\n') + `\n        }${i < langs.length - 1 ? ',' : ''}\n`;
});
out += `    };\n    return LANG;\n});\n`;
fs.writeFileSync(repo + '/public/i18n.js', out);
console.log('wrote', out.split('\n').length, 'lines');
