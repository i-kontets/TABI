const notificationCategoryMeta = {
  chat: { label: 'チャット', tone: 'chat' },
  schedule: { label: '予定', tone: 'schedule' },
  survey: { label: 'アンケート', tone: 'survey' },
  system: { label: 'システム', tone: 'system' },
  member: { label: 'メンバー', tone: 'member' },
  split_bill: { label: '割り勘', tone: 'splitBill' },
};

const notificationTabs = [
  { id: 'all', label: 'すべて' },
  { id: 'unread', label: '未読' },
  { id: 'chat', label: 'チャット' },
  { id: 'schedule', label: '予定' },
  { id: 'survey', label: 'アンケート' },
  { id: 'system', label: 'システム' },
];

function getNotificationCategoryMeta(category) {
  return notificationCategoryMeta[category] || notificationCategoryMeta.system;
}

function filterNotifications(notifications, activeTab) {
  if (activeTab === 'unread') return notifications.filter((item) => !item.isRead);
  if (activeTab === 'all') return notifications;
  return notifications.filter((item) => item.category === activeTab);
}

function getDateGroupLabel(createdAt, now = new Date()) {
  const date = new Date(createdAt);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round((today.getTime() - target.getTime()) / 86400000);

  if (diffDays === 0) return '今日';
  if (diffDays === 1) return '昨日';
  return 'それ以前';
}

function formatNotificationTime(createdAt, now = new Date()) {
  const date = new Date(createdAt);
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.max(0, Math.floor(diffMs / 60000));

  if (diffMinutes < 60) return `${Math.max(1, diffMinutes)}分前`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24 && getDateGroupLabel(createdAt, now) === '今日') return `${diffHours}時間前`;

  const time = date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
  if (getDateGroupLabel(createdAt, now) === '昨日') return `昨日 ${time}`;

  return date.toLocaleDateString('ja-JP', { month: '2-digit', day: '2-digit' });
}

function formatNotificationDateTime(createdAt) {
  return new Date(createdAt).toLocaleString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function groupNotificationsByDate(notifications, now = new Date()) {
  return ['今日', '昨日', 'それ以前']
    .map((label) => ({
      label,
      items: notifications.filter((item) => getDateGroupLabel(item.createdAt, now) === label),
    }))
    .filter((group) => group.items.length > 0);
}

function getNotificationAction(notification) {
  if (!notification) return { type: 'none', path: null, message: '通知が見つかりません。' };
  if (notification.category === 'system') return { type: 'detail', path: `/notifications/${notification.id}` };
  if (notification.actionPath) return { type: 'route', path: notification.actionPath };
  return { type: 'pending', path: null, message: '関連ページは今後接続予定です。' };
}

export {
  filterNotifications,
  formatNotificationDateTime,
  formatNotificationTime,
  getNotificationAction,
  getNotificationCategoryMeta,
  groupNotificationsByDate,
  notificationTabs,
};
