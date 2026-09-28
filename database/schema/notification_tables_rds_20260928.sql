-- RDS実構成の参照用スナップショット（2026-09-28、UTC 2026-09-27 23:38）。
-- 既存RDSへ実行するmigrationではありません。データ・認証情報を含みません。
-- SHOW CREATE TABLEの結果からAUTO_INCREMENTの現在値だけを除外しました。
-- 新しい通知連携用の追加4列は別migrationで管理します。

CREATE TABLE `admin_notices` (
  `notice_id` bigint NOT NULL AUTO_INCREMENT COMMENT 'お知らせID',
  `title` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'お知らせタイトル',
  `body` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'お知らせ本文',
  `target_type` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '全ユーザー' COMMENT '配信対象（全ユーザー/特定ユーザー/特定グループ）',
  `status` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'published' COMMENT '公開状態（published / draft / ended）',
  `start_at` datetime DEFAULT NULL COMMENT '公開開始日時',
  `end_at` datetime DEFAULT NULL COMMENT '公開終了日時',
  `push_enabled` tinyint(1) NOT NULL DEFAULT '0' COMMENT 'プッシュ通知送信フラグ',
  `read_rate` int NOT NULL DEFAULT '0' COMMENT '既読率（パーセント）',
  `created_by` bigint DEFAULT NULL COMMENT '作成した管理者ユーザーID',
  `created_at` datetime NOT NULL COMMENT '作成日時',
  `updated_at` datetime DEFAULT NULL COMMENT '更新日時',
  `deleted_at` datetime DEFAULT NULL COMMENT '論理削除日時',
  PRIMARY KEY (`notice_id`),
  KEY `idx_admin_notices_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='管理画面用お知らせ管理テーブル';

CREATE TABLE `notifications` (
  `notification_id` bigint NOT NULL AUTO_INCREMENT COMMENT '通知ID',
  `notification_type` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '通知カテゴリ（chat / schedule / survey / member / split_bill / system）',
  `notification_subtype` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '通知の詳細種別（message / reminder / deadline / maintenance / terms_update など）',
  `title` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '通知タイトル',
  `body` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '通知本文',
  `target_type` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '関連先の種類（chat_room / schedule / survey / group / split_bill / system_notice など）',
  `target_id` bigint DEFAULT NULL COMMENT '関連先データのID',
  `action_path` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '通知タップ時のTABI内部遷移先。外部URLは保存しない',
  `detail_data` json DEFAULT NULL COMMENT '通知詳細画面などで使用する追加情報。機密情報は保存しない',
  `created_by` int DEFAULT NULL COMMENT '通知を発生させたユーザーID。運営・自動通知はNULL可',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '通知作成日時',
  `expires_at` datetime DEFAULT NULL COMMENT '通知の表示・利用期限。NULLは期限なし',
  PRIMARY KEY (`notification_id`),
  KEY `idx_notifications_type_created` (`notification_type`,`created_at`),
  KEY `idx_notifications_target` (`target_type`,`target_id`),
  KEY `idx_notifications_created_at` (`created_at`),
  KEY `idx_notifications_expires_at` (`expires_at`),
  KEY `idx_notifications_created_by` (`created_by`),
  CONSTRAINT `fk_notifications_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`user_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='TABIの通知内容を保存するテーブル';

CREATE TABLE `notification_recipients` (
  `recipient_id` bigint NOT NULL AUTO_INCREMENT COMMENT '通知受信者レコードID',
  `notification_id` bigint NOT NULL COMMENT '通知ID',
  `user_id` int NOT NULL COMMENT '通知を受け取るユーザーID',
  `is_read` tinyint(1) NOT NULL DEFAULT '0' COMMENT '既読状態（0:未読 / 1:既読）',
  `read_at` datetime DEFAULT NULL COMMENT '既読日時',
  `delivered_at` datetime DEFAULT NULL COMMENT 'プッシュ通知送信成功日時。アプリ内通知のみの場合はNULL可',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '受信者への通知作成日時',
  PRIMARY KEY (`recipient_id`),
  UNIQUE KEY `uk_notification_recipients_notification_user` (`notification_id`,`user_id`),
  KEY `idx_notification_recipients_user_read_created` (`user_id`,`is_read`,`created_at`),
  KEY `idx_notification_recipients_user_created` (`user_id`,`created_at`),
  KEY `idx_notification_recipients_notification` (`notification_id`),
  CONSTRAINT `fk_notification_recipients_notification` FOREIGN KEY (`notification_id`) REFERENCES `notifications` (`notification_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_notification_recipients_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='ユーザーごとの通知受信・未読既読状態を保存するテーブル';

CREATE TABLE `notification_settings` (
  `user_id` int NOT NULL COMMENT '通知設定を持つユーザーID',
  `chat_notification_enabled` tinyint(1) NOT NULL DEFAULT '1' COMMENT 'チャット通知を受け取るか',
  `survey_deadline_notification_enabled` tinyint(1) NOT NULL DEFAULT '1' COMMENT 'アンケート締切通知を受け取るか',
  `schedule_reminder_notification_enabled` tinyint(1) NOT NULL DEFAULT '1' COMMENT '予定リマインド通知を受け取るか',
  `member_join_notification_enabled` tinyint(1) NOT NULL DEFAULT '1' COMMENT 'メンバー参加通知を受け取るか',
  `split_bill_notification_enabled` tinyint(1) NOT NULL DEFAULT '1' COMMENT '割り勘更新通知を受け取るか',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '作成日時',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新日時',
  PRIMARY KEY (`user_id`),
  CONSTRAINT `fk_notification_settings_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='ユーザーごとの通知受信設定';
