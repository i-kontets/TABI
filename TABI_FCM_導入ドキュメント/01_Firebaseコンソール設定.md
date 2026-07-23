# 01. Firebase コンソール設定

## 1. なぜ Firebase Cloud Messaging を使うのか

TABI は現在 PWA であり、将来 Capacitor を使って Android・iOS アプリへ展開する予定です。

Firebase Cloud Messaging（FCM）を採用すると、同じ Firebase プロジェクトを中心に次のクライアントを管理できます。

- Web / PWA
- Android
- iOS

ただし、Web、Android、iOS は Firebase Console 上ではそれぞれ別の「アプリ登録」です。今回最初に登録したのは Web アプリです。

## 2. Firebase プロジェクト作成

作成したプロジェクト:

- 表示名: `TABI Development`
- プラン: Spark プランで開始
- 用途: 開発・検証用

### なぜ開発用と分かる名前にしたのか

本番用と開発用を同じ Firebase プロジェクトにすると、次の問題が起きやすくなります。

- 開発端末へ本番通知を誤送信する
- テスト用トークンと本番トークンが混ざる
- 誰がどの環境へ送ったか分かりにくくなる
- 設定変更の影響範囲が不明になる

将来は本番用 Firebase プロジェクトを分けることを推奨します。

## 3. Firebase プロジェクト作成時のオプション

### Gemini in Firebase

今回の通知機能に必須ではありません。ON/OFF どちらでも FCM は利用できます。

### Google Analytics

FCM の端末トークン宛てテストには必須ではありません。

Analytics を有効にすると、キャンペーンやユーザーセグメントなどの分析機能を使いやすくなりますが、今回の初期実装は「特定端末に届くか」を確認する目的だったため、後回しでも問題ありません。

## 4. Web アプリ登録

- アプリのニックネーム: `TABI PWA`
- Firebase Hosting: 今回は使用しない
- 実際の公開先: 既存の TABI サーバー
- 公開パス: `/TABI/`

### なぜ Firebase Hosting を選択しなかったのか

TABI は既存のサーバー、PHP API、AWS RDS と連携しており、現在の公開環境を維持するためです。

FCM を使うために Firebase Hosting へ移行する必要はありません。Web Push では HTTPS が必要ですが、既存ドメインが HTTPS で配信されていれば利用できます。

## 5. Firebase SDK 設定の取得

```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

実際の値はこの資料へ記載しません。

### Web 設定値は「秘密鍵」ではない

Firebase の Web 設定はブラウザへ配信されるため、最終的には利用者のブラウザから確認できます。

`.env.local` に入れる理由:

- 開発・本番で設定を分けやすい
- ソースコードへ直接固定しない
- 設定変更箇所をまとめる
- 誤ったプロジェクト ID をコードへ散らさない

一方、サービスアカウント JSON の `private_key` は本物の秘密情報です。

## 6. Web Push 証明書と VAPID キー

Firebase Console:

```text
プロジェクト設定
  → Cloud Messaging
  → ウェブの構成
  → ウェブプッシュ証明書
  → Generate key pair
```

```env
VITE_FIREBASE_VAPID_KEY=
```

### VAPID の役割

VAPID は、Web Push の購読を作るときに送信元アプリケーションを識別する仕組みです。

```javascript
getToken(messaging, {
  vapidKey,
  serviceWorkerRegistration,
});
```

VAPID 公開鍵はブラウザ側で使用されます。サービスアカウント秘密鍵とは別物です。

## 7. Cloud Messaging API

確認内容:

- Firebase Cloud Messaging API（v1）: 有効
- レガシー API: 無効

今後サーバーから送信する場合、FCM HTTP v1 API を利用します。

HTTP v1 では、サービスアカウントから短時間有効な OAuth 2.0 アクセストークンを取得して送信します。

## 8. サービスアカウント JSON

Firebase Console:

```text
プロジェクト設定
  → サービス アカウント
  → Firebase Admin SDK
  → 新しい秘密鍵を生成
```

保管場所:

```text
C:\work\TABI-Secrets
```

### 絶対にしてはいけないこと

- `src` に置く
- `public` に置く
- GitHub へ commit する
- チャットへ貼る
- スクリーンショットへ写す
- Web API のレスポンスで返す
- フロントエンド JavaScript から読み込む

## 9. Android・iOS アプリ登録を後回しにした理由

正式な次の値が確定してから登録します。

- Android applicationId
- iOS Bundle ID
- アプリ名
- ストア配布方針
- 署名設定

仮の `com.example.app` で進めると、後で Firebase 設定ファイルやビルド設定を作り直す可能性があります。

## 10. 公式資料

- Web FCM の開始  
  https://firebase.google.com/docs/cloud-messaging/web/get-started
- API キーの管理  
  https://firebase.google.com/docs/projects/api-keys
- HTTP v1 API  
  https://firebase.google.com/docs/cloud-messaging/send/v1-api
