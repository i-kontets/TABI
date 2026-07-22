import { getToken } from 'firebase/messaging';
import { getFirebaseMessaging } from './firebaseMessaging';
import { registerFirebaseServiceWorker } from './registerFirebaseServiceWorker';

function failed(status, permission = null) {
  return { success: false, status, permission, token: null };
}

async function requestFirebasePushToken() {
  // 通知許可ダイアログはページ表示時ではなく、ユーザーがボタンを押した時だけ出します。
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return failed('unsupported');
  }

  if (typeof Notification === 'undefined' || !Notification.requestPermission) {
    return failed('unsupported');
  }

  if (!('serviceWorker' in navigator)) {
    return failed('unsupported', Notification.permission);
  }

  if (!window.isSecureContext) {
    return failed('insecure-context', Notification.permission);
  }

  let permission = Notification.permission;

  if (permission === 'default') {
    // ブラウザの決まりで、通知許可はユーザー操作をきっかけに要求する必要があります。
    permission = await Notification.requestPermission();
  }

  if (permission === 'denied') {
    // 拒否済みの場合は何度も許可要求せず、端末やブラウザ設定での変更を案内します。
    return failed('denied', permission);
  }

  if (permission !== 'granted') {
    return failed('default', permission);
  }

  try {
    // FCMトークン取得には、Firebase Messaging用のService Worker登録が必要です。
    const serviceWorkerRegistration = await registerFirebaseServiceWorker();

    if (!serviceWorkerRegistration) {
      return failed('service-worker-error', permission);
    }

    const messaging = await getFirebaseMessaging();

    if (!messaging) {
      return failed('unsupported', permission);
    }

    const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;

    if (typeof vapidKey !== 'string' || vapidKey.trim() === '') {
      return failed('token-error', permission);
    }

    // VAPIDキーは、このWebアプリが正しくWeb Pushを使うための公開鍵です。
    const token = await getToken(messaging, {
      vapidKey,
      serviceWorkerRegistration,
    });

    if (!token) {
      return failed('token-error', permission);
    }

    // FCMトークンは秘密情報に近い扱いにし、ログや画面には出しません。
    return { success: true, status: 'ready', permission, token };
  } catch {
    return failed('token-error', permission);
  }
}

export { requestFirebasePushToken };
