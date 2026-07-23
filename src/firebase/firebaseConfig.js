/**
 * Firebaseアプリ本体を初期化する設定ファイルです。
 *
 * 主な流れ:
 * 1. Viteの環境変数(VITE_FIREBASE_*)からFirebaseの接続設定を読み込む
 * 2. 未設定の環境変数があれば、どれが足りないかを明示してエラーにする
 * 3. Firebaseアプリを初期化し、他のファイル(Messaging等)から使えるように公開する
 *
 * 扱うデータ: FirebaseのAPIキー・プロジェクトIDなどの接続設定。
 */
import { getApp, getApps, initializeApp } from 'firebase/app';

// Firebaseの設定値は環境変数から読み込みます。
// 環境ごとに設定を分け、設定値をソースコードへ直接書かないようにします。
const firebaseEnv = {
    VITE_FIREBASE_API_KEY: import.meta.env.VITE_FIREBASE_API_KEY,
    VITE_FIREBASE_AUTH_DOMAIN: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    VITE_FIREBASE_PROJECT_ID: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    VITE_FIREBASE_STORAGE_BUCKET: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    VITE_FIREBASE_MESSAGING_SENDER_ID:
        import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    VITE_FIREBASE_APP_ID: import.meta.env.VITE_FIREBASE_APP_ID,
};

// 未設定(空文字や文字列以外)の環境変数を探します。見つかればその名前が入ります。
const missingEnvName = Object.entries(firebaseEnv).find(
    ([, value]) => typeof value !== 'string' || value.trim() === ''
)?.[0];

// 設定が足りないまま動かすと原因が分かりにくいため、ここで明確なエラーにします。
if (missingEnvName) {
    throw new Error(`Firebaseの環境変数 ${missingEnvName} が設定されていません。`);
}

// Firebase SDK が要求する形式に設定値をまとめます。
const firebaseConfig = {
    apiKey: firebaseEnv.VITE_FIREBASE_API_KEY,
    authDomain: firebaseEnv.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: firebaseEnv.VITE_FIREBASE_PROJECT_ID,
    storageBucket: firebaseEnv.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: firebaseEnv.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: firebaseEnv.VITE_FIREBASE_APP_ID,
};

// Reactの開発中は同じコードが読み直されることがあります。
// すでにFirebaseアプリがある場合は再初期化せず、重複初期化エラーを防ぎます。
const firebaseApp = getApps().length === 0
    ? initializeApp(firebaseConfig)
    : getApp();

export { firebaseApp };