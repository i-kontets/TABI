/**
 * 通知画面(一覧・詳細)で使う共通の変換・整形処理をまとめたファイルです。
 *
 * 主な流れ:
 * 1. APIから受け取った通知データを画面用の統一形式へ変換する(normalizeNotification)
 * 2. 日時を「今日/昨日/それ以前」や「◯分前」などの表示用文字列へ整形する
 * 3. 通知タップ時の遷移先(actionPath)を安全に検証し、開ける画面だけを許可する
 *
 * 扱うデータ: 通知1件分のオブジェクト(カテゴリ・タイトル・本文・既読状態・遷移先など)。
 */

// カテゴリごとの表示名(label)と色分け用の種別(tone)の対応表です。
const notificationCategoryMeta = {
  chat: { label: 'チャット', tone: 'chat' },
  schedule: { label: '予定', tone: 'schedule' },
  survey: { label: 'アンケート', tone: 'survey' },
  system: { label: 'システム', tone: 'system' },
  member: { label: 'メンバー', tone: 'member' },
  split_bill: { label: '割り勘', tone: 'splitBill' },
};

// 通知一覧画面の上部に表示する絞り込みタブの定義です。
const notificationTabs = [
  { id: 'all', label: 'すべて' },
  { id: 'unread', label: '未読' },
  { id: 'chat', label: 'チャット' },
  { id: 'schedule', label: '予定' },
  { id: 'survey', label: 'アンケート' },
  { id: 'system', label: 'システム' },
];

// 通知タップで遷移してよい「TABI内の既知のルート」の一覧です。
// この一覧に無いパスへは遷移させません(不正な遷移先の防止)。
const routePrefixes = [
  '/',
  '/Home',
  '/MyPage',
  '/mypage',
  '/notifications',
  '/Chat',
  '/Discussion',
  '/schedule',
  '/Appointment',
  '/Invoice',
  '/Itinerary',
  '/Candidates',
  '/Tourist',
  '/CheckList',
  '/Other',
  '/album',
  '/group/',
];

/**
 * カテゴリ名から表示用メタ情報(label/tone)を返します。
 * 未知のカテゴリは「システム」として扱います。
 */
function getNotificationCategoryMeta(category) {
  return notificationCategoryMeta[category] || notificationCategoryMeta.system;
}

/**
 * 日時文字列を Date オブジェクトへ変換します。
 * 解析できない値の場合は現在時刻を返し、画面表示が壊れないようにします。
 */
function getReadableDate(createdAt) {
  const date = new Date(createdAt);
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

/**
 * 通知の詳細データ(detailData)を解析します。
 * 文字列ならJSONとして解析し、失敗したら null を返します。
 */
function parseDetailData(detailData) {
  // 文字列以外(既にオブジェクト等)はそのまま返します。
  if (!detailData || typeof detailData !== 'string') return detailData ?? null;

  try {
    return JSON.parse(detailData);
  } catch {
    // 壊れたJSONは詳細なし(null)として扱います。
    return null;
  }
}

/**
 * APIから受け取った通知データを、画面用の統一形式へ変換します。
 * APIの世代によってキー名がキャメルケース/スネークケースで揺れるため、
 * どちらの形式で来ても同じ形になるよう ?? で順に探しています。
 */
function normalizeNotification(notification) {
  // カテゴリ: どのキー名でも拾えなければ 'system' 扱いにします。
  const category = notification?.category || notification?.notificationType || notification?.notification_type || 'system';
  // 宛先レコードID(既読処理に使用)と通知本体のIDを取り出します。
  const recipientId = notification?.recipientId ?? notification?.recipient_id ?? notification?.id;
  const notificationId = notification?.notificationId ?? notification?.notification_id ?? notification?.id;
  // 受信日時: どのキーにも無ければ現在時刻を使います。
  const createdAt = notification?.createdAt || notification?.receivedAt || notification?.received_at || notification?.created_at || new Date().toISOString();
  // 詳細データはJSON文字列の場合があるため解析します。
  const detailData = parseDetailData(notification?.detailData ?? notification?.detail_data);

  return {
    ...notification,
    // 画面のkeyやURLに使う一意なIDです(recipientId → notificationId → 日時の順で採用)。
    id: String(recipientId ?? notificationId ?? createdAt),
    recipientId,
    notificationId,
    category,
    subtype: notification?.subtype ?? notification?.notificationSubtype ?? notification?.notification_subtype ?? null,
    // タイトルが無い場合は「通知」と表示します。
    title: notification?.title || '通知',
    body: notification?.body || '',
    targetType: notification?.targetType ?? notification?.target_type ?? null,
    targetId: notification?.targetId ?? notification?.target_id ?? null,
    // 0/1 や true/false のどちらで来ても真偽値へ統一します。
    isRead: Boolean(notification?.isRead ?? notification?.is_read),
    actionPath: notification?.actionPath ?? notification?.action_path ?? null,
    detailData,
    readAt: notification?.readAt ?? notification?.read_at ?? null,
    createdAt,
    expiresAt: notification?.expiresAt ?? notification?.expires_at ?? null,
  };
}

/**
 * 通知の受信日を「今日」「昨日」「それ以前」のグループ名に変換します。
 * 一覧画面の日付見出しに使われます。
 */
function getDateGroupLabel(createdAt, now = new Date()) {
  const date = getReadableDate(createdAt);
  // 時刻部分を切り捨てて「日付だけ」の状態にしてから差を計算します。
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  // 86400000ミリ秒 = 1日。何日前かを求めます。
  const diffDays = Math.round((today.getTime() - target.getTime()) / 86400000);

  if (diffDays === 0) return '今日';
  if (diffDays === 1) return '昨日';
  return 'それ以前';
}

/**
 * 通知の受信時刻を、経過時間に応じた読みやすい表記へ変換します。
 * 例: 「5分前」→「3時間前」→「昨日 14:30」→「07/20」
 */
function formatNotificationTime(createdAt, now = new Date()) {
  const date = getReadableDate(createdAt);
  const diffMs = now.getTime() - date.getTime();
  // 負の値(未来の日時)は0分として扱います。
  const diffMinutes = Math.max(0, Math.floor(diffMs / 60000));

  // 1時間未満: 「◯分前」(最低でも「1分前」と表示します)。
  if (diffMinutes < 60) return String(Math.max(1, diffMinutes)) + '分前';

  // 今日中かつ24時間未満: 「◯時間前」。
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24 && getDateGroupLabel(createdAt, now) === '今日') return String(diffHours) + '時間前';

  // 昨日: 「昨日 HH:MM」。
  const time = date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
  if (getDateGroupLabel(createdAt, now) === '昨日') return '昨日 ' + time;

  // それ以前: 「MM/DD」形式の日付だけを表示します。
  return date.toLocaleDateString('ja-JP', { month: '2-digit', day: '2-digit' });
}

/**
 * 通知詳細画面用に「YYYY/MM/DD HH:MM」形式の完全な日時文字列を返します。
 */
function formatNotificationDateTime(createdAt) {
  return getReadableDate(createdAt).toLocaleString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * 通知の配列を「今日」「昨日」「それ以前」の3グループへ分類します。
 * 1件も無いグループは結果から除外します。
 */
function groupNotificationsByDate(notifications, now = new Date()) {
  return ['今日', '昨日', 'それ以前']
    .map((label) => ({
      label,
      // このグループに属する通知だけを抽出します。
      items: notifications.filter((item) => getDateGroupLabel(item.createdAt, now) === label),
    }))
    // 空のグループ(見出しだけ)は表示しません。
    .filter((group) => group.items.length > 0);
}

/**
 * 通知の遷移先(actionPath)を検証し、アプリ内で開ける安全なパスへ変換します。
 * 危険な形式や未知のパスの場合は null を返します(遷移させない)。
 */
function normalizeInternalActionPath(actionPath) {
  // 文字列以外は遷移先なしとして扱います。
  if (typeof actionPath !== 'string') return null;

  const trimmedPath = actionPath.trim();
  // 空文字と "//example.com" 形式(プロトコル相対URL)は拒否します。
  if (!trimmedPath || trimmedPath.startsWith('//')) return null;
  // "https:" や "javascript:" などスキーム付きのURLは拒否します。
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmedPath)) return null;

  // actionPathはDB由来なので、外部URLや危険な形式を避けてTABI内部の既存ルートだけ許可します。
  // "/TABI/..." の接頭辞を取り除き、アプリ内のパスに変換します。
  const appPath = trimmedPath === '/TABI' ? '/' : trimmedPath.replace(/^\/TABI(?=\/|$)/, '') || '/';
  if (!appPath.startsWith('/')) return null;

  // 既知のルート一覧に一致するパスだけを許可します。
  const isKnownRoute = routePrefixes.some((prefix) => appPath === prefix || (prefix !== '/' && appPath.startsWith(prefix)));
  return isKnownRoute ? appPath : null;
}

/**
 * 通知をタップしたときに行う動作を決めます。
 * 戻り値の type: 'detail'=詳細画面へ / 'route'=関連画面へ遷移 / 'none'=遷移なし(メッセージ表示)
 */
function getNotificationAction(notification) {
  // 通知データが無い場合は遷移なしにします。
  if (!notification) return { type: 'none', path: null, message: '通知が見つかりません。' };
  // システム通知(お知らせ)は通知詳細画面で全文を表示します。
  if (notification.category === 'system') return { type: 'detail', path: '/notifications/' + notification.id };

  // 遷移先パスが安全であれば、その画面へ遷移します。
  const internalPath = normalizeInternalActionPath(notification.actionPath);
  if (internalPath) return { type: 'route', path: internalPath };

  // 安全な遷移先が無い場合は、遷移せずメッセージだけ表示します。
  return { type: 'none', path: null, message: '関連ページは現在開けません。通知内容を確認してください。' };
}

// 通知画面(一覧・詳細)から使う関数・定義をまとめてエクスポートします。
export {
  formatNotificationDateTime,
  formatNotificationTime,
  getNotificationAction,
  getNotificationCategoryMeta,
  groupNotificationsByDate,
  normalizeInternalActionPath,
  normalizeNotification,
  notificationTabs,
};
