/**
 * Firebase Messaging(プッシュ通知の受信機能)を安全に取得するためのファイルです。
 *
 * 主な流れ:
 * 1. ブラウザ環境かどうか、Messagingに対応しているかを確認する
 * 2. 対応していれば Messaging インスタンスを返し、非対応なら null を返す
 * 3. 呼び出し側は null かどうかで通知機能の有無を判断できる
 *
 * 扱うデータ: Firebaseアプリのインスタンス(firebaseConfig.js から取得)。
 */
import { getMessaging, isSupported } from 'firebase/messaging';
import { firebaseApp } from './firebaseConfig';

/**
 * Messagingインスタンスを返します。使えない環境では null を返します(例外は投げません)。
 */
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