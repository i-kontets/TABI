import { getMessaging, isSupported } from 'firebase/messaging';
import { firebaseApp } from './firebaseConfig';

async function getFirebaseMessaging() {
    // Firebase Messagingはブラウザの機能を使うため、ブラウザ以外では動かしません。
    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
        return null;
    }

    try {
        // ブラウザや端末によってはMessagingに対応していないため、先に安全に確認します。
        const supported = await isSupported();

        if (!supported) {
            // 未対応は異常ではないので、画面を止めずに呼び出し元で判定できるnullを返します。
            return null;
        }

        return getMessaging(firebaseApp);
    } catch {
        // 確認中に失敗しても、通知以外の画面まで止めないようにnullを返します。
        return null;
    }
}

export { getFirebaseMessaging };