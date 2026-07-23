-- TABI Firebase Cloud Messaging initial migration
-- 2026-07-22
--
-- 先に以下の確認結果を見てから、本番DBへ適用してください。
-- push_tokenの実値は運用上の機密に近いため、確認結果の取り扱いに注意してください。

SELECT push_token, COUNT(*) AS duplicate_count
FROM user_devices
WHERE push_token IS NOT NULL AND TRIM(push_token) <> ''
GROUP BY push_token
HAVING COUNT(*) > 1;

SELECT ud.device_id, ud.user_id
FROM user_devices ud
LEFT JOIN users u ON u.user_id = ud.user_id
WHERE u.user_id IS NULL;

SELECT device_id
FROM user_devices
WHERE push_token IS NULL OR TRIM(push_token) = '';

SELECT DISTINCT platform
FROM user_devices
WHERE LOWER(platform) NOT IN ('web', 'android', 'ios');

CREATE TABLE IF NOT EXISTS notification_settings (
  user_id int NOT NULL COMMENT '通知設定を持つユーザーID',
  chat_notification_enabled tinyint(1) NOT NULL DEFAULT 1 COMMENT 'チャット通知を受け取るか',
  survey_deadline_notification_enabled tinyint(1) NOT NULL DEFAULT 1 COMMENT 'アンケート締切通知を受け取るか',
  schedule_reminder_notification_enabled tinyint(1) NOT NULL DEFAULT 1 COMMENT '予定リマインド通知を受け取るか',
  member_join_notification_enabled tinyint(1) NOT NULL DEFAULT 1 COMMENT 'メンバー参加通知を受け取るか',
  split_bill_notification_enabled tinyint(1) NOT NULL DEFAULT 1 COMMENT '割り勘更新通知を受け取るか',
  created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '作成日時',
  updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新日時',
  PRIMARY KEY (user_id),
  CONSTRAINT fk_notification_settings_user FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='ユーザーごとの通知受信設定';

ALTER TABLE user_devices
  MODIFY user_id int NOT NULL COMMENT '所有ユーザーID',
  MODIFY push_token text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'FCM登録トークン',
  ADD COLUMN token_hash char(64) CHARACTER SET ascii COLLATE ascii_bin NULL COMMENT 'FCM登録トークンのSHA-256ハッシュ' AFTER push_token,
  ADD COLUMN app_type varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pwa' COMMENT 'アプリ種別（pwa / native）' AFTER platform,
  ADD COLUMN device_name varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL COMMENT '端末名' AFTER app_type,
  ADD COLUMN browser varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL COMMENT 'ブラウザ名' AFTER device_name,
  ADD COLUMN user_agent varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL COMMENT 'ユーザーエージェント' AFTER browser,
  ADD COLUMN is_active tinyint(1) NOT NULL DEFAULT 1 COMMENT '通知送信対象として有効か' AFTER user_agent,
  ADD COLUMN created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '作成日時' AFTER is_active,
  ADD COLUMN updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新日時' AFTER created_at,
  ADD COLUMN last_used_at datetime NULL COMMENT '最後に登録・利用した日時' AFTER updated_at,
  ADD COLUMN revoked_at datetime NULL COMMENT '無効化日時' AFTER last_used_at;

UPDATE user_devices
SET token_hash = SHA2(push_token, 256)
WHERE token_hash IS NULL;

UPDATE user_devices
SET platform = LOWER(platform)
WHERE platform IS NOT NULL;

UPDATE user_devices
SET platform = 'web'
WHERE platform IS NULL OR platform = '' OR platform NOT IN ('web', 'android', 'ios');

UPDATE user_devices
SET app_type = 'pwa'
WHERE app_type IS NULL OR app_type = '' OR app_type NOT IN ('pwa', 'native');

UPDATE user_devices
SET is_active = 0,
    revoked_at = COALESCE(revoked_at, last_login_at, NOW()),
    last_used_at = COALESCE(last_used_at, last_login_at)
WHERE push_token LIKE 'test_web_push_%';

ALTER TABLE user_devices
  MODIFY token_hash char(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL COMMENT 'FCM登録トークンのSHA-256ハッシュ',
  MODIFY platform varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'web' COMMENT 'プラットフォーム（web / android / ios）';

ALTER TABLE user_devices
  ADD UNIQUE KEY uk_user_devices_token_hash (token_hash),
  ADD KEY idx_user_devices_user_active (user_id, is_active),
  ADD KEY idx_user_devices_platform_app (platform, app_type),
  ADD CONSTRAINT fk_user_devices_user FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE;
