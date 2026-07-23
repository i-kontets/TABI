const notificationApi = {
  device: '/TABI/api/Notifications/RegisterDevice.php',
  settings: '/TABI/api/Notifications/Settings.php',
  list: '/TABI/api/Notifications/List.php',
  unreadCount: '/TABI/api/Notifications/UnreadCount.php',
  markRead: '/TABI/api/Notifications/MarkRead.php',
  markAllRead: '/TABI/api/Notifications/MarkAllRead.php',
};

async function parseNotificationResponse(response) {
  const data = await response.json().catch(() => ({}));

  if (!response.ok || data.success === false) {
    throw new Error(data.message || '\u901a\u77e5API\u306e\u901a\u4fe1\u306b\u5931\u6557\u3057\u307e\u3057\u305f\u3002');
  }

  return data;
}

function createNotificationQuery(params) {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      query.set(key, String(value));
    }
  });

  const queryString = query.toString();
  return queryString ? '?' + queryString : '';
}

async function registerNotificationDevice({ token, platform = 'web', appType = 'pwa', deviceName = null, browser = null }) {
  // FCM token is only sent to the device registration API. Never print it to the UI or logs.
  const response = await fetch(notificationApi.device, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, platform, appType, deviceName, browser }),
  });

  return parseNotificationResponse(response);
}

async function fetchNotificationSettings() {
  const response = await fetch(notificationApi.settings, {
    method: 'GET',
    credentials: 'include',
  });

  return parseNotificationResponse(response);
}

async function updateNotificationSettings(settings) {
  const response = await fetch(notificationApi.settings, {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  });

  return parseNotificationResponse(response);
}

async function fetchNotifications({ category = 'all', limit = 20, offset = 0, signal } = {}) {
  const query = createNotificationQuery({ category, limit, offset });
  const response = await fetch(notificationApi.list + query, {
    method: 'GET',
    credentials: 'include',
    signal,
  });

  return parseNotificationResponse(response);
}

async function fetchUnreadNotificationCount({ signal } = {}) {
  const response = await fetch(notificationApi.unreadCount, {
    method: 'GET',
    credentials: 'include',
    signal,
  });

  return parseNotificationResponse(response);
}

async function markNotificationAsRead(recipientId) {
  const query = createNotificationQuery({ recipientId });
  const response = await fetch(notificationApi.markRead + query, {
    method: 'PATCH',
    credentials: 'include',
  });

  return parseNotificationResponse(response);
}

async function markAllNotificationsAsRead() {
  const response = await fetch(notificationApi.markAllRead, {
    method: 'PATCH',
    credentials: 'include',
  });

  return parseNotificationResponse(response);
}

export {
  fetchNotificationSettings,
  fetchNotifications,
  fetchUnreadNotificationCount,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  registerNotificationDevice,
  updateNotificationSettings,
};