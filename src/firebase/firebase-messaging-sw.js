import { getApp, getApps, initializeApp } from 'firebase/app';
import { getMessaging } from 'firebase/messaging/sw';

// Service Workerは通常の画面とは別の場所で動くため、ここでもFirebaseを初期化します。
// 環境ごとに設定を分け、設定値をソースコードへ直接書かないようにします。
const firebaseEnv = {
    VITE_FIREBASE_API_KEY: import.meta.env.VITE_FIREBASE_API_KEY,
    VITE_FIREBASE_AUTH_DOMAIN:
        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    VITE_FIREBASE_PROJECT_ID:
        import.meta.env.VITE_FIREBASE_PROJECT_ID,
    VITE_FIREBASE_STORAGE_BUCKET:
        import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    VITE_FIREBASE_MESSAGING_SENDER_ID:
        import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    VITE_FIREBASE_APP_ID:
        import.meta.env.VITE_FIREBASE_APP_ID,
};

const missingEnvName = Object.entries(firebaseEnv).find(
    ([, value]) => typeof value !== 'string' || value.trim() === ''
)?.[0];

if (missingEnvName) {
    throw new Error(`Firebaseの環境変数 ${missingEnvName} が設定されていません。`);
}

const firebaseConfig = {
    apiKey: firebaseEnv.VITE_FIREBASE_API_KEY,
    authDomain: firebaseEnv.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: firebaseEnv.VITE_FIREBASE_PROJECT_ID,
    storageBucket: firebaseEnv.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: firebaseEnv.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: firebaseEnv.VITE_FIREBASE_APP_ID,
};

// Service Workerが読み直されたときに同じFirebaseアプリを何度も作らないようにします。
// 重複初期化を防ぐことで、Firebaseの初期化エラーを避けます。
const firebaseWorkerApp = getApps().length === 0
    ? initializeApp(firebaseConfig)
    : getApp();

// 今回はMessagingをService Worker内で使える状態にするところまでです。
// 通知の表示やバックグラウンド受信処理は、次の段階で追加します。
getMessaging(firebaseWorkerApp);