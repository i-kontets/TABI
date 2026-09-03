# FCM HTTP v1 サーバー送信基盤

この文書は、PHPからFirebase Cloud Messaging HTTP v1 APIへ送信する低レベル基盤の導入手順です。通知履歴の作成や通知設定判定をまとめる上位サービスは、この基盤の上に実装します。

## 対象ファイル

- `api/Notifications/Fcm/FcmConfig.php`
- `api/Notifications/Fcm/FcmAccessTokenProvider.php`
- `api/Notifications/Fcm/FcmHttpClient.php`
- `api/Notifications/Fcm/FcmDeviceRepository.php`
- `api/Notifications/Fcm/FcmSendService.php`
- `api/Notifications/cli/send_fcm_test.php`

## 前提

- PHP CLI環境に `curl`、`openssl`、`json`、`mbstring`、`PDO`、`pdo_mysql` が有効化されていること。
- Composer依存として `google/auth` が導入され、`vendor/autoload.php` が存在すること。
- DBには `users` と `user_devices` が存在し、`user_devices.push_token` にFCM登録トークンが保存されていること。
- サービスアカウントJSONはGit管理外に置くこと。

## 環境変数

実値は `.env`、シェル、コンテナ実行時の環境変数、または安全なシークレット管理で渡してください。

```bash
GOOGLE_APPLICATION_CREDENTIALS=/path/to/firebase-service-account.json
FIREBASE_PROJECT_ID=your-firebase-project-id
FCM_SEND_ENABLED=false
```

`FCM_SEND_ENABLED=true` は実送信を許可するための安全弁です。CLIでは、この環境変数が `true` で、かつ `--send` を指定した場合だけFCMへ送信します。

## dry-run

dry-runはDBから対象端末を取得し、サービスアカウントJSONの形式、Firebase project id、送信ペイロードを確認します。FCMへの通信、アクセストークン取得、DB更新は行いません。

```bash
php api/Notifications/cli/send_fcm_test.php --user-id=123 --dry-run
```

特定端末だけ確認する場合:

```bash
php api/Notifications/cli/send_fcm_test.php --user-id=123 --device-id=456 --dry-run
```

出力には `push_token`、`token_hash`、メールアドレス、サービスアカウント内の秘密情報は含めません。

## 実送信

実送信は運用者が明示的に行います。

```bash
FCM_SEND_ENABLED=true php api/Notifications/cli/send_fcm_test.php --user-id=123 --send
```

Dockerで実行する場合も、サービスアカウントJSONのパスはコンテナ内の読み取り専用マウント先を `GOOGLE_APPLICATION_CREDENTIALS` に指定してください。ホスト側の秘密ディレクトリ名やファイル名はソースコードへ書き込まないでください。

## 送信内容

CLIテストでは固定のテスト通知を送ります。

- title: `TABI通知テスト`
- body: `FCM HTTP v1 APIの疎通確認です。`
- data.type: `test`
- data.actionPath: `/TABI/notifications`
- webpush.fcm_options.link: `/TABI/notifications`

`actionPath` は `/TABI` または `/TABI/` 配下のみ許可します。

## 端末無効化

FCMレスポンスが `UNREGISTERED` と明確に判定できた端末だけ、`user_devices` を以下のように更新します。

- `is_active = 0`
- `revoked_at = NOW()` ただし既に値がある場合は維持
- `updated_at = NOW()`

`INVALID_ARGUMENT` など、トークン失効と断定できないエラーでは端末を無効化しません。

## エラー記録

実送信で失敗した場合、既存の `logSystemError()` が読み込める環境では `system_errors` へ安全な要約だけを記録します。記録対象はHTTPステータス、FCMステータス、再試行可否、短い要約です。

以下は記録しません。

- FCM登録トークン
- `token_hash`
- OAuthアクセストークン
- サービスアカウントの秘密鍵
- メールアドレス

## セキュリティ注意

- サービスアカウントJSONをGitへ追加しないでください。
- `GOOGLE_APPLICATION_CREDENTIALS` に秘密ファイルの実パスを設定しますが、ソースコードやドキュメントには環境固有の実パスを書かないでください。
- dry-run出力やログを共有する前に、利用者IDや端末IDの扱いに注意してください。
- Codexによる検証では `--send` を実行しません。
