# 03. DB と PHP API 設計

## 1. なぜ DB が必要なのか

FCM トークンは「通知を届ける端末の宛先」です。

Firebase からトークンを取得するだけでは、サーバー側が次を判断できません。

- このトークンはどのユーザーのものか
- 現在も有効か
- Web、Android、iOS のどれか
- どの種類の通知を受け取りたいか
- 1人が複数端末を持っているか

そのため、次の2テーブルを使います。

- `user_devices`: 端末と FCM トークン
- `notification_settings`: ユーザー単位の通知種別設定

## 2. データモデル

```mermaid
erDiagram
    users ||--o{ user_devices : owns
    users ||--o| notification_settings : has

    users {
        int user_id PK
    }

    user_devices {
        bigint device_id PK
        int user_id FK
        text push_token
        char token_hash UK
        varchar platform
        varchar app_type
        varchar device_name
        varchar browser
        varchar user_agent
        tinyint is_active
        datetime created_at
        datetime updated_at
        datetime last_used_at
        datetime revoked_at
    }

    notification_settings {
        int user_id PK_FK
        tinyint chat_notification_enabled
        tinyint survey_deadline_notification_enabled
        tinyint schedule_reminder_notification_enabled
        tinyint member_join_notification_enabled
        tinyint split_bill_notification_enabled
        datetime created_at
        datetime updated_at
    }
```

## 3. `notification_settings`

1ユーザーにつき1レコードです。

| カラム | 意味 |
|---|---|
| `user_id` | 所有ユーザー。主キー兼外部キー |
| `chat_notification_enabled` | チャット通知 |
| `survey_deadline_notification_enabled` | アンケート締切通知 |
| `schedule_reminder_notification_enabled` | 予定リマインド |
| `member_join_notification_enabled` | メンバー参加通知 |
| `split_bill_notification_enabled` | 割り勘更新通知 |
| `created_at` | 作成日時 |
| `updated_at` | 更新日時 |

初期値は全て `1` としました。

GET API でレコードがない場合は、DB を勝手に更新せず、全項目 `true` を返す設計にできます。

## 4. `user_devices`

### 4.1 1ユーザー複数端末

1人のユーザーが学校の PC、自宅の PC、Android、iPhone を同時に使う可能性があります。

そのため `user_id` は UNIQUE にしません。

### 4.2 PWA・ネイティブ共通値

| クライアント | platform | app_type |
|---|---|---|
| Web/PWA | `web` | `pwa` |
| Android | `android` | `native` |
| iOS | `ios` | `native` |

### 4.3 `push_token`

FCM が発行する実際の宛先トークンです。

通知送信時に必要なため DB に保持しますが、次へ出してはいけません。

- 通常ログ
- 画面
- URL
- Git
- エラー文
- チャット
- スクリーンショット

### 4.4 `token_hash`

PHP 側で生成します。

```php
$tokenHash = hash('sha256', $token);
```

目的:

- 長い `TEXT` を直接 UNIQUE にしない
- 同じトークンの重複登録を判定する
- 更新対象を識別する

SHA-256 は暗号化ではありません。送信に必要な `push_token` 自体も DB に残ります。

### 4.5 `is_active` と `revoked_at`

- `is_active = 1`: 送信候補
- `is_active = 0`: 送信対象外
- `revoked_at`: 無効化日時

将来、FCM が無効トークンを返した場合は自動で無効化します。

## 5. 外部キー

```sql
FOREIGN KEY (user_id)
REFERENCES users (user_id)
ON DELETE CASCADE
```

ユーザー削除後に通知設定や端末情報が孤立しないようにします。

変更前:

```text
users.user_id        = int
user_devices.user_id = bigint
```

変更後:

```text
users.user_id        = int
user_devices.user_id = int
```

MySQL の外部キーでは、整数型のサイズと符号を合わせる必要があります。

## 6. 端末登録 API

正確なファイルパスはリポジトリで確認してください。

### リクエスト例

```json
{
  "token": "<FCM_TOKEN>",
  "platform": "web",
  "appType": "pwa",
  "deviceName": null,
  "browser": "Chrome"
}
```

### 認証

```php
session_start();
$userId = $_SESSION['user_id'] ?? null;
```

`user_id` は JSON から受け取りません。

リクエストで自由に `user_id` を送れると、他人のアカウントへ端末を登録できるためです。

### バリデーション

- `token`: 必須、文字列、空禁止、最大長制限
- `platform`: `web` / `android` / `ios`
- `appType`: `pwa` / `native`
- `deviceName`: 任意、最大100文字
- `browser`: 任意、最大100文字
- `user_agent`: HTTP ヘッダーから取得し最大500文字

### UPSERT

`token_hash` を基準にします。

- 新規: INSERT
- 既存: UPDATE
- 別ユーザーに移った同じトークン: 現在ログイン中ユーザーへ再関連付け
- `is_active = 1`
- `revoked_at = NULL`
- `last_used_at = NOW()`

## 7. 通知設定 API

### GET

DB にない場合の例:

```json
{
  "success": true,
  "data": {
    "chatNotification": true,
    "surveyDeadlineNotification": true,
    "scheduleReminderNotification": true,
    "memberJoinNotification": true,
    "splitBillNotification": true
  }
}
```

### PATCH / PUT

```json
{
  "chatNotification": false
}
```

JSON boolean だけを許可し、次は拒否します。

```json
{
  "chatNotification": "false"
}
```

## 8. 通知送信時の判定

将来のサーバー送信処理では少なくとも次を確認します。

```text
1. 対象通知の設定が ON
2. user_devices.is_active = 1
3. platform / app_type が送信対象
4. push_token が存在
```

## 9. API レスポンスへ出さない情報

- `push_token`
- `token_hash`
- SQL 文
- PDO 例外
- DB ホスト
- DB パスワード
- Firebase 設定
- サービスアカウント情報
- スタックトレース

## 10. 検証時に確認できた端末

```text
device_id = 8
user_id = 2
platform = web
app_type = pwa
is_active = 1
revoked_at = NULL
```

トークン本体とハッシュは資料へ記載しません。

ブラウザ名が `Safari` になったのは、Chrome DevTools の iPhone エミュレーションで User-Agent がモバイル Safari 相当に見えた影響と考えられます。

## 11. 公式資料

- MySQL 外部キー  
  https://dev.mysql.com/doc/refman/8.0/en/create-table-foreign-keys.html
- FCM エラーコード  
  https://firebase.google.com/docs/cloud-messaging/error-codes
