-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- ホスト: mysql327.phy.lolipop.lan
-- 生成日時: 2026 年 6 月 18 日 13:32
-- サーバのバージョン： 8.0.35
-- PHP のバージョン: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- データベース: `LAA1658851-web`
--

-- --------------------------------------------------------

--
-- テーブルの構造 `admin_users`
--

CREATE TABLE `admin_users` (
  `admin_user_id` bigint NOT NULL COMMENT '管理者ID',
  `user_id` bigint NOT NULL COMMENT 'ユーザーID（usersと紐付け）',
  `admin_level` int DEFAULT NULL COMMENT '権限レベル（例: 1=一般管理者, 9=スーパー管理者）',
  `created_at` datetime DEFAULT NULL COMMENT '登録日時'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- テーブルのデータのダンプ `admin_users`
--

INSERT INTO `admin_users` (`admin_user_id`, `user_id`, `admin_level`, `created_at`) VALUES
(1, 1, 9, '2026-04-01 09:30:00'),
(2, 4, 1, '2026-04-10 13:00:00');

-- --------------------------------------------------------

--
-- テーブルの構造 `albums`
--

CREATE TABLE `albums` (
  `album_id` bigint NOT NULL COMMENT 'アルバムID',
  `trip_id` bigint DEFAULT NULL COMMENT '旅行ID',
  `title` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'アルバム名',
  `created_by` bigint DEFAULT NULL COMMENT '作成者',
  `created_at` datetime DEFAULT NULL COMMENT '作成日時'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- テーブルのデータのダンプ `albums`
--

INSERT INTO `albums` (`album_id`, `trip_id`, `title`, `created_by`, `created_at`) VALUES
(1, 1, '大阪・京都旅行アルバム', 2, '2026-08-01 21:00:00'),
(2, 2, '有馬温泉旅行アルバム', 4, '2026-09-12 21:30:00');

-- --------------------------------------------------------

--
-- テーブルの構造 `audit_logs`
--

CREATE TABLE `audit_logs` (
  `audit_log_id` bigint NOT NULL COMMENT '監査ログID',
  `actor_user_id` bigint DEFAULT NULL COMMENT '操作ユーザー',
  `action_type` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '操作内容（更新/削除など）',
  `target_table` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '対象テーブル',
  `target_id` bigint DEFAULT NULL COMMENT '対象レコードID',
  `created_at` datetime DEFAULT NULL COMMENT '実行日時'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- テーブルのデータのダンプ `audit_logs`
--

INSERT INTO `audit_logs` (`audit_log_id`, `actor_user_id`, `action_type`, `target_table`, `target_id`, `created_at`) VALUES
(1, 1, 'CREATE', 'trips', 1, '2026-04-06 09:00:00'),
(2, 1, 'UPDATE', 'trips', 1, '2026-04-21 18:00:00'),
(3, 2, 'CREATE', 'expenses', 2, '2026-07-25 10:00:00'),
(4, 1, 'REVIEW_APPROVE', 'reviews', 1, '2026-08-04 09:00:00');

-- --------------------------------------------------------

--
-- テーブルの構造 `chats`
--

CREATE TABLE `chats` (
  `chat_id` bigint NOT NULL COMMENT 'チャットID',
  `trip_id` bigint DEFAULT NULL COMMENT '紐づく旅行ID',
  `chat_type` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '種別（group / hotel / support）',
  `related_entity_type` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '関連エンティティ種別（hotel等）',
  `related_entity_id` bigint DEFAULT NULL COMMENT '関連エンティティID',
  `created_at` datetime DEFAULT NULL COMMENT '作成日時'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- テーブルのデータのダンプ `chats`
--

INSERT INTO `chats` (`chat_id`, `trip_id`, `chat_type`, `related_entity_type`, `related_entity_id`, `created_at`) VALUES
(1, 1, 'group', 'trip', 1, '2026-04-06 09:05:00'),
(2, 1, 'hotel', 'hotel', 101, '2026-07-20 11:00:00'),
(3, 2, 'group', 'trip', 2, '2026-04-13 14:05:00');

-- --------------------------------------------------------

--
-- テーブルの構造 `chat_members`
--

CREATE TABLE `chat_members` (
  `chat_member_id` bigint NOT NULL COMMENT 'チャット参加ID',
  `chat_id` bigint NOT NULL COMMENT 'チャットID',
  `user_id` bigint NOT NULL COMMENT '参加ユーザー',
  `joined_at` datetime DEFAULT NULL COMMENT '参加日時'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- テーブルのデータのダンプ `chat_members`
--

INSERT INTO `chat_members` (`chat_member_id`, `chat_id`, `user_id`, `joined_at`) VALUES
(1, 1, 1, '2026-04-06 09:05:00'),
(2, 1, 2, '2026-04-06 09:07:00'),
(3, 1, 3, '2026-04-06 09:08:00'),
(4, 2, 1, '2026-07-20 11:00:00'),
(5, 2, 2, '2026-07-20 11:05:00'),
(6, 3, 2, '2026-04-13 14:05:00'),
(7, 3, 4, '2026-04-13 14:40:00');

-- --------------------------------------------------------

--
-- テーブルの構造 `checklists`
--

CREATE TABLE `checklists` (
  `checklist_id` bigint NOT NULL COMMENT 'チェックリストID',
  `trip_id` bigint DEFAULT NULL COMMENT '旅行ID',
  `checklist_type` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '種類（持ち物 / 買い物）',
  `title` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'タイトル',
  `created_by` bigint DEFAULT NULL COMMENT '作成者'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- テーブルのデータのダンプ `checklists`
--

INSERT INTO `checklists` (`checklist_id`, `trip_id`, `checklist_type`, `title`, `created_by`) VALUES
(1, 1, '持ち物', '大阪・京都旅行の持ち物リスト', 1),
(2, 1, '買い物', '出発前に買うもの', 2),
(3, 2, '持ち物', '有馬温泉旅行の持ち物リスト', 2);

-- --------------------------------------------------------

--
-- テーブルの構造 `checklist_items`
--

CREATE TABLE `checklist_items` (
  `checklist_item_id` bigint NOT NULL COMMENT '項目ID',
  `checklist_id` bigint DEFAULT NULL COMMENT 'チェックリストID',
  `item_name` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '項目名',
  `is_checked` tinyint(1) DEFAULT NULL COMMENT 'チェック状態',
  `assigned_user_id` bigint DEFAULT NULL COMMENT '担当者',
  `sort_order` int DEFAULT NULL COMMENT '表示順'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- テーブルのデータのダンプ `checklist_items`
--

INSERT INTO `checklist_items` (`checklist_item_id`, `checklist_id`, `item_name`, `is_checked`, `assigned_user_id`, `sort_order`) VALUES
(1, 1, 'モバイルバッテリー', 1, 1, 1),
(2, 1, '折りたたみ傘', 0, 2, 2),
(3, 1, '学生証', 1, 3, 3),
(4, 2, '酔い止め薬', 0, 2, 1),
(5, 2, '使い捨てカメラ', 0, 3, 2),
(6, 3, '温泉用タオル', 1, 4, 1);

-- --------------------------------------------------------

--
-- テーブルの構造 `expenses`
--

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

--
-- テーブルのデータのダンプ `expenses`
--

INSERT INTO `expenses` (`expense_id`, `trip_id`, `paid_by_user_id`, `title`, `amount`, `expense_date`, `category`, `memo`) VALUES
(1, 1, 1, 'ホテル予約金', 36000.00, '2026-07-20', '宿泊', '大阪市内ホテル2泊分の事前決済。3人で均等負担。'),
(2, 1, 2, '新幹線チケット', 27000.00, '2026-07-25', '交通', '京都から大阪方面の移動を含む交通費。3人で均等負担。'),
(3, 2, 2, '有馬温泉旅館予約金', 44000.00, '2026-08-20', '宿泊', '2名分の宿泊予約金。');

-- --------------------------------------------------------

--
-- テーブルの構造 `expense_participants`
--

CREATE TABLE `expense_participants` (
  `expense_participant_id` bigint NOT NULL COMMENT '負担者ID',
  `expense_id` bigint DEFAULT NULL COMMENT '支払いID',
  `user_id` bigint DEFAULT NULL COMMENT '対象ユーザー',
  `share_ratio` decimal(5,2) DEFAULT NULL COMMENT '負担割合',
  `share_amount` decimal(10,2) DEFAULT NULL COMMENT '負担額',
  `is_settled` tinyint(1) DEFAULT NULL COMMENT '精算済みか'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- テーブルのデータのダンプ `expense_participants`
--

INSERT INTO `expense_participants` (`expense_participant_id`, `expense_id`, `user_id`, `share_ratio`, `share_amount`, `is_settled`) VALUES
(1, 1, 1, 33.33, 12000.00, 1),
(2, 1, 2, 33.33, 12000.00, 0),
(3, 1, 3, 33.34, 12000.00, 0),
(4, 2, 1, 33.33, 9000.00, 0),
(5, 2, 2, 33.33, 9000.00, 1),
(6, 2, 3, 33.34, 9000.00, 0),
(7, 3, 2, 50.00, 22000.00, 1),
(8, 3, 4, 50.00, 22000.00, 0);

-- --------------------------------------------------------

--
-- テーブルの構造 `group_invitations`
--

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

--
-- テーブルのデータのダンプ `group_invitations`
--

INSERT INTO `group_invitations` (`invitation_id`, `group_id`, `invited_by`, `invited_user_id`, `invitation_token`, `status`, `expired_at`, `created_at`) VALUES
(1, 1, 1, 2, 'invite_osaka_kyoto_hanako_20260405', 'accepted', '2026-04-12 23:59:59', '2026-04-05 10:10:00'),
(2, 1, 1, 3, 'invite_osaka_kyoto_ken_20260405', 'accepted', '2026-04-12 23:59:59', '2026-04-05 10:20:00'),
(3, 2, 2, 4, 'invite_arima_misaki_20260412', 'pending', '2026-04-30 23:59:59', '2026-04-12 15:45:00');

-- --------------------------------------------------------

--
-- テーブルの構造 `group_members`
--

CREATE TABLE `group_members` (
  `group_member_id` bigint NOT NULL COMMENT 'グループ所属レコードID',
  `group_id` bigint NOT NULL COMMENT '所属グループID',
  `user_id` bigint NOT NULL COMMENT '所属ユーザーID',
  `role_in_group` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT 'member' COMMENT '役割（admin / member）',
  `joined_at` datetime DEFAULT NULL COMMENT '参加日時',
  `invitation_status` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '招待状態（pending / accepted / rejected）'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- テーブルのデータのダンプ `group_members`
--

INSERT INTO `group_members` (`group_member_id`, `group_id`, `user_id`, `role_in_group`, `joined_at`, `invitation_status`) VALUES
(1, 1, 1, 'admin', '2026-04-05 10:00:00', 'accepted'),
(2, 1, 2, 'member', '2026-04-05 10:30:00', 'accepted'),
(3, 1, 3, 'member', '2026-04-05 11:00:00', 'accepted'),
(4, 2, 2, 'admin', '2026-04-12 15:20:00', 'accepted'),
(5, 2, 4, 'member', '2026-04-12 16:00:00', 'pending');

-- --------------------------------------------------------

--
-- テーブルの構造 `itineraries`
--

CREATE TABLE `itineraries` (
  `itinerary_id` bigint NOT NULL COMMENT '旅程ID（1日単位の行程）',
  `trip_id` bigint NOT NULL COMMENT '対象旅行ID',
  `itinerary_date` date NOT NULL COMMENT '対象日（旅行内の日付）',
  `title` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'タイトル（例: 1日目プラン）',
  `note` text COLLATE utf8mb4_unicode_ci COMMENT '備考・説明'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- テーブルのデータのダンプ `itineraries`
--

INSERT INTO `itineraries` (`itinerary_id`, `trip_id`, `itinerary_date`, `title`, `note`) VALUES
(1, 1, '2026-08-01', '1日目：大阪観光', '大阪城から道頓堀へ移動し、夜はグルメ中心に楽しむ。'),
(2, 1, '2026-08-02', '2日目：京都観光', '清水寺と嵐山を中心に回る。移動時間に余裕を持たせる。'),
(3, 1, '2026-08-03', '3日目：自由行動と帰宅', '午前は自由行動、午後に帰宅予定。'),
(4, 2, '2026-09-12', '1日目：有馬温泉', 'チェックイン前に温泉街を散策し、夜は旅館で夕食。');

-- --------------------------------------------------------

--
-- テーブルの構造 `itinerary_items`
--

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

--
-- テーブルのデータのダンプ `itinerary_items`
--

INSERT INTO `itinerary_items` (`itinerary_item_id`, `itinerary_id`, `item_type`, `place_id`, `start_time`, `end_time`, `order_no`, `memo`) VALUES
(1, 1, 'visit', 1, '2026-08-01 10:00:00', '2026-08-01 12:00:00', 1, '大阪城天守閣と公園を見学。'),
(2, 1, 'meal', 2, '2026-08-01 18:30:00', '2026-08-01 20:00:00', 2, '道頓堀で夕食。たこ焼きとお好み焼き候補。'),
(3, 2, 'visit', 3, '2026-08-02 09:30:00', '2026-08-02 11:30:00', 1, '清水寺を観光。'),
(4, 2, 'move', 4, '2026-08-02 13:00:00', '2026-08-02 14:00:00', 2, '清水寺から嵐山方面へ移動。'),
(5, 4, 'hotel', 5, '2026-09-12 15:00:00', '2026-09-12 18:00:00', 1, '旅館チェックインと温泉入浴。');

-- --------------------------------------------------------

--
-- テーブルの構造 `messages`
--

CREATE TABLE `messages` (
  `message_id` bigint NOT NULL COMMENT 'メッセージID',
  `chat_id` bigint DEFAULT NULL COMMENT 'チャットID',
  `sender_user_id` bigint DEFAULT NULL COMMENT '送信者',
  `body` text COLLATE utf8mb4_unicode_ci COMMENT '本文',
  `sent_at` datetime DEFAULT NULL COMMENT '送信日時'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- テーブルのデータのダンプ `messages`
--

INSERT INTO `messages` (`message_id`, `chat_id`, `sender_user_id`, `body`, `sent_at`) VALUES
(1, 1, 1, '旅行日程は8月1日から3日で確定にしましょう。', '2026-04-21 18:05:00'),
(2, 1, 2, '了解です。宿泊先の候補を確認します。', '2026-04-21 18:07:00'),
(3, 1, 3, '移動ルートは自分が確認します。', '2026-04-21 18:10:00'),
(4, 2, 1, 'チェックイン時間は15時で大丈夫でしょうか。', '2026-07-20 11:10:00'),
(5, 3, 2, '有馬温泉の日程候補に投票お願いします。', '2026-04-13 15:10:00');

-- --------------------------------------------------------

--
-- テーブルの構造 `message_reads`
--

CREATE TABLE `message_reads` (
  `message_read_id` bigint NOT NULL COMMENT '既読管理ID',
  `message_id` bigint NOT NULL COMMENT '対象メッセージID',
  `user_id` bigint NOT NULL COMMENT '既読ユーザーID',
  `read_at` datetime DEFAULT NULL COMMENT '既読日時'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- テーブルのデータのダンプ `message_reads`
--

INSERT INTO `message_reads` (`message_read_id`, `message_id`, `user_id`, `read_at`) VALUES
(1, 1, 2, '2026-04-21 18:06:00'),
(2, 1, 3, '2026-04-21 18:09:00'),
(3, 2, 1, '2026-04-21 18:08:00'),
(4, 3, 1, '2026-04-21 18:12:00'),
(5, 4, 2, '2026-07-20 11:12:00'),
(6, 5, 4, '2026-04-13 16:00:00');

-- --------------------------------------------------------

--
-- テーブルの構造 `photos`
--

CREATE TABLE `photos` (
  `photo_id` bigint NOT NULL COMMENT '写真ID',
  `album_id` bigint DEFAULT NULL COMMENT '所属アルバム',
  `uploaded_by` bigint DEFAULT NULL COMMENT 'アップロード者',
  `file_url` text COLLATE utf8mb4_unicode_ci COMMENT '画像URL',
  `caption` text COLLATE utf8mb4_unicode_ci COMMENT '説明',
  `shot_at` datetime DEFAULT NULL COMMENT '撮影日時'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- テーブルのデータのダンプ `photos`
--

INSERT INTO `photos` (`photo_id`, `album_id`, `uploaded_by`, `file_url`, `caption`, `shot_at`) VALUES
(1, 1, 2, 'https://cdn.example.com/photos/osaka_castle_20260801_001.jpg', '大阪城前で集合写真', '2026-08-01 10:45:00'),
(2, 1, 3, 'https://cdn.example.com/photos/dotonbori_20260801_002.jpg', '道頓堀の夜景', '2026-08-01 19:10:00'),
(3, 1, 1, 'https://cdn.example.com/photos/kiyomizu_20260802_003.jpg', '清水寺の舞台からの景色', '2026-08-02 10:20:00'),
(4, 2, 4, 'https://cdn.example.com/photos/arima_20260912_001.jpg', '有馬温泉街の風景', '2026-09-12 16:00:00');

-- --------------------------------------------------------

--
-- テーブルの構造 `photo_tags`
--

CREATE TABLE `photo_tags` (
  `photo_tag_id` bigint NOT NULL COMMENT 'タグID',
  `photo_id` bigint NOT NULL COMMENT '対象写真ID',
  `tagged_user_id` bigint NOT NULL COMMENT 'タグ付けされたユーザーID'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- テーブルのデータのダンプ `photo_tags`
--

INSERT INTO `photo_tags` (`photo_tag_id`, `photo_id`, `tagged_user_id`) VALUES
(1, 1, 1),
(2, 1, 2),
(3, 1, 3),
(4, 2, 3),
(5, 4, 4);

-- --------------------------------------------------------

--
-- テーブルの構造 `roles`
--

CREATE TABLE `roles` (
  `role_id` bigint NOT NULL COMMENT 'ロールID（権限の種類を識別）',
  `role_name` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'ロール名（例: admin / user / moderator）'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- テーブルのデータのダンプ `roles`
--

INSERT INTO `roles` (`role_id`, `role_name`) VALUES
(1, 'admin'),
(2, 'user'),
(3, 'moderator');

-- --------------------------------------------------------

--
-- テーブルの構造 `settlements`
--

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

--
-- テーブルのデータのダンプ `settlements`
--

INSERT INTO `settlements` (`settlement_id`, `trip_id`, `from_user_id`, `to_user_id`, `amount`, `status`, `settled_at`, `created_at`) VALUES
(1, 1, 2, 1, 12000.00, 'pending', '2026-07-28 12:00:00', '2026-07-26 09:00:00'),
(2, 1, 3, 1, 12000.00, 'pending', '2026-07-28 12:30:00', '2026-07-26 09:05:00'),
(3, 1, 1, 2, 9000.00, 'completed', '2026-07-27 18:00:00', '2026-07-26 09:10:00'),
(4, 2, 4, 2, 22000.00, 'pending', '2026-08-25 20:00:00', '2026-08-21 10:00:00');

-- --------------------------------------------------------

--
-- テーブルの構造 `system_settings`
--

CREATE TABLE `system_settings` (
  `setting_key` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '設定キー（例: max_upload_size）',
  `setting_value` text COLLATE utf8mb4_unicode_ci COMMENT '設定値（文字列で柔軟に管理）',
  `updated_at` datetime DEFAULT NULL COMMENT '更新日時'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- テーブルのデータのダンプ `system_settings`
--

INSERT INTO `system_settings` (`setting_key`, `setting_value`, `updated_at`) VALUES
('default_language', 'ja', '2026-04-01 00:00:00'),
('max_upload_size_mb', '20', '2026-04-01 00:00:00'),
('ranking_cache_enabled', 'true', '2026-04-01 00:00:00'),
('review_requires_visit_confirmation', 'true', '2026-04-01 00:00:00');

-- --------------------------------------------------------

--
-- テーブルの構造 `trips`
--

CREATE TABLE `trips` (
  `trip_id` bigint NOT NULL COMMENT '旅行ID',
  `group_id` bigint NOT NULL COMMENT '紐づくグループID',
  `title` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '旅行タイトル',
  `group_icon` TEXT COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'グループアイコンURL',
  `start_date` date DEFAULT NULL COMMENT '開始日（確定後に使用）',
  `end_date` date DEFAULT NULL COMMENT '終了日',
  `destination_summary` text COLLATE utf8mb4_unicode_ci COMMENT '行き先概要',
  `status` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '状態（draft / voting / confirmed）',
  `created_by` bigint DEFAULT NULL COMMENT '作成者',
  `created_at` datetime DEFAULT NULL COMMENT '作成日時',
  `updated_at` datetime DEFAULT NULL COMMENT '更新日時'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- テーブルのデータのダンプ `trips`
--

INSERT INTO `trips` (`trip_id`, `group_id`, `title`, `group_icon`, `start_date`, `end_date`, `destination_summary`, `status`, `created_by`, `created_at`, `updated_at`) VALUES
(1, 1, '大阪・京都2泊3日旅行', NULL, '2026-08-01', '2026-08-03', '大阪城、道頓堀、清水寺、嵐山を巡る予定です。', 'confirmed', 1, '2026-04-06 09:00:00', '2026-04-21 18:00:00'),
(2, 2, '有馬温泉リラックス旅行', NULL, '2026-09-12', '2026-09-13', '有馬温泉、神戸三宮、北野異人館を候補にしています。', 'voting', 2, '2026-04-13 14:00:00', '2026-04-22 11:30:00');

-- --------------------------------------------------------

-- テーブルの構造 `trip_candidates`
--

CREATE TABLE `trip_candidates` (
  `candidate_id` bigint NOT NULL COMMENT '候補ID',
  `trip_id` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '所属旅行ID',
  `candidate_type` enum('destination','spot','hotel','restaurant') COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '候補種別 destination=旅行先 spot=観光地 hotel=宿泊先 restaurant=飲食店',
  `candidate_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '候補名',
  `description` text COLLATE utf8mb4_unicode_ci COMMENT '候補の説明文',
  `img_url` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '候補画像URL',
  `created_by` bigint NOT NULL COMMENT '候補を登録したユーザーID',
  `status` enum('candidate','selected','rejected') COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '候補状態 candidate=検討中 selected=採用 rejected=不採用',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '登録日時'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='旅行候補テーブル';

-- --------------------------------------------------------

--
-- テーブルの構造 `trip_candidate_votes`
--

CREATE TABLE `trip_candidate_votes` (
  `vote_id` bigint NOT NULL COMMENT '候補投票ID',
  `candidate_id` bigint NOT NULL COMMENT '投票対象候補ID',
  `user_id` bigint NOT NULL COMMENT '投票したユーザーID',
  `vote_type` enum('like','dislike') COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '投票内容 like=賛成 dislike=反対',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '投票日時'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='候補投票テーブル';

-- --------------------------------------------------------

--
-- テーブルの構造 `trip_date_candidates`
--

CREATE TABLE `trip_date_candidates` (
  `candidate_id` bigint NOT NULL COMMENT '候補日ID',
  `trip_id` bigint NOT NULL COMMENT '旅行ID',
  `candidate_start_date` date DEFAULT NULL COMMENT '候補開始日',
  `candidate_end_date` date DEFAULT NULL COMMENT '候補終了日',
  `created_by` bigint DEFAULT NULL COMMENT '登録者',
  `created_at` datetime DEFAULT NULL COMMENT '登録日時'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- テーブルのデータのダンプ `trip_date_candidates`
--

INSERT INTO `trip_date_candidates` (`candidate_id`, `trip_id`, `candidate_start_date`, `candidate_end_date`, `created_by`, `created_at`) VALUES
(1, 1, '2026-08-01', '2026-08-03', 1, '2026-04-06 09:15:00'),
(2, 1, '2026-08-08', '2026-08-10', 2, '2026-04-06 09:25:00'),
(3, 2, '2026-09-12', '2026-09-13', 2, '2026-04-13 14:20:00');

-- --------------------------------------------------------

--
-- テーブルの構造 `trip_date_votes`
--

CREATE TABLE `trip_date_votes` (
  `vote_id` bigint NOT NULL COMMENT '投票ID',
  `candidate_id` bigint NOT NULL COMMENT '対象候補日ID',
  `user_id` bigint NOT NULL COMMENT '投票ユーザー',
  `vote_type` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '投票結果（yes / maybe / no）',
  `voted_at` datetime DEFAULT NULL COMMENT '投票日時'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- テーブルのデータのダンプ `trip_date_votes`
--

INSERT INTO `trip_date_votes` (`vote_id`, `candidate_id`, `user_id`, `vote_type`, `voted_at`) VALUES
(1, 1, 1, 'yes', '2026-04-06 10:00:00'),
(2, 1, 2, 'yes', '2026-04-06 10:05:00'),
(3, 1, 3, 'maybe', '2026-04-06 10:10:00'),
(4, 2, 1, 'no', '2026-04-06 10:15:00'),
(5, 3, 2, 'yes', '2026-04-13 15:00:00'),
(6, 3, 4, 'maybe', '2026-04-13 16:00:00');

-- --------------------------------------------------------

--
-- テーブルの構造 `trip_decisions`
--

CREATE TABLE `trip_decisions` (
  `decision_id` bigint NOT NULL COMMENT '決定事項ID',
  `trip_id` bigint NOT NULL COMMENT '対象旅行ID',
  `decision_type` enum('destination','hotel','schedule','budget') COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '決定事項種別',
  `title` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '決定事項タイトル',
  `detail` text COLLATE utf8mb4_unicode_ci COMMENT '詳細内容',
  `decided_at` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '決定日時'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='旅行確定情報';

--
-- テーブルのデータのダンプ `trip_decisions`
--

INSERT INTO `trip_decisions` (`decision_id`, `trip_id`, `decision_type`, `title`, `detail`, `decided_at`) VALUES
(1, 1, 'destination', '大阪', NULL, '2026-04-21 18:30:00'),
(2, 1, 'hotel', '大阪ホテル', NULL, '2026-04-22 09:00:00'),
(3, 1, 'schedule', '日程決定', '旅行の日程は8月1日から3日に決定しました。', '2026-04-21 18:45:00'),
(4, 2, 'destination', '有馬温泉', NULL, '2026-04-22 11:00:00');

-- --------------------------------------------------------

--
-- テーブルの構造 `trip_members`
--

CREATE TABLE `trip_members` (
  `trip_member_id` bigint NOT NULL COMMENT '旅行参加レコードID',
  `trip_id` bigint NOT NULL COMMENT '旅行ID',
  `user_id` int NOT NULL,
  `participation_status` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '参加状態（joined / pending）',
  `joined_at` datetime DEFAULT NULL COMMENT '参加日時'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- テーブルのデータのダンプ `trip_members`
--

INSERT INTO `trip_members` (`trip_member_id`, `trip_id`, `user_id`, `participation_status`, `joined_at`) VALUES
(1, 1, 1, 'joined', '2026-04-06 09:10:00'),
(2, 1, 2, 'joined', '2026-04-06 09:20:00'),
(3, 1, 3, 'joined', '2026-04-06 09:30:00'),
(4, 2, 2, 'joined', '2026-04-13 14:10:00'),
(5, 2, 4, 'pending', '2026-04-13 14:40:00');

-- --------------------------------------------------------

--
-- テーブルの構造 `trip_surveys`
--

CREATE TABLE `trip_surveys` (
  `survey_id` bigint NOT NULL COMMENT 'アンケートID',
  `trip_id` bigint NOT NULL COMMENT '対象旅行ID',
  `title` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'アンケートタイトル',
  `created_by` bigint NOT NULL COMMENT '作成者ユーザーID',
  `deadline_at` datetime DEFAULT NULL COMMENT '回答締切日時',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '作成日時'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='アンケート';

--
-- テーブルのデータのダンプ `trip_surveys`
--

INSERT INTO `trip_surveys` (`survey_id`, `trip_id`, `title`, `created_by`, `deadline_at`, `created_at`) VALUES
(1, 1, '大阪・京都旅行アンケート', 1, '2026-07-15 23:59:59', '2026-04-01 00:00:00'),
(2, 2, '有馬温泉旅行アンケート', 2, '2026-08-30 23:59:59', '2026-04-01 00:00:00'),
(3, 1, '大阪・京都旅行事前アンケート', 1, '2026-06-30 23:59:59', '2026-04-01 00:00:00'),
(4, 2, '有馬温泉旅行事前アンケート', 2, '2026-07-31 23:59:59', '2026-04-01 00:00:00');

-- --------------------------------------------------------

--
-- テーブルの構造 `trip_survey_options`
--

CREATE TABLE `trip_survey_options` (
  `option_id` bigint NOT NULL COMMENT '選択肢ID',
  `survey_id` bigint NOT NULL COMMENT '対象アンケートID',
  `option_text` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '選択肢内容',
  `sort_order` int DEFAULT '0' COMMENT '表示順'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='アンケート選択肢';

--
-- テーブルのデータのダンプ `trip_survey_options`
--

INSERT INTO `trip_survey_options` (`option_id`, `survey_id`, `option_text`, `sort_order`) VALUES
(1, 1, '旅行前の事前説明会を開催する', 1),
(2, 1, '旅行中の食事は全員で決める', 2),
(3, 1, '旅行後にアルバムを作成する', 3),
(4, 2, '温泉以外の観光も行う', 1),
(5, 2, '食事は各自で自由に取る', 2),
(6, 2, '旅行後にアンケートを実施する', 3);

-- --------------------------------------------------------

--
-- テーブルの構造 `trip_survey_votes`
--

CREATE TABLE `trip_survey_votes` (
  `vote_id` bigint NOT NULL COMMENT 'アンケート回答ID',
  `survey_id` bigint NOT NULL COMMENT 'アンケートID',
  `option_id` bigint NOT NULL COMMENT '選択した選択肢ID',
  `user_id` bigint NOT NULL COMMENT '回答者ユーザーID',
  `voted_at` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '回答日時'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='アンケート回答';

--
-- テーブルのデータのダンプ `trip_survey_votes`
--

INSERT INTO `trip_survey_votes` (`vote_id`, `survey_id`, `option_id`, `user_id`, `voted_at`) VALUES
(1, 1, 1, 1, '2026-04-01 10:00:00'),
(2, 1, 2, 1, '2026-04-01 10:00:00'),
(3, 1, 3, 1, '2026-04-01 10:00:00'),
(4, 1, 1, 2, '2026-04-01 10:00:00'),
(5, 1, 2, 2, '2026-04-01 10:00:00'),
(6, 1, 3, 2, '2026-04-01 10:00:00'),
(7, 1, 1, 3, '2026-04-01 10:00:00'),
(8, 1, 2, 3, '2026-04-01 10:00:00'),
(9, 1, 3, 3, '2026-04-01 10:00:00'),
(10, 2, 4, 2, '2026-04-01 10:00:00'),
(11, 2, 5, 2, '2026-04-01 10:00:00'),
(12, 2, 6, 2, '2026-04-01 10:00:00'),
(13, 2, 4, 4, '2026-04-01 10:00:00'),
(14, 2, 5, 4, '2026-04-01 10:00:00'),
(15, 2, 6, 4, '2026-04-01 10:00:00');

-- --------------------------------------------------------

--
-- テーブルの構造 `users`
--

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

--
-- テーブルのデータのダンプ `users`
--

INSERT INTO `users` (`user_id`, `name`, `email`, `password_hash`, `icon_url`, `language_code`, `status`, `created_at`, `updated_at`, `deleted_at`) VALUES
(1, '田中 太郎', 'tanaka.taro@example.com', '2', 'https://cdn.example.com/icons/users/1.png', 'ja', 'active', '2026-04-01 09:00:00', '2026-04-20 18:30:00', NULL),
(2, '佐藤 花子', 'sato.hanako@example.com', 'test', 'https://cdn.example.com/icons/users/2.png', 'ja', 'active', '2026-04-02 10:15:00', '2026-04-21 20:10:00', NULL),
(3, '鈴木 健', 'suzuki.ken@example.com', 'trustno1', 'https://cdn.example.com/icons/users/3.png', 'ja', 'active', '2026-04-03 11:20:00', '2026-04-22 08:45:00', NULL),
(4, '山本 美咲', 'yamamoto.misaki@example.com', 'Skirk100', 'https://cdn.example.com/icons/users/4.png', 'en', 'suspended', '2026-04-04 12:30:00', '2026-04-23 09:05:00', '2026-04-24 00:00:00'),
(5, 'Bell', 'ayuki.y1027@icloud.com', '2024Gakusei', NULL, 'ja', 'active', '2026-06-15 16:24:40', '2026-06-15 16:24:40', NULL),
(6, 'Bell', '2410041@i-seifu.jp', '2024Gakusei', NULL, 'ja', 'active', '2026-06-16 17:35:15', '2026-06-16 17:35:15', NULL),
(7, 'Bell', 'test@gmail.com', '2024Test', NULL, 'ja', 'active', '2026-06-16 17:38:21', '2026-06-16 17:38:21', NULL),
(8, 'HirotoIshigaki', '2410026@i-seifu.jp', 'Hirotoseifu2024', NULL, 'ja', 'active', '2026-06-17 14:40:41', '2026-06-17 14:40:41', NULL),
(9, 'metax0376', '2410017@i-seifu.jp', '2024Gakusei', NULL, 'ja', 'active', '2026-06-17 15:51:36', '2026-06-17 15:51:36', NULL);

-- --------------------------------------------------------

--
-- テーブルの構造 `user_devices`
--

CREATE TABLE `user_devices` (
  `device_id` bigint NOT NULL COMMENT 'デバイス識別ID',
  `user_id` bigint NOT NULL COMMENT '所有ユーザーID',
  `push_token` text COLLATE utf8mb4_unicode_ci COMMENT 'プッシュ通知用トークン',
  `platform` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'OS（iOS / Android / Web）',
  `last_login_at` datetime DEFAULT NULL COMMENT '最終ログイン日時'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- テーブルのデータのダンプ `user_devices`
--

INSERT INTO `user_devices` (`device_id`, `user_id`, `push_token`, `platform`, `last_login_at`) VALUES
(1, 1, 'expo_push_token_user_1_ios_20260427', 'iOS', '2026-04-27 08:10:00'),
(2, 2, 'fcm_push_token_user_2_android_20260427', 'Android', '2026-04-27 08:35:00'),
(3, 3, 'web_push_token_user_3_chrome_20260427', 'Web', '2026-04-27 09:00:00'),
(4, 4, 'expo_push_token_user_4_ios_20260427', 'iOS', '2026-04-25 21:40:00');

-- --------------------------------------------------------

--
-- テーブルの構造 `user_groups`
--

CREATE TABLE `user_groups` (
  `group_id` bigint NOT NULL COMMENT 'グループID',
  `group_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'グループ名',
  `created_by` bigint NOT NULL COMMENT '作成ユーザーID',
  `description` text COLLATE utf8mb4_unicode_ci COMMENT 'グループ説明',
  `status` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT 'active' COMMENT '状態（active / archived）',
  `created_at` datetime NOT NULL COMMENT '作成日時',
  `updated_at` datetime NOT NULL COMMENT '更新日時'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- テーブルのデータのダンプ `user_groups`
--

INSERT INTO `user_groups` (`group_id`, `group_name`, `created_by`, `description`, `status`, `created_at`, `updated_at`) VALUES
(1, '大阪・京都卒業旅行チーム', 1, '卒業前に大阪と京都を2泊3日で回る旅行グループです。', 'active', '2026-04-05 10:00:00', '2026-04-20 19:00:00'),
(2, '夏休み温泉計画', 2, '夏休みに有馬温泉へ行くための候補管理グループです。', 'active', '2026-04-12 15:20:00', '2026-04-22 12:10:00');

-- --------------------------------------------------------

--
-- テーブルの構造 `user_profiles`
--

CREATE TABLE `user_profiles` (
  `user_id` bigint NOT NULL COMMENT 'usersテーブルとの1対1紐付け',
  `nickname` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'ニックネーム（表示用・任意）',
  `birthday` date DEFAULT NULL COMMENT '生年月日（年齢計算などで使用）',
  `gender` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '性別（任意・未設定可）',
  `self_introduction` text COLLATE utf8mb4_unicode_ci COMMENT '自己紹介文',
  `country_code` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '国コード（例: JP, US）',
  `timezone` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'タイムゾーン（例: Asia/Tokyo）'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- テーブルのデータのダンプ `user_profiles`
--

INSERT INTO `user_profiles` (`user_id`, `nickname`, `birthday`, `gender`, `self_introduction`, `country_code`, `timezone`) VALUES
(1, 'たろう', '2001-06-15', 'male', '関西の観光地と食べ歩きが好きです。旅行では予定表作成を担当します。', 'JP', 'Asia/Tokyo'),
(2, 'はな', '2002-02-10', 'female', 'カフェ巡りと写真撮影が好きです。旅先ではアルバム整理を担当します。', 'JP', 'Asia/Tokyo'),
(3, 'けん', '2000-11-03', 'male', '電車移動と地図アプリが好きです。ルート確認を担当します。', 'JP', 'Asia/Tokyo'),
(4, 'ミサキ', '2001-09-28', 'female', '宿泊先やレビュー確認を担当します。', 'JP', 'Asia/Tokyo');

-- --------------------------------------------------------

--
-- テーブルの構造 `user_roles`
--

CREATE TABLE `user_roles` (
  `user_id` bigint NOT NULL COMMENT 'ユーザーID（rolesとの中間テーブル）',
  `role_id` bigint NOT NULL COMMENT '付与されるロールID'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- テーブルのデータのダンプ `user_roles`
--

INSERT INTO `user_roles` (`user_id`, `role_id`) VALUES
(1, 1),
(1, 2),
(2, 2),
(3, 2),
(4, 3);

--
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
  ADD PRIMARY KEY (`option_id`);

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
-- ダンプしたテーブルの AUTO_INCREMENT
--

--
-- テーブルの AUTO_INCREMENT `trip_candidate_votes`
--
ALTER TABLE `trip_candidate_votes`
  MODIFY `vote_id` bigint NOT NULL AUTO_INCREMENT COMMENT '候補投票ID';

--
-- テーブルの AUTO_INCREMENT `trip_candidates`
--
ALTER TABLE `trip_candidates`
  MODIFY `candidate_id` bigint NOT NULL AUTO_INCREMENT COMMENT '候補ID';

--
-- テーブルの AUTO_INCREMENT `trip_decisions`
--
ALTER TABLE `trip_decisions`
  MODIFY `decision_id` bigint NOT NULL AUTO_INCREMENT COMMENT '決定事項ID', AUTO_INCREMENT=5;

--
-- テーブルの AUTO_INCREMENT `trip_surveys`
--
ALTER TABLE `trip_surveys`
  MODIFY `survey_id` bigint NOT NULL AUTO_INCREMENT COMMENT 'アンケートID', AUTO_INCREMENT=5;

--
-- テーブルの AUTO_INCREMENT `trip_survey_options`
--
ALTER TABLE `trip_survey_options`
  MODIFY `option_id` bigint NOT NULL AUTO_INCREMENT COMMENT '選択肢ID', AUTO_INCREMENT=7;

--
-- テーブルの AUTO_INCREMENT `trip_survey_votes`
--
ALTER TABLE `trip_survey_votes`
  MODIFY `vote_id` bigint NOT NULL AUTO_INCREMENT COMMENT 'アンケート回答ID', AUTO_INCREMENT=16;

--
-- テーブルの AUTO_INCREMENT `users`
--
ALTER TABLE `users`
  MODIFY `user_id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- ダンプしたテーブルの制約
--

--
-- テーブルの制約 `trip_members`
--
ALTER TABLE `trip_members`
  ADD CONSTRAINT `fk_trip_members_trip` FOREIGN KEY (`trip_id`) REFERENCES `trips` (`trip_id`),
  ADD CONSTRAINT `fk_trip_members_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
