# FCM PHPサーバー送信 作業履歴と今後の手順

作成日: 2026-07-23  
対象: TABI PWA / PHPバックエンド / Firebase Cloud Messaging HTTP v1

この資料は、TABIプロジェクトでこれまで進めてきたFCM通知機能の作業内容、発生した問題、判断理由、現在の進捗、次に行う作業をまとめたものです。単なる完成手順ではなく、別の担当者や将来の自分が経緯を追える作業記録として残します。

## 関連ドキュメント

既存のFCM関連資料は `TABI_FCM_導入ドキュメント` に整理されています。

| ファイル | 役割 |
|---|---|
| `01_Firebaseコンソール設定.md` | Firebaseプロジェクト、Webアプリ、VAPID、サービスアカウントなどの設定 |
| `02_PWAクライアント実装.md` | PWA側のFirebase Messaging、Service Worker、通知許可、FCMトークン取得 |
| `03_DBとPHP_API設計.md` | 通知関連DB、端末登録、通知設定、PHP API設計 |
| `04_AWS_RDSマイグレーション手順.md` | AWS RDS向けDB変更手順 |
| `05_動作確認手順.md` | PWA通知受信、Firebase Console送信、基本確認 |
| `06_セキュリティと運用.md` | 秘密情報、Git、API、トークン、運用上の注意 |
| `07_Capacitorネイティブ化ロードマップ.md` | 将来のAndroid/iOSネイティブ通知対応 |
| `08_実装状況と次の作業.md` | FCM導入全体の初期進捗 |
| `09_トラブルシューティングと用語集.md` | よくある問題、用語、初期切り分け |
| `10_FCM_HTTP_v1_サーバー送信.md` | PHPからFCM HTTP v1へ送信する低レベル基盤の導入手順 |
| `11_FCM_PHPサーバー送信_作業履歴と今後の手順.md` | 本資料。作業履歴、判断理由、次作業、追記用ログ |

既存ファイルは上書きせず、本資料を11番として追加しました。今後FCM関連作業を進めた場合も、この資料の末尾に日付単位で追記します。

## FCM通知機能全体の目的

TABIでは、チャット、メンバー参加、予定、アンケート、割り勘、管理者通知、メンテナンス通知など、アプリ内で発生する重要なイベントをユーザーへ届ける必要があります。

FCM通知機能の最終目的は次の3つです。

1. PWAまたは将来のネイティブアプリへプッシュ通知を届ける。
2. プッシュ通知が届かない場合でも、TABIアプリ内の通知一覧から履歴を確認できる。
3. ユーザーごとの通知設定、端末状態、失効トークン、安全なログ運用を考慮して通知を送る。

このため、通知機能は単なるFCM送信だけでは完結しません。DBに通知履歴を残し、受信者ごとの既読状態を管理し、通知設定を判定し、送信結果を安全に扱う共通通知サービスが必要です。

## 作業開始時点で完了していた内容

作業開始時点では、主にPWAの受信経路と通知履歴API側の基礎ができていました。

- Firebaseプロジェクト作成
- Firebase Webアプリ登録
- VAPIDキー作成
- Firebase Messaging用Service Worker
- ブラウザ通知許可
- FCM登録トークン取得
- `user_devices` への端末トークン保存
- 複数端末対応
- Firebase Consoleからの手動通知
- Windows通知センターでの受信確認
- `notification_settings`
- 通知設定画面
- 通知一覧画面
- 通知詳細画面
- `notifications` テーブル
- `notification_recipients` テーブル
- 通知履歴PHP API
- 通知画面とPHP APIの接続
- JS/JSON形式の通知モックデータ整理

ただし、TABIのPHPサーバーからFCM HTTP v1 APIへ自動送信する部分は未実装でした。

## PHPからFCMを送る必要がある理由

Firebase Consoleからの手動送信は、受信経路の確認には有効です。しかし、TABIの実運用ではアプリ内イベントを起点に通知を自動送信する必要があります。

例:

- チャット投稿時に参加者へ通知する
- メンバーが旅行に参加したときに主催者へ通知する
- 予定の変更を関係者へ通知する
- アンケート回答を促す
- 割り勘の更新を知らせる
- 管理者から全体通知を送る
- メンテナンス予定を事前通知する

これらはFirebase Consoleではなく、PHPバックエンドからDB状態を見て送信する必要があります。

## PHP CLIが見つからなかった経緯

当初、ローカル環境でPHP CLIを直接実行しようとしましたが、`php` コマンドが見つかりませんでした。

確認された状態:

```text
php: command not found
```

Windows上のローカル環境にPHP CLIを直接導入していないため、ターミナルから `php` を実行できない状態でした。

また、ロリポップSSH側でもWeb用PHPとCLI実行環境は別物であり、今回の開発・検証に使える安定したPHP CLI環境として扱うには不十分でした。

## Dockerを選択した理由

PHP CLIをWindowsへ直接入れるのではなく、Dockerを選択しました。

理由:

- 開発チームで同じPHP環境を再現しやすい
- PHP拡張をDockerfileに明記できる
- ローカルWindows環境を壊しにくい
- Composer、PHP拡張、MySQL接続拡張をまとめて管理できる
- 本番やCIに近い確認手順を作りやすい

結果として、PHP 8.3 CLI用のDockerイメージ `tabi-php-cli:8.3` を使う方針になりました。

## Docker PHP 8.3 CLI環境

現在のPHP CLI検証用ファイルは次です。

```text
Dockerfile.php-cli
```

このDockerfileでは次を用意します。

- `php:8.3-cli`
- Composer
- `pdo_mysql`
- `zip`
- `libzip-dev`
- `unzip`

`pdo_mysql` はTABIのPHPからMySQL / AWS RDSへ接続し、`user_devices` から送信対象端末を取得するために必要です。

`zip` と `unzip` はComposerが依存ライブラリを取得・展開するために必要です。初期状態では不足しており、Composer実行時にエラーになったため追加しました。

## Composerを導入した理由

FCM HTTP v1 APIでは、Firebaseサービスアカウントを使ってOAuth 2.0アクセストークンを取得します。

この処理を独自にJWT署名から手作りすると、署名、スコープ、有効期限、エラー処理、秘密鍵の扱いで事故が起きやすくなります。そのため、公式系のGoogle認証ライブラリである `google/auth` をComposerで導入しました。

Node.jsとの対応関係は次のように考えると分かりやすいです。

| Node.js | PHP |
|---|---|
| `package.json` | `composer.json` |
| `package-lock.json` | `composer.lock` |
| `node_modules` | `vendor` |
| `npm install` | `composer install` / `composer require` |

## 現在のComposer構成

現在の `composer.json` はPHPバックエンド依存として `google/auth` を管理しています。

```json
{
  "name": "tabi/tabi-pwa",
  "type": "project",
  "license": "proprietary",
  "require": {
    "google/auth": "^1.53"
  }
}
```

確認済みの要点:

- `google/auth` は `composer.lock` 上で `v1.53.0`
- `vendor/autoload.php` が存在
- `composer validate` は成功済み
- `composer audit` では脆弱性警告なし

`composer.json` は最初に必須メタ情報が不足していたため、`name`、`description`、`type`、`license` を整えました。その後、`composer.lock` との整合性を取るため `composer update --lock` を実行しました。これは依存ライブラリを新しく増やすためではなく、ロックファイルのメタ情報を現在の `composer.json` に合わせるための作業です。

## vendor/autoload.phpの役割

`vendor/autoload.php` はComposerで導入したPHPライブラリを読み込む入口です。

今回のFCM送信基盤では、`google/auth` の `Google\Auth\Credentials\ServiceAccountCredentials` を使うために必要です。

実装ではCLIスクリプトから `vendor/autoload.php` を読み込み、その後FCM関連クラスを読み込みます。

## 実装済みの低レベルFCM送信基盤

PHPからFCM HTTP v1 APIへ送るための低レベル基盤を `api/Notifications/Fcm` に追加しました。

対象ファイル:

- `api/Notifications/Fcm/FcmConfig.php`
- `api/Notifications/Fcm/FcmAccessTokenProvider.php`
- `api/Notifications/Fcm/FcmHttpClient.php`
- `api/Notifications/Fcm/FcmDeviceRepository.php`
- `api/Notifications/Fcm/FcmSendService.php`
- `api/Notifications/cli/send_fcm_test.php`

### FcmConfig.php

役割:

- `FIREBASE_PROJECT_ID` を読み込む
- `GOOGLE_APPLICATION_CREDENTIALS` を読み込む
- `FCM_SEND_ENABLED` を読み込む
- FCM HTTP v1 endpointを生成する
- `actionPath` が `/TABI` または `/TABI/` 配下であることを検証する
- CLIテスト用の固定通知ペイロードを作る

`actionPath` は外部URLや改行を含む値を許可しません。通知クリック時にTABI内部の通知画面へ誘導するため、`/TABI/notifications` を使います。

### FcmAccessTokenProvider.php

役割:

- サービスアカウントJSONの読み取り可否を確認する
- JSON形式と必須フィールドを確認する
- サービスアカウントの `project_id` と `FIREBASE_PROJECT_ID` の一致を確認する
- `google/auth` でOAuth 2.0アクセストークンを取得する
- 同一プロセス内では有効期限に余裕があるアクセストークンを再利用する

ログや例外メッセージに `private_key`、実際のメールアドレス、アクセストークンは出しません。

### FcmHttpClient.php

役割:

- cURLでFCM HTTP v1 APIへPOSTする
- JSONレスポンスを解析する
- HTTPステータスを扱う
- `UNREGISTERED` を検出する
- `429`、`500`、`503` などを再試行可能エラーとして扱う
- エラー要約から長いトークン風文字列やAuthorization値をマスクする

`UNREGISTERED` はFCM登録トークンが無効になったことを示す明確なシグナルとして扱います。

`INVALID_ARGUMENT` は必ずしもトークン失効とは限らないため、それだけでは端末を無効化しません。

### FcmDeviceRepository.php

役割:

- `users` に対象ユーザーが存在するか確認する
- `user_devices` から有効な端末を取得する
- `device_id` 指定時は対象端末だけに絞る
- `UNREGISTERED` 端末を論理的に無効化する

端末無効化では行を削除せず、履歴として残します。

更新内容:

```text
is_active = 0
revoked_at = NOW()
updated_at = NOW()
```

ただし、`revoked_at` に既に値がある場合は既存値を維持します。

### FcmSendService.php

役割:

- 1ユーザーの全有効端末へ送信する
- `device_id` 指定時は特定端末へ送信する
- 1台が失敗しても他端末への送信を続ける
- 成功数、失敗数、無効化数を集計する
- 明確な `UNREGISTERED` の場合だけ端末を無効化する
- 既存の `logSystemError()` が使える場合は安全な要約だけ記録する

このサービスはまだ通知履歴の作成や通知設定判定までは担当しません。今後作る上位通知サービスから利用される低レベル送信基盤です。

### send_fcm_test.php

役割:

- CLI専用の疎通確認スクリプト
- `--help`
- `--dry-run`
- `--send`
- `--user-id`
- `--device-id`
- `FCM_SEND_ENABLED` による実送信安全弁

HTTP経由で実行されないよう、`PHP_SAPI !== 'cli'` の場合は終了します。

## CLIの安全設計

実送信には次の2条件が両方必要です。

```text
FCM_SEND_ENABLED=true
--send
```

`--send` だけでは送信されません。さらに、`FCM_SEND_ENABLED=true` がない場合はFirebase設定やDB接続より前に停止します。

Codexでの検証では、実送信を行いません。

確認済み:

- `--help` はDBやFirebase設定を読まずに表示できる
- `FCM_SEND_ENABLED=true` なしの `--send` は停止する
- 追加PHPファイルは `php -l` で構文エラーなし

## dry-runの意味

dry-runは、実送信前の安全確認です。

dry-runで確認すること:

- CLI引数が正しい
- DB接続できる
- 対象ユーザーが存在する
- 対象ユーザーの有効端末を取得できる
- サービスアカウントJSONを読み込める
- サービスアカウントのproject_idがFirebase project idと一致する
- テスト通知ペイロードが作れる
- 出力にトークンや秘密情報が含まれない

dry-runで行わないこと:

- FCM送信
- OAuthアクセストークン取得
- DB更新
- 通知履歴作成
- 端末無効化

dry-runコマンド例:

```bash
MSYS_NO_PATHCONV=1 docker run --rm \
  -v "$(pwd -W):/app" \
  -v "<HOST_SECRET_DIR>:/run/secrets/tabi:ro" \
  -w /app \
  -e GOOGLE_APPLICATION_CREDENTIALS=/run/secrets/tabi/<SERVICE_ACCOUNT_FILE>.json \
  -e FIREBASE_PROJECT_ID=<FIREBASE_PROJECT_ID> \
  -e FCM_SEND_ENABLED=false \
  tabi-php-cli:8.3 \
  php api/Notifications/cli/send_fcm_test.php \
  --user-id=<USER_ID> \
  --dry-run
```

特定端末だけ確認する場合:

```bash
MSYS_NO_PATHCONV=1 docker run --rm \
  -v "$(pwd -W):/app" \
  -v "<HOST_SECRET_DIR>:/run/secrets/tabi:ro" \
  -w /app \
  -e GOOGLE_APPLICATION_CREDENTIALS=/run/secrets/tabi/<SERVICE_ACCOUNT_FILE>.json \
  -e FIREBASE_PROJECT_ID=<FIREBASE_PROJECT_ID> \
  -e FCM_SEND_ENABLED=false \
  tabi-php-cli:8.3 \
  php api/Notifications/cli/send_fcm_test.php \
  --user-id=<USER_ID> \
  --device-id=<DEVICE_ID> \
  --dry-run
```

## 実送信テスト

dry-runが成功したあと、運用者が手動で実送信します。

```bash
MSYS_NO_PATHCONV=1 docker run --rm \
  -v "$(pwd -W):/app" \
  -v "<HOST_SECRET_DIR>:/run/secrets/tabi:ro" \
  -w /app \
  -e GOOGLE_APPLICATION_CREDENTIALS=/run/secrets/tabi/<SERVICE_ACCOUNT_FILE>.json \
  -e FIREBASE_PROJECT_ID=<FIREBASE_PROJECT_ID> \
  -e FCM_SEND_ENABLED=true \
  tabi-php-cli:8.3 \
  php api/Notifications/cli/send_fcm_test.php \
  --user-id=<USER_ID> \
  --send
```

実送信後に確認すること:

- CLI結果の成功数
- CLI結果の失敗数
- CLI結果の無効化数
- Windows通知センターで受信できるか
- PWA通知許可が有効か
- 通知クリック時に `/TABI/notifications` へ移動するか
- ログにトークンや秘密情報が出ていないか
- `notifications` と `notification_recipients` にはまだINSERTされないこと

低レベル送信基盤の段階では、通知履歴DBへの登録はまだ行いません。

## 対象端末確認SQL

送信前に対象端末を確認するときは、`push_token` と `token_hash` を表示しないSQLを使います。

```sql
SELECT
    device_id,
    user_id,
    platform,
    app_type,
    device_name,
    browser,
    is_active,
    revoked_at,
    last_used_at
FROM user_devices
WHERE user_id = <USER_ID>
ORDER BY device_id;
```

`<USER_ID>` は対象ユーザーIDに置き換えます。メールアドレス、FCM登録トークン、token_hash、認証情報は表示しません。

## セキュリティ方針

以下はソースコード、Markdown、ログ、CLI出力へ実値を書かないでください。

- サービスアカウントJSONの実ファイル名
- `private_key`
- `client_email` の実値
- OAuthアクセストークン
- Authorizationヘッダー
- FCM登録トークン
- `push_token`
- `token_hash`
- DBパスワード
- RDSエンドポイント
- メールアドレス
- 個人情報
- Firebase APIキーの実値

資料やコマンド例では、必ず次のようなプレースホルダを使います。

- `<HOST_SECRET_DIR>`
- `<SERVICE_ACCOUNT_FILE>`
- `<FIREBASE_PROJECT_ID>`
- `<USER_ID>`
- `<DEVICE_ID>`

## 現在の進捗

| 状態 | 内容 |
|---|---|
| 完了 | Firebaseプロジェクト作成 |
| 完了 | Firebase Webアプリ登録 |
| 完了 | VAPIDキー作成 |
| 完了 | Service Worker |
| 完了 | ブラウザ通知許可 |
| 完了 | FCMトークン取得 |
| 完了 | `user_devices` への端末保存 |
| 完了 | 複数端末対応 |
| 完了 | Firebase Consoleからの手動通知受信 |
| 完了 | `notification_settings` |
| 完了 | 通知設定画面 |
| 完了 | 通知一覧画面 |
| 完了 | 通知詳細画面 |
| 完了 | `notifications` |
| 完了 | `notification_recipients` |
| 完了 | 通知履歴PHP API |
| 完了 | 通知画面とPHP APIの接続 |
| 完了 | 通知モックデータ整理 |
| 完了 | Docker PHP 8.3 CLI環境 |
| 完了 | `pdo_mysql` 追加 |
| 完了 | `zip` / `unzip` 追加 |
| 完了 | Composer導入 |
| 完了 | `google/auth` 導入 |
| 完了 | `composer.json` / `composer.lock` 整備 |
| 完了 | `vendor/autoload.php` 確認 |
| 完了 | 低レベルFCM送信基盤 |
| 完了 | CLIテストスクリプト |
| 完了 | `php -l` 構文チェック |
| 完了 | `--help` 確認 |
| 完了 | `FCM_SEND_ENABLED` なしの `--send` ブロック確認 |
| 未実施 | 手動dry-run |
| 未実施 | 実DBからの対象端末取得確認 |
| 未実施 | FCM実送信 |
| 未実施 | Windows通知センターでの実送信受信確認 |
| 未実施 | 通知履歴DBとFCM送信の統合 |
| 未実施 | チャットなど各機能との接続 |
| 未実施 | 管理者通知 |
| 未実施 | メンテナンス予約通知 |
| 未実施 | Capacitor Android / iOS通知 |

## 次に実施する作業

### 1. 対象ユーザーと端末を確認する

まず、テスト送信してよいユーザーと端末を決めます。

確認内容:

- 対象ユーザーが通知テストを許可している
- 対象端末が現在使えるブラウザである
- PWA通知許可が `granted` である
- `user_devices.is_active = 1`
- `revoked_at IS NULL`
- `push_token` が存在する

確認SQLでは `push_token` と `token_hash` を表示しません。

### 2. Dockerでdry-runする

サービスアカウントJSONを読み取り専用でマウントし、`FCM_SEND_ENABLED=false` のままdry-runを実行します。

dry-run成功条件:

- 対象ユーザーが見つかる
- 対象端末数が1以上
- サービスアカウントJSONが読める
- Firebase project idが一致する
- 出力に秘密情報が出ない
- DB更新が発生しない

### 3. 実送信の前に安全弁を確認する

実送信前に、`FCM_SEND_ENABLED=false` で `--send` が失敗することを確認します。

期待する結果:

```text
--send requires FCM_SEND_ENABLED=true.
```

### 4. 実送信する

dry-runが成功し、対象端末が正しいことを確認してから、`FCM_SEND_ENABLED=true` と `--send` を両方指定して実送信します。

実送信後の確認:

- FCMレスポンスが成功する
- Windows通知センターに通知が届く
- 通知クリックでTABIの通知一覧へ移動する
- `UNREGISTERED` の場合だけ端末が無効化される
- ログやCLI結果に秘密情報が出ない

### 5. 通知履歴DBとFCM送信を統合する

低レベル送信が確認できたら、次に上位の共通通知サービスを実装します。

役割:

- `notifications` へ通知履歴をINSERT
- `notification_recipients` へ受信者をINSERT
- `notification_settings` で通知可否を判定
- 通知ONならFCM送信
- 通知OFFなら履歴だけ作成しFCM送信しない
- 有効端末がない場合も履歴だけ残す
- FCM失敗時も履歴は残す
- 1台以上成功した場合は `delivered_at` を更新する

方針:

```text
通知設定ON:
  通知履歴を作成
  受信者を登録
  FCM送信

通知設定OFF:
  通知履歴を作成
  受信者を登録
  FCM送信しない

有効端末なし:
  通知履歴を作成
  受信者を登録
  FCM送信しない

FCM失敗:
  通知履歴は残す
  失敗結果を安全に記録
```

理由は、プッシュ通知が届かなくてもTABIアプリ内の通知一覧から確認できるようにするためです。

### 6. 各機能と接続する

共通通知サービスができた後、各機能から呼び出します。

候補:

- チャット投稿
- メンバー参加
- 予定作成
- 予定変更
- アンケート作成
- アンケート回答依頼
- 割り勘更新
- 管理者通知
- メンテナンス通知

各機能では、直接FCMを呼ばず、共通通知サービスだけを呼ぶ方針にします。

### 7. 管理者通知を実装する

将来的には管理画面から次の通知を送れるようにします。

- 全ユーザー通知
- 特定ユーザー通知
- 特定グループ通知
- 利用規約変更通知
- プライバシーポリシー変更通知
- 障害通知
- セキュリティ通知

大量送信になる可能性があるため、キュー、分割送信、レート制限、送信履歴の確認が必要です。

### 8. メンテナンス予約通知を実装する

メンテナンス通知は、即時送信だけでなく予約送信が必要です。

想定フロー:

```text
管理者が日時を登録
  ↓
予約ジョブをDBへ保存
  ↓
Cronが定期確認
  ↓
指定時刻になった通知を送信
  ↓
送信結果を保存
```

DB停止を伴うメンテナンスでは、開始前通知はDB保存できますが、終了通知はDB復旧後に送る必要があります。

### 9. Capacitor Android / iOS対応

将来的にCapacitorでAndroid / iOSアプリ化する場合、PWAとは別の通知経路が必要です。

現時点の想定:

```text
PWA:
platform = web
app_type = pwa

Android:
platform = android
app_type = native

iOS:
platform = ios
app_type = native
```

`user_devices` は複数端末を扱えるため、同じユーザーがPWA、Android、iOSを併用する構成にも対応できます。

## 実行した主なコマンド

秘密情報を含む実コマンドは記録しません。以下は作業内容を理解するための代表例です。

```bash
docker build -f Dockerfile.php-cli -t tabi-php-cli:8.3 .
```

```bash
docker run --rm \
  -v "<PROJECT_DIR>:/app" \
  -w /app \
  tabi-php-cli:8.3 \
  php -m
```

```bash
docker run --rm \
  -v "<PROJECT_DIR>:/app" \
  -w /app \
  tabi-php-cli:8.3 \
  composer validate
```

```bash
docker run --rm \
  -v "<PROJECT_DIR>:/app" \
  -w /app \
  tabi-php-cli:8.3 \
  composer audit
```

```bash
docker run --rm \
  -v "<PROJECT_DIR>:/app:ro" \
  -w /app \
  tabi-php-cli:8.3 \
  php -l api/Notifications/cli/send_fcm_test.php
```

Git BashでDockerのパス変換問題が出る場合は、`MSYS_NO_PATHCONV=1` を付けます。

## 発生した問題と対応

| 問題 | 原因 | 対応 |
|---|---|---|
| ローカルで `php` が見つからない | WindowsにPHP CLIが入っていない | Docker PHP CLIへ切り替え |
| ロリポップSSHでPHP CLIを使えない | Web用PHPとCLI環境が別 | 開発検証には使わずDockerへ切り替え |
| Git BashでDockerの `/app` が変換される | MSYSのパス変換 | `MSYS_NO_PATHCONV=1` を使う |
| `pdo_mysql` がない | 初期PHP CLIイメージにMySQL PDO拡張がない | `Dockerfile.php-cli` に `docker-php-ext-install pdo_mysql` を追加 |
| ComposerでZIP関連エラー | `zip` 拡張と `unzip` が不足 | `libzip-dev`、`unzip`、PHP `zip` 拡張を追加 |
| `composer validate` 警告 | `composer.json` のメタ情報不足 | `name`、`description`、`type`、`license` を整備 |
| `composer.lock` と不一致 | `composer.json` を手動更新したため | `composer update --lock` でロック情報を整合 |
| Docker API接続が拒否される | Codexサンドボックス外のDockerアクセス | 承認付きで読み取り検証のみ実行 |

## 変更禁止・注意事項

この資料作成時点では、コードやDBは変更しません。

今後も以下に注意します。

- SQLダンプを実行しない
- SQLダンプをGitへ追加しない
- DBデータを不用意に変更しない
- `DROP TABLE` や `INSERT` を検証目的で実行しない
- `push_token` を表示しない
- `token_hash` を表示しない
- メールアドレスを表示しない
- サービスアカウントJSONの実ファイル名を表示しない
- OAuthアクセストークンを表示しない
- 実送信はユーザー確認後に行う

## 作業履歴

### 2026-07-23

#### 実施内容

- 既存FCMドキュメントフォルダを確認
- Docker PHP 8.3 CLI環境を確認
- Composer構成を確認
- `google/auth v1.53.0` を確認
- `vendor/autoload.php` の存在を確認
- 低レベルFCM送信基盤のファイル構成を確認
- CLIテストスクリプトのオプションを確認
- 本資料を新規作成

#### 実装済みとして整理した内容

- Docker PHP CLI環境
- Composer導入
- `pdo_mysql` 追加
- `zip` / `unzip` 追加
- `google/auth` 導入
- OAuth 2.0アクセストークン取得処理
- FCM HTTP v1 cURL送信処理
- `user_devices` からの有効端末取得
- `UNREGISTERED` 端末の論理無効化
- CLI専用テストスクリプト
- `FCM_SEND_ENABLED` と `--send` の二重安全弁

#### 確認結果

- 追加PHPファイルの構文チェックは成功済み
- CLI `--help` は成功済み
- `FCM_SEND_ENABLED=true` なしの `--send` は送信前に停止することを確認済み
- Codexでは実送信を実行していない

#### 次回

- 対象ユーザーと端末を安全なSQLで確認する
- Dockerでdry-runする
- dry-run結果に秘密情報が含まれないことを確認する
- ユーザー確認後に実送信する
- 受信確認後、通知履歴DBとFCM送信を統合する共通通知サービスへ進む
