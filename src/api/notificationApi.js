const notificationApi = {
  device: '/TABI/api/Notifications/RegisterDevice.php',
  settings: '/TABI/api/User/NotificationSettings.php',
};

async function parseNotificationResponse(response) {
  const data = await response.json().catch(() => ({}));

  if (!response.ok || data.success === false) {
    throw new Error(data.message || '通知APIの通信に失敗しました。');
  }

  return data;
}

async function registerNotificationDevice({ token, platform = 'web', appType = 'pwa', deviceName = null, browser = null }) {
  // FCMトークンは通知端末登録APIへ送るためだけに使い、画面やログには出しません。
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

export {
  fetchNotificationSettings,
  registerNotificationDevice,
  updateNotificationSettings,
};
