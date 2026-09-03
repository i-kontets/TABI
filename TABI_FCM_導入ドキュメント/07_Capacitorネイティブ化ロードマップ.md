# 07. Capacitor ネイティブ化ロードマップ

## 1. 現在の方針

現在は PWA を先に完成させます。

将来は同じ Firebase プロジェクトへ次を追加します。

- Android アプリ
- iOS アプリ

PWA の Web アプリ登録はそのまま残します。

## 2. Firebase 上の構成

```text
Firebase Project: TABI Development
├─ Web app: TABI PWA
├─ Android app: 将来追加
└─ iOS app: 将来追加
```

1つの Firebase プロジェクトでも、各プラットフォームは別のアプリ設定を持ちます。

## 3. 先に正式 ID を決める

### Android

```text
applicationId
例: jp.example.tabi
```

### iOS

```text
Bundle Identifier
例: jp.example.tabi
```

以前の調査時点では、生成物に `com.example.app` が残っていました。

仮 ID のまま Firebase アプリ登録を進めると、正式 ID へ変えるときに設定ファイルを作り直す可能性があります。

## 4. Capacitor パッケージ

将来の導入例:

```bash
npm install @capacitor/core @capacitor/cli
npm install @capacitor/android @capacitor/ios
npm install @capacitor/push-notifications
npx cap sync
```

実際のバージョンは導入時点の公式資料を確認してください。

## 5. Android

Firebase Console で Android アプリを追加します。

必要:

- applicationId
- `google-services.json`
- Android プロジェクトの app モジュール
- 通知権限
- Android 13 以降の実行時通知許可
- 通知アイコン
- 必要に応じて通知チャンネル

Capacitor Push Notifications は Android で FCM SDK を利用します。

## 6. iOS

Firebase Console で iOS アプリを追加します。

必要:

- Bundle ID
- `GoogleService-Info.plist`
- Apple Developer Program
- Push Notifications capability
- Background Modes / Remote notifications
- APNs 認証キーまたは証明書
- Firebase Console への APNs 設定
- iOS の通知許可

iOS は PWA とネイティブで Push の仕組みが異なります。

## 7. DB は共通利用

```text
Web:
platform = web
app_type = pwa

Android:
platform = android
app_type = native

iOS:
platform = ios
app_type = native
```

同じユーザーが Web とスマホを使う場合、複数行になります。

## 8. 通知設定も共通利用

`notification_settings` はユーザー単位です。

例:

```text
チャット通知 OFF
```

この設定は PWA、Android、iOS の全てで共通にできます。

将来、端末別設定も必要になった場合は、`user_devices` または別テーブルへ端末別設定を追加します。

## 9. クライアント処理の違い

### PWA

- `Notification.permission`
- Service Worker
- VAPID
- Web Push
- Firebase Web SDK

### Android / iOS

- Capacitor Push Notifications API
- OS ネイティブ権限
- ネイティブ FCM/APNs トークン
- アプリライフサイクル
- 通知タップイベント

PWA の Service Worker コードをそのまま Android・iOS で使うわけではありません。

## 10. サーバー送信は共通化できる

サーバーは DB に保存された FCM トークンへ HTTP v1 API で送信できます。

```json
{
  "message": {
    "token": "<TOKEN>",
    "notification": {
      "title": "TABI",
      "body": "新しいメッセージがあります"
    },
    "webpush": {},
    "android": {},
    "apns": {}
  }
}
```

## 11. 推奨導入順

1. PWA の通知履歴とサーバー送信を完成
2. 通知イベント仕様を固める
3. 正式 applicationId / Bundle ID を決定
4. Capacitor 基本構成を整理
5. Android アプリを Firebase へ登録
6. Android Push を確認
7. Apple Developer 設定
8. iOS アプリを Firebase へ登録
9. APNs と iOS Push を確認
10. ストア配布環境で確認

## 12. 注意点

- `google-services.json` と `GoogleService-Info.plist` の扱いはチーム方針を決める
- サービスアカウント JSON とは別物
- 開発・本番で Firebase プロジェクトを分ける
- ストア版と社内版で ID を混ぜない
- 同じ端末でもトークンが更新される可能性を考慮
- ログアウトやアカウント切り替え時に再関連付けする

## 13. 公式資料

- Capacitor Push Notifications  
  https://capacitorjs.com/docs/apis/push-notifications
- Firebase Android FCM  
  https://firebase.google.com/docs/cloud-messaging/android/client
- Firebase Apple FCM  
  https://firebase.google.com/docs/cloud-messaging/ios/client
