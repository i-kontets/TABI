# 04. AWS RDS マイグレーション手順

## 1. この章の位置付け

この SQL マイグレーションは 2026-07-22 に AWS RDS の `tabidb` へ反映済みです。

**同じ SQL を再実行しないでください。**

この章は、変更内容の共有、別環境への適用、障害時の追跡のために残します。

## 2. SQL ダンプとマイグレーションの違い

### SQL ダンプ

空の DB を復元する目的の記述が含まれます。

```sql
DROP TABLE IF EXISTS ...
CREATE TABLE ...
LOCK TABLES ...
INSERT INTO ...
UNLOCK TABLES;
```

既存本番 DB へ一部分だけ貼る用途ではありません。

### マイグレーション

既存テーブルを残しながら構造を更新します。

```sql
CREATE TABLE notification_settings ...
ALTER TABLE user_devices ...
UPDATE user_devices ...
```

既存の `user_devices` に対して、再度 `CREATE TABLE user_devices` を実行してはいけません。

## 3. 実行前に行った確認

### 接続先

```sql
SELECT
    DATABASE() AS current_database,
    @@hostname AS database_host,
    @@version AS mysql_version;
```

確認結果:

```text
database = tabidb
MySQL = 8.0.46
```

ホスト名は運用情報のため、この資料には固定値を残しません。

### テーブル構造

```sql
SHOW CREATE TABLE users\G
SHOW CREATE TABLE user_devices\G
SHOW TABLES LIKE 'notification_settings';
```

変更前:

- `users.user_id`: `int`
- `user_devices.user_id`: `bigint`
- `notification_settings`: 存在しない
- `user_devices`: 旧構成

### データ整合性

```sql
SELECT COUNT(*) AS duplicate_token_groups
FROM (
    SELECT SHA2(push_token, 256) AS token_hash
    FROM user_devices
    WHERE push_token IS NOT NULL
      AND TRIM(push_token) <> ''
    GROUP BY SHA2(push_token, 256)
    HAVING COUNT(*) > 1
) AS duplicate_tokens;

SELECT COUNT(*) AS orphan_device_count
FROM user_devices AS ud
LEFT JOIN users AS u
    ON u.user_id = ud.user_id
WHERE u.user_id IS NULL;

SELECT COUNT(*) AS empty_token_count
FROM user_devices
WHERE push_token IS NULL
   OR TRIM(push_token) = '';

SELECT platform, COUNT(*)
FROM user_devices
GROUP BY platform;
```

結果:

```text
duplicate_token_groups = 0
orphan_device_count = 0
empty_token_count = 0
想定外 platform = 0
```

## 4. なぜ RDS スナップショットが必要なのか

MySQL の `CREATE TABLE` や `ALTER TABLE` は暗黙的コミットを発生させます。

途中で失敗しても、一般的な DML のようにスクリプト全体を `ROLLBACK` するだけでは元へ戻せません。

そのため、大きなスキーマ変更前には RDS 手動スナップショットを作成します。

RDS スナップショットからの復元は、通常は既存インスタンスをその場で巻き戻すのではなく、新しい DB インスタンスとして復元します。復旧手順には接続先切り替えも必要です。

## 5. 実行した変更

### `notification_settings` 作成

```sql
CREATE TABLE `notification_settings` (
  `user_id` int NOT NULL
    COMMENT '通知設定を持つユーザーID',

  `chat_notification_enabled`
    tinyint(1) NOT NULL DEFAULT 1
    COMMENT 'チャット通知を受け取るか',

  `survey_deadline_notification_enabled`
    tinyint(1) NOT NULL DEFAULT 1
    COMMENT 'アンケート締切通知を受け取るか',

  `schedule_reminder_notification_enabled`
    tinyint(1) NOT NULL DEFAULT 1
    COMMENT '予定リマインド通知を受け取るか',

  `member_join_notification_enabled`
    tinyint(1) NOT NULL DEFAULT 1
    COMMENT 'メンバー参加通知を受け取るか',

  `split_bill_notification_enabled`
    tinyint(1) NOT NULL DEFAULT 1
    COMMENT '割り勘更新通知を受け取るか',

  `created_at`
    datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
    COMMENT '作成日時',

  `updated_at`
    datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
    ON UPDATE CURRENT_TIMESTAMP
    COMMENT '更新日時',

  PRIMARY KEY (`user_id`),

  CONSTRAINT `fk_notification_settings_user`
    FOREIGN KEY (`user_id`)
    REFERENCES `users` (`user_id`)
    ON DELETE CASCADE
)
ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='ユーザーごとの通知受信設定';
```

### `user_devices` の拡張

追加した主なカラム:

```text
token_hash
app_type
device_name
browser
user_agent
is_active
created_at
updated_at
last_used_at
revoked_at
```

`user_id` は `bigint` から `int` へ変更し、`users.user_id` と合わせました。

### データ変換

```sql
UPDATE `user_devices`
SET `token_hash` = LOWER(SHA2(`push_token`, 256))
WHERE `token_hash` IS NULL;

UPDATE `user_devices`
SET `platform` = LOWER(TRIM(`platform`))
WHERE `platform` IS NOT NULL;

UPDATE `user_devices`
SET `platform` = 'web'
WHERE `platform` IS NULL
   OR `platform` = ''
   OR `platform` NOT IN ('web', 'android', 'ios');

UPDATE `user_devices`
SET `app_type` = CASE
    WHEN `platform` = 'web' THEN 'pwa'
    WHEN `platform` IN ('android', 'ios') THEN 'native'
    ELSE 'pwa'
END;
```

### 開発用ダミートークンの無効化

```sql
UPDATE `user_devices`
SET
    `is_active` = 0,
    `revoked_at` = COALESCE(
        `revoked_at`,
        `last_login_at`,
        NOW()
    ),
    `last_used_at` = COALESCE(
        `last_used_at`,
        `last_login_at`
    )
WHERE `push_token` LIKE 'test_web_push_%';
```

実際のダミートークン値は資料へ記載しません。

### 制約とインデックス

```sql
ALTER TABLE `user_devices`
  ADD UNIQUE KEY `uk_user_devices_token_hash`
    (`token_hash`),

  ADD KEY `idx_user_devices_user_active`
    (`user_id`, `is_active`),

  ADD KEY `idx_user_devices_platform_app`
    (`platform`, `app_type`),

  ADD CONSTRAINT `fk_user_devices_user`
    FOREIGN KEY (`user_id`)
    REFERENCES `users` (`user_id`)
    ON DELETE CASCADE;
```

## 6. 反映後の確認

```sql
SHOW CREATE TABLE notification_settings\G
SHOW CREATE TABLE user_devices\G

SELECT COUNT(*) AS missing_token_hash_count
FROM user_devices
WHERE token_hash IS NULL
   OR TRIM(token_hash) = '';

SELECT COUNT(*) AS duplicate_token_groups
FROM (
    SELECT token_hash
    FROM user_devices
    GROUP BY token_hash
    HAVING COUNT(*) > 1
) AS duplicated_tokens;

SELECT COUNT(*) AS orphan_device_count
FROM user_devices AS ud
LEFT JOIN users AS u
    ON u.user_id = ud.user_id
WHERE u.user_id IS NULL;
```

結果:

```text
missing_token_hash_count = 0
duplicate_token_groups = 0
orphan_device_count = 0
```

## 7. 端末確認用 SQL

```sql
SELECT
    device_id,
    user_id,
    platform,
    app_type,
    device_name,
    browser,
    is_active,
    created_at,
    updated_at,
    last_used_at,
    revoked_at
FROM user_devices
ORDER BY device_id DESC
LIMIT 10;
```

## 8. 再実行してはいけない理由

既にカラムや制約が存在する状態で再実行すると、次のエラーになります。

```text
Duplicate column name
Duplicate key name
Duplicate foreign key constraint name
```

## 9. 別環境へ適用するとき

1. 接続先を表示して確認
2. RDS スナップショットを作成
3. 事前 SELECT を実行
4. `notification_settings` を作成
5. `user_devices` へカラム追加
6. データ変換
7. 制約追加
8. `SHOW CREATE TABLE`
9. 整合性 SELECT
10. アプリから端末登録テスト

## 10. 公式資料

- MySQL 暗黙的コミット  
  https://dev.mysql.com/doc/refman/8.0/en/implicit-commit.html
- MySQL 外部キー  
  https://dev.mysql.com/doc/refman/8.0/en/create-table-foreign-keys.html
- RDS スナップショット復元  
  https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_RestoreFromSnapshot.html
