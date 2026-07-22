const notificationCategoryMeta = {
  chat: { label: '\u30c1\u30e3\u30c3\u30c8', tone: 'chat' },
  schedule: { label: '\u4e88\u5b9a', tone: 'schedule' },
  survey: { label: '\u30a2\u30f3\u30b1\u30fc\u30c8', tone: 'survey' },
  system: { label: '\u30b7\u30b9\u30c6\u30e0', tone: 'system' },
  member: { label: '\u30e1\u30f3\u30d0\u30fc', tone: 'member' },
  split_bill: { label: '\u5272\u308a\u52d8', tone: 'splitBill' },
};

const notificationTabs = [
  { id: 'all', label: '\u3059\u3079\u3066' },
  { id: 'unread', label: '\u672a\u8aad' },
  { id: 'chat', label: '\u30c1\u30e3\u30c3\u30c8' },
  { id: 'schedule', label: '\u4e88\u5b9a' },
  { id: 'survey', label: '\u30a2\u30f3\u30b1\u30fc\u30c8' },
  { id: 'system', label: '\u30b7\u30b9\u30c6\u30e0' },
];

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

function getNotificationCategoryMeta(category) {
  return notificationCategoryMeta[category] || notificationCategoryMeta.system;
}

function getReadableDate(createdAt) {
  const date = new Date(createdAt);
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function parseDetailData(detailData) {
  if (!detailData || typeof detailData !== 'string') return detailData ?? null;

  try {
    return JSON.parse(detailData);
  } catch {
    return null;
  }
}

function normalizeNotification(notification) {
  const category = notification?.category || notification?.notificationType || notification?.notification_type || 'system';
  const recipientId = notification?.recipientId ?? notification?.recipient_id ?? notification?.id;
  const notificationId = notification?.notificationId ?? notification?.notification_id ?? notification?.id;
  const createdAt = notification?.createdAt || notification?.receivedAt || notification?.received_at || notification?.created_at || new Date().toISOString();
  const detailData = parseDetailData(notification?.detailData ?? notification?.detail_data);

  return {
    ...notification,
    id: String(recipientId ?? notificationId ?? createdAt),
    recipientId,
    notificationId,
    category,
    subtype: notification?.subtype ?? notification?.notificationSubtype ?? notification?.notification_subtype ?? null,
    title: notification?.title || '\u901a\u77e5',
    body: notification?.body || '',
    targetType: notification?.targetType ?? notification?.target_type ?? null,
    targetId: notification?.targetId ?? notification?.target_id ?? null,
    isRead: Boolean(notification?.isRead ?? notification?.is_read),
    actionPath: notification?.actionPath ?? notification?.action_path ?? null,
    detailData,
    readAt: notification?.readAt ?? notification?.read_at ?? null,
    createdAt,
    expiresAt: notification?.expiresAt ?? notification?.expires_at ?? null,
  };
}

function getDateGroupLabel(createdAt, now = new Date()) {
  const date = getReadableDate(createdAt);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round((today.getTime() - target.getTime()) / 86400000);

  if (diffDays === 0) return '\u4eca\u65e5';
  if (diffDays === 1) return '\u6628\u65e5';
  return '\u305d\u308c\u4ee5\u524d';
}

function formatNotificationTime(createdAt, now = new Date()) {
  const date = getReadableDate(createdAt);
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.max(0, Math.floor(diffMs / 60000));

  if (diffMinutes < 60) return String(Math.max(1, diffMinutes)) + '\u5206\u524d';

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24 && getDateGroupLabel(createdAt, now) === '\u4eca\u65e5') return String(diffHours) + '\u6642\u9593\u524d';

  const time = date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
  if (getDateGroupLabel(createdAt, now) === '\u6628\u65e5') return '\u6628\u65e5 ' + time;

  return date.toLocaleDateString('ja-JP', { month: '2-digit', day: '2-digit' });
}

function formatNotificationDateTime(createdAt) {
  return getReadableDate(createdAt).toLocaleString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function groupNotificationsByDate(notifications, now = new Date()) {
  return ['\u4eca\u65e5', '\u6628\u65e5', '\u305d\u308c\u4ee5\u524d']
    .map((label) => ({
      label,
      items: notifications.filter((item) => getDateGroupLabel(item.createdAt, now) === label),
    }))
    .filter((group) => group.items.length > 0);
}

function normalizeInternalActionPath(actionPath) {
  if (typeof actionPath !== 'string') return null;

  const trimmedPath = actionPath.trim();
  if (!trimmedPath || trimmedPath.startsWith('//')) return null;
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmedPath)) return null;

  // actionPathはDB由来なので、外部URLや危険な形式を避けてTABI内部の既存ルートだけ許可します。
  const appPath = trimmedPath === '/TABI' ? '/' : trimmedPath.replace(/^\/TABI(?=\/|$)/, '') || '/';
  if (!appPath.startsWith('/')) return null;

  const isKnownRoute = routePrefixes.some((prefix) => appPath === prefix || (prefix !== '/' && appPath.startsWith(prefix)));
  return isKnownRoute ? appPath : null;
}

function getNotificationAction(notification) {
  if (!notification) return { type: 'none', path: null, message: '\u901a\u77e5\u304c\u898b\u3064\u304b\u308a\u307e\u305b\u3093\u3002' };
  if (notification.category === 'system') return { type: 'detail', path: '/notifications/' + notification.id };

  const internalPath = normalizeInternalActionPath(notification.actionPath);
  if (internalPath) return { type: 'route', path: internalPath };

  return { type: 'none', path: null, message: '\u95a2\u9023\u30da\u30fc\u30b8\u306f\u73fe\u5728\u958b\u3051\u307e\u305b\u3093\u3002\u901a\u77e5\u5185\u5bb9\u3092\u78ba\u8a8d\u3057\u3066\u304f\u3060\u3055\u3044\u3002' };
}

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
