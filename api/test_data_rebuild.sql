-- TABI データベース完全再構築・テストデータ投入SQL
-- 注意: 対象データベース内の既存35テーブルとデータを削除します。
SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+09:00";
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS `user_roles`;
DROP TABLE IF EXISTS `user_profiles`;
DROP TABLE IF EXISTS `user_groups`;
DROP TABLE IF EXISTS `user_devices`;
DROP TABLE IF EXISTS `users`;
DROP TABLE IF EXISTS `trip_survey_votes`;
DROP TABLE IF EXISTS `trip_survey_options`;
DROP TABLE IF EXISTS `trip_surveys`;
DROP TABLE IF EXISTS `trip_members`;
DROP TABLE IF EXISTS `trip_decisions`;
DROP TABLE IF EXISTS `trip_date_votes`;
DROP TABLE IF EXISTS `trip_date_candidates`;
DROP TABLE IF EXISTS `trip_candidate_votes`;
DROP TABLE IF EXISTS `trip_candidates`;
DROP TABLE IF EXISTS `trips`;
DROP TABLE IF EXISTS `system_settings`;
DROP TABLE IF EXISTS `settlements`;
DROP TABLE IF EXISTS `roles`;
DROP TABLE IF EXISTS `photo_tags`;
DROP TABLE IF EXISTS `photos`;
DROP TABLE IF EXISTS `message_reads`;
DROP TABLE IF EXISTS `messages`;
DROP TABLE IF EXISTS `itinerary_items`;
DROP TABLE IF EXISTS `itineraries`;
DROP TABLE IF EXISTS `group_members`;
DROP TABLE IF EXISTS `group_invitations`;
DROP TABLE IF EXISTS `expense_participants`;
DROP TABLE IF EXISTS `expenses`;
DROP TABLE IF EXISTS `checklist_items`;
DROP TABLE IF EXISTS `checklists`;
DROP TABLE IF EXISTS `chat_members`;
DROP TABLE IF EXISTS `chats`;
DROP TABLE IF EXISTS `audit_logs`;
DROP TABLE IF EXISTS `albums`;
DROP TABLE IF EXISTS `admin_users`;

CREATE TABLE `admin_users` (
  `admin_user_id` bigint NOT NULL COMMENT '管理者ID',
  `user_id` bigint NOT NULL COMMENT 'ユーザーID（usersと紐付け）',
  `admin_level` int DEFAULT NULL COMMENT '権限レベル（例: 1=一般管理者, 9=スーパー管理者）',
  `created_at` datetime DEFAULT NULL COMMENT '登録日時'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `albums` (
  `album_id` bigint NOT NULL COMMENT 'アルバムID',
  `trip_id` bigint DEFAULT NULL COMMENT '旅行ID',
  `title` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'アルバム名',
  `created_by` bigint DEFAULT NULL COMMENT '作成者',
  `created_at` datetime DEFAULT NULL COMMENT '作成日時'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `audit_logs` (
  `audit_log_id` bigint NOT NULL COMMENT '監査ログID',
  `actor_user_id` bigint DEFAULT NULL COMMENT '操作ユーザー',
  `action_type` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '操作内容（更新/削除など）',
  `target_table` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '対象テーブル',
  `target_id` bigint DEFAULT NULL COMMENT '対象レコードID',
  `created_at` datetime DEFAULT NULL COMMENT '実行日時'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `chats` (
  `chat_id` bigint NOT NULL COMMENT 'チャットID',
  `trip_id` bigint DEFAULT NULL COMMENT '紐づく旅行ID',
  `chat_type` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '種別（group / hotel / support）',
  `related_entity_type` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '関連エンティティ種別（hotel等）',
  `related_entity_id` bigint DEFAULT NULL COMMENT '関連エンティティID',
  `created_at` datetime DEFAULT NULL COMMENT '作成日時'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `chat_members` (
  `chat_member_id` bigint NOT NULL COMMENT 'チャット参加ID',
  `chat_id` bigint NOT NULL COMMENT 'チャットID',
  `user_id` bigint NOT NULL COMMENT '参加ユーザー',
  `joined_at` datetime DEFAULT NULL COMMENT '参加日時'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `checklists` (
  `checklist_id` bigint NOT NULL COMMENT 'チェックリストID',
  `trip_id` bigint DEFAULT NULL COMMENT '旅行ID',
  `checklist_type` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '種類（持ち物 / 買い物）',
  `title` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'タイトル',
  `created_by` bigint DEFAULT NULL COMMENT '作成者'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `checklist_items` (
  `checklist_item_id` bigint NOT NULL COMMENT '項目ID',
  `checklist_id` bigint DEFAULT NULL COMMENT 'チェックリストID',
  `item_name` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '項目名',
  `is_checked` tinyint(1) DEFAULT NULL COMMENT 'チェック状態',
  `assigned_user_id` bigint DEFAULT NULL COMMENT '担当者',
  `sort_order` int DEFAULT NULL COMMENT '表示順'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `expenses` (
  `expense_id` bigint NOT NULL COMMENT '支払いID',
  `trip_id` bigint DEFAULT NULL COMMENT '旅行ID',
  `paid_by_user_id` bigint DEFAULT NULL COMMENT '支払者',
  `title` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '内容（例: 宿代）',
  `amount` decimal(10,2) DEFAULT NULL COMMENT '金額',
  `expense_date` date DEFAULT NULL COMMENT '支払日',
  `category` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'カテゴリ',
  `memo` text COLLATE utf8mb4_unicode_ci COMMENT 'メモ'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `expense_participants` (
  `expense_participant_id` bigint NOT NULL COMMENT '負担者ID',
  `expense_id` bigint DEFAULT NULL COMMENT '支払いID',
  `user_id` bigint DEFAULT NULL COMMENT '対象ユーザー',
  `share_ratio` decimal(5,2) DEFAULT NULL COMMENT '負担割合',
  `share_amount` decimal(10,2) DEFAULT NULL COMMENT '負担額',
  `is_settled` tinyint(1) DEFAULT NULL COMMENT '精算済みか'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `group_invitations` (
  `invitation_id` bigint NOT NULL COMMENT '招待ID',
  `group_id` bigint NOT NULL COMMENT '招待対象のグループID',
  `invited_by` bigint NOT NULL COMMENT '招待を送信したユーザーID',
  `invited_user_id` bigint DEFAULT NULL COMMENT '招待されたユーザーID（未登録ユーザーはNULLも想定）',
  `invitation_token` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '招待リンク用トークン（URL経由参加用）',
  `status` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '状態（pending / accepted / expired / rejected）',
  `expired_at` datetime DEFAULT NULL COMMENT '有効期限（期限切れ判定に使用）',
  `created_at` datetime NOT NULL COMMENT '作成日時'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `group_members` (
  `group_member_id` bigint NOT NULL COMMENT 'グループ所属レコードID',
  `group_id` bigint NOT NULL COMMENT '所属グループID',
  `user_id` bigint NOT NULL COMMENT '所属ユーザーID',
  `role_in_group` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT 'member' COMMENT '役割（admin / member）',
  `joined_at` datetime DEFAULT NULL COMMENT '参加日時',
  `invitation_status` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '招待状態（pending / accepted / rejected）'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `itineraries` (
  `itinerary_id` bigint NOT NULL COMMENT '旅程ID（1日単位の行程）',
  `trip_id` bigint NOT NULL COMMENT '対象旅行ID',
  `itinerary_date` date NOT NULL COMMENT '対象日（旅行内の日付）',
  `title` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'タイトル（例: 1日目プラン）',
  `note` text COLLATE utf8mb4_unicode_ci COMMENT '備考・説明'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `itinerary_items` (
  `itinerary_item_id` bigint NOT NULL COMMENT '行程項目ID',
  `itinerary_id` bigint NOT NULL COMMENT '所属旅程ID',
  `item_type` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '種別（move / visit / meal / hotel / free_time）',
  `place_id` bigint DEFAULT NULL COMMENT '関連する場所ID（移動・観光・宿泊など）',
  `start_time` datetime DEFAULT NULL COMMENT '開始時刻',
  `end_time` datetime DEFAULT NULL COMMENT '終了時刻',
  `order_no` int DEFAULT NULL COMMENT '表示順序（UI表示制御用）',
  `memo` text COLLATE utf8mb4_unicode_ci COMMENT 'メモ・補足情報'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `messages` (
  `message_id` bigint NOT NULL COMMENT 'メッセージID',
  `chat_id` bigint DEFAULT NULL COMMENT 'チャットID',
  `sender_user_id` bigint DEFAULT NULL COMMENT '送信者',
  `body` text COLLATE utf8mb4_unicode_ci COMMENT '本文',
  `sent_at` datetime DEFAULT NULL COMMENT '送信日時'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `message_reads` (
  `message_read_id` bigint NOT NULL COMMENT '既読管理ID',
  `message_id` bigint NOT NULL COMMENT '対象メッセージID',
  `user_id` bigint NOT NULL COMMENT '既読ユーザーID',
  `read_at` datetime DEFAULT NULL COMMENT '既読日時'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `photos` (
  `photo_id` bigint NOT NULL COMMENT '写真ID',
  `album_id` bigint DEFAULT NULL COMMENT '所属アルバム',
  `uploaded_by` bigint DEFAULT NULL COMMENT 'アップロード者',
  `file_url` text COLLATE utf8mb4_unicode_ci COMMENT '画像URL',
  `caption` text COLLATE utf8mb4_unicode_ci COMMENT '説明',
  `shot_at` datetime DEFAULT NULL COMMENT '撮影日時'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `photo_tags` (
  `photo_tag_id` bigint NOT NULL COMMENT 'タグID',
  `photo_id` bigint NOT NULL COMMENT '対象写真ID',
  `tagged_user_id` bigint NOT NULL COMMENT 'タグ付けされたユーザーID'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `roles` (
  `role_id` bigint NOT NULL COMMENT 'ロールID（権限の種類を識別）',
  `role_name` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'ロール名（例: admin / user / moderator）'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `settlements` (
  `settlement_id` bigint NOT NULL COMMENT '精算ID',
  `trip_id` bigint NOT NULL COMMENT '対象旅行ID',
  `from_user_id` bigint NOT NULL COMMENT '支払う側ユーザー',
  `to_user_id` bigint NOT NULL COMMENT '受け取る側ユーザー',
  `amount` decimal(10,2) NOT NULL COMMENT '精算金額',
  `status` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '状態（pending / completed / cancelled）',
  `settled_at` datetime DEFAULT NULL COMMENT '精算完了日時',
  `created_at` datetime NOT NULL COMMENT '作成日時'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `system_settings` (
  `setting_key` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '設定キー（例: max_upload_size）',
  `setting_value` text COLLATE utf8mb4_unicode_ci COMMENT '設定値（文字列で柔軟に管理）',
  `updated_at` datetime DEFAULT NULL COMMENT '更新日時'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `trips` (
  `trip_id` bigint NOT NULL COMMENT '旅行ID',
  `group_id` bigint NOT NULL COMMENT '紐づくグループID',
  `title` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '旅行タイトル',
  `description` text COLLATE utf8mb4_unicode_ci COMMENT '旅行の説明',
  `start_date` date DEFAULT NULL COMMENT '開始日（確定後に使用）',
  `end_date` date DEFAULT NULL COMMENT '終了日',
  `destination_summary` text COLLATE utf8mb4_unicode_ci COMMENT '行き先概要',
  `status` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '状態（draft / voting / confirmed）',
  `created_by` bigint DEFAULT NULL COMMENT '作成者',
  `created_at` datetime DEFAULT NULL COMMENT '作成日時',
  `updated_at` datetime DEFAULT NULL COMMENT '更新日時'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `trip_candidates` (
  `candidate_id` bigint NOT NULL COMMENT '候補ID',
  `trip_id` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '所属旅行ID',
  `candidate_type` enum('destination','spot','hotel','restaurant') COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '候補種別 destination=旅行先 spot=観光地 hotel=宿泊先 restaurant=食べたい物',
  `candidate_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '候補名',
  `description` text COLLATE utf8mb4_unicode_ci COMMENT '候補の説明文',
  `img_url` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '候補画像URL',
  `created_by` bigint NOT NULL COMMENT '候補を登録したユーザーID',
  `status` enum('candidate','selected','rejected') COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '候補状態 candidate=検討中 selected=採用 rejected=不採用',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '登録日時'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='旅行候補テーブル';

CREATE TABLE `trip_candidate_votes` (
  `vote_id` bigint NOT NULL COMMENT '候補投票ID',
  `candidate_id` bigint NOT NULL COMMENT '投票対象候補ID',
  `user_id` bigint NOT NULL COMMENT '投票したユーザーID',
  `vote_type` enum('like','dislike') COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '投票内容 like=賛成 dislike=反対',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '投票日時'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='候補投票テーブル';

CREATE TABLE `trip_date_candidates` (
  `candidate_id` bigint NOT NULL COMMENT '候補日ID',
  `trip_id` bigint NOT NULL COMMENT '旅行ID',
  `candidate_start_date` date DEFAULT NULL COMMENT '候補開始日',
  `candidate_end_date` date DEFAULT NULL COMMENT '候補終了日',
  `created_by` bigint DEFAULT NULL COMMENT '登録者',
  `created_at` datetime DEFAULT NULL COMMENT '登録日時'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `trip_date_votes` (
  `vote_id` bigint NOT NULL COMMENT '投票ID',
  `candidate_id` bigint NOT NULL COMMENT '対象候補日ID',
  `user_id` bigint NOT NULL COMMENT '投票ユーザー',
  `vote_type` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '投票結果（yes / maybe / no）',
  `voted_at` datetime DEFAULT NULL COMMENT '投票日時'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `trip_decisions` (
  `decision_id` bigint NOT NULL COMMENT '決定事項ID',
  `trip_id` bigint NOT NULL COMMENT '対象旅行ID',
  `decision_type` enum('destination','hotel','schedule','budget') COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '決定事項種別',
  `title` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '決定事項タイトル',
  `detail` text COLLATE utf8mb4_unicode_ci COMMENT '詳細内容',
  `decided_at` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '決定日時'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='旅行確定情報';

CREATE TABLE `trip_members` (
  `trip_member_id` bigint NOT NULL COMMENT '旅行参加レコードID',
  `trip_id` bigint NOT NULL COMMENT '旅行ID',
  `user_id` int NOT NULL,
  `participation_status` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '参加状態（joined / pending）',
  `joined_at` datetime DEFAULT NULL COMMENT '参加日時'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `trip_surveys` (
  `survey_id` bigint NOT NULL COMMENT 'アンケートID',
  `trip_id` bigint NOT NULL COMMENT '対象旅行ID',
  `title` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'アンケートタイトル',
  `candidate_type` enum('destination','spot','hotel','restaurant') COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '投票対象の候補カテゴリ',
  `created_by` bigint NOT NULL COMMENT '作成者ユーザーID',
  `deadline_at` datetime DEFAULT NULL COMMENT '回答締切日時',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '作成日時'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='アンケート';

CREATE TABLE `trip_survey_options` (
  `option_id` bigint NOT NULL COMMENT '選択肢ID',
  `survey_id` bigint NOT NULL COMMENT '対象アンケートID',
  `option_text` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '選択肢内容',
  `candidate_id` bigint DEFAULT NULL COMMENT '選択肢に紐づく旅行候補ID',
  `sort_order` int DEFAULT '0' COMMENT '表示順'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='アンケート選択肢';

CREATE TABLE `trip_survey_votes` (
  `vote_id` bigint NOT NULL COMMENT 'アンケート回答ID',
  `survey_id` bigint NOT NULL COMMENT 'アンケートID',
  `option_id` bigint NOT NULL COMMENT '選択した選択肢ID',
  `user_id` bigint NOT NULL COMMENT '回答者ユーザーID',
  `voted_at` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '回答日時'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='アンケート回答';

CREATE TABLE `users` (
  `user_id` int NOT NULL,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'ユーザーの表示名（アプリ内で表示される名前）',
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'ログイン用メールアドレス（一意制約で重複防止）',
  `password_hash` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'ハッシュ化されたパスワード（平文保存禁止）',
  `icon_url` text COLLATE utf8mb4_unicode_ci COMMENT 'プロフィール画像のURL（外部ストレージ参照）',
  `language_code` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT 'ja' COMMENT '言語設定（例: ja, en）',
  `status` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT 'active' COMMENT 'アカウント状態（active / suspended / deleted）',
  `created_at` datetime NOT NULL COMMENT '作成日時',
  `updated_at` datetime NOT NULL COMMENT '更新日時',
  `deleted_at` datetime DEFAULT NULL COMMENT '論理削除日時（NULLなら有効）'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `user_devices` (
  `device_id` bigint NOT NULL COMMENT 'デバイス識別ID',
  `user_id` bigint NOT NULL COMMENT '所有ユーザーID',
  `push_token` text COLLATE utf8mb4_unicode_ci COMMENT 'プッシュ通知用トークン',
  `platform` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'OS（iOS / Android / Web）',
  `last_login_at` datetime DEFAULT NULL COMMENT '最終ログイン日時'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `user_groups` (
  `group_id` bigint NOT NULL COMMENT 'グループID',
  `group_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'グループ名',
  `created_by` bigint NOT NULL COMMENT '作成ユーザーID',
  `description` text COLLATE utf8mb4_unicode_ci COMMENT 'グループ説明',
  `status` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT 'active' COMMENT '状態（active / archived）',
  `created_at` datetime NOT NULL COMMENT '作成日時',
  `updated_at` datetime NOT NULL COMMENT '更新日時'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `user_profiles` (
  `user_id` bigint NOT NULL COMMENT 'usersテーブルとの1対1紐付け',
  `nickname` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'ニックネーム（表示用・任意）',
  `birthday` date DEFAULT NULL COMMENT '生年月日（年齢計算などで使用）',
  `gender` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '性別（任意・未設定可）',
  `self_introduction` text COLLATE utf8mb4_unicode_ci COMMENT '自己紹介文',
  `country_code` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '国コード（例: JP, US）',
  `timezone` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'タイムゾーン（例: Asia/Tokyo）'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `user_roles` (
  `user_id` bigint NOT NULL COMMENT 'ユーザーID（rolesとの中間テーブル）',
  `role_id` bigint NOT NULL COMMENT '付与されるロールID'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ダンプしたテーブルのインデックス
--

--
-- テーブルのインデックス `admin_users`
--
ALTER TABLE `admin_users`
  ADD PRIMARY KEY (`admin_user_id`);

--
-- テーブルのインデックス `albums`
--
ALTER TABLE `albums`
  ADD PRIMARY KEY (`album_id`);

--
-- テーブルのインデックス `audit_logs`
--
ALTER TABLE `audit_logs`
  ADD PRIMARY KEY (`audit_log_id`);

--
-- テーブルのインデックス `chats`
--
ALTER TABLE `chats`
  ADD PRIMARY KEY (`chat_id`);

--
-- テーブルのインデックス `chat_members`
--
ALTER TABLE `chat_members`
  ADD PRIMARY KEY (`chat_member_id`);

--
-- テーブルのインデックス `checklists`
--
ALTER TABLE `checklists`
  ADD PRIMARY KEY (`checklist_id`);

--
-- テーブルのインデックス `checklist_items`
--
ALTER TABLE `checklist_items`
  ADD PRIMARY KEY (`checklist_item_id`);

--
-- テーブルのインデックス `expenses`
--
ALTER TABLE `expenses`
  ADD PRIMARY KEY (`expense_id`);

--
-- テーブルのインデックス `expense_participants`
--
ALTER TABLE `expense_participants`
  ADD PRIMARY KEY (`expense_participant_id`);

--
-- テーブルのインデックス `group_invitations`
--
ALTER TABLE `group_invitations`
  ADD PRIMARY KEY (`invitation_id`);

--
-- テーブルのインデックス `group_members`
--
ALTER TABLE `group_members`
  ADD PRIMARY KEY (`group_member_id`);

--
-- テーブルのインデックス `itineraries`
--
ALTER TABLE `itineraries`
  ADD PRIMARY KEY (`itinerary_id`);

--
-- テーブルのインデックス `itinerary_items`
--
ALTER TABLE `itinerary_items`
  ADD PRIMARY KEY (`itinerary_item_id`);

--
-- テーブルのインデックス `messages`
--
ALTER TABLE `messages`
  ADD PRIMARY KEY (`message_id`);

--
-- テーブルのインデックス `message_reads`
--
ALTER TABLE `message_reads`
  ADD PRIMARY KEY (`message_read_id`);

--
-- テーブルのインデックス `photos`
--
ALTER TABLE `photos`
  ADD PRIMARY KEY (`photo_id`);

--
-- テーブルのインデックス `photo_tags`
--
ALTER TABLE `photo_tags`
  ADD PRIMARY KEY (`photo_tag_id`);

--
-- テーブルのインデックス `roles`
--
ALTER TABLE `roles`
  ADD PRIMARY KEY (`role_id`);

--
-- テーブルのインデックス `settlements`
--
ALTER TABLE `settlements`
  ADD PRIMARY KEY (`settlement_id`);

--
-- テーブルのインデックス `system_settings`
--
ALTER TABLE `system_settings`
  ADD PRIMARY KEY (`setting_key`);

--
-- テーブルのインデックス `trips`
--
ALTER TABLE `trips`
  ADD PRIMARY KEY (`trip_id`);

--
-- テーブルのインデックス `trip_candidates`
--
ALTER TABLE `trip_candidates`
  ADD PRIMARY KEY (`candidate_id`);

--
-- テーブルのインデックス `trip_candidate_votes`
--
ALTER TABLE `trip_candidate_votes`
  ADD PRIMARY KEY (`vote_id`);

--
-- テーブルのインデックス `trip_date_candidates`
--
ALTER TABLE `trip_date_candidates`
  ADD PRIMARY KEY (`candidate_id`);

--
-- テーブルのインデックス `trip_date_votes`
--
ALTER TABLE `trip_date_votes`
  ADD PRIMARY KEY (`vote_id`);

--
-- テーブルのインデックス `trip_decisions`
--
ALTER TABLE `trip_decisions`
  ADD PRIMARY KEY (`decision_id`);

--
-- テーブルのインデックス `trip_members`
--
ALTER TABLE `trip_members`
  ADD PRIMARY KEY (`trip_member_id`),
  ADD UNIQUE KEY `uq_trip_members_trip_user` (`trip_id`,`user_id`),
  ADD KEY `idx_trip_members_trip_id` (`trip_id`),
  ADD KEY `idx_trip_members_user_id` (`user_id`);

--
-- テーブルのインデックス `trip_surveys`
--
ALTER TABLE `trip_surveys`
  ADD PRIMARY KEY (`survey_id`);

--
-- テーブルのインデックス `trip_survey_options`
--
ALTER TABLE `trip_survey_options`
  ADD PRIMARY KEY (`option_id`),
  ADD KEY `idx_trip_survey_options_candidate_id` (`candidate_id`);

--
-- テーブルのインデックス `trip_survey_votes`
--
ALTER TABLE `trip_survey_votes`
  ADD PRIMARY KEY (`vote_id`);

--
-- テーブルのインデックス `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`user_id`),
  ADD UNIQUE KEY `email` (`email`);

--
-- テーブルのインデックス `user_devices`
--
ALTER TABLE `user_devices`
  ADD PRIMARY KEY (`device_id`);

--
-- テーブルのインデックス `user_groups`
--
ALTER TABLE `user_groups`
  ADD PRIMARY KEY (`group_id`);

--
-- テーブルのインデックス `user_profiles`
--
ALTER TABLE `user_profiles`
  ADD PRIMARY KEY (`user_id`);

--
-- テーブルのインデックス `user_roles`
--
ALTER TABLE `user_roles`
  ADD PRIMARY KEY (`user_id`,`role_id`) COMMENT '同一ユーザーへの重複ロール付与防止';

--

-- 単一IDを持つテーブルをAUTO_INCREMENT化します。
ALTER TABLE `admin_users` MODIFY `admin_user_id` bigint NOT NULL AUTO_INCREMENT COMMENT '管理者ID';
ALTER TABLE `albums` MODIFY `album_id` bigint NOT NULL AUTO_INCREMENT COMMENT 'アルバムID';
ALTER TABLE `audit_logs` MODIFY `audit_log_id` bigint NOT NULL AUTO_INCREMENT COMMENT '監査ログID';
ALTER TABLE `chats` MODIFY `chat_id` bigint NOT NULL AUTO_INCREMENT COMMENT 'チャットID';
ALTER TABLE `chat_members` MODIFY `chat_member_id` bigint NOT NULL AUTO_INCREMENT COMMENT 'チャット参加ID';
ALTER TABLE `checklists` MODIFY `checklist_id` bigint NOT NULL AUTO_INCREMENT COMMENT 'チェックリストID';
ALTER TABLE `checklist_items` MODIFY `checklist_item_id` bigint NOT NULL AUTO_INCREMENT COMMENT '項目ID';
ALTER TABLE `expenses` MODIFY `expense_id` bigint NOT NULL AUTO_INCREMENT COMMENT '支払いID';
ALTER TABLE `expense_participants` MODIFY `expense_participant_id` bigint NOT NULL AUTO_INCREMENT COMMENT '負担者ID';
ALTER TABLE `group_invitations` MODIFY `invitation_id` bigint NOT NULL AUTO_INCREMENT COMMENT '招待ID';
ALTER TABLE `group_members` MODIFY `group_member_id` bigint NOT NULL AUTO_INCREMENT COMMENT 'グループ所属レコードID';
ALTER TABLE `itineraries` MODIFY `itinerary_id` bigint NOT NULL AUTO_INCREMENT COMMENT '旅程ID（1日単位の行程）';
ALTER TABLE `itinerary_items` MODIFY `itinerary_item_id` bigint NOT NULL AUTO_INCREMENT COMMENT '行程項目ID';
ALTER TABLE `messages` MODIFY `message_id` bigint NOT NULL AUTO_INCREMENT COMMENT 'メッセージID';
ALTER TABLE `message_reads` MODIFY `message_read_id` bigint NOT NULL AUTO_INCREMENT COMMENT '既読管理ID';
ALTER TABLE `photos` MODIFY `photo_id` bigint NOT NULL AUTO_INCREMENT COMMENT '写真ID';
ALTER TABLE `photo_tags` MODIFY `photo_tag_id` bigint NOT NULL AUTO_INCREMENT COMMENT 'タグID';
ALTER TABLE `roles` MODIFY `role_id` bigint NOT NULL AUTO_INCREMENT COMMENT 'ロールID（権限の種類を識別）';
ALTER TABLE `settlements` MODIFY `settlement_id` bigint NOT NULL AUTO_INCREMENT COMMENT '精算ID';
ALTER TABLE `trips` MODIFY `trip_id` bigint NOT NULL AUTO_INCREMENT COMMENT '旅行ID';
ALTER TABLE `trip_candidates` MODIFY `candidate_id` bigint NOT NULL AUTO_INCREMENT COMMENT '候補ID';
ALTER TABLE `trip_candidate_votes` MODIFY `vote_id` bigint NOT NULL AUTO_INCREMENT COMMENT '候補投票ID';
ALTER TABLE `trip_date_candidates` MODIFY `candidate_id` bigint NOT NULL AUTO_INCREMENT COMMENT '候補日ID';
ALTER TABLE `trip_date_votes` MODIFY `vote_id` bigint NOT NULL AUTO_INCREMENT COMMENT '投票ID';
ALTER TABLE `trip_decisions` MODIFY `decision_id` bigint NOT NULL AUTO_INCREMENT COMMENT '決定事項ID';
ALTER TABLE `trip_members` MODIFY `trip_member_id` bigint NOT NULL AUTO_INCREMENT COMMENT '旅行参加レコードID';
ALTER TABLE `trip_surveys` MODIFY `survey_id` bigint NOT NULL AUTO_INCREMENT COMMENT 'アンケートID';
ALTER TABLE `trip_survey_options` MODIFY `option_id` bigint NOT NULL AUTO_INCREMENT COMMENT '選択肢ID';
ALTER TABLE `trip_survey_votes` MODIFY `vote_id` bigint NOT NULL AUTO_INCREMENT COMMENT 'アンケート回答ID';
ALTER TABLE `user_devices` MODIFY `device_id` bigint NOT NULL AUTO_INCREMENT COMMENT 'デバイス識別ID';
ALTER TABLE `user_groups` MODIFY `group_id` bigint NOT NULL AUTO_INCREMENT COMMENT 'グループID';
ALTER TABLE `users` MODIFY `user_id` int NOT NULL AUTO_INCREMENT;

ALTER TABLE `admin_users` AUTO_INCREMENT = 1;
ALTER TABLE `albums` AUTO_INCREMENT = 1;
ALTER TABLE `audit_logs` AUTO_INCREMENT = 1;
ALTER TABLE `chats` AUTO_INCREMENT = 1;
ALTER TABLE `chat_members` AUTO_INCREMENT = 1;
ALTER TABLE `checklists` AUTO_INCREMENT = 1;
ALTER TABLE `checklist_items` AUTO_INCREMENT = 1;
ALTER TABLE `expenses` AUTO_INCREMENT = 1;
ALTER TABLE `expense_participants` AUTO_INCREMENT = 1;
ALTER TABLE `group_invitations` AUTO_INCREMENT = 1;
ALTER TABLE `group_members` AUTO_INCREMENT = 1;
ALTER TABLE `itineraries` AUTO_INCREMENT = 1;
ALTER TABLE `itinerary_items` AUTO_INCREMENT = 1;
ALTER TABLE `messages` AUTO_INCREMENT = 1;
ALTER TABLE `message_reads` AUTO_INCREMENT = 1;
ALTER TABLE `photos` AUTO_INCREMENT = 1;
ALTER TABLE `photo_tags` AUTO_INCREMENT = 1;
ALTER TABLE `roles` AUTO_INCREMENT = 1;
ALTER TABLE `settlements` AUTO_INCREMENT = 1;
ALTER TABLE `trips` AUTO_INCREMENT = 1;
ALTER TABLE `trip_candidates` AUTO_INCREMENT = 1;
ALTER TABLE `trip_candidate_votes` AUTO_INCREMENT = 1;
ALTER TABLE `trip_date_candidates` AUTO_INCREMENT = 1;
ALTER TABLE `trip_date_votes` AUTO_INCREMENT = 1;
ALTER TABLE `trip_decisions` AUTO_INCREMENT = 1;
ALTER TABLE `trip_members` AUTO_INCREMENT = 1;
ALTER TABLE `trip_surveys` AUTO_INCREMENT = 1;
ALTER TABLE `trip_survey_options` AUTO_INCREMENT = 1;
ALTER TABLE `trip_survey_votes` AUTO_INCREMENT = 1;
ALTER TABLE `user_devices` AUTO_INCREMENT = 1;
ALTER TABLE `user_groups` AUTO_INCREMENT = 1;
ALTER TABLE `users` AUTO_INCREMENT = 1;

-- users: 画像内のメールアドレスを重複なしで登録します。
-- パスワードはテスト用として全員「2024gakusei」に統一しています。
INSERT INTO `users`
  (`name`, `email`, `password_hash`, `icon_url`, `language_code`, `status`, `created_at`, `updated_at`, `deleted_at`)
VALUES
  ('石垣大斗', '2410026@i-seifu.jp', '2024gakusei', NULL, 'ja', 'active', '2026-06-17 14:40:41', '2026-06-22 15:00:00', NULL),
  ('山口歩希', '2410041@i-seifu.jp', '2024gakusei', NULL, 'ja', 'active', '2026-06-22 15:00:00', '2026-06-22 15:00:00', NULL),
  ('福島心人', '2410008@i-seifu.jp', '2024gakusei', NULL, 'ja', 'active', '2026-06-22 15:00:00', '2026-06-22 15:00:00', NULL),
  ('寺川慎哉', '2410017@i-seifu.jp', '2024gakusei', NULL, 'ja', 'active', '2026-06-17 15:51:36', '2026-06-22 15:00:00', NULL),
  ('小野絃輝', '2410019@i-seifu.jp', '2024gakusei', NULL, 'ja', 'active', '2026-06-22 15:00:00', '2026-06-22 15:00:00', NULL),
  ('田中煌', '2410027@i-seifu.jp', '2024gakusei', NULL, 'ja', 'active', '2026-06-22 15:00:00', '2026-06-22 15:00:00', NULL),
  ('志田真人', '2410056@i-seifu.jp', '2024gakusei', NULL, 'ja', 'active', '2026-06-22 15:00:00', '2026-06-22 15:00:00', NULL);

INSERT INTO `roles` (`role_name`) VALUES
  ('admin'),
  ('user'),
  ('moderator');

INSERT INTO `user_profiles`
  (`user_id`, `nickname`, `birthday`, `gender`, `self_introduction`, `country_code`, `timezone`)
VALUES
  (1, '大斗', NULL, NULL, '旅行全体の管理を担当します。', 'JP', 'Asia/Tokyo'),
  (2, '歩希', NULL, NULL, '旅行プランの編集を担当します。', 'JP', 'Asia/Tokyo'),
  (3, '心人', NULL, NULL, '観光スポット探しを担当します。', 'JP', 'Asia/Tokyo'),
  (4, '慎哉', NULL, NULL, 'チャットと候補管理を担当します。', 'JP', 'Asia/Tokyo'),
  (5, '絃輝', NULL, NULL, 'スポット情報の管理を担当します。', 'JP', 'Asia/Tokyo'),
  (6, '煌', NULL, NULL, 'スケジュール確認を担当します。', 'JP', 'Asia/Tokyo'),
  (7, '真人', NULL, NULL, '旅行費用の確認を担当します。', 'JP', 'Asia/Tokyo');

INSERT INTO `user_roles` (`user_id`, `role_id`) VALUES
  (1, 1),
  (1, 2),
  (2, 2),
  (3, 2),
  (4, 2),
  (5, 2),
  (6, 2),
  (7, 2);

INSERT INTO `user_devices` (`user_id`, `push_token`, `platform`, `last_login_at`) VALUES
  (1, 'test_web_push_2410026', 'Web', '2026-06-22 15:00:00'),
  (2, 'test_web_push_2410041', 'Web', '2026-06-22 15:00:00'),
  (3, 'test_web_push_2410008', 'Web', '2026-06-22 15:00:00'),
  (4, 'test_web_push_2410017', 'Web', '2026-06-22 15:00:00'),
  (5, 'test_web_push_2410019', 'Web', '2026-06-22 15:00:00'),
  (6, 'test_web_push_2410027', 'Web', '2026-06-22 15:00:00'),
  (7, 'test_web_push_2410056', 'Web', '2026-06-22 15:00:00');

INSERT INTO `admin_users` (`user_id`, `admin_level`, `created_at`) VALUES
  (1, 9, '2026-06-16 17:40:00');

INSERT INTO `user_groups`
  (`group_name`, `created_by`, `description`, `status`, `created_at`, `updated_at`)
VALUES
  ('三重旅行メンバー', 1, '伊勢・鳥羽を巡る2泊3日の旅行グループです。', 'active', '2026-06-18 10:00:00', '2026-06-22 09:00:00'),
  ('京都日帰り旅', 2, '京都の寺社とカフェを巡る日帰り旅行です。', 'active', '2026-06-19 13:00:00', '2026-06-21 18:00:00');

INSERT INTO `group_members`
  (`group_id`, `user_id`, `role_in_group`, `joined_at`, `invitation_status`)
VALUES
  (1, 1, 'admin', '2026-06-18 10:00:00', 'accepted'),
  (1, 2, 'member', '2026-06-18 10:10:00', 'accepted'),
  (1, 3, 'member', '2026-06-18 10:15:00', 'accepted'),
  (1, 4, 'member', '2026-06-18 10:20:00', 'accepted'),
  (1, 5, 'member', '2026-06-18 10:25:00', 'accepted'),
  (1, 6, 'member', '2026-06-18 10:30:00', 'accepted'),
  (1, 7, 'member', '2026-06-18 10:35:00', 'accepted'),
  (2, 2, 'admin', '2026-06-19 13:00:00', 'accepted'),
  (2, 1, 'member', '2026-06-19 13:20:00', 'accepted');

INSERT INTO `group_invitations`
  (`group_id`, `invited_by`, `invited_user_id`, `invitation_token`, `status`, `expired_at`, `created_at`)
VALUES
  (1, 1, 2, 'test-invite-mie-hiroto-001', 'accepted', '2026-06-25 23:59:59', '2026-06-18 10:05:00'),
  (1, 1, 3, 'test-invite-mie-metax-001', 'accepted', '2026-06-25 23:59:59', '2026-06-18 10:06:00'),
  (2, 2, 3, 'test-invite-kyoto-metax-001', 'pending', '2026-06-28 23:59:59', '2026-06-21 12:00:00');

INSERT INTO `trips`
  (`group_id`, `title`, `description`, `start_date`, `end_date`, `destination_summary`, `status`, `created_by`, `created_at`, `updated_at`)
VALUES
  (1, '三重旅行', '伊勢神宮、鳥羽水族館、温泉を楽しむ2泊3日の旅行です。', '2026-08-20', '2026-08-22', '三重県 伊勢・鳥羽エリア', 'voting', 1, '2026-06-18 10:30:00', '2026-06-22 09:00:00'),
  (2, '京都日帰り旅行', '清水寺と祇園周辺を巡る日帰り旅行です。', '2026-09-12', '2026-09-12', '京都市東山区・中京区', 'draft', 2, '2026-06-19 14:00:00', '2026-06-21 18:00:00');

INSERT INTO `trip_members` (`trip_id`, `user_id`, `participation_status`, `joined_at`) VALUES
  (1, 1, 'joined', '2026-06-18 10:30:00'),
  (1, 2, 'joined', '2026-06-18 10:35:00'),
  (1, 3, 'joined', '2026-06-18 10:40:00'),
  (1, 4, 'joined', '2026-06-18 10:45:00'),
  (1, 5, 'joined', '2026-06-18 10:50:00'),
  (1, 6, 'joined', '2026-06-18 10:55:00'),
  (1, 7, 'joined', '2026-06-18 11:00:00'),
  (2, 2, 'joined', '2026-06-19 14:00:00'),
  (2, 1, 'joined', '2026-06-19 14:10:00');

INSERT INTO `trip_candidates`
  (`trip_id`, `candidate_type`, `candidate_name`, `description`, `img_url`, `created_by`, `status`, `created_at`)
VALUES
  ('1', 'destination', '三重県（伊勢・鳥羽エリア）', '伊勢神宮や鳥羽水族館、海の幸も楽しめる旅行先です。', NULL, 1, 'selected', '2026-06-18 11:00:00'),
  ('1', 'destination', '三重県（志摩エリア）', '英虞湾の景色とリゾートを楽しめるエリアです。', NULL, 2, 'candidate', '2026-06-18 11:10:00'),
  ('1', 'spot', '伊勢神宮', '内宮・外宮を巡る三重旅行の定番スポットです。', 'https://images.unsplash.com/photo-1627575191507-6a4a0619a909?auto=format&fit=crop&w=800&q=80', 2, 'candidate', '2026-06-18 11:20:00'),
  ('1', 'spot', '鳥羽水族館', 'ジュゴンやラッコで有名な水族館です。', 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=800&q=80', 3, 'candidate', '2026-06-18 11:30:00'),
  ('1', 'hotel', '鳥羽シーサイドホテル', '海を眺められる温泉付きホテルです。', NULL, 1, 'candidate', '2026-06-18 11:40:00'),
  ('1', 'restaurant', '伊勢うどん 山口屋', '伊勢うどんを味わえる老舗です。', NULL, 3, 'candidate', '2026-06-18 11:50:00'),
  ('2', 'destination', '京都府（東山エリア）', '清水寺や祇園を徒歩で巡れます。', NULL, 2, 'candidate', '2026-06-19 15:00:00');

-- 候補投票は初期状態を空にし、各ユーザーが画面から投票します。

INSERT INTO `trip_date_candidates`
  (`trip_id`, `candidate_start_date`, `candidate_end_date`, `created_by`, `created_at`)
VALUES
  (1, '2026-08-20', '2026-08-22', 1, '2026-06-18 13:00:00'),
  (1, '2026-08-27', '2026-08-29', 2, '2026-06-18 13:05:00'),
  (2, '2026-09-12', '2026-09-12', 2, '2026-06-19 15:30:00');

INSERT INTO `trip_date_votes` (`candidate_id`, `user_id`, `vote_type`, `voted_at`) VALUES
  (1, 1, 'yes', '2026-06-18 14:00:00'),
  (1, 2, 'yes', '2026-06-18 14:05:00'),
  (1, 3, 'maybe', '2026-06-18 14:10:00'),
  (2, 1, 'maybe', '2026-06-18 14:15:00'),
  (2, 2, 'no', '2026-06-18 14:20:00'),
  (3, 1, 'yes', '2026-06-19 16:00:00'),
  (3, 2, 'yes', '2026-06-19 16:05:00');

INSERT INTO `trip_decisions`
  (`trip_id`, `decision_type`, `title`, `detail`, `decided_at`)
VALUES
  (1, 'destination', '旅行先を伊勢・鳥羽に決定', '伊勢神宮と鳥羽水族館を中心に巡ります。', '2026-06-20 18:00:00'),
  (1, 'schedule', '旅行日程を決定', '2026年8月20日から8月22日までの2泊3日です。', '2026-06-20 18:10:00'),
  (1, 'budget', '予算上限を決定', '交通費と宿泊費を含めて1人5万円を目安にします。', '2026-06-20 18:20:00');

-- アンケートは投票タブの「作成」ボタンから登録します。

INSERT INTO `chats`
  (`trip_id`, `chat_type`, `related_entity_type`, `related_entity_id`, `created_at`)
VALUES
  (1, 'group', NULL, NULL, '2026-06-18 10:30:00'),
  (1, 'hotel', 'hotel', 5, '2026-06-20 12:00:00'),
  (2, 'group', NULL, NULL, '2026-06-19 14:00:00');

INSERT INTO `chat_members` (`chat_id`, `user_id`, `joined_at`) VALUES
  (1, 1, '2026-06-18 10:30:00'),
  (1, 2, '2026-06-18 10:35:00'),
  (1, 3, '2026-06-18 10:40:00'),
  (1, 4, '2026-06-18 10:45:00'),
  (1, 5, '2026-06-18 10:50:00'),
  (1, 6, '2026-06-18 10:55:00'),
  (1, 7, '2026-06-18 11:00:00'),
  (2, 1, '2026-06-20 12:00:00'),
  (2, 2, '2026-06-20 12:00:00'),
  (3, 1, '2026-06-19 14:10:00'),
  (3, 2, '2026-06-19 14:00:00');

INSERT INTO `messages` (`chat_id`, `sender_user_id`, `body`, `sent_at`) VALUES
  (1, 1, '三重旅行、伊勢神宮は外せないよね！', '2026-06-18 16:00:00'),
  (1, 2, '鳥羽水族館にも行きたいです。', '2026-06-18 16:02:00'),
  (1, 3, '宿は温泉付きで探してみます。', '2026-06-18 16:05:00'),
  (1, 1, '予算は1人5万円くらいを目安にしよう。', '2026-06-18 16:10:00'),
  (2, 2, '3名で宿泊予定です。空室を確認したいです。', '2026-06-20 12:10:00'),
  (3, 2, '京都は清水寺から回るのはどう？', '2026-06-19 18:00:00'),
  (3, 1, '賛成！午後は祇園でカフェに行きたい。', '2026-06-19 18:05:00');

INSERT INTO `message_reads` (`message_id`, `user_id`, `read_at`) VALUES
  (1, 2, '2026-06-18 16:01:00'),
  (1, 3, '2026-06-18 16:01:30'),
  (2, 1, '2026-06-18 16:03:00'),
  (2, 3, '2026-06-18 16:03:30'),
  (3, 1, '2026-06-18 16:06:00'),
  (3, 2, '2026-06-18 16:06:30'),
  (4, 2, '2026-06-18 16:11:00'),
  (4, 3, '2026-06-18 16:11:30'),
  (6, 1, '2026-06-19 18:01:00'),
  (7, 2, '2026-06-19 18:06:00');

INSERT INTO `itineraries` (`trip_id`, `itinerary_date`, `title`, `note`) VALUES
  (1, '2026-08-20', '1日目 伊勢', '伊勢神宮とおかげ横丁を巡ります。'),
  (1, '2026-08-21', '2日目 鳥羽', '鳥羽水族館と海沿いを観光します。'),
  (1, '2026-08-22', '3日目 帰宅', '朝食後にお土産を購入して帰ります。'),
  (2, '2026-09-12', '京都日帰り', '清水寺、祇園、伏見稲荷を巡ります。');

INSERT INTO `itinerary_items`
  (`itinerary_id`, `item_type`, `place_id`, `start_time`, `end_time`, `order_no`, `memo`)
VALUES
  (1, 'move', NULL, '2026-08-20 08:00:00', '2026-08-20 10:00:00', 1, '近鉄特急で伊勢市駅へ移動'),
  (1, 'visit', 3, '2026-08-20 10:30:00', '2026-08-20 12:30:00', 2, '伊勢神宮 外宮・内宮を参拝'),
  (1, 'meal', 6, '2026-08-20 13:00:00', '2026-08-20 14:00:00', 3, '伊勢うどんを食べる'),
  (1, 'hotel', 5, '2026-08-20 17:00:00', '2026-08-20 18:00:00', 4, 'ホテルへチェックイン'),
  (2, 'visit', 4, '2026-08-21 10:00:00', '2026-08-21 14:00:00', 1, '鳥羽水族館を見学'),
  (2, 'free_time', NULL, '2026-08-21 15:00:00', '2026-08-21 17:00:00', 2, '鳥羽駅周辺で自由行動'),
  (4, 'visit', 7, '2026-09-12 09:30:00', '2026-09-12 11:30:00', 1, '清水寺周辺を散策');

INSERT INTO `checklists` (`trip_id`, `checklist_type`, `title`, `created_by`) VALUES
  (1, '持ち物', '三重旅行の持ち物', 1),
  (1, '買い物', '旅行前に買うもの', 2),
  (2, '持ち物', '京都日帰りの持ち物', 2);

INSERT INTO `checklist_items`
  (`checklist_id`, `item_name`, `is_checked`, `assigned_user_id`, `sort_order`)
VALUES
  (1, 'モバイルバッテリー', 1, 1, 1),
  (1, '折りたたみ傘', 0, 2, 2),
  (1, '常備薬', 0, 3, 3),
  (1, '着替え2日分', 1, 1, 4),
  (2, 'お菓子と飲み物', 0, 2, 1),
  (2, '旅行用シャンプー', 0, 3, 2),
  (3, '歩きやすい靴', 1, 2, 1);

INSERT INTO `expenses`
  (`trip_id`, `paid_by_user_id`, `title`, `amount`, `expense_date`, `category`, `memo`)
VALUES
  (1, 1, 'ホテル予約金', 30000.00, '2026-06-20', '宿泊', '3名分の予約金'),
  (1, 2, '近鉄特急券', 12600.00, '2026-06-21', '交通', '往路3名分'),
  (1, 3, '水族館前売り券', 8400.00, '2026-06-22', '観光', '大人3名分'),
  (2, 2, '京都までの電車代', 3200.00, '2026-09-12', '交通', '2名分');

INSERT INTO `expense_participants`
  (`expense_id`, `user_id`, `share_ratio`, `share_amount`, `is_settled`)
VALUES
  (1, 1, 33.33, 10000.00, 1),
  (1, 2, 33.33, 10000.00, 0),
  (1, 3, 33.34, 10000.00, 0),
  (2, 1, 33.33, 4200.00, 0),
  (2, 2, 33.33, 4200.00, 1),
  (2, 3, 33.34, 4200.00, 0),
  (3, 1, 33.33, 2800.00, 0),
  (3, 2, 33.33, 2800.00, 0),
  (3, 3, 33.34, 2800.00, 1),
  (4, 1, 50.00, 1600.00, 0),
  (4, 2, 50.00, 1600.00, 1);

INSERT INTO `settlements`
  (`trip_id`, `from_user_id`, `to_user_id`, `amount`, `status`, `settled_at`, `created_at`)
VALUES
  (1, 2, 1, 10000.00, 'pending', NULL, '2026-06-22 10:00:00'),
  (1, 3, 1, 10000.00, 'pending', NULL, '2026-06-22 10:01:00'),
  (1, 1, 2, 4200.00, 'completed', '2026-06-22 11:00:00', '2026-06-22 10:02:00'),
  (1, 3, 2, 4200.00, 'pending', NULL, '2026-06-22 10:03:00'),
  (2, 1, 2, 1600.00, 'pending', NULL, '2026-09-12 18:00:00');

INSERT INTO `albums` (`trip_id`, `title`, `created_by`, `created_at`) VALUES
  (1, '三重旅行アルバム', 1, '2026-08-20 20:00:00'),
  (2, '京都日帰りアルバム', 2, '2026-09-12 20:00:00');

INSERT INTO `photos` (`album_id`, `uploaded_by`, `file_url`, `caption`, `shot_at`) VALUES
  (1, 1, 'https://images.unsplash.com/photo-1627575191507-6a4a0619a909?auto=format&fit=crop&w=1200&q=80', '伊勢神宮で集合', '2026-08-20 11:30:00'),
  (1, 2, 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=1200&q=80', '鳥羽水族館の水槽', '2026-08-21 12:00:00'),
  (1, 3, 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80', '鳥羽の海', '2026-08-21 16:00:00'),
  (2, 2, 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=1200&q=80', '京都の街並み', '2026-09-12 15:00:00');

INSERT INTO `photo_tags` (`photo_id`, `tagged_user_id`) VALUES
  (1, 1),
  (1, 2),
  (1, 3),
  (2, 2),
  (2, 3),
  (3, 1),
  (4, 1),
  (4, 2);

INSERT INTO `audit_logs`
  (`actor_user_id`, `action_type`, `target_table`, `target_id`, `created_at`)
VALUES
  (1, 'CREATE', 'user_groups', 1, '2026-06-18 10:00:00'),
  (1, 'CREATE', 'trips', 1, '2026-06-18 10:30:00'),
  (2, 'CREATE', 'trip_candidates', 3, '2026-06-18 11:20:00'),
  (1, 'UPDATE', 'trip_decisions', 1, '2026-06-20 18:00:00'),
  (3, 'CREATE', 'expenses', 3, '2026-06-22 09:30:00');

INSERT INTO `system_settings` (`setting_key`, `setting_value`, `updated_at`) VALUES
  ('default_language', 'ja', '2026-06-22 09:00:00'),
  ('max_upload_size_mb', '20', '2026-06-22 09:00:00'),
  ('ranking_cache_enabled', 'true', '2026-06-22 09:00:00'),
  ('review_requires_visit_confirmation', 'true', '2026-06-22 09:00:00'),
  ('test_data_version', '2026-06-22-v1', '2026-06-22 09:00:00');

ALTER TABLE `trip_members`
  ADD CONSTRAINT `fk_trip_members_trip` FOREIGN KEY (`trip_id`) REFERENCES `trips` (`trip_id`),
  ADD CONSTRAINT `fk_trip_members_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`);

SET FOREIGN_KEY_CHECKS = 1;
