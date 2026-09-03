-- MySQL dump 10.13  Distrib 5.6.51, for Linux (x86_64)
--
-- Host: tabi-rds.crmq0gc46bxg.ap-northeast-1.rds.amazonaws.com    Database: tabidb
-- ------------------------------------------------------
-- Server version	8.0.46

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- GTID state at the beginning of the backup 
--

--
-- Table structure for table `admin_activity_logs`
--

DROP TABLE IF EXISTS `admin_activity_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `admin_activity_logs` (
  `activity_log_id` bigint NOT NULL AUTO_INCREMENT COMMENT '管理操作ログID',
  `manager_user_id` bigint DEFAULT NULL COMMENT '操作した管理者ユーザーID',
  `action_text` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '操作内容の表示文',
  `target_type` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '操作対象種別',
  `target_id` bigint DEFAULT NULL COMMENT '操作対象ID',
  `created_at` datetime NOT NULL COMMENT '操作日時',
  PRIMARY KEY (`activity_log_id`),
  KEY `idx_admin_activity_logs_created_at` (`created_at`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='管理画面用最近の活動・操作ログテーブル';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `admin_activity_logs`
--

LOCK TABLES `admin_activity_logs` WRITE;
/*!40000 ALTER TABLE `admin_activity_logs` DISABLE KEYS */;
INSERT INTO `admin_activity_logs` VALUES (1,1,'新規ユーザー登録を確認しました','ユーザー',2,'2026-07-02 10:25:00'),(2,1,'お知らせを公開しました','お知らせ',1,'2026-07-02 10:10:00'),(3,1,'投稿を非表示にしました','投稿',4,'2026-07-02 09:58:00'),(4,1,'お問い合わせに返信しました','お問い合わせ',3,'2026-07-02 09:30:00'),(5,1,'通報ステータスを対応済みに変更しました','通報',3,'2026-07-02 08:30:00');
/*!40000 ALTER TABLE `admin_activity_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `admin_inquiries`
--

DROP TABLE IF EXISTS `admin_inquiries`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `admin_inquiries` (
  `inquiry_id` bigint NOT NULL AUTO_INCREMENT COMMENT 'お問い合わせID',
  `public_id` varchar(40) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '画面表示用お問い合わせ番号',
  `user_id` bigint DEFAULT NULL COMMENT '問い合わせユーザーID',
  `title` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'お問い合わせ件名',
  `category` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'お問い合わせカテゴリ',
  `body` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'お問い合わせ本文',
  `status` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'open' COMMENT '対応状態（open / working / resolved）',
  `has_attachment` tinyint(1) NOT NULL DEFAULT '0' COMMENT '添付ファイル有無',
  `admin_memo` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT '管理者メモ',
  `created_at` datetime NOT NULL COMMENT 'お問い合わせ作成日時',
  `updated_at` datetime DEFAULT NULL COMMENT '更新日時',
  PRIMARY KEY (`inquiry_id`),
  UNIQUE KEY `uk_admin_inquiries_public_id` (`public_id`),
  KEY `idx_admin_inquiries_status` (`status`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='管理画面用お問い合わせ管理テーブル';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `admin_inquiries`
--

LOCK TABLES `admin_inquiries` WRITE;
/*!40000 ALTER TABLE `admin_inquiries` DISABLE KEYS */;
INSERT INTO `admin_inquiries` VALUES (1,'INQ-20260702-001',2,'ログインできません','ログイン','パスワードは合っているはずですがログインできません。確認をお願いします。','open',0,'','2026-07-02 10:59:00','2026-07-02 10:59:00'),(2,'INQ-20260702-002',3,'画像がアップロードできません','不具合','アルバムに画像をアップロードしようとするとエラーになります。','open',1,'','2026-07-02 09:40:00','2026-07-02 09:40:00'),(3,'INQ-20260701-005',4,'グループに参加できません','操作方法','招待リンクを開いてもグループに参加できません。','working',0,'招待リンクの有効期限切れを確認中。','2026-07-01 18:20:00','2026-07-01 18:40:00'),(4,'INQ-20260701-003',5,'退会方法がわかりません','操作方法','アカウントを削除したいのですが方法がわかりません。','resolved',0,'手順を案内済み。','2026-07-01 11:30:00','2026-07-01 12:10:00'),(5,'INQ-20260713114640-de78',2,'PHP emit debug test','旅行グループ','PHPからWebSocketサーバーへ通知できるか確認するテストです。テスト','open',0,NULL,'2026-07-13 11:46:40','2026-07-13 11:46:40');
/*!40000 ALTER TABLE `admin_inquiries` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `admin_inquiry_replies`
--

DROP TABLE IF EXISTS `admin_inquiry_replies`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `admin_inquiry_replies` (
  `reply_id` bigint NOT NULL AUTO_INCREMENT COMMENT 'お問い合わせ返信ID',
  `inquiry_id` bigint NOT NULL COMMENT '返信対象のお問い合わせID',
  `manager_user_id` bigint DEFAULT NULL COMMENT '返信した管理者ユーザーID',
  `body` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '返信本文',
  `created_at` datetime NOT NULL COMMENT '返信日時',
  PRIMARY KEY (`reply_id`),
  KEY `idx_admin_inquiry_replies_inquiry_id` (`inquiry_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='管理画面用お問い合わせ返信履歴テーブル';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `admin_inquiry_replies`
--

LOCK TABLES `admin_inquiry_replies` WRITE;
/*!40000 ALTER TABLE `admin_inquiry_replies` DISABLE KEYS */;
/*!40000 ALTER TABLE `admin_inquiry_replies` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `admin_notices`
--

DROP TABLE IF EXISTS `admin_notices`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
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
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='管理画面用お知らせ管理テーブル';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `admin_notices`
--

LOCK TABLES `admin_notices` WRITE;
/*!40000 ALTER TABLE `admin_notices` DISABLE KEYS */;
INSERT INTO `admin_notices` VALUES (1,'メンテナンスのお知らせ','下記の日程でメンテナンスを実施します。ご不便をおかけしますが、よろしくお願いいたします。','全ユーザー','published','2026-07-01 00:00:00','2026-07-07 23:59:00',1,72,1,'2026-07-01 09:00:00','2026-07-01 09:00:00',NULL),(2,'新機能リリースのお知らせ','しおり共有機能をリリースしました。ぜひご利用ください。','全ユーザー','published','2026-06-20 00:00:00','2026-07-20 23:59:00',1,64,1,'2026-06-20 10:00:00','2026-06-20 10:00:00',NULL),(3,'利用規約改定のお知らせ','2026年7月1日より利用規約を改定します。','全ユーザー','ended','2026-06-15 00:00:00','2026-06-30 23:59:00',0,88,1,'2026-06-15 10:00:00','2026-06-30 23:59:00',NULL);
/*!40000 ALTER TABLE `admin_notices` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `admin_reports`
--

DROP TABLE IF EXISTS `admin_reports`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `admin_reports` (
  `report_id` bigint NOT NULL AUTO_INCREMENT COMMENT '通報ID',
  `report_type` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '通報種別（投稿/画像/迷惑行為など）',
  `status` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'open' COMMENT '対応状態（open / reviewing / resolved）',
  `target_user_id` bigint DEFAULT NULL COMMENT '通報対象ユーザーID',
  `target_message_id` bigint DEFAULT NULL COMMENT '通報対象メッセージID（投稿扱い）',
  `reporter_user_id` bigint DEFAULT NULL COMMENT '通報したユーザーID',
  `reason` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '通報理由',
  `detail` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT '通報の詳細内容',
  `admin_note` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT '管理者の対応メモ',
  `reported_at` datetime NOT NULL COMMENT '通報日時',
  `resolved_at` datetime DEFAULT NULL COMMENT '対応完了日時',
  `updated_at` datetime DEFAULT NULL COMMENT '更新日時',
  PRIMARY KEY (`report_id`),
  KEY `idx_admin_reports_status` (`status`),
  KEY `idx_admin_reports_target_message_id` (`target_message_id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='管理画面用通報管理テーブル';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `admin_reports`
--

LOCK TABLES `admin_reports` WRITE;
/*!40000 ALTER TABLE `admin_reports` DISABLE KEYS */;
INSERT INTO `admin_reports` VALUES (1,'不適切な投稿','open',2,2,1,'不適切な内容','旅行チャット内の投稿内容について確認してください。','','2026-07-02 10:40:00',NULL,'2026-07-02 10:40:00'),(2,'迷惑行為','reviewing',3,NULL,2,'チャットでの迷惑行為','グループ内で同じ内容の投稿が繰り返されています。','','2026-07-02 08:50:00',NULL,'2026-07-02 09:10:00'),(3,'個人情報の掲載','resolved',4,4,5,'個人情報が含まれる投稿','電話番号を含む投稿があったため確認しました。','該当投稿を確認し、非表示対応済み。','2026-07-01 07:30:00','2026-07-01 08:30:00','2026-07-01 08:30:00');
/*!40000 ALTER TABLE `admin_reports` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `admin_spots`
--

DROP TABLE IF EXISTS `admin_spots`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `admin_spots` (
  `spot_id` bigint NOT NULL AUTO_INCREMENT COMMENT 'スポットID',
  `name` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'スポット名',
  `category` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'スポットカテゴリ',
  `prefecture` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '都道府県',
  `address` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '住所',
  `latitude` decimal(10,7) DEFAULT NULL COMMENT '緯度',
  `longitude` decimal(10,7) DEFAULT NULL COMMENT '経度',
  `status` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'published' COMMENT '公開状態（published / hidden）',
  `created_at` datetime NOT NULL COMMENT '作成日時',
  `updated_at` datetime DEFAULT NULL COMMENT '更新日時',
  `deleted_at` datetime DEFAULT NULL COMMENT '論理削除日時',
  PRIMARY KEY (`spot_id`),
  KEY `idx_admin_spots_status` (`status`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='管理画面用スポットマスターテーブル';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `admin_spots`
--

LOCK TABLES `admin_spots` WRITE;
/*!40000 ALTER TABLE `admin_spots` DISABLE KEYS */;
INSERT INTO `admin_spots` VALUES (1,'伊勢神宮','観光地・神社','三重県','三重県伊勢市宇治館町1',34.4893000,136.7097000,'published','2026-06-18 11:20:00','2026-06-18 11:20:00',NULL),(2,'鳥羽水族館','観光地・水族館','三重県','三重県鳥羽市鳥羽3-3-6',34.4813000,136.8437000,'published','2026-06-18 11:30:00','2026-06-18 11:30:00',NULL),(3,'白良浜','観光地・ビーチ','和歌山県','和歌山県西牟婁郡白浜町864',33.6851000,135.3369000,'hidden','2026-06-18 11:35:00','2026-06-18 11:35:00',NULL),(4,'清水寺','観光地・寺院','京都府','京都府京都市東山区清水1-294',34.9949000,135.7850000,'published','2026-06-18 11:40:00','2026-06-18 11:40:00',NULL);
/*!40000 ALTER TABLE `admin_spots` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `admin_users`
--

DROP TABLE IF EXISTS `admin_users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `admin_users` (
  `admin_user_id` bigint NOT NULL AUTO_INCREMENT COMMENT '管理者ID',
  `user_id` bigint NOT NULL COMMENT 'ユーザーID（usersと紐付け）',
  `admin_level` int DEFAULT NULL COMMENT '権限レベル（例: 1=一般管理者, 9=スーパー管理者）',
  `created_at` datetime DEFAULT NULL COMMENT '登録日時',
  PRIMARY KEY (`admin_user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `admin_users`
--

LOCK TABLES `admin_users` WRITE;
/*!40000 ALTER TABLE `admin_users` DISABLE KEYS */;
INSERT INTO `admin_users` VALUES (1,1,9,'2026-06-16 17:40:00');
/*!40000 ALTER TABLE `admin_users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `albums`
--

DROP TABLE IF EXISTS `albums`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `albums` (
  `album_id` bigint NOT NULL AUTO_INCREMENT COMMENT 'アルバムID',
  `trip_id` bigint DEFAULT NULL COMMENT '旅行ID',
  `title` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'アルバム名',
  `created_by` bigint DEFAULT NULL COMMENT '作成者',
  `created_at` datetime DEFAULT NULL COMMENT '作成日時',
  PRIMARY KEY (`album_id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `albums`
--

LOCK TABLES `albums` WRITE;
/*!40000 ALTER TABLE `albums` DISABLE KEYS */;
INSERT INTO `albums` VALUES (1,1,'三重旅行アルバム',1,'2026-08-20 20:00:00'),(2,2,'北海道旅行アルバム',2,'2026-09-14 20:00:00');
/*!40000 ALTER TABLE `albums` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `audit_logs`
--

DROP TABLE IF EXISTS `audit_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `audit_logs` (
  `audit_log_id` bigint NOT NULL AUTO_INCREMENT COMMENT '監査ログID',
  `actor_user_id` bigint DEFAULT NULL COMMENT '操作ユーザー',
  `action_type` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '操作内容（更新/削除など）',
  `target_table` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '対象テーブル',
  `target_id` bigint DEFAULT NULL COMMENT '対象レコードID',
  `created_at` datetime DEFAULT NULL COMMENT '実行日時',
  PRIMARY KEY (`audit_log_id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `audit_logs`
--

LOCK TABLES `audit_logs` WRITE;
/*!40000 ALTER TABLE `audit_logs` DISABLE KEYS */;
INSERT INTO `audit_logs` VALUES (1,1,'CREATE','user_groups',1,'2026-06-18 10:00:00'),(2,1,'CREATE','trips',1,'2026-06-18 10:30:00'),(3,2,'CREATE','trip_candidates',3,'2026-06-18 11:20:00'),(4,1,'UPDATE','trip_decisions',1,'2026-06-20 18:00:00'),(5,3,'CREATE','expenses',3,'2026-06-22 09:30:00');
/*!40000 ALTER TABLE `audit_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `chat_members`
--

DROP TABLE IF EXISTS `chat_members`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `chat_members` (
  `chat_member_id` bigint NOT NULL AUTO_INCREMENT COMMENT 'チャット参加ID',
  `chat_id` bigint NOT NULL COMMENT 'チャットID',
  `user_id` bigint NOT NULL COMMENT '参加ユーザー',
  `joined_at` datetime DEFAULT NULL COMMENT '参加日時',
  PRIMARY KEY (`chat_member_id`)
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `chat_members`
--

LOCK TABLES `chat_members` WRITE;
/*!40000 ALTER TABLE `chat_members` DISABLE KEYS */;
INSERT INTO `chat_members` VALUES (1,1,1,'2026-06-18 10:30:00'),(2,1,2,'2026-06-18 10:35:00'),(3,1,3,'2026-06-18 10:40:00'),(4,1,4,'2026-06-18 10:45:00'),(5,1,5,'2026-06-18 10:50:00'),(6,1,6,'2026-06-18 10:55:00'),(7,1,7,'2026-06-18 11:00:00'),(8,2,2,'2026-06-20 12:00:00'),(9,2,8,'2026-06-20 12:00:00'),(10,3,1,'2026-06-19 14:10:00'),(11,3,2,'2026-06-19 14:00:00');
/*!40000 ALTER TABLE `chat_members` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `chats`
--

DROP TABLE IF EXISTS `chats`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `chats` (
  `chat_id` bigint NOT NULL AUTO_INCREMENT COMMENT 'チャットID',
  `trip_id` bigint DEFAULT NULL COMMENT '紐づく旅行ID',
  `chat_type` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '種別（group / hotel / support）',
  `related_entity_type` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '関連エンティティ種別（hotel等）',
  `related_entity_id` bigint DEFAULT NULL COMMENT '関連エンティティID',
  `created_at` datetime DEFAULT NULL COMMENT '作成日時',
  PRIMARY KEY (`chat_id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `chats`
--

LOCK TABLES `chats` WRITE;
/*!40000 ALTER TABLE `chats` DISABLE KEYS */;
INSERT INTO `chats` VALUES (1,1,'group',NULL,NULL,'2026-06-18 10:30:00'),(2,1,'hotel','hotel',5,'2026-06-20 12:00:00'),(3,2,'group',NULL,NULL,'2026-06-19 14:00:00');
/*!40000 ALTER TABLE `chats` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `checklist_items`
--

DROP TABLE IF EXISTS `checklist_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `checklist_items` (
  `checklist_item_id` bigint NOT NULL AUTO_INCREMENT COMMENT '項目ID',
  `checklist_id` bigint DEFAULT NULL COMMENT 'チェックリストID',
  `item_name` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '項目名',
  `is_checked` tinyint(1) DEFAULT NULL COMMENT 'チェック状態',
  `assigned_user_id` bigint DEFAULT NULL COMMENT '担当者',
  `sort_order` int DEFAULT NULL COMMENT '表示順',
  PRIMARY KEY (`checklist_item_id`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `checklist_items`
--

LOCK TABLES `checklist_items` WRITE;
/*!40000 ALTER TABLE `checklist_items` DISABLE KEYS */;
INSERT INTO `checklist_items` VALUES (1,1,'モバイルバッテリー',1,1,1),(2,1,'折りたたみ傘',0,2,2),(3,1,'常備薬',0,3,3),(4,1,'着替え2日分',1,1,4),(5,2,'お菓子と飲み物',0,2,1),(6,2,'旅行用シャンプー',0,3,2),(7,3,'防寒着',1,2,1);
/*!40000 ALTER TABLE `checklist_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `checklists`
--

DROP TABLE IF EXISTS `checklists`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `checklists` (
  `checklist_id` bigint NOT NULL AUTO_INCREMENT COMMENT 'チェックリストID',
  `trip_id` bigint DEFAULT NULL COMMENT '旅行ID',
  `checklist_type` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '種類（持ち物 / 買い物）',
  `title` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'タイトル',
  `created_by` bigint DEFAULT NULL COMMENT '作成者',
  PRIMARY KEY (`checklist_id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `checklists`
--

LOCK TABLES `checklists` WRITE;
/*!40000 ALTER TABLE `checklists` DISABLE KEYS */;
INSERT INTO `checklists` VALUES (1,1,'持ち物','三重旅行の持ち物',1),(2,1,'買い物','旅行前に買うもの',2),(3,2,'持ち物','北海道旅行の持ち物',2);
/*!40000 ALTER TABLE `checklists` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `email_change_verifications`
--

DROP TABLE IF EXISTS `email_change_verifications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `email_change_verifications` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT COMMENT 'メールアドレス変更認証データのID',
  `user_id` bigint unsigned NOT NULL COMMENT 'メールアドレスを変更するユーザーID',
  `old_email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '変更前のメールアドレス',
  `new_email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '変更予定の新しいメールアドレス',
  `verification_code` char(6) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'メールで送信した6桁の認証コード',
  `expires_at` datetime NOT NULL COMMENT '認証コードの有効期限',
  `attempt_count` tinyint unsigned NOT NULL DEFAULT '0' COMMENT '認証コードの入力失敗回数',
  `resend_available_at` datetime NOT NULL COMMENT '認証コードを再送信できる日時',
  `used_at` datetime DEFAULT NULL COMMENT '認証コードを使用して変更が完了した日時',
  `invalidated_at` datetime DEFAULT NULL COMMENT '再送信などによって無効化された日時',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '認証コードを作成した日時',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'データを最後に更新した日時',
  PRIMARY KEY (`id`),
  KEY `idx_email_change_user_latest` (`user_id`,`used_at`,`invalidated_at`,`created_at`),
  KEY `idx_email_change_new_email` (`new_email`),
  KEY `idx_email_change_expires_at` (`expires_at`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='メールアドレス変更用の認証コード管理テーブル';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `email_change_verifications`
--

LOCK TABLES `email_change_verifications` WRITE;
/*!40000 ALTER TABLE `email_change_verifications` DISABLE KEYS */;
INSERT INTO `email_change_verifications` VALUES (1,2,'2410041@i-seifu.jp','gvp.1027.fpd@gmail.com','420526','2026-07-16 10:02:06',0,'2026-07-16 09:53:06','2026-07-16 09:52:36',NULL,'2026-07-16 09:52:06','2026-07-16 00:52:36'),(2,2,'gvp.1027.fpd@gmail.com','2410041@i-seifu.jp','696649','2026-07-16 10:05:10',0,'2026-07-16 09:56:10','2026-07-16 09:55:47',NULL,'2026-07-16 09:55:10','2026-07-16 00:55:47');
/*!40000 ALTER TABLE `email_change_verifications` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `expense_participants`
--

DROP TABLE IF EXISTS `expense_participants`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `expense_participants` (
  `expense_participant_id` bigint NOT NULL AUTO_INCREMENT COMMENT '負担者ID',
  `expense_id` bigint DEFAULT NULL COMMENT '支払いID',
  `user_id` bigint DEFAULT NULL COMMENT '対象ユーザー',
  `share_ratio` decimal(5,2) DEFAULT NULL COMMENT '負担割合',
  `share_amount` decimal(10,2) DEFAULT NULL COMMENT '負担額',
  `is_settled` tinyint(1) DEFAULT NULL COMMENT '精算済みか',
  PRIMARY KEY (`expense_participant_id`)
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `expense_participants`
--

LOCK TABLES `expense_participants` WRITE;
/*!40000 ALTER TABLE `expense_participants` DISABLE KEYS */;
INSERT INTO `expense_participants` VALUES (1,1,1,33.33,10000.00,1),(2,1,2,33.33,10000.00,0),(3,1,3,33.34,10000.00,0),(4,2,1,33.33,4200.00,0),(5,2,2,33.33,4200.00,1),(6,2,3,33.34,4200.00,0),(7,3,1,33.33,2800.00,0),(8,3,2,33.33,2800.00,0),(9,3,3,33.34,2800.00,1),(10,4,1,50.00,1600.00,0),(11,4,2,50.00,1600.00,1);
/*!40000 ALTER TABLE `expense_participants` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `expenses`
--

DROP TABLE IF EXISTS `expenses`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `expenses` (
  `expense_id` bigint NOT NULL AUTO_INCREMENT COMMENT '支払いID',
  `trip_id` bigint DEFAULT NULL COMMENT '旅行ID',
  `paid_by_user_id` bigint DEFAULT NULL COMMENT '支払者',
  `title` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '内容（例: 宿代）',
  `amount` decimal(10,2) DEFAULT NULL COMMENT '金額',
  `expense_date` date DEFAULT NULL COMMENT '支払日',
  `category` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'カテゴリ',
  `memo` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT 'メモ',
  PRIMARY KEY (`expense_id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `expenses`
--

LOCK TABLES `expenses` WRITE;
/*!40000 ALTER TABLE `expenses` DISABLE KEYS */;
INSERT INTO `expenses` VALUES (1,1,1,'ホテル予約金',30000.00,'2026-06-20','宿泊','3名分の予約金'),(2,1,2,'近鉄特急券',12600.00,'2026-06-21','交通','往路3名分'),(3,1,3,'水族館前売り券',8400.00,'2026-06-22','観光','大人3名分'),(4,2,2,'北海道までの航空券代',48000.00,'2026-09-12','交通','2名分');
/*!40000 ALTER TABLE `expenses` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `group_invitations`
--

DROP TABLE IF EXISTS `group_invitations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `group_invitations` (
  `invitation_id` bigint NOT NULL AUTO_INCREMENT COMMENT '招待ID',
  `group_id` bigint NOT NULL COMMENT '招待対象のグループID',
  `invited_by` bigint NOT NULL COMMENT '招待を送信したユーザーID',
  `invited_user_id` bigint DEFAULT NULL COMMENT '招待されたユーザーID（未登録ユーザーはNULLも想定）',
  `invitation_token` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '招待リンク用トークン（URL経由参加用）',
  `status` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '状態（pending / accepted / expired / rejected）',
  `expired_at` datetime DEFAULT NULL COMMENT '有効期限（期限切れ判定に使用）',
  `created_at` datetime NOT NULL COMMENT '作成日時',
  PRIMARY KEY (`invitation_id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `group_invitations`
--

LOCK TABLES `group_invitations` WRITE;
/*!40000 ALTER TABLE `group_invitations` DISABLE KEYS */;
INSERT INTO `group_invitations` VALUES (1,1,1,2,'test-invite-mie-hiroto-001','accepted','2026-06-25 23:59:59','2026-06-18 10:05:00'),(2,1,1,3,'test-invite-mie-metax-001','accepted','2026-06-25 23:59:59','2026-06-18 10:06:00'),(3,2,2,3,'test-invite-hokkaido-metax-001','pending','2026-06-28 23:59:59','2026-06-21 12:00:00');
/*!40000 ALTER TABLE `group_invitations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `group_members`
--

DROP TABLE IF EXISTS `group_members`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `group_members` (
  `group_member_id` bigint NOT NULL AUTO_INCREMENT COMMENT 'グループ所属レコードID',
  `group_id` bigint NOT NULL COMMENT '所属グループID',
  `user_id` bigint NOT NULL COMMENT '所属ユーザーID',
  `role_in_group` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'member' COMMENT '役割（admin / member）',
  `joined_at` datetime DEFAULT NULL COMMENT '参加日時',
  `invitation_status` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '招待状態（pending / accepted / rejected）',
  PRIMARY KEY (`group_member_id`)
) ENGINE=InnoDB AUTO_INCREMENT=15 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `group_members`
--

LOCK TABLES `group_members` WRITE;
/*!40000 ALTER TABLE `group_members` DISABLE KEYS */;
INSERT INTO `group_members` VALUES (1,1,1,'admin','2026-06-18 10:00:00','accepted'),(2,1,2,'member','2026-06-18 10:10:00','accepted'),(3,1,3,'member','2026-06-18 10:15:00','accepted'),(4,1,4,'member','2026-06-18 10:20:00','accepted'),(5,1,5,'member','2026-06-18 10:25:00','accepted'),(6,1,6,'member','2026-06-18 10:30:00','accepted'),(7,1,7,'member','2026-06-18 10:35:00','accepted'),(8,2,2,'admin','2026-06-19 13:00:00','accepted'),(9,2,1,'member','2026-06-19 13:20:00','accepted'),(14,3,2,'admin','2026-07-13 14:33:55','accepted');
/*!40000 ALTER TABLE `group_members` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `itineraries`
--

DROP TABLE IF EXISTS `itineraries`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `itineraries` (
  `itinerary_id` bigint NOT NULL AUTO_INCREMENT COMMENT '旅程ID（1日単位の行程）',
  `trip_id` bigint NOT NULL COMMENT '対象旅行ID',
  `itinerary_date` date NOT NULL COMMENT '対象日（旅行内の日付）',
  `title` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'タイトル（例: 1日目プラン）',
  `note` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT '備考・説明',
  PRIMARY KEY (`itinerary_id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `itineraries`
--

LOCK TABLES `itineraries` WRITE;
/*!40000 ALTER TABLE `itineraries` DISABLE KEYS */;
INSERT INTO `itineraries` VALUES (1,1,'2026-08-20','1日目 伊勢','伊勢神宮とおかげ横丁を巡ります。'),(2,1,'2026-08-21','2日目 鳥羽','鳥羽水族館と海沿いを観光します。'),(3,1,'2026-08-22','3日目 帰宅','朝食後にお土産を購入して帰ります。'),(4,2,'2026-09-12','1日目 札幌','大通公園と時計台、すすきの周辺を巡ります。');
/*!40000 ALTER TABLE `itineraries` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `itinerary_items`
--

DROP TABLE IF EXISTS `itinerary_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `itinerary_items` (
  `itinerary_item_id` bigint NOT NULL AUTO_INCREMENT COMMENT '行程項目ID',
  `itinerary_id` bigint NOT NULL COMMENT '所属旅程ID',
  `item_type` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '種別（move / visit / meal / hotel / free_time）',
  `place_id` bigint DEFAULT NULL COMMENT '関連する場所ID（移動・観光・宿泊など）',
  `start_time` datetime DEFAULT NULL COMMENT '開始時刻',
  `end_time` datetime DEFAULT NULL COMMENT '終了時刻',
  `order_no` int DEFAULT NULL COMMENT '表示順序（UI表示制御用）',
  `memo` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT 'メモ・補足情報',
  PRIMARY KEY (`itinerary_item_id`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `itinerary_items`
--

LOCK TABLES `itinerary_items` WRITE;
/*!40000 ALTER TABLE `itinerary_items` DISABLE KEYS */;
INSERT INTO `itinerary_items` VALUES (1,1,'move',NULL,'2026-08-20 08:00:00','2026-08-20 10:00:00',1,'近鉄特急で伊勢市駅へ移動'),(2,1,'visit',3,'2026-08-20 10:30:00','2026-08-20 12:30:00',2,'伊勢神宮 外宮・内宮を参拝'),(3,1,'meal',6,'2026-08-20 13:00:00','2026-08-20 14:00:00',3,'伊勢うどんを食べる'),(4,1,'hotel',5,'2026-08-20 15:00:00','2026-08-20 16:00:00',4,'鳥羽シーサイドコテージへチェックイン'),(5,2,'visit',4,'2026-08-21 10:00:00','2026-08-21 14:00:00',1,'鳥羽水族館を見学'),(6,2,'free_time',NULL,'2026-08-21 15:00:00','2026-08-21 17:00:00',2,'鳥羽駅周辺で自由行動'),(7,4,'visit',NULL,'2026-09-12 09:30:00','2026-09-12 11:30:00',1,'大通公園と時計台周辺を散策');
/*!40000 ALTER TABLE `itinerary_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `message_reads`
--

DROP TABLE IF EXISTS `message_reads`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `message_reads` (
  `message_read_id` bigint NOT NULL AUTO_INCREMENT COMMENT '既読管理ID',
  `message_id` bigint NOT NULL COMMENT '対象メッセージID',
  `user_id` bigint NOT NULL COMMENT '既読ユーザーID',
  `read_at` datetime DEFAULT NULL COMMENT '既読日時',
  PRIMARY KEY (`message_read_id`)
) ENGINE=InnoDB AUTO_INCREMENT=51 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `message_reads`
--

LOCK TABLES `message_reads` WRITE;
/*!40000 ALTER TABLE `message_reads` DISABLE KEYS */;
INSERT INTO `message_reads` VALUES (1,1,2,'2026-06-18 16:01:00'),(2,1,3,'2026-06-18 16:01:30'),(3,2,1,'2026-06-18 16:03:00'),(4,2,3,'2026-06-18 16:03:30'),(5,3,1,'2026-06-18 16:06:00'),(6,3,2,'2026-06-18 16:06:30'),(7,4,2,'2026-06-18 16:11:00'),(8,4,3,'2026-06-18 16:11:30'),(9,6,1,'2026-06-19 18:01:00'),(10,7,2,'2026-06-19 18:06:00'),(11,6,2,'2026-07-13 02:29:48'),(12,9,2,'2026-07-13 02:29:48'),(13,10,2,'2026-07-13 02:29:48'),(14,12,2,'2026-07-13 02:29:48'),(15,15,2,'2026-07-13 02:29:48'),(16,16,2,'2026-07-13 02:29:48'),(17,17,2,'2026-07-13 02:29:48'),(18,1,5,'2026-07-13 05:40:15'),(19,2,5,'2026-07-13 05:40:15'),(20,3,5,'2026-07-13 05:40:15'),(21,4,5,'2026-07-13 05:40:15'),(22,1,4,'2026-07-13 05:41:05'),(23,2,4,'2026-07-13 05:41:05'),(24,3,4,'2026-07-13 05:41:05'),(25,4,4,'2026-07-13 05:41:05'),(26,18,4,'2026-07-13 05:41:23'),(27,18,3,'2026-07-13 06:19:59'),(28,1,6,'2026-07-13 06:22:13'),(29,2,6,'2026-07-13 06:22:13'),(30,3,6,'2026-07-13 06:22:13'),(31,4,6,'2026-07-13 06:22:13'),(32,18,6,'2026-07-13 06:22:13'),(33,19,3,'2026-07-13 06:22:23'),(34,19,5,'2026-07-13 06:22:23'),(35,20,6,'2026-07-13 06:22:28'),(36,21,6,'2026-07-13 06:22:50'),(37,20,5,'2026-07-13 06:22:52'),(38,21,5,'2026-07-13 06:22:52'),(39,14,2,'2026-07-13 07:00:16'),(40,18,2,'2026-07-13 07:51:22'),(41,19,2,'2026-07-13 07:51:22'),(42,20,2,'2026-07-13 07:51:22'),(43,21,2,'2026-07-13 07:51:22'),(44,18,1,'2026-07-16 05:59:31'),(45,19,1,'2026-07-16 05:59:31'),(46,20,1,'2026-07-16 05:59:31'),(47,21,1,'2026-07-16 05:59:31'),(48,19,4,'2026-07-16 08:44:16'),(49,20,4,'2026-07-16 08:44:16'),(50,21,4,'2026-07-16 08:44:16');
/*!40000 ALTER TABLE `message_reads` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `messages`
--

DROP TABLE IF EXISTS `messages`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `messages` (
  `message_id` bigint NOT NULL AUTO_INCREMENT COMMENT 'メッセージID',
  `chat_id` bigint DEFAULT NULL COMMENT 'チャットID',
  `sender_user_id` bigint DEFAULT NULL COMMENT '送信者',
  `body` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT '本文',
  `image_url` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '画像パス（画像メッセージの場合）',
  `sent_at` datetime DEFAULT NULL COMMENT '送信日時',
  `admin_visibility_status` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'visible' COMMENT '管理画面での表示状態（visible / hidden）',
  `admin_deleted_at` datetime DEFAULT NULL COMMENT '管理画面から削除扱いにした日時',
  PRIMARY KEY (`message_id`)
) ENGINE=InnoDB AUTO_INCREMENT=22 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `messages`
--

LOCK TABLES `messages` WRITE;
/*!40000 ALTER TABLE `messages` DISABLE KEYS */;
INSERT INTO `messages` VALUES (1,1,1,'三重旅行、伊勢神宮は外せないよね！',NULL,'2026-06-18 16:00:00','visible',NULL),(2,1,2,'鳥羽水族館にも行きたいです。',NULL,'2026-06-18 16:02:00','visible',NULL),(3,1,3,'宿は温泉付きで探してみます。',NULL,'2026-06-18 16:05:00','visible',NULL),(4,1,1,'予算は1人5万円くらいを目安にしよう。',NULL,'2026-06-18 16:10:00','visible',NULL),(5,2,2,'3名でコテージの宿泊を考えています。8月20日〜22日の空室はありますか？',NULL,'2026-06-20 12:10:00','visible',NULL),(6,2,8,'お問い合わせありがとうございます！8月20日〜22日（2泊3日）、3名様でのご利用ですね。その日程は空室がございます。',NULL,'2026-06-20 13:00:00','visible',NULL),(7,2,8,'コテージAは最大4名様までご利用いただけます。BBQスペースも完備しており、グループ旅行に最適です。ご興味はいかがでしょうか？',NULL,'2026-06-20 13:02:00','visible',NULL),(8,2,2,'BBQ付きはいいですね！料金を教えていただけますか？',NULL,'2026-06-20 13:30:00','visible',NULL),(9,2,8,'コテージA（最大4名）の2泊分の料金は36,000円（税込）です。3名様でご利用の場合、お1人あたり約12,000円になります。',NULL,'2026-06-20 14:00:00','visible',NULL),(10,2,8,'チェックインは15:00〜、チェックアウトは11:00となっております。駐車場は無料でご利用いただけます。',NULL,'2026-06-20 14:02:00','visible',NULL),(11,2,2,'ありがとうございます！グループで相談してまた連絡します。',NULL,'2026-06-20 14:30:00','visible',NULL),(12,2,8,'ごゆっくりご検討ください。ご予約はお早めにどうぞ。ご不明な点があればいつでもお気軽にご連絡ください！',NULL,'2026-06-20 14:35:00','visible',NULL),(13,3,2,'北海道はまず札幌から回るのはどう？',NULL,'2026-06-19 18:00:00','visible',NULL),(14,3,1,'賛成！午後は小樽運河にも行きたい。',NULL,'2026-06-19 18:05:00','visible',NULL),(15,2,8,'お問い合わせありがとうございます。3名様の空室をご用意できます。ご希望の日程を教えてください。',NULL,'2026-06-20 13:00:00','visible',NULL),(16,2,1,'8月20日から22日で、3名でお願いできますか？',NULL,'2026-06-20 14:00:00','visible',NULL),(17,2,8,'はい、その日程でご予約可能です。到着予定時刻をお知らせください。',NULL,'2026-06-20 14:30:00','visible',NULL),(18,1,5,'こんちゃ',NULL,'2026-07-13 05:41:21','visible',NULL),(19,1,6,'おひさしぶりどす',NULL,'2026-07-13 06:22:22','visible',NULL),(20,1,3,'ちゃす',NULL,'2026-07-13 06:22:27','visible',NULL),(21,1,3,NULL,'/TABI/uploads/chat/20260713_152249_63a8cb46b0e6.jpg','2026-07-13 06:22:49','visible',NULL);
/*!40000 ALTER TABLE `messages` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `password_reset_tokens`
--

DROP TABLE IF EXISTS `password_reset_tokens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `password_reset_tokens` (
  `password_reset_token_id` bigint NOT NULL AUTO_INCREMENT COMMENT 'パスワード再設定データを識別するID',
  `user_id` int NOT NULL COMMENT 'パスワードを再設定するユーザーID。users.user_idと紐付ける',
  `reset_token` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'パスワード再設定URLで使用する一時トークン。今回の開発方針ではハッシュ化せず保存する',
  `expires_at` datetime NOT NULL COMMENT '再設定URLを使用できる期限。今回はメール送信から1時間後に設定する',
  `used_at` datetime DEFAULT NULL COMMENT '再設定URLを使用した日時。未使用の場合はNULL',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '再設定メールの発行日時',
  PRIMARY KEY (`password_reset_token_id`) COMMENT '各トークン行を一意に識別する主キー',
  UNIQUE KEY `uq_password_reset_tokens_token` (`reset_token`) COMMENT '同じ再設定トークンが重複しないようにする',
  KEY `idx_password_reset_tokens_user_id` (`user_id`) COMMENT 'ユーザーごとの未使用トークンを探しやすくする',
  KEY `idx_password_reset_tokens_expires_at` (`expires_at`) COMMENT '有効期限切れトークンを確認しやすくする',
  CONSTRAINT `fk_password_reset_tokens_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='パスワード再設定用の一時URLを管理するテーブル';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `password_reset_tokens`
--

LOCK TABLES `password_reset_tokens` WRITE;
/*!40000 ALTER TABLE `password_reset_tokens` DISABLE KEYS */;
INSERT INTO `password_reset_tokens` VALUES (4,2,'0d1370adf7570f58d63fbf130f3cb6ef29382e90d56b9136af7e322793feb912','2026-07-15 19:59:19',NULL,'2026-07-15 18:59:19');
/*!40000 ALTER TABLE `password_reset_tokens` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `photo_hashtags`
--

DROP TABLE IF EXISTS `photo_hashtags`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `photo_hashtags` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '写真ハッシュタグID',
  `photo_id` bigint NOT NULL COMMENT '写真ID',
  `hashtag` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'ハッシュタグ',
  PRIMARY KEY (`id`),
  KEY `idx_photo_id` (`photo_id`),
  KEY `idx_hashtag` (`hashtag`),
  CONSTRAINT `fk_photo_hashtags_photo` FOREIGN KEY (`photo_id`) REFERENCES `photos` (`photo_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=20 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='写真ハッシュタグ';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `photo_hashtags`
--

LOCK TABLES `photo_hashtags` WRITE;
/*!40000 ALTER TABLE `photo_hashtags` DISABLE KEYS */;
INSERT INTO `photo_hashtags` VALUES (19,38,'aaaa');
/*!40000 ALTER TABLE `photo_hashtags` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `photo_tags`
--

DROP TABLE IF EXISTS `photo_tags`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `photo_tags` (
  `photo_tag_id` bigint NOT NULL AUTO_INCREMENT COMMENT 'タグID',
  `photo_id` bigint NOT NULL COMMENT '対象写真ID',
  `tagged_user_id` bigint NOT NULL COMMENT 'タグ付けされたユーザーID',
  PRIMARY KEY (`photo_tag_id`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `photo_tags`
--

LOCK TABLES `photo_tags` WRITE;
/*!40000 ALTER TABLE `photo_tags` DISABLE KEYS */;
INSERT INTO `photo_tags` VALUES (1,1,1),(2,1,2),(3,1,3),(4,2,2),(5,2,3),(6,3,1),(7,4,1),(8,4,2);
/*!40000 ALTER TABLE `photo_tags` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `photos`
--

DROP TABLE IF EXISTS `photos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `photos` (
  `photo_id` bigint NOT NULL AUTO_INCREMENT COMMENT '写真ID',
  `album_id` bigint DEFAULT NULL COMMENT '所属アルバム',
  `uploaded_by` bigint DEFAULT NULL COMMENT 'アップロード者',
  `file_url` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT '画像URL',
  `caption` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT '説明',
  `shot_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`photo_id`)
) ENGINE=InnoDB AUTO_INCREMENT=39 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `photos`
--

LOCK TABLES `photos` WRITE;
/*!40000 ALTER TABLE `photos` DISABLE KEYS */;
INSERT INTO `photos` VALUES (34,2,1,'photos/ddd0b0c52d7605d58a73a3dac014a8a0.png','','0000-00-00 00:00:00'),(35,2,1,'photos/c953a681982a7504c8922e1e6ec3df4f.png','','2026-07-17 01:19:49'),(36,2,1,'photos/70cff7a90281dca6df1e821c07dd4cdf.png','','2026-07-17 01:25:26'),(37,2,1,'photos/851092d613805f62dbd50c2716ec900a.png','','2026-07-17 10:30:36'),(38,2,1,'photos/e9a5044bdf730faacf55bd4525dafa83.png','aaaa','2026-07-17 10:39:47');
/*!40000 ALTER TABLE `photos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `roles`
--

DROP TABLE IF EXISTS `roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `roles` (
  `role_id` bigint NOT NULL AUTO_INCREMENT COMMENT 'ロールID（権限の種類を識別）',
  `role_name` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'ロール名（例: admin / user / moderator）',
  PRIMARY KEY (`role_id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `roles`
--

LOCK TABLES `roles` WRITE;
/*!40000 ALTER TABLE `roles` DISABLE KEYS */;
INSERT INTO `roles` VALUES (1,'admin'),(2,'user'),(3,'moderator');
/*!40000 ALTER TABLE `roles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `settlements`
--

DROP TABLE IF EXISTS `settlements`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `settlements` (
  `settlement_id` bigint NOT NULL AUTO_INCREMENT COMMENT '精算ID',
  `trip_id` bigint NOT NULL COMMENT '対象旅行ID',
  `from_user_id` bigint NOT NULL COMMENT '支払う側ユーザー',
  `to_user_id` bigint NOT NULL COMMENT '受け取る側ユーザー',
  `amount` decimal(10,2) NOT NULL COMMENT '精算金額',
  `status` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '状態（pending / completed / cancelled）',
  `settled_at` datetime DEFAULT NULL COMMENT '精算完了日時',
  `created_at` datetime NOT NULL COMMENT '作成日時',
  PRIMARY KEY (`settlement_id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `settlements`
--

LOCK TABLES `settlements` WRITE;
/*!40000 ALTER TABLE `settlements` DISABLE KEYS */;
INSERT INTO `settlements` VALUES (1,1,2,1,10000.00,'pending',NULL,'2026-06-22 10:00:00'),(2,1,3,1,10000.00,'pending',NULL,'2026-06-22 10:01:00'),(3,1,1,2,4200.00,'completed','2026-06-22 11:00:00','2026-06-22 10:02:00'),(4,1,3,2,4200.00,'pending',NULL,'2026-06-22 10:03:00'),(5,2,1,2,1600.00,'pending',NULL,'2026-09-12 18:00:00');
/*!40000 ALTER TABLE `settlements` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `system_errors`
--

DROP TABLE IF EXISTS `system_errors`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `system_errors` (
  `error_id` int NOT NULL AUTO_INCREMENT,
  `source` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'php, react, websocket, s3, db など',
  `level` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'error' COMMENT 'info, warning, error, critical',
  `message` text COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'エラーメッセージ',
  `detail` text COLLATE utf8mb4_unicode_ci COMMENT '詳細情報',
  `url` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '発生URL',
  `user_id` int DEFAULT NULL COMMENT '発生ユーザーID',
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'unresolved' COMMENT 'unresolved, checking, resolved',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `resolved_at` datetime DEFAULT NULL,
  `error_type` varchar(80) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `error_code` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `page_path` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `request_url` varchar(1000) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `http_status` int DEFAULT NULL,
  `user_agent` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `stack_trace` text COLLATE utf8mb4_unicode_ci,
  `fingerprint` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `occurrence_count` int NOT NULL DEFAULT '1',
  `first_occurred_at` datetime DEFAULT NULL,
  `last_occurred_at` datetime DEFAULT NULL,
  PRIMARY KEY (`error_id`)
) ENGINE=InnoDB AUTO_INCREMENT=140 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `system_errors`
--

LOCK TABLES `system_errors` WRITE;
/*!40000 ALTER TABLE `system_errors` DISABLE KEYS */;
INSERT INTO `system_errors` VALUES (1,'test','error','Dashboard表示テスト','system_errors テーブルの表示確認用テストデータです','/admin/dashboard',NULL,'resolved','2026-07-13 07:58:11','2026-07-16 04:27:16',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,NULL,NULL),(2,'frontend','error','e is not iterable','{\"error_type\":\"JAVASCRIPT_ERROR\",\"error_code\":\"UNHANDLED_PROMISE_REJECTION\",\"source\":\"window.unhandledrejection\",\"page_path\":\"/TABI/admin/managers\",\"request_url\":null,\"http_status\":null,\"user_agent\":\"Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Mobile Safari/537.36\",\"stack_trace\":\"TypeError: e is not iterable\\n    at https://genshin.mond.jp/TABI/assets/index-DG9gfqYv.js:3235:378197\",\"fingerprint\":\"UNHANDLED_PROMISE_REJECTION|/TABI/admin/managers|window.unhandledrejection||e is not iterable\",\"component\":null}','/TABI/admin/managers',2,'resolved','2026-07-15 09:24:46','2026-07-16 04:27:16','JAVASCRIPT_ERROR','UNHANDLED_PROMISE_REJECTION','/TABI/admin/managers',NULL,NULL,'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Mobile Safari/537.36','TypeError: e is not iterable\n    at https://genshin.mond.jp/TABI/assets/index-BAFIwwmI.js:3235:378158','UNHANDLED_PROMISE_REJECTION|/TABI/admin/managers|window.unhandledrejection||e is not iterable',2,'2026-07-15 09:24:46','2026-07-15 09:25:07'),(3,'frontend','error','API request failed with HTTP 500','{\"error_type\":\"API_ERROR\",\"error_code\":\"API_HTTP_ERROR\",\"source\":\"fetch\",\"page_path\":\"/TABI/mypage\",\"request_url\":\"https://genshin.mond.jp/TABI/api/Auth/PasswordResetRequest.php\",\"http_status\":500,\"user_agent\":\"Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1\",\"stack_trace\":null,\"fingerprint\":\"API_HTTP_ERROR|/TABI/mypage|fetch|https://genshin.mond.jp/TABI/api/Auth/PasswordResetRequest.php|API request failed with HTTP 500\",\"component\":null}','/TABI/mypage',2,'resolved','2026-07-15 09:34:38','2026-07-16 04:27:16','API_ERROR','API_HTTP_ERROR','/TABI/mypage','https://genshin.mond.jp/TABI/api/Auth/PasswordResetRequest.php',500,'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1',NULL,'API_HTTP_ERROR|/TABI/mypage|fetch|https://genshin.mond.jp/TABI/api/Auth/PasswordResetRequest.php|API request failed with HTTP 500',3,'2026-07-15 09:34:38','2026-07-15 09:51:06'),(4,'auth','error','パスワード再設定メールの送信に失敗しました','{\"error_type\":\"PASSWORD_RESET_MAIL_FAILED\",\"error_code\":\"PASSWORD_RESET_MAIL_FAILED\",\"reason\":\"GAS側でメール送信に失敗しました: Missing recipient or reply body\",\"email\":\"provided\",\"request_url\":\"/TABI/api/Auth/PasswordResetRequest.php\",\"fingerprint\":\"e891555bcadf07d1455d91cb7af29d14b5e515047d04dfb07075ef6aa1468d8c\"}','/TABI/api/Auth/PasswordResetRequest.php',2,'resolved','2026-07-15 09:42:40','2026-07-16 04:27:16','PASSWORD_RESET_MAIL_FAILED','PASSWORD_RESET_MAIL_FAILED',NULL,'/TABI/api/Auth/PasswordResetRequest.php',NULL,NULL,NULL,'e891555bcadf07d1455d91cb7af29d14b5e515047d04dfb07075ef6aa1468d8c',2,'2026-07-15 09:42:40','2026-07-15 09:51:06'),(5,'frontend','error','API request failed with HTTP 500','{\"error_type\":\"API_ERROR\",\"error_code\":\"API_HTTP_ERROR\",\"source\":\"fetch\",\"page_path\":\"/TABI/mypage/email-change\",\"request_url\":\"https://genshin.mond.jp/TABI/api/User/EmailChangeSendCode.php\",\"http_status\":500,\"user_agent\":\"Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1\",\"stack_trace\":null,\"fingerprint\":\"API_HTTP_ERROR|/TABI/mypage/email-change|fetch|https://genshin.mond.jp/TABI/api/User/EmailChangeSendCode.php|API request failed with HTTP 500\",\"component\":null}','/TABI/mypage/email-change',2,'resolved','2026-07-16 00:09:19','2026-07-16 04:07:58','API_ERROR','API_HTTP_ERROR','/TABI/mypage/email-change','https://genshin.mond.jp/TABI/api/User/EmailChangeSendCode.php',500,'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1',NULL,'API_HTTP_ERROR|/TABI/mypage/email-change|fetch|https://genshin.mond.jp/TABI/api/User/EmailChangeSendCode.php|API request failed with HTTP 500',1,'2026-07-16 00:09:19','2026-07-16 00:09:19'),(6,'websocket','warning','WebSocket通知設定が不足しています','{\"room\":\"admin:global\",\"event\":\"user_active_updated\",\"reason\":\"REALTIME_SECRET is not set.\"}','/TABI/api/auth/login.php',NULL,'unresolved','2026-07-16 04:40:41',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,'2026-07-16 04:40:41','2026-07-16 04:40:41'),(7,'s3','error','AWS SDK autoload が見つかりません','{\"path\":\"/var/www/html/TABI/api/Groups/../vendor/autoload.php\"}','/TABI/api/Groups/List.php',NULL,'unresolved','2026-07-16 04:40:42',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,'2026-07-16 04:40:42','2026-07-16 04:40:42'),(8,'s3','error','AWS SDK autoload が見つかりません','{\"path\":\"/var/www/html/TABI/api/Groups/../vendor/autoload.php\"}','/TABI/api/Auth/whoami.php',NULL,'unresolved','2026-07-16 04:40:42',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,'2026-07-16 04:40:42','2026-07-16 04:40:42'),(9,'s3','error','AWS SDK autoload が見つかりません','{\"path\":\"/var/www/html/TABI/api/Groups/../vendor/autoload.php\"}','/TABI/api/Groups/List.php',NULL,'unresolved','2026-07-16 04:40:42',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,'2026-07-16 04:40:42','2026-07-16 04:40:42'),(10,'s3','error','AWS SDK autoload が見つかりません','{\"path\":\"/var/www/html/TABI/api/Groups/../vendor/autoload.php\"}','/TABI/api/Auth/whoami.php',NULL,'unresolved','2026-07-16 04:40:42',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,'2026-07-16 04:40:42','2026-07-16 04:40:42'),(11,'s3','error','AWS SDK autoload が見つかりません','{\"path\":\"/var/www/html/TABI/api/Groups/../vendor/autoload.php\"}','/TABI/api/Groups/List.php',NULL,'unresolved','2026-07-16 04:40:43',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,'2026-07-16 04:40:43','2026-07-16 04:40:43'),(12,'s3','error','AWS SDK autoload が見つかりません','{\"path\":\"/var/www/html/TABI/api/Groups/../vendor/autoload.php\"}','/TABI/api/Groups/List.php',NULL,'unresolved','2026-07-16 04:40:43',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,'2026-07-16 04:40:43','2026-07-16 04:40:43'),(13,'s3','error','AWS SDK autoload が見つかりません','{\"path\":\"/var/www/html/TABI/api/Groups/../vendor/autoload.php\"}','/TABI/api/Auth/whoami.php',NULL,'unresolved','2026-07-16 04:40:47',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,'2026-07-16 04:40:47','2026-07-16 04:40:47'),(14,'s3','error','AWS SDK autoload が見つかりません','{\"path\":\"/var/www/html/TABI/api/Groups/../vendor/autoload.php\"}','/TABI/api/Auth/whoami.php',NULL,'unresolved','2026-07-16 04:40:47',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,'2026-07-16 04:40:47','2026-07-16 04:40:47'),(15,'s3','error','AWS SDK autoload が見つかりません','{\"path\":\"/var/www/html/TABI/api/Groups/../vendor/autoload.php\"}','/TABI/api/Auth/whoami.php',NULL,'unresolved','2026-07-16 04:40:50',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,'2026-07-16 04:40:50','2026-07-16 04:40:50'),(16,'s3','error','AWS SDK autoload が見つかりません','{\"path\":\"/var/www/html/TABI/api/Groups/../vendor/autoload.php\"}','/TABI/api/Chat/Messages.php?group_id=1',NULL,'unresolved','2026-07-16 04:40:50',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,'2026-07-16 04:40:50','2026-07-16 04:40:50'),(17,'s3','error','AWS SDK autoload が見つかりません','{\"path\":\"/var/www/html/TABI/api/Groups/../vendor/autoload.php\"}','/TABI/api/Auth/whoami.php',NULL,'unresolved','2026-07-16 04:40:51',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,'2026-07-16 04:40:51','2026-07-16 04:40:51'),(18,'s3','error','AWS SDK autoload が見つかりません','{\"path\":\"/var/www/html/TABI/api/Groups/../vendor/autoload.php\"}','/TABI/api/Auth/whoami.php',NULL,'unresolved','2026-07-16 04:40:55',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,'2026-07-16 04:40:55','2026-07-16 04:40:55'),(19,'s3','error','AWS SDK autoload が見つかりません','{\"path\":\"/var/www/html/TABI/api/Groups/../vendor/autoload.php\"}','/TABI/api/Auth/whoami.php',NULL,'unresolved','2026-07-16 04:40:56',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,'2026-07-16 04:40:56','2026-07-16 04:40:56'),(20,'s3','error','AWS SDK autoload が見つかりません','{\"path\":\"/var/www/html/TABI/api/Groups/../vendor/autoload.php\"}','/TABI/api/Auth/whoami.php',NULL,'unresolved','2026-07-16 04:40:59',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,'2026-07-16 04:40:59','2026-07-16 04:40:59'),(21,'s3','error','AWS SDK autoload が見つかりません','{\"path\":\"/var/www/html/TABI/api/Groups/../vendor/autoload.php\"}','/TABI/api/Auth/whoami.php',NULL,'unresolved','2026-07-16 04:40:59',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,'2026-07-16 04:40:59','2026-07-16 04:40:59'),(22,'s3','error','AWS SDK autoload が見つかりません','{\"path\":\"/var/www/html/TABI/api/Groups/../vendor/autoload.php\"}','/TABI/api/Auth/whoami.php',NULL,'unresolved','2026-07-16 04:41:06',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,'2026-07-16 04:41:06','2026-07-16 04:41:06'),(23,'s3','error','AWS SDK autoload が見つかりません','{\"path\":\"/var/www/html/TABI/api/Groups/../vendor/autoload.php\"}','/TABI/api/Auth/whoami.php',NULL,'unresolved','2026-07-16 04:41:06',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,'2026-07-16 04:41:06','2026-07-16 04:41:06'),(24,'s3','error','AWS SDK autoload が見つかりません','{\"path\":\"/var/www/html/TABI/api/Groups/../vendor/autoload.php\"}','/TABI/api/Auth/whoami.php',NULL,'unresolved','2026-07-16 04:41:07',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,'2026-07-16 04:41:07','2026-07-16 04:41:07'),(25,'s3','error','AWS SDK autoload が見つかりません','{\"path\":\"/var/www/html/TABI/api/Groups/../vendor/autoload.php\"}','/TABI/api/Chat/Messages.php?group_id=1',NULL,'unresolved','2026-07-16 04:41:08',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,'2026-07-16 04:41:08','2026-07-16 04:41:08'),(26,'s3','error','AWS SDK autoload が見つかりません','{\"path\":\"/var/www/html/TABI/api/Groups/../vendor/autoload.php\"}','/TABI/api/Auth/whoami.php',NULL,'unresolved','2026-07-16 04:41:08',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,'2026-07-16 04:41:08','2026-07-16 04:41:08'),(27,'s3','error','AWS SDK autoload が見つかりません','{\"path\":\"/var/www/html/TABI/api/Groups/../vendor/autoload.php\"}','/TABI/api/Auth/whoami.php',NULL,'unresolved','2026-07-16 04:41:38',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,'2026-07-16 04:41:38','2026-07-16 04:41:38'),(28,'s3','error','AWS SDK autoload が見つかりません','{\"path\":\"/var/www/html/TABI/api/Groups/../vendor/autoload.php\"}','/TABI/api/Auth/whoami.php',NULL,'unresolved','2026-07-16 04:41:38',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,'2026-07-16 04:41:38','2026-07-16 04:41:38'),(29,'s3','error','AWS SDK autoload が見つかりません','{\"path\":\"/var/www/html/TABI/api/Groups/../vendor/autoload.php\"}','/TABI/api/Auth/whoami.php',NULL,'unresolved','2026-07-16 04:41:44',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,'2026-07-16 04:41:44','2026-07-16 04:41:44'),(30,'s3','error','AWS SDK autoload が見つかりません','{\"path\":\"/var/www/html/TABI/api/Groups/../vendor/autoload.php\"}','/TABI/api/Auth/whoami.php',NULL,'unresolved','2026-07-16 04:41:45',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,'2026-07-16 04:41:45','2026-07-16 04:41:45'),(31,'s3','error','AWS SDK autoload が見つかりません','{\"path\":\"/var/www/html/TABI/api/Groups/../vendor/autoload.php\"}','/TABI/api/Auth/whoami.php',NULL,'unresolved','2026-07-16 04:41:51',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,'2026-07-16 04:41:51','2026-07-16 04:41:51'),(32,'s3','error','AWS SDK autoload が見つかりません','{\"path\":\"/var/www/html/TABI/api/Groups/../vendor/autoload.php\"}','/TABI/api/Auth/whoami.php',NULL,'unresolved','2026-07-16 04:41:51',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,'2026-07-16 04:41:51','2026-07-16 04:41:51'),(33,'s3','error','AWS SDK autoload が見つかりません','{\"path\":\"/var/www/html/TABI/api/Groups/../vendor/autoload.php\"}','/TABI/api/Auth/whoami.php',NULL,'unresolved','2026-07-16 04:41:53',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,'2026-07-16 04:41:53','2026-07-16 04:41:53'),(34,'s3','error','AWS SDK autoload が見つかりません','{\"path\":\"/var/www/html/TABI/api/Groups/../vendor/autoload.php\"}','/TABI/api/Chat/Messages.php?group_id=1',NULL,'unresolved','2026-07-16 04:41:53',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,'2026-07-16 04:41:53','2026-07-16 04:41:53'),(35,'s3','error','AWS SDK autoload が見つかりません','{\"path\":\"/var/www/html/TABI/api/Groups/../vendor/autoload.php\"}','/TABI/api/Auth/whoami.php',NULL,'unresolved','2026-07-16 04:41:53',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,'2026-07-16 04:41:53','2026-07-16 04:41:53'),(36,'s3','error','AWS SDK autoload が見つかりません','{\"path\":\"/var/www/html/TABI/api/Groups/../vendor/autoload.php\"}','/TABI/api/Auth/whoami.php',NULL,'unresolved','2026-07-16 04:42:00',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,'2026-07-16 04:42:00','2026-07-16 04:42:00'),(37,'s3','error','AWS SDK autoload が見つかりません','{\"path\":\"/var/www/html/TABI/api/Groups/../vendor/autoload.php\"}','/TABI/api/Auth/whoami.php',NULL,'unresolved','2026-07-16 04:42:00',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,'2026-07-16 04:42:00','2026-07-16 04:42:00'),(38,'s3','error','AWS SDK autoload が見つかりません','{\"path\":\"/var/www/html/TABI/api/Groups/../vendor/autoload.php\"}','/TABI/api/Auth/whoami.php',NULL,'unresolved','2026-07-16 04:49:36',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,'2026-07-16 04:49:36','2026-07-16 04:49:36'),(39,'s3','error','AWS SDK autoload が見つかりません','{\"path\":\"/var/www/html/TABI/api/Groups/../vendor/autoload.php\"}','/TABI/api/Auth/whoami.php',NULL,'unresolved','2026-07-16 04:49:37',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,'2026-07-16 04:49:37','2026-07-16 04:49:37'),(40,'s3','error','AWS SDK autoload が見つかりません','{\"path\":\"/var/www/html/TABI/api/Groups/../vendor/autoload.php\"}','/TABI/api/Auth/whoami.php',NULL,'unresolved','2026-07-16 04:49:45',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,'2026-07-16 04:49:45','2026-07-16 04:49:45'),(41,'s3','error','AWS SDK autoload が見つかりません','{\"path\":\"/var/www/html/TABI/api/Groups/../vendor/autoload.php\"}','/TABI/api/Auth/whoami.php',NULL,'unresolved','2026-07-16 04:49:45',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,'2026-07-16 04:49:45','2026-07-16 04:49:45'),(42,'s3','error','AWS SDK autoload が見つかりません','{\"path\":\"/var/www/html/TABI/api/Groups/../vendor/autoload.php\"}','/TABI/api/Auth/whoami.php',NULL,'unresolved','2026-07-16 04:49:46',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,'2026-07-16 04:49:46','2026-07-16 04:49:46'),(43,'s3','error','AWS SDK autoload が見つかりません','{\"path\":\"/var/www/html/TABI/api/Groups/../vendor/autoload.php\"}','/TABI/api/Chat/Messages.php?group_id=1',NULL,'unresolved','2026-07-16 04:49:46',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,'2026-07-16 04:49:46','2026-07-16 04:49:46'),(44,'s3','error','AWS SDK autoload が見つかりません','{\"path\":\"/var/www/html/TABI/api/Groups/../vendor/autoload.php\"}','/TABI/api/Auth/whoami.php',NULL,'unresolved','2026-07-16 04:49:47',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,'2026-07-16 04:49:47','2026-07-16 04:49:47'),(45,'s3','error','AWS SDK autoload が見つかりません','{\"path\":\"/var/www/html/TABI/api/Groups/../vendor/autoload.php\"}','/TABI/api/Auth/whoami.php',NULL,'unresolved','2026-07-16 04:54:58',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,'2026-07-16 04:54:58','2026-07-16 04:54:58'),(46,'s3','error','AWS SDK autoload が見つかりません','{\"path\":\"/var/www/html/TABI/api/Groups/../vendor/autoload.php\"}','/TABI/api/Auth/whoami.php',NULL,'unresolved','2026-07-16 04:54:59',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,'2026-07-16 04:54:59','2026-07-16 04:54:59'),(47,'websocket','warning','WebSocket通知設定が不足しています','{\"room\":\"admin:global\",\"event\":\"user_active_updated\",\"reason\":\"REALTIME_SECRET is not set.\"}','/TABI/api/Auth/whoami.php',NULL,'unresolved','2026-07-16 05:15:07',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,'2026-07-16 05:15:07','2026-07-16 05:15:07'),(48,'s3','error','AWS SDK autoload が見つかりません','{\"path\":\"/var/www/html/TABI/api/Groups/../vendor/autoload.php\"}','/TABI/api/Auth/whoami.php',NULL,'unresolved','2026-07-16 05:15:07',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,'2026-07-16 05:15:07','2026-07-16 05:15:07'),(49,'s3','error','AWS SDK autoload が見つかりません','{\"path\":\"/var/www/html/TABI/api/Groups/../vendor/autoload.php\"}','/TABI/api/Auth/whoami.php',NULL,'unresolved','2026-07-16 05:15:08',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,'2026-07-16 05:15:08','2026-07-16 05:15:08'),(50,'frontend','error','Uncaught TypeError: Cannot read properties of undefined (reading \'map\')','{\"error_type\":\"JAVASCRIPT_ERROR\",\"error_code\":\"UNHANDLED_JAVASCRIPT_ERROR\",\"source\":\"window.error\",\"page_path\":\"/TABI/Itinerary\",\"request_url\":null,\"request_method\":\"GET\",\"http_status\":null,\"user_agent\":\"Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Mobile Safari/537.36\",\"stack_trace\":\"TypeError: Cannot read properties of undefined (reading \'map\')\\n    at Itinerary (http://localhost:5173/TABI/src/pages/Itinerary/Itinerary.jsx?t=1784178931208:187:28)\\n    at Object.react_stack_bottom_frame (http://localhost:5173/TABI/node_modules/.vite/deps/react-dom_client.js?v=ab08f2d8:12868:12)\\n    at renderWithHooks (http://localhost:5173/TABI/node_modules/.vite/deps/react-dom_client.js?v=ab08f2d8:4213:19)\\n    at updateFunctionComponent (http://localhost:5173/TABI/node_modules/.vite/deps/react-dom_client.js?v=ab08f2d8:5569:16)\\n    at beginWork (http://localhost:5173/TABI/node_modules/.vite/deps/react-dom_client.js?v=ab08f2d8:6140:20)\\n    at runWithFiberInDEV (http://localhost:5173/TABI/node_modules/.vite/deps/react-dom_client.js?v=ab08f2d8:851:66)\\n    at performUnitOfWork (http://localhost:5173/TABI/node_modules/.vite/deps/react-dom_client.js?v=ab08f2d8:8429:92)\\n    at workLoopSync (http://localhost:5173/TABI/node_modules/.vite/deps/react-dom_client.js?v=ab08f2d8:8325:37)\\n    at renderRootSync (http://localhost:5173/TABI/node_modules/.vite/deps/react-dom_client.js?v=ab08f2d8:8309:6)\\n    at performWorkOnRoot (http://localhost:5173/TABI/node_modules/.vite/deps/react-dom_client.js?v=ab08f2d8:7994:27)\",\"fingerprint\":\"UNHANDLED_JAVASCRIPT_ERROR|/TABI/Itinerary|window.error||Uncaught TypeError: Cannot read properties of undefined (reading \'map\')\",\"recovery_key\":\"window.error|GET||/TABI/Itinerary|UNHANDLED_JAVASCRIPT_ERROR\",\"component\":null}','/TABI/Itinerary',2,'unresolved','2026-07-16 05:15:34',NULL,'JAVASCRIPT_ERROR','UNHANDLED_JAVASCRIPT_ERROR','/TABI/Itinerary',NULL,NULL,'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Mobile Safari/537.36','TypeError: Cannot read properties of undefined (reading \'map\')\n    at Itinerary (http://localhost:5173/TABI/src/pages/Itinerary/Itinerary.jsx?t=1784178931208:187:28)\n    at Object.react_stack_bottom_frame (http://localhost:5173/TABI/node_modules/.vite/deps/react-dom_client.js?v=ab08f2d8:12868:12)\n    at renderWithHooks (http://localhost:5173/TABI/node_modules/.vite/deps/react-dom_client.js?v=ab08f2d8:4213:19)\n    at updateFunctionComponent (http://localhost:5173/TABI/node_modules/.vite/deps/react-dom_client.js?v=ab08f2d8:5569:16)\n    at beginWork (http://localhost:5173/TABI/node_modules/.vite/deps/react-dom_client.js?v=ab08f2d8:6140:20)\n    at runWithFiberInDEV (http://localhost:5173/TABI/node_modules/.vite/deps/react-dom_client.js?v=ab08f2d8:851:66)\n    at performUnitOfWork (http://localhost:5173/TABI/node_modules/.vite/deps/react-dom_client.js?v=ab08f2d8:8429:92)\n    at workLoopSync (http://localhost:5173/TABI/node_modules/.vite/deps/react-dom_client.js?v=ab08f2d8:8325:37)\n    at renderRootSync (http://localhost:5173/TABI/node_modules/.vite/deps/react-dom_client.js?v=ab08f2d8:8309:6)\n    at performWorkOnRoot (http://localhost:5173/TABI/node_modules/.vite/deps/react-dom_client.js?v=ab08f2d8:7994:27)','UNHANDLED_JAVASCRIPT_ERROR|/TABI/Itinerary|window.error||Uncaught TypeError: Cannot read properties of undefined (reading \'map\')',1,'2026-07-16 05:15:34','2026-07-16 05:15:34'),(51,'frontend','error','Uncaught TypeError: Cannot destructure property \'trip\' of \'useContext(...)\' as it is undefined.','{\"error_type\":\"JAVASCRIPT_ERROR\",\"error_code\":\"UNHANDLED_JAVASCRIPT_ERROR\",\"source\":\"window.error\",\"page_path\":\"/TABI/Itinerary\",\"request_url\":null,\"request_method\":\"GET\",\"http_status\":null,\"user_agent\":\"Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Mobile Safari/537.36\",\"stack_trace\":\"TypeError: Cannot destructure property \'trip\' of \'useContext(...)\' as it is undefined.\\n    at Itinerary (http://localhost:5173/TABI/src/pages/Itinerary/Itinerary.jsx?t=1784178935052:19:10)\\n    at Object.react_stack_bottom_frame (http://localhost:5173/TABI/node_modules/.vite/deps/react-dom_client.js?v=ab08f2d8:12868:12)\\n    at renderWithHooks (http://localhost:5173/TABI/node_modules/.vite/deps/react-dom_client.js?v=ab08f2d8:4213:19)\\n    at updateFunctionComponent (http://localhost:5173/TABI/node_modules/.vite/deps/react-dom_client.js?v=ab08f2d8:5569:16)\\n    at beginWork (http://localhost:5173/TABI/node_modules/.vite/deps/react-dom_client.js?v=ab08f2d8:6140:20)\\n    at runWithFiberInDEV (http://localhost:5173/TABI/node_modules/.vite/deps/react-dom_client.js?v=ab08f2d8:851:66)\\n    at performUnitOfWork (http://localhost:5173/TABI/node_modules/.vite/deps/react-dom_client.js?v=ab08f2d8:8429:92)\\n    at workLoopSync (http://localhost:5173/TABI/node_modules/.vite/deps/react-dom_client.js?v=ab08f2d8:8325:37)\\n    at renderRootSync (http://localhost:5173/TABI/node_modules/.vite/deps/react-dom_client.js?v=ab08f2d8:8309:6)\\n    at performWorkOnRoot (http://localhost:5173/TABI/node_modules/.vite/deps/react-dom_client.js?v=ab08f2d8:7994:27)\",\"fingerprint\":\"UNHANDLED_JAVASCRIPT_ERROR|/TABI/Itinerary|window.error||Uncaught TypeError: Cannot destructure property \'trip\' of \'useContext(...)\' as it is undefined.\",\"recovery_key\":\"window.error|GET||/TABI/Itinerary|UNHANDLED_JAVASCRIPT_ERROR\",\"component\":null}','/TABI/Itinerary',2,'unresolved','2026-07-16 05:15:38',NULL,'JAVASCRIPT_ERROR','UNHANDLED_JAVASCRIPT_ERROR','/TABI/Itinerary',NULL,NULL,'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Mobile Safari/537.36','TypeError: Cannot destructure property \'trip\' of \'useContext(...)\' as it is undefined.\n    at Itinerary (http://localhost:5173/TABI/src/pages/Itinerary/Itinerary.jsx?t=1784178935052:19:10)\n    at Object.react_stack_bottom_frame (http://localhost:5173/TABI/node_modules/.vite/deps/react-dom_client.js?v=ab08f2d8:12868:12)\n    at renderWithHooks (http://localhost:5173/TABI/node_modules/.vite/deps/react-dom_client.js?v=ab08f2d8:4213:19)\n    at updateFunctionComponent (http://localhost:5173/TABI/node_modules/.vite/deps/react-dom_client.js?v=ab08f2d8:5569:16)\n    at beginWork (http://localhost:5173/TABI/node_modules/.vite/deps/react-dom_client.js?v=ab08f2d8:6140:20)\n    at runWithFiberInDEV (http://localhost:5173/TABI/node_modules/.vite/deps/react-dom_client.js?v=ab08f2d8:851:66)\n    at performUnitOfWork (http://localhost:5173/TABI/node_modules/.vite/deps/react-dom_client.js?v=ab08f2d8:8429:92)\n    at workLoopSync (http://localhost:5173/TABI/node_modules/.vite/deps/react-dom_client.js?v=ab08f2d8:8325:37)\n    at renderRootSync (http://localhost:5173/TABI/node_modules/.vite/deps/react-dom_client.js?v=ab08f2d8:8309:6)\n    at performWorkOnRoot (http://localhost:5173/TABI/node_modules/.vite/deps/react-dom_client.js?v=ab08f2d8:7994:27)','UNHANDLED_JAVASCRIPT_ERROR|/TABI/Itinerary|window.error||Uncaught TypeError: Cannot destructure property \'trip\' of \'useContext(...)\' as it is undefined.',1,'2026-07-16 05:15:38','2026-07-16 05:15:38'),(52,'s3','error','AWS SDK autoload が見つかりません','{\"path\":\"/var/www/html/TABI/api/Groups/../vendor/autoload.php\"}','/TABI/api/Auth/whoami.php',NULL,'unresolved','2026-07-16 05:16:15',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,'2026-07-16 05:16:15','2026-07-16 05:16:15'),(53,'websocket','warning','WebSocket通知設定が不足しています','{\"room\":\"admin:global\",\"event\":\"user_active_updated\",\"reason\":\"REALTIME_SECRET is not set.\"}','/TABI/api/auth/login.php',NULL,'unresolved','2026-07-16 05:16:19',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,'2026-07-16 05:16:19','2026-07-16 05:16:19'),(54,'s3','error','AWS SDK autoload が見つかりません','{\"path\":\"/var/www/html/TABI/api/Groups/../vendor/autoload.php\"}','/TABI/api/Groups/List.php',NULL,'unresolved','2026-07-16 05:16:19',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,'2026-07-16 05:16:19','2026-07-16 05:16:19'),(55,'s3','error','AWS SDK autoload が見つかりません','{\"path\":\"/var/www/html/TABI/api/Groups/../vendor/autoload.php\"}','/TABI/api/Groups/List.php',NULL,'unresolved','2026-07-16 05:16:20',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,'2026-07-16 05:16:20','2026-07-16 05:16:20'),(56,'s3','error','AWS SDK autoload が見つかりません','{\"path\":\"/var/www/html/TABI/api/Groups/../vendor/autoload.php\"}','/TABI/api/Groups/List.php',NULL,'unresolved','2026-07-16 05:16:28',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,'2026-07-16 05:16:28','2026-07-16 05:16:28'),(57,'s3','error','AWS SDK autoload が見つかりません','{\"path\":\"/var/www/html/TABI/api/Groups/../vendor/autoload.php\"}','/TABI/api/Groups/List.php',NULL,'unresolved','2026-07-16 05:16:28',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,'2026-07-16 05:16:28','2026-07-16 05:16:28'),(58,'websocket','warning','WebSocket通知設定が不足しています','{\"room\":\"admin:global\",\"event\":\"user_active_updated\",\"reason\":\"REALTIME_SECRET is not set.\"}','/TABI/api/Auth/whoami.php',NULL,'unresolved','2026-07-16 05:44:06',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,'2026-07-16 05:44:06','2026-07-16 05:44:06'),(59,'s3','error','AWS SDK autoload が見つかりません','{\"path\":\"/var/www/html/TABI/api/Groups/../vendor/autoload.php\"}','/TABI/api/Auth/whoami.php',NULL,'unresolved','2026-07-16 05:44:06',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,'2026-07-16 05:44:06','2026-07-16 05:44:06'),(60,'websocket','warning','WebSocket通知設定が不足しています','{\"room\":\"admin:global\",\"event\":\"user_active_updated\",\"reason\":\"REALTIME_SECRET is not set.\"}','/TABI/api/Auth/whoami.php',NULL,'unresolved','2026-07-16 05:44:09',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,'2026-07-16 05:44:09','2026-07-16 05:44:09'),(61,'s3','error','AWS SDK autoload が見つかりません','{\"path\":\"/var/www/html/TABI/api/Groups/../vendor/autoload.php\"}','/TABI/api/Auth/whoami.php',NULL,'unresolved','2026-07-16 05:44:09',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,'2026-07-16 05:44:09','2026-07-16 05:44:09'),(62,'s3','error','AWS SDK autoload が見つかりません','{\"path\":\"/var/www/html/TABI/api/Groups/../vendor/autoload.php\"}','/TABI/api/Groups/List.php',NULL,'unresolved','2026-07-16 05:46:33',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,'2026-07-16 05:46:33','2026-07-16 05:46:33'),(63,'s3','error','AWS SDK autoload が見つかりません','{\"path\":\"/var/www/html/TABI/api/Groups/../vendor/autoload.php\"}','/TABI/api/Groups/List.php',NULL,'unresolved','2026-07-16 05:46:34',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,'2026-07-16 05:46:34','2026-07-16 05:46:34'),(64,'s3','error','AWS SDK autoload が見つかりません','{\"path\":\"/var/www/html/TABI/api/Groups/../vendor/autoload.php\"}','/TABI/api/Auth/whoami.php',NULL,'unresolved','2026-07-16 05:46:38',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,'2026-07-16 05:46:38','2026-07-16 05:46:38'),(65,'websocket','warning','WebSocket通知設定が不足しています','{\"room\":\"admin:global\",\"event\":\"user_active_updated\",\"reason\":\"REALTIME_SECRET is not set.\"}','/TABI/api/auth/login.php',NULL,'unresolved','2026-07-16 05:46:41',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,'2026-07-16 05:46:41','2026-07-16 05:46:41'),(66,'s3','error','AWS SDK autoload が見つかりません','{\"path\":\"/var/www/html/TABI/api/Groups/../vendor/autoload.php\"}','/TABI/api/Groups/List.php',NULL,'unresolved','2026-07-16 05:46:42',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,'2026-07-16 05:46:42','2026-07-16 05:46:42'),(67,'s3','error','AWS SDK autoload が見つかりません','{\"path\":\"/var/www/html/TABI/api/Groups/../vendor/autoload.php\"}','/TABI/api/Groups/List.php',NULL,'unresolved','2026-07-16 05:46:42',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,'2026-07-16 05:46:42','2026-07-16 05:46:42'),(68,'s3','error','AWS SDK autoload が見つかりません','{\"path\":\"/var/www/html/TABI/api/Groups/../vendor/autoload.php\"}','/TABI/api/Auth/whoami.php',NULL,'unresolved','2026-07-16 05:49:48',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,'2026-07-16 05:49:48','2026-07-16 05:49:48'),(69,'s3','error','AWS SDK autoload が見つかりません','{\"path\":\"/var/www/html/TABI/api/Groups/../vendor/autoload.php\"}','/TABI/api/Auth/whoami.php',NULL,'unresolved','2026-07-16 05:49:55',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,'2026-07-16 05:49:55','2026-07-16 05:49:55'),(70,'websocket','warning','WebSocket通知設定が不足しています','{\"room\":\"admin:global\",\"event\":\"user_active_updated\",\"reason\":\"REALTIME_SECRET is not set.\"}','/TABI/api/auth/login.php',NULL,'unresolved','2026-07-16 05:50:00',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,'2026-07-16 05:50:00','2026-07-16 05:50:00'),(71,'s3','error','AWS SDK autoload が見つかりません','{\"path\":\"/var/www/html/TABI/api/Groups/../vendor/autoload.php\"}','/TABI/api/Groups/List.php',NULL,'unresolved','2026-07-16 05:50:00',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,'2026-07-16 05:50:00','2026-07-16 05:50:00'),(72,'s3','error','AWS SDK autoload が見つかりません','{\"path\":\"/var/www/html/TABI/api/Groups/../vendor/autoload.php\"}','/TABI/api/Groups/List.php',NULL,'unresolved','2026-07-16 05:50:01',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,'2026-07-16 05:50:01','2026-07-16 05:50:01'),(73,'websocket','warning','WebSocket通知設定が不足しています','{\"room\":\"admin:global\",\"event\":\"user_active_updated\",\"reason\":\"REALTIME_SECRET is not set.\"}','/TABI/api/Auth/whoami.php',NULL,'unresolved','2026-07-16 05:56:22',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,'2026-07-16 05:56:22','2026-07-16 05:56:22'),(74,'s3','error','AWS SDK autoload が見つかりません','{\"path\":\"/var/www/html/TABI/api/Groups/../vendor/autoload.php\"}','/TABI/api/Auth/whoami.php',NULL,'unresolved','2026-07-16 05:56:22',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,'2026-07-16 05:56:22','2026-07-16 05:56:22'),(75,'s3','error','AWS SDK autoload が見つかりません','{\"path\":\"/var/www/html/TABI/api/Groups/../vendor/autoload.php\"}','/TABI/api/Auth/whoami.php',NULL,'unresolved','2026-07-16 05:57:43',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,'2026-07-16 05:57:43','2026-07-16 05:57:43'),(76,'s3','error','AWS SDK autoload が見つかりません','{\"path\":\"/var/www/html/TABI/api/Groups/../vendor/autoload.php\"}','/TABI/api/Chat/Messages.php?group_id=1',NULL,'unresolved','2026-07-16 05:59:31',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,'2026-07-16 05:59:31','2026-07-16 05:59:31'),(77,'websocket','warning','WebSocket通知設定が不足しています','{\"room\":\"admin:global\",\"event\":\"user_active_updated\",\"reason\":\"REALTIME_SECRET is not set.\"}','/TABI/api/Auth/whoami.php',NULL,'unresolved','2026-07-16 06:08:24',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,'2026-07-16 06:08:24','2026-07-16 06:08:24'),(78,'s3','error','AWS SDK autoload が見つかりません','{\"path\":\"/var/www/html/TABI/api/Groups/../vendor/autoload.php\"}','/TABI/api/Auth/whoami.php',NULL,'unresolved','2026-07-16 06:08:24',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,'2026-07-16 06:08:24','2026-07-16 06:08:24'),(79,'s3','error','AWS SDK autoload が見つかりません','{\"path\":\"/var/www/html/TABI/api/Groups/../vendor/autoload.php\"}','/TABI/api/Groups/List.php',NULL,'unresolved','2026-07-16 06:08:41',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,'2026-07-16 06:08:41','2026-07-16 06:08:41'),(80,'s3','error','AWS SDK autoload が見つかりません','{\"path\":\"/var/www/html/TABI/api/Groups/../vendor/autoload.php\"}','/TABI/api/Groups/List.php',NULL,'unresolved','2026-07-16 06:08:41',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,'2026-07-16 06:08:41','2026-07-16 06:08:41'),(81,'websocket','warning','WebSocket通知設定が不足しています','{\"room\":\"admin:global\",\"event\":\"user_active_updated\",\"reason\":\"REALTIME_SECRET is not set.\"}','/TABI/api/Auth/whoami.php',NULL,'unresolved','2026-07-16 06:21:17',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,'2026-07-16 06:21:17','2026-07-16 06:21:17'),(82,'s3','error','AWS SDK autoload が見つかりません','{\"path\":\"/var/www/html/TABI/api/Groups/../vendor/autoload.php\"}','/TABI/api/Auth/whoami.php',NULL,'unresolved','2026-07-16 06:21:17',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,'2026-07-16 06:21:17','2026-07-16 06:21:17'),(83,'s3','error','AWS SDK autoload が見つかりません','{\"path\":\"/var/www/html/TABI/api/Groups/../vendor/autoload.php\"}','/TABI/api/Auth/whoami.php',NULL,'unresolved','2026-07-16 06:21:18',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,'2026-07-16 06:21:18','2026-07-16 06:21:18'),(84,'s3','error','AWS SDK autoload が見つかりません','{\"path\":\"/var/www/html/TABI/api/Groups/../vendor/autoload.php\"}','/TABI/api/Auth/whoami.php',NULL,'unresolved','2026-07-16 06:21:18',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,'2026-07-16 06:21:18','2026-07-16 06:21:18'),(85,'s3','error','AWS SDK autoload が見つかりません','{\"path\":\"/var/www/html/TABI/api/Groups/../vendor/autoload.php\"}','/TABI/api/Auth/whoami.php',NULL,'unresolved','2026-07-16 06:21:19',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,'2026-07-16 06:21:19','2026-07-16 06:21:19'),(86,'s3','error','AWS SDK autoload が見つかりません','{\"path\":\"/var/www/html/TABI/api/Groups/../vendor/autoload.php\"}','/TABI/api/Auth/whoami.php',NULL,'unresolved','2026-07-16 06:23:25',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,'2026-07-16 06:23:25','2026-07-16 06:23:25'),(87,'s3','error','AWS SDK autoload が見つかりません','{\"path\":\"/var/www/html/TABI/api/Groups/../vendor/autoload.php\"}','/TABI/api/Auth/whoami.php',NULL,'unresolved','2026-07-16 06:23:26',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,'2026-07-16 06:23:26','2026-07-16 06:23:26'),(88,'s3','error','AWS SDK autoload が見つかりません','{\"path\":\"/var/www/html/TABI/api/Groups/../vendor/autoload.php\"}','/TABI/api/Auth/whoami.php',NULL,'unresolved','2026-07-16 06:23:26',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,'2026-07-16 06:23:26','2026-07-16 06:23:26'),(89,'s3','error','AWS SDK autoload が見つかりません','{\"path\":\"/var/www/html/TABI/api/Groups/../vendor/autoload.php\"}','/TABI/api/Auth/whoami.php',NULL,'unresolved','2026-07-16 06:23:26',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,'2026-07-16 06:23:26','2026-07-16 06:23:26'),(90,'websocket','warning','WebSocket通知設定が不足しています','{\"room\":\"admin:global\",\"event\":\"user_active_updated\",\"reason\":\"REALTIME_SECRET is not set.\"}','/TABI/api/Auth/whoami.php',NULL,'unresolved','2026-07-16 06:24:35',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,'2026-07-16 06:24:35','2026-07-16 06:24:35'),(91,'s3','error','AWS SDK autoload が見つかりません','{\"path\":\"/var/www/html/TABI/api/Groups/../vendor/autoload.php\"}','/TABI/api/Auth/whoami.php',NULL,'unresolved','2026-07-16 06:24:35',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,'2026-07-16 06:24:35','2026-07-16 06:24:35'),(92,'s3','error','AWS SDK autoload が見つかりません','{\"path\":\"/var/www/html/TABI/api/Groups/../vendor/autoload.php\"}','/TABI/api/Auth/whoami.php',NULL,'unresolved','2026-07-16 06:24:36',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,'2026-07-16 06:24:36','2026-07-16 06:24:36'),(93,'s3','error','AWS SDK autoload が見つかりません','{\"path\":\"/var/www/html/TABI/api/Groups/../vendor/autoload.php\"}','/TABI/api/Auth/whoami.php',NULL,'unresolved','2026-07-16 06:24:43',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,'2026-07-16 06:24:43','2026-07-16 06:24:43'),(94,'websocket','warning','WebSocket通知設定が不足しています','{\"room\":\"admin:global\",\"event\":\"user_active_updated\",\"reason\":\"REALTIME_SECRET is not set.\"}','/TABI/api/Auth/whoami.php',NULL,'unresolved','2026-07-16 06:45:53',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,'2026-07-16 06:45:53','2026-07-16 06:45:53'),(95,'s3','error','AWS SDK autoload が見つかりません','{\"path\":\"/var/www/html/TABI/api/Groups/../vendor/autoload.php\"}','/TABI/api/Auth/whoami.php',NULL,'unresolved','2026-07-16 06:45:53',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,'2026-07-16 06:45:53','2026-07-16 06:45:53'),(96,'websocket','warning','WebSocket通知設定が不足しています','{\"room\":\"admin:global\",\"event\":\"user_active_updated\",\"reason\":\"REALTIME_SECRET is not set.\"}','/TABI/api/auth/login.php',NULL,'unresolved','2026-07-16 06:45:59',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,'2026-07-16 06:45:59','2026-07-16 06:45:59'),(97,'s3','error','AWS SDK autoload が見つかりません','{\"path\":\"/var/www/html/TABI/api/Groups/../vendor/autoload.php\"}','/TABI/api/Groups/List.php',NULL,'unresolved','2026-07-16 06:46:00',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,'2026-07-16 06:46:00','2026-07-16 06:46:00'),(98,'s3','error','AWS SDK autoload が見つかりません','{\"path\":\"/var/www/html/TABI/api/Groups/../vendor/autoload.php\"}','/TABI/api/Auth/whoami.php',NULL,'unresolved','2026-07-16 06:46:00',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,'2026-07-16 06:46:00','2026-07-16 06:46:00'),(99,'s3','error','AWS SDK autoload が見つかりません','{\"path\":\"/var/www/html/TABI/api/Groups/../vendor/autoload.php\"}','/TABI/api/Groups/List.php',NULL,'unresolved','2026-07-16 06:46:01',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,'2026-07-16 06:46:01','2026-07-16 06:46:01'),(100,'s3','error','AWS SDK autoload が見つかりません','{\"path\":\"/var/www/html/TABI/api/Groups/../vendor/autoload.php\"}','/TABI/api/Auth/whoami.php',NULL,'unresolved','2026-07-16 06:46:01',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,'2026-07-16 06:46:01','2026-07-16 06:46:01'),(101,'s3','error','AWS SDK autoload が見つかりません','{\"path\":\"/var/www/html/TABI/api/Groups/../vendor/autoload.php\"}','/TABI/api/Groups/List.php',NULL,'unresolved','2026-07-16 06:46:01',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,'2026-07-16 06:46:01','2026-07-16 06:46:01'),(102,'s3','error','AWS SDK autoload が見つかりません','{\"path\":\"/var/www/html/TABI/api/Groups/../vendor/autoload.php\"}','/TABI/api/Groups/List.php',NULL,'unresolved','2026-07-16 06:46:01',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,'2026-07-16 06:46:01','2026-07-16 06:46:01'),(103,'s3','error','AWS SDK autoload が見つかりません','{\"path\":\"/var/www/html/TABI/api/Groups/../vendor/autoload.php\"}','/TABI/api/Auth/whoami.php',NULL,'unresolved','2026-07-16 06:46:04',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,'2026-07-16 06:46:04','2026-07-16 06:46:04'),(104,'s3','error','AWS SDK autoload が見つかりません','{\"path\":\"/var/www/html/TABI/api/Groups/../vendor/autoload.php\"}','/TABI/api/Auth/whoami.php',NULL,'unresolved','2026-07-16 06:46:04',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,'2026-07-16 06:46:04','2026-07-16 06:46:04'),(105,'s3','error','AWS SDK autoload が見つかりません','{\"path\":\"/var/www/html/TABI/api/Groups/../vendor/autoload.php\"}','/TABI/api/Auth/whoami.php',NULL,'unresolved','2026-07-16 06:46:09',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,'2026-07-16 06:46:09','2026-07-16 06:46:09'),(106,'s3','error','AWS SDK autoload が見つかりません','{\"path\":\"/var/www/html/TABI/api/Groups/../vendor/autoload.php\"}','/TABI/api/Auth/whoami.php',NULL,'unresolved','2026-07-16 06:46:09',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,'2026-07-16 06:46:09','2026-07-16 06:46:09'),(107,'frontend','error','Uncaught ReferenceError: useState is not defined','{\"error_type\":\"JAVASCRIPT_ERROR\",\"error_code\":\"UNHANDLED_JAVASCRIPT_ERROR\",\"source\":\"window.error\",\"page_path\":\"/TABI/Tourist\",\"request_url\":null,\"request_method\":\"GET\",\"http_status\":null,\"user_agent\":\"Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Mobile Safari/537.36\",\"stack_trace\":\"ReferenceError: useState is not defined\\n    at Tourist (http://localhost:5173/TABI/src/pages/Tourist/Tourist.jsx:28:28)\\n    at Object.react_stack_bottom_frame (http://localhost:5173/TABI/node_modules/.vite/deps/react-dom_client.js?v=ab08f2d8:12868:12)\\n    at renderWithHooks (http://localhost:5173/TABI/node_modules/.vite/deps/react-dom_client.js?v=ab08f2d8:4213:19)\\n    at updateFunctionComponent (http://localhost:5173/TABI/node_modules/.vite/deps/react-dom_client.js?v=ab08f2d8:5569:16)\\n    at beginWork (http://localhost:5173/TABI/node_modules/.vite/deps/react-dom_client.js?v=ab08f2d8:6140:20)\\n    at runWithFiberInDEV (http://localhost:5173/TABI/node_modules/.vite/deps/react-dom_client.js?v=ab08f2d8:851:66)\\n    at performUnitOfWork (http://localhost:5173/TABI/node_modules/.vite/deps/react-dom_client.js?v=ab08f2d8:8429:92)\\n    at workLoopSync (http://localhost:5173/TABI/node_modules/.vite/deps/react-dom_client.js?v=ab08f2d8:8325:37)\\n    at renderRootSync (http://localhost:5173/TABI/node_modules/.vite/deps/react-dom_client.js?v=ab08f2d8:8309:6)\\n    at performWorkOnRoot (http://localhost:5173/TABI/node_modules/.vite/deps/react-dom_client.js?v=ab08f2d8:7994:27)\",\"fingerprint\":\"UNHANDLED_JAVASCRIPT_ERROR|/TABI/Tourist|window.error||Uncaught ReferenceError: useState is not defined\",\"recovery_key\":\"window.error|GET||/TABI/Tourist|UNHANDLED_JAVASCRIPT_ERROR\",\"component\":null}','/TABI/Tourist',4,'unresolved','2026-07-16 06:46:09',NULL,'JAVASCRIPT_ERROR','UNHANDLED_JAVASCRIPT_ERROR','/TABI/Tourist',NULL,NULL,'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Mobile Safari/537.36','ReferenceError: useState is not defined\n    at Tourist (http://localhost:5173/TABI/src/pages/Tourist/Tourist.jsx:28:28)\n    at Object.react_stack_bottom_frame (http://localhost:5173/TABI/node_modules/.vite/deps/react-dom_client.js?v=ab08f2d8:12868:12)\n    at renderWithHooks (http://localhost:5173/TABI/node_modules/.vite/deps/react-dom_client.js?v=ab08f2d8:4213:19)\n    at updateFunctionComponent (http://localhost:5173/TABI/node_modules/.vite/deps/react-dom_client.js?v=ab08f2d8:5569:16)\n    at beginWork (http://localhost:5173/TABI/node_modules/.vite/deps/react-dom_client.js?v=ab08f2d8:6140:20)\n    at runWithFiberInDEV (http://localhost:5173/TABI/node_modules/.vite/deps/react-dom_client.js?v=ab08f2d8:851:66)\n    at performUnitOfWork (http://localhost:5173/TABI/node_modules/.vite/deps/react-dom_client.js?v=ab08f2d8:8429:92)\n    at workLoopSync (http://localhost:5173/TABI/node_modules/.vite/deps/react-dom_client.js?v=ab08f2d8:8325:37)\n    at renderRootSync (http://localhost:5173/TABI/node_modules/.vite/deps/react-dom_client.js?v=ab08f2d8:8309:6)\n    at performWorkOnRoot (http://localhost:5173/TABI/node_modules/.vite/deps/react-dom_client.js?v=ab08f2d8:7994:27)','UNHANDLED_JAVASCRIPT_ERROR|/TABI/Tourist|window.error||Uncaught ReferenceError: useState is not defined',1,'2026-07-16 06:46:09','2026-07-16 06:46:09'),(108,'s3','error','AWS SDK autoload が見つかりません','{\"path\":\"/var/www/html/TABI/api/Groups/../vendor/autoload.php\"}','/TABI/api/Auth/whoami.php',NULL,'unresolved','2026-07-16 06:48:10',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,'2026-07-16 06:48:10','2026-07-16 06:48:10'),(109,'s3','error','AWS SDK autoload が見つかりません','{\"path\":\"/var/www/html/TABI/api/Groups/../vendor/autoload.php\"}','/TABI/api/Auth/whoami.php',NULL,'unresolved','2026-07-16 06:48:11',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,'2026-07-16 06:48:11','2026-07-16 06:48:11'),(110,'frontend','error','API request failed with HTTP 500','{\"error_type\":\"API_ERROR\",\"error_code\":\"API_HTTP_ERROR\",\"source\":\"frontend\",\"page_path\":\"/TABI/Tourist\",\"request_url\":\"http://localhost:5173/TABI/api/tourist/getTouristSpots.php?city=%E4%BA%AC%E9%83%BD\",\"request_method\":\"GET\",\"http_status\":500,\"user_agent\":\"Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Mobile Safari/537.36\",\"stack_trace\":null,\"fingerprint\":\"API_HTTP_ERROR|/TABI/Tourist|frontend|http://localhost:5173/TABI/api/tourist/getTouristSpots.php?city=%E4%BA%AC%E9%83%BD|API request failed with HTTP 500\",\"recovery_key\":\"frontend|GET|/TABI/api/tourist/getTouristSpots.php?city=%E4%BA%AC%E9%83%BD|/TABI/Tourist|API_HTTP_ERROR\",\"component\":null}','/TABI/Tourist',4,'unresolved','2026-07-16 06:48:11',NULL,'API_ERROR','API_HTTP_ERROR','/TABI/Tourist','http://localhost:5173/TABI/api/tourist/getTouristSpots.php?city=%E4%BA%AC%E9%83%BD',500,'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Mobile Safari/537.36',NULL,'API_HTTP_ERROR|/TABI/Tourist|frontend|http://localhost:5173/TABI/api/tourist/getTouristSpots.php?city=%E4%BA%AC%E9%83%BD|API request failed with HTTP 500',7,'2026-07-16 06:48:11','2026-07-16 07:50:58'),(111,'frontend','error','API request failed with HTTP 500','{\"error_type\":\"API_ERROR\",\"error_code\":\"API_HTTP_ERROR\",\"source\":\"frontend\",\"page_path\":\"/TABI/Tourist\",\"request_url\":\"http://localhost:5173/TABI/api/tourist/getFavorites.php\",\"request_method\":\"GET\",\"http_status\":500,\"user_agent\":\"Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Mobile Safari/537.36\",\"stack_trace\":null,\"fingerprint\":\"API_HTTP_ERROR|/TABI/Tourist|frontend|http://localhost:5173/TABI/api/tourist/getFavorites.php|API request failed with HTTP 500\",\"recovery_key\":\"frontend|GET|/TABI/api/tourist/getFavorites.php|/TABI/Tourist|API_HTTP_ERROR\",\"component\":null}','/TABI/Tourist',4,'unresolved','2026-07-16 06:48:11',NULL,'API_ERROR','API_HTTP_ERROR','/TABI/Tourist','http://localhost:5173/TABI/api/tourist/getFavorites.php',500,'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Mobile Safari/537.36',NULL,'API_HTTP_ERROR|/TABI/Tourist|frontend|http://localhost:5173/TABI/api/tourist/getFavorites.php|API request failed with HTTP 500',7,'2026-07-16 06:48:11','2026-07-16 07:50:57'),(112,'s3','error','AWS SDK autoload が見つかりません','{\"path\":\"/var/www/html/TABI/api/Groups/../vendor/autoload.php\"}','/TABI/api/Auth/whoami.php',NULL,'unresolved','2026-07-16 06:48:15',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,'2026-07-16 06:48:15','2026-07-16 06:48:15'),(113,'s3','error','AWS SDK autoload が見つかりません','{\"path\":\"/var/www/html/TABI/api/Groups/../vendor/autoload.php\"}','/TABI/api/Groups/List.php',NULL,'unresolved','2026-07-16 06:58:52',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,'2026-07-16 06:58:52','2026-07-16 06:58:52'),(114,'websocket','warning','WebSocket通知設定が不足しています','{\"room\":\"admin:global\",\"event\":\"user_active_updated\",\"reason\":\"REALTIME_SECRET is not set.\"}','/TABI/api/Auth/whoami.php',NULL,'unresolved','2026-07-16 06:58:52',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,'2026-07-16 06:58:52','2026-07-16 06:58:52'),(115,'s3','error','AWS SDK autoload が見つかりません','{\"path\":\"/var/www/html/TABI/api/Groups/../vendor/autoload.php\"}','/TABI/api/Auth/whoami.php',NULL,'unresolved','2026-07-16 06:58:53',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,'2026-07-16 06:58:53','2026-07-16 06:58:53'),(116,'s3','error','AWS SDK autoload が見つかりません','{\"path\":\"/var/www/html/TABI/api/Groups/../vendor/autoload.php\"}','/TABI/api/Groups/List.php',NULL,'unresolved','2026-07-16 06:58:53',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,'2026-07-16 06:58:53','2026-07-16 06:58:53'),(117,'s3','error','AWS SDK autoload が見つかりません','{\"path\":\"/var/www/html/TABI/api/Groups/../vendor/autoload.php\"}','/TABI/api/Auth/whoami.php',NULL,'unresolved','2026-07-16 06:58:53',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,'2026-07-16 06:58:53','2026-07-16 06:58:53'),(118,'s3','error','AWS SDK autoload が見つかりません','{\"path\":\"/var/www/html/TABI/api/Groups/../vendor/autoload.php\"}','/TABI/api/Groups/List.php',NULL,'unresolved','2026-07-16 06:58:54',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,'2026-07-16 06:58:54','2026-07-16 06:58:54'),(119,'s3','error','AWS SDK autoload が見つかりません','{\"path\":\"/var/www/html/TABI/api/Groups/../vendor/autoload.php\"}','/TABI/api/Groups/List.php',NULL,'unresolved','2026-07-16 06:58:54',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,'2026-07-16 06:58:54','2026-07-16 06:58:54'),(120,'s3','error','AWS SDK autoload が見つかりません','{\"path\":\"/var/www/html/TABI/api/Groups/../vendor/autoload.php\"}','/TABI/api/Auth/whoami.php',NULL,'unresolved','2026-07-16 06:58:56',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,'2026-07-16 06:58:56','2026-07-16 06:58:56'),(121,'s3','error','AWS SDK autoload が見つかりません','{\"path\":\"/var/www/html/TABI/api/Groups/../vendor/autoload.php\"}','/TABI/api/Auth/whoami.php',NULL,'unresolved','2026-07-16 06:58:57',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,'2026-07-16 06:58:57','2026-07-16 06:58:57'),(122,'s3','error','AWS SDK autoload が見つかりません','{\"path\":\"/var/www/html/TABI/api/Groups/../vendor/autoload.php\"}','/TABI/api/Auth/whoami.php',NULL,'unresolved','2026-07-16 06:58:58',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,'2026-07-16 06:58:58','2026-07-16 06:58:58'),(123,'s3','error','AWS SDK autoload が見つかりません','{\"path\":\"/var/www/html/TABI/api/Groups/../vendor/autoload.php\"}','/TABI/api/Auth/whoami.php',NULL,'unresolved','2026-07-16 06:58:58',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,'2026-07-16 06:58:58','2026-07-16 06:58:58'),(124,'s3','error','AWS SDK autoload が見つかりません','{\"path\":\"/var/www/html/TABI/api/Groups/../vendor/autoload.php\"}','/TABI/api/Auth/whoami.php',NULL,'unresolved','2026-07-16 06:59:00',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,'2026-07-16 06:59:00','2026-07-16 06:59:00'),(125,'s3','error','AWS SDK autoload が見つかりません','{\"path\":\"/var/www/html/TABI/api/Groups/../vendor/autoload.php\"}','/TABI/api/Auth/whoami.php',NULL,'unresolved','2026-07-16 06:59:01',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,'2026-07-16 06:59:01','2026-07-16 06:59:01'),(126,'websocket','warning','WebSocket通知設定が不足しています','{\"room\":\"admin:global\",\"event\":\"user_active_updated\",\"reason\":\"REALTIME_SECRET is not set.\"}','/TABI/api/Auth/whoami.php',NULL,'unresolved','2026-07-16 07:04:26',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,'2026-07-16 07:04:26','2026-07-16 07:04:26'),(127,'s3','error','AWS SDK autoload が見つかりません','{\"path\":\"/var/www/html/TABI/api/Groups/../vendor/autoload.php\"}','/TABI/api/Auth/whoami.php',NULL,'unresolved','2026-07-16 07:04:26',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,'2026-07-16 07:04:26','2026-07-16 07:04:26'),(128,'websocket','warning','WebSocket通知設定が不足しています','{\"room\":\"admin:global\",\"event\":\"user_active_updated\",\"reason\":\"REALTIME_SECRET is not set.\"}','/TABI/api/Auth/whoami.php',NULL,'unresolved','2026-07-16 07:16:19',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,'2026-07-16 07:16:19','2026-07-16 07:16:19'),(129,'s3','error','AWS SDK autoload が見つかりません','{\"path\":\"/var/www/html/TABI/api/Groups/../vendor/autoload.php\"}','/TABI/api/Auth/whoami.php',NULL,'unresolved','2026-07-16 07:16:19',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,'2026-07-16 07:16:19','2026-07-16 07:16:19'),(130,'s3','error','AWS SDK autoload が見つかりません','{\"path\":\"/var/www/html/TABI/api/Groups/../vendor/autoload.php\"}','/TABI/api/Auth/whoami.php',NULL,'unresolved','2026-07-16 07:36:31',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,'2026-07-16 07:36:31','2026-07-16 07:36:31'),(131,'websocket','warning','WebSocket通知設定が不足しています','{\"room\":\"admin:global\",\"event\":\"user_active_updated\",\"reason\":\"REALTIME_SECRET is not set.\"}','/TABI/api/Auth/whoami.php',NULL,'unresolved','2026-07-16 07:40:08',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,'2026-07-16 07:40:08','2026-07-16 07:40:08'),(132,'s3','error','AWS SDK autoload が見つかりません','{\"path\":\"/var/www/html/TABI/api/Groups/../vendor/autoload.php\"}','/TABI/api/Auth/whoami.php',NULL,'unresolved','2026-07-16 07:40:08',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,'2026-07-16 07:40:08','2026-07-16 07:40:08'),(133,'websocket','warning','WebSocket通知設定が不足しています','{\"room\":\"admin:global\",\"event\":\"user_active_updated\",\"reason\":\"REALTIME_SECRET is not set.\"}','/TABI/api/Auth/whoami.php',NULL,'unresolved','2026-07-16 07:40:11',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,'2026-07-16 07:40:11','2026-07-16 07:40:11'),(134,'s3','error','AWS SDK autoload が見つかりません','{\"path\":\"/var/www/html/TABI/api/Groups/../vendor/autoload.php\"}','/TABI/api/Auth/whoami.php',NULL,'unresolved','2026-07-16 07:40:11',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,'2026-07-16 07:40:11','2026-07-16 07:40:11'),(135,'websocket','warning','WebSocket通知設定が不足しています','{\"room\":\"admin:global\",\"event\":\"user_active_updated\",\"reason\":\"REALTIME_SECRET is not set.\"}','/TABI/api/Auth/whoami.php',NULL,'unresolved','2026-07-16 07:49:17',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,'2026-07-16 07:49:17','2026-07-16 07:49:17'),(136,'s3','error','AWS SDK autoload が見つかりません','{\"path\":\"/var/www/html/TABI/api/Groups/../vendor/autoload.php\"}','/TABI/api/Auth/whoami.php',NULL,'unresolved','2026-07-16 07:49:17',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,'2026-07-16 07:49:17','2026-07-16 07:49:17'),(137,'websocket','warning','WebSocket通知設定が不足しています','{\"room\":\"admin:global\",\"event\":\"user_active_updated\",\"reason\":\"REALTIME_SECRET is not set.\"}','/TABI/api/Auth/whoami.php',NULL,'unresolved','2026-07-16 07:50:57',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,'2026-07-16 07:50:57','2026-07-16 07:50:57'),(138,'s3','error','AWS SDK autoload が見つかりません','{\"path\":\"/var/www/html/TABI/api/Groups/../vendor/autoload.php\"}','/TABI/api/Auth/whoami.php',NULL,'unresolved','2026-07-16 07:50:57',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,'2026-07-16 07:50:57','2026-07-16 07:50:57'),(139,'frontend','error','API request failed with HTTP 500','{\"error_type\":\"API_ERROR\",\"error_code\":\"API_HTTP_ERROR\",\"source\":\"frontend\",\"page_path\":\"/TABI/Tourist\",\"request_url\":\"https://genshin.mond.jp/TABI/api/tourist/getTouristSpots.php?city=%E4%BA%AC%E9%83%BD\",\"request_method\":\"GET\",\"http_status\":500,\"user_agent\":\"Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Mobile Safari/537.36\",\"stack_trace\":null,\"fingerprint\":\"API_HTTP_ERROR|/TABI/Tourist|frontend|https://genshin.mond.jp/TABI/api/tourist/getTouristSpots.php?city=%E4%BA%AC%E9%83%BD|API request failed with HTTP 500\",\"recovery_key\":\"frontend|GET|/TABI/api/tourist/getTouristSpots.php?city=%E4%BA%AC%E9%83%BD|/TABI/Tourist|API_HTTP_ERROR\",\"component\":null}','/TABI/Tourist',4,'unresolved','2026-07-16 08:44:03',NULL,'API_ERROR','API_HTTP_ERROR','/TABI/Tourist','https://genshin.mond.jp/TABI/api/tourist/getTouristSpots.php?city=%E4%BA%AC%E9%83%BD',500,'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Mobile Safari/537.36',NULL,'API_HTTP_ERROR|/TABI/Tourist|frontend|https://genshin.mond.jp/TABI/api/tourist/getTouristSpots.php?city=%E4%BA%AC%E9%83%BD|API request failed with HTTP 500',2,'2026-07-16 08:44:03','2026-07-16 08:47:37');
/*!40000 ALTER TABLE `system_errors` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `notification_settings`
--

DROP TABLE IF EXISTS `notification_settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `notification_settings`
--

LOCK TABLES `notification_settings` WRITE;
/*!40000 ALTER TABLE `notification_settings` DISABLE KEYS */;
/*!40000 ALTER TABLE `notification_settings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `system_settings`
--

DROP TABLE IF EXISTS `system_settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `system_settings` (
  `setting_key` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '設定キー（例: max_upload_size）',
  `setting_value` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT '設定値（文字列で柔軟に管理）',
  `updated_at` datetime DEFAULT NULL COMMENT '更新日時',
  PRIMARY KEY (`setting_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `system_settings`
--

LOCK TABLES `system_settings` WRITE;
/*!40000 ALTER TABLE `system_settings` DISABLE KEYS */;
INSERT INTO `system_settings` VALUES ('default_language','ja','2026-06-22 09:00:00'),('faq_items','[{\"category\":\"アカウント\",\"question\":\"アカウントを作成するにはどうすればよいですか？\",\"answer\":\"新規登録画面で名前、メールアドレス、パスワードなど必要な情報を入力して登録します。登録後はログイン画面からTABIを利用できます。\"},{\"category\":\"アカウント\",\"question\":\"ログインできないときは何を確認すればよいですか？\",\"answer\":\"メールアドレスとパスワードに入力間違いがないか確認してください。解決しない場合は、パスワード再設定や問い合わせからご連絡ください。\"},{\"category\":\"アカウント\",\"question\":\"パスワードを忘れた場合はどうすればよいですか？\",\"answer\":\"ログイン画面のパスワード再設定から、登録済みメールアドレスへ再設定用の案内を送信してください。案内に従って新しいパスワードを設定できます。\"},{\"category\":\"アカウント\",\"question\":\"メールアドレスは変更できますか？\",\"answer\":\"マイページのメールアドレス変更画面から変更できます。確認コードを使って本人確認を行うため、受信できるメールアドレスを入力してください。\"},{\"category\":\"アカウント\",\"question\":\"プロフィール画像や表示名は変更できますか？\",\"answer\":\"マイページのプロフィール編集から変更できます。画像を変更する場合は、対応形式とファイルサイズを確認してアップロードしてください。\"},{\"category\":\"アカウント\",\"question\":\"アカウントを削除したい場合はどうすればよいですか？\",\"answer\":\"アカウント削除を希望する場合は、問い合わせ画面からご連絡ください。本人確認後、必要な手続きについて案内します。\"},{\"category\":\"アカウント\",\"question\":\"公開プロフィールには何が表示されますか？\",\"answer\":\"表示名、プロフィール画像、自己紹介など、TABI内で共有される情報が表示されます。個人情報を含む内容は入力しないようご注意ください。\"},{\"category\":\"グループ\",\"question\":\"旅行グループはどうやって作成しますか？\",\"answer\":\"ホーム画面のグループ作成から、グループ名や説明を入力して作成します。作成したユーザーはグループ管理者として登録されます。\"},{\"category\":\"グループ\",\"question\":\"メンバーを旅行グループへ招待できますか？\",\"answer\":\"グループ画面の招待機能からメンバーを招待できます。招待を受けた人は案内に従って参加してください。\"},{\"category\":\"グループ\",\"question\":\"招待リンクを開いても参加できない場合は？\",\"answer\":\"ログイン状態、招待の有効期限、すでに参加済みかどうかを確認してください。うまくいかない場合は、招待を送ったメンバーに再発行を依頼してください。\"},{\"category\":\"グループ\",\"question\":\"グループ画像や説明は変更できますか？\",\"answer\":\"グループの編集画面から変更できます。画像を更新しても反映に時間がかかる場合は、画面を再読み込みしてください。\"},{\"category\":\"グループ\",\"question\":\"旅行先や宿泊先の候補はどうやって追加しますか？\",\"answer\":\"旅行グループ内の候補追加画面から、観光地、宿泊先、飲食店などの候補を登録できます。登録後はメンバーが確認できます。\"},{\"category\":\"グループ\",\"question\":\"候補への投票はできますか？\",\"answer\":\"グループ内の候補一覧や投票画面から、行きたい候補へ投票できます。投票結果を参考に旅行計画を決められます。\"},{\"category\":\"グループ\",\"question\":\"グループ内でメッセージを送れますか？\",\"answer\":\"グループのチャット画面からメンバーへメッセージを送れます。旅行計画の相談や確認事項の共有に利用してください。\"},{\"category\":\"グループ\",\"question\":\"グループから抜けたい場合はどうすればよいですか？\",\"answer\":\"グループからの退出や削除が必要な場合は、グループ管理者に相談してください。操作できない場合は問い合わせ画面から状況をお知らせください。\"},{\"category\":\"通知\",\"question\":\"通知を受け取るには何が必要ですか？\",\"answer\":\"通知画面で通知を許可し、ブラウザや端末側でも通知が許可されていることを確認してください。ログイン状態で利用すると通知を受け取りやすくなります。\"},{\"category\":\"通知\",\"question\":\"通知を許可したのに届かない場合は？\",\"answer\":\"端末やブラウザの通知設定、通信状況、ログイン状態を確認してください。通知を一度オフにしてから再度オンにすると改善する場合があります。\"},{\"category\":\"通知\",\"question\":\"通知の種類は変更できますか？\",\"answer\":\"マイページの通知設定から、受け取りたい通知の種類を変更できます。設定を変更した後は、保存されていることを確認してください。\"},{\"category\":\"通知\",\"question\":\"メール通知は届きますか？\",\"answer\":\"メールアドレス変更など一部の重要な操作では、確認や完了通知のメールが送信される場合があります。迷惑メールフォルダも確認してください。\"},{\"category\":\"通知\",\"question\":\"チャットやグループ更新の通知はいつ届きますか？\",\"answer\":\"メンバーの投稿やグループに関する重要な更新があったときに通知される場合があります。通知の届き方は端末やブラウザの状態によって変わります。\"},{\"category\":\"通知\",\"question\":\"メンテナンス中も通知は届きますか？\",\"answer\":\"メンテナンス中やデータベース停止中は、通知や画面更新が遅れることがあります。時間をおいてから再度確認してください。\"},{\"category\":\"その他\",\"question\":\"TABIを利用する推奨環境はありますか？\",\"answer\":\"最新版のChrome、Edge、Safariなど主要ブラウザでの利用をおすすめします。古いブラウザでは一部機能が正しく動作しない場合があります。\"},{\"category\":\"その他\",\"question\":\"写真をアップロードできない場合は？\",\"answer\":\"画像形式、ファイルサイズ、通信状況を確認してください。サイズが大きすぎる場合は、画像を圧縮してから再度アップロードしてください。\"},{\"category\":\"その他\",\"question\":\"観光スポットのお気に入りはどこで使えますか？\",\"answer\":\"観光スポット画面で気になる場所をお気に入り登録できます。旅行先の候補を考えるときのメモとして活用してください。\"},{\"category\":\"その他\",\"question\":\"精算機能では何ができますか？\",\"answer\":\"旅行中に立て替えた金額や回収したい金額を整理できます。メンバー間の支払い確認に役立ててください。\"},{\"category\":\"その他\",\"question\":\"問い合わせはどこから送れますか？\",\"answer\":\"マイページの問い合わせ画面から送信できます。内容、発生した画面、操作手順をできるだけ具体的に入力してください。\"},{\"category\":\"その他\",\"question\":\"不適切な投稿や迷惑行為を見つけた場合は？\",\"answer\":\"対象の投稿やユーザー情報を確認し、通報または問い合わせからご連絡ください。安全に利用できるよう内容を確認します。\"},{\"category\":\"その他\",\"question\":\"メンテナンス表示が出た場合はどうすればよいですか？\",\"answer\":\"メンテナンス中は一部機能を利用できません。表示されている案内を確認し、しばらく時間をおいてから再度アクセスしてください。\"},{\"category\":\"その他\",\"question\":\"画面の情報が最新に見えない場合は？\",\"answer\":\"ページを再読み込みするか、いったん別の画面へ移動して戻ってください。通信状況によって反映に時間がかかることがあります。\"},{\"category\":\"その他\",\"question\":\"個人情報を入力するときの注意点はありますか？\",\"answer\":\"チャット、プロフィール、問い合わせには、公開したくない住所、電話番号、認証コード、パスワードなどを入力しないでください。\"}]','2026-07-16 15:13:18'),('max_upload_size_mb','20','2026-06-22 09:00:00'),('ranking_cache_enabled','true','2026-06-22 09:00:00'),('review_requires_visit_confirmation','true','2026-06-22 09:00:00'),('test_data_version','2026-06-22-v1','2026-06-22 09:00:00');
/*!40000 ALTER TABLE `system_settings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `trip_candidate_votes`
--

DROP TABLE IF EXISTS `trip_candidate_votes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `trip_candidate_votes` (
  `vote_id` bigint NOT NULL AUTO_INCREMENT COMMENT '候補投票ID',
  `candidate_id` bigint NOT NULL COMMENT '投票対象候補ID',
  `user_id` bigint NOT NULL COMMENT '投票したユーザーID',
  `vote_type` enum('like','dislike') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '投票内容 like=賛成 dislike=反対',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '投票日時',
  PRIMARY KEY (`vote_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='候補投票テーブル';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `trip_candidate_votes`
--

LOCK TABLES `trip_candidate_votes` WRITE;
/*!40000 ALTER TABLE `trip_candidate_votes` DISABLE KEYS */;
/*!40000 ALTER TABLE `trip_candidate_votes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `trip_candidates`
--

DROP TABLE IF EXISTS `trip_candidates`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `trip_candidates` (
  `candidate_id` bigint NOT NULL AUTO_INCREMENT COMMENT '候補ID',
  `trip_id` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '所属旅行ID',
  `candidate_type` enum('destination','spot','hotel','restaurant') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '候補種別 destination=旅行先 spot=観光地 hotel=宿泊先 restaurant=食べたい物',
  `candidate_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '候補名',
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT '候補の説明文',
  `img_url` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '候補画像URL',
  `created_by` bigint NOT NULL COMMENT '候補を登録したユーザーID',
  `status` enum('candidate','selected','rejected') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '候補状態 candidate=検討中 selected=採用 rejected=不採用',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '登録日時',
  PRIMARY KEY (`candidate_id`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='旅行候補テーブル';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `trip_candidates`
--

LOCK TABLES `trip_candidates` WRITE;
/*!40000 ALTER TABLE `trip_candidates` DISABLE KEYS */;
INSERT INTO `trip_candidates` VALUES (1,'1','destination','三重県（伊勢・鳥羽エリア）','伊勢神宮や鳥羽水族館、海の幸も楽しめる旅行先です。',NULL,1,'selected','2026-06-18 11:00:00'),(2,'1','destination','三重県（志摩エリア）','英虞湾の景色とリゾートを楽しめるエリアです。',NULL,2,'candidate','2026-06-18 11:10:00'),(3,'1','spot','伊勢神宮','内宮・外宮を巡る三重旅行の定番スポットです。','https://images.unsplash.com/photo-1627575191507-6a4a0619a909?auto=format&fit=crop&w=800&q=80',2,'candidate','2026-06-18 11:20:00'),(4,'1','spot','鳥羽水族館','ジュゴンやラッコで有名な水族館です。','https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=800&q=80',3,'candidate','2026-06-18 11:30:00'),(5,'1','hotel','鳥羽シーサイドコテージ','海を一望できるBBQ付きコテージです。グループ旅行に最適です。',NULL,1,'candidate','2026-06-18 11:40:00'),(6,'1','restaurant','伊勢うどん 山口屋','伊勢うどんを味わえる老舗です。',NULL,3,'candidate','2026-06-18 11:50:00'),(7,'2','destination','北海道（札幌・小樽エリア）','札幌の街歩きと小樽運河、海鮮グルメを楽しめます。',NULL,2,'candidate','2026-06-19 15:00:00');
/*!40000 ALTER TABLE `trip_candidates` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `trip_date_candidates`
--

DROP TABLE IF EXISTS `trip_date_candidates`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `trip_date_candidates` (
  `candidate_id` bigint NOT NULL AUTO_INCREMENT COMMENT '候補日ID',
  `trip_id` bigint NOT NULL COMMENT '旅行ID',
  `candidate_start_date` date DEFAULT NULL COMMENT '候補開始日',
  `candidate_end_date` date DEFAULT NULL COMMENT '候補終了日',
  `created_by` bigint DEFAULT NULL COMMENT '登録者',
  `created_at` datetime DEFAULT NULL COMMENT '登録日時',
  PRIMARY KEY (`candidate_id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `trip_date_candidates`
--

LOCK TABLES `trip_date_candidates` WRITE;
/*!40000 ALTER TABLE `trip_date_candidates` DISABLE KEYS */;
INSERT INTO `trip_date_candidates` VALUES (1,1,'2026-08-20','2026-08-22',1,'2026-06-18 13:00:00'),(2,1,'2026-08-27','2026-08-29',2,'2026-06-18 13:05:00'),(3,2,'2026-09-12','2026-09-14',2,'2026-06-19 15:30:00');
/*!40000 ALTER TABLE `trip_date_candidates` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `trip_date_votes`
--

DROP TABLE IF EXISTS `trip_date_votes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `trip_date_votes` (
  `vote_id` bigint NOT NULL AUTO_INCREMENT COMMENT '投票ID',
  `candidate_id` bigint NOT NULL COMMENT '対象候補日ID',
  `user_id` bigint NOT NULL COMMENT '投票ユーザー',
  `vote_type` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '投票結果（yes / maybe / no）',
  `voted_at` datetime DEFAULT NULL COMMENT '投票日時',
  PRIMARY KEY (`vote_id`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `trip_date_votes`
--

LOCK TABLES `trip_date_votes` WRITE;
/*!40000 ALTER TABLE `trip_date_votes` DISABLE KEYS */;
INSERT INTO `trip_date_votes` VALUES (1,1,1,'yes','2026-06-18 14:00:00'),(2,1,2,'yes','2026-06-18 14:05:00'),(3,1,3,'maybe','2026-06-18 14:10:00'),(4,2,1,'maybe','2026-06-18 14:15:00'),(5,2,2,'no','2026-06-18 14:20:00'),(6,3,1,'yes','2026-06-19 16:00:00'),(7,3,2,'yes','2026-06-19 16:05:00');
/*!40000 ALTER TABLE `trip_date_votes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `trip_decisions`
--

DROP TABLE IF EXISTS `trip_decisions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `trip_decisions` (
  `decision_id` bigint NOT NULL AUTO_INCREMENT COMMENT '決定事項ID',
  `trip_id` bigint NOT NULL COMMENT '対象旅行ID',
  `decision_type` enum('destination','hotel','schedule','budget') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '決定事項種別',
  `title` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '決定事項タイトル',
  `detail` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT '詳細内容',
  `decided_at` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '決定日時',
  PRIMARY KEY (`decision_id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='旅行確定情報';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `trip_decisions`
--

LOCK TABLES `trip_decisions` WRITE;
/*!40000 ALTER TABLE `trip_decisions` DISABLE KEYS */;
INSERT INTO `trip_decisions` VALUES (1,1,'destination','旅行先を伊勢・鳥羽に決定','伊勢神宮と鳥羽水族館を中心に巡ります。','2026-06-20 18:00:00'),(2,1,'schedule','旅行日程を決定','2026年8月20日から8月22日までの2泊3日です。','2026-06-20 18:10:00'),(3,1,'budget','予算上限を決定','交通費と宿泊費を含めて1人5万円を目安にします。','2026-06-20 18:20:00');
/*!40000 ALTER TABLE `trip_decisions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `trip_members`
--

DROP TABLE IF EXISTS `trip_members`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `trip_members` (
  `trip_member_id` bigint NOT NULL AUTO_INCREMENT COMMENT '旅行参加レコードID',
  `trip_id` bigint NOT NULL COMMENT '旅行ID',
  `user_id` int NOT NULL,
  `participation_status` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '参加状態（joined / pending）',
  `joined_at` datetime DEFAULT NULL COMMENT '参加日時',
  PRIMARY KEY (`trip_member_id`),
  UNIQUE KEY `uq_trip_members_trip_user` (`trip_id`,`user_id`),
  KEY `idx_trip_members_trip_id` (`trip_id`),
  KEY `idx_trip_members_user_id` (`user_id`),
  CONSTRAINT `fk_trip_members_trip` FOREIGN KEY (`trip_id`) REFERENCES `trips` (`trip_id`),
  CONSTRAINT `fk_trip_members_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=15 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `trip_members`
--

LOCK TABLES `trip_members` WRITE;
/*!40000 ALTER TABLE `trip_members` DISABLE KEYS */;
INSERT INTO `trip_members` VALUES (1,1,1,'joined','2026-06-18 10:30:00'),(2,1,2,'joined','2026-06-18 10:35:00'),(3,1,3,'joined','2026-06-18 10:40:00'),(4,1,4,'joined','2026-06-18 10:45:00'),(5,1,5,'joined','2026-06-18 10:50:00'),(6,1,6,'joined','2026-06-18 10:55:00'),(7,1,7,'joined','2026-06-18 11:00:00'),(8,2,2,'joined','2026-06-19 14:00:00'),(9,2,1,'joined','2026-06-19 14:10:00'),(14,3,2,'joined','2026-07-13 14:33:55');
/*!40000 ALTER TABLE `trip_members` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `trip_survey_options`
--

DROP TABLE IF EXISTS `trip_survey_options`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `trip_survey_options` (
  `option_id` bigint NOT NULL AUTO_INCREMENT COMMENT '選択肢ID',
  `survey_id` bigint NOT NULL COMMENT '対象アンケートID',
  `option_text` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '選択肢内容',
  `candidate_id` bigint DEFAULT NULL COMMENT '選択肢に紐づく旅行候補ID',
  `sort_order` int DEFAULT '0' COMMENT '表示順',
  PRIMARY KEY (`option_id`),
  KEY `idx_trip_survey_options_candidate_id` (`candidate_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='アンケート選択肢';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `trip_survey_options`
--

LOCK TABLES `trip_survey_options` WRITE;
/*!40000 ALTER TABLE `trip_survey_options` DISABLE KEYS */;
/*!40000 ALTER TABLE `trip_survey_options` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `trip_survey_votes`
--

DROP TABLE IF EXISTS `trip_survey_votes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `trip_survey_votes` (
  `vote_id` bigint NOT NULL AUTO_INCREMENT COMMENT 'アンケート回答ID',
  `survey_id` bigint NOT NULL COMMENT 'アンケートID',
  `option_id` bigint NOT NULL COMMENT '選択した選択肢ID',
  `user_id` bigint NOT NULL COMMENT '回答者ユーザーID',
  `voted_at` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '回答日時',
  PRIMARY KEY (`vote_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='アンケート回答';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `trip_survey_votes`
--

LOCK TABLES `trip_survey_votes` WRITE;
/*!40000 ALTER TABLE `trip_survey_votes` DISABLE KEYS */;
/*!40000 ALTER TABLE `trip_survey_votes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `trip_surveys`
--

DROP TABLE IF EXISTS `trip_surveys`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `trip_surveys` (
  `survey_id` bigint NOT NULL AUTO_INCREMENT COMMENT 'アンケートID',
  `trip_id` bigint NOT NULL COMMENT '対象旅行ID',
  `title` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'アンケートタイトル',
  `candidate_type` enum('destination','spot','hotel','restaurant') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '投票対象の候補カテゴリ',
  `created_by` bigint NOT NULL COMMENT '作成者ユーザーID',
  `deadline_at` datetime DEFAULT NULL COMMENT '回答締切日時',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '作成日時',
  PRIMARY KEY (`survey_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='アンケート';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `trip_surveys`
--

LOCK TABLES `trip_surveys` WRITE;
/*!40000 ALTER TABLE `trip_surveys` DISABLE KEYS */;
/*!40000 ALTER TABLE `trip_surveys` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `trips`
--

DROP TABLE IF EXISTS `trips`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `trips` (
  `trip_id` bigint NOT NULL AUTO_INCREMENT COMMENT '旅行ID',
  `group_id` bigint NOT NULL COMMENT '紐づくグループID',
  `title` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '旅行タイトル',
  `group_icon` text COLLATE utf8mb4_unicode_ci COMMENT '旅行グループのアイコン',
  `start_date` date DEFAULT NULL COMMENT '開始日（確定後に使用）',
  `end_date` date DEFAULT NULL COMMENT '終了日',
  `destination_summary` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT '行き先概要',
  `status` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '状態（draft / voting / confirmed）',
  `created_by` bigint DEFAULT NULL COMMENT '作成者',
  `created_at` datetime DEFAULT NULL COMMENT '作成日時',
  `updated_at` datetime DEFAULT NULL COMMENT '更新日時',
  PRIMARY KEY (`trip_id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `trips`
--

LOCK TABLES `trips` WRITE;
/*!40000 ALTER TABLE `trips` DISABLE KEYS */;
INSERT INTO `trips` VALUES (1,1,'三重旅行','Icon/21b58ef36e662e18212a626b79b1a545.jpg','2026-08-20','2026-08-22','三重県 伊勢・鳥羽エリア','voting',1,'2026-06-18 10:30:00','2026-06-22 09:00:00'),(2,2,'北海道旅行','Icon/0c4effb81f6e603f7039ab47c6b431d6.jpg','2026-09-12','2026-09-14','北海道 札幌・小樽エリア','draft',2,'2026-06-19 14:00:00','2026-06-21 18:00:00'),(3,3,'山形県','Icon/f8418bf550ae2cb38dd19ff20e3a0334.jpg','2027-03-31','2027-04-03',NULL,'draft',2,'2026-07-13 14:33:55','2026-07-13 14:33:56');
/*!40000 ALTER TABLE `trips` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_daily_activities`
--

DROP TABLE IF EXISTS `user_daily_activities`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `user_daily_activities` (
  `activity_id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `activity_date` date NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`activity_id`),
  UNIQUE KEY `uniq_user_activity_date` (`user_id`,`activity_date`),
  KEY `idx_activity_date` (`activity_date`),
  CONSTRAINT `fk_user_daily_activities_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=40 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_daily_activities`
--

LOCK TABLES `user_daily_activities` WRITE;
/*!40000 ALTER TABLE `user_daily_activities` DISABLE KEYS */;
INSERT INTO `user_daily_activities` VALUES (1,1,'2026-07-06','2026-07-06 04:37:23'),(2,2,'2026-07-06','2026-07-06 04:37:23'),(3,3,'2026-07-06','2026-07-06 04:37:23'),(4,4,'2026-07-06','2026-07-06 04:37:23'),(5,5,'2026-07-06','2026-07-06 04:37:23'),(6,6,'2026-07-06','2026-07-06 04:37:23'),(7,7,'2026-07-06','2026-07-06 04:37:23'),(8,8,'2026-07-06','2026-07-06 04:37:23'),(16,1,'2026-06-30','2026-07-06 05:00:53'),(17,1,'2026-07-01','2026-07-06 05:00:53'),(18,2,'2026-07-01','2026-07-06 05:00:53'),(20,1,'2026-07-02','2026-07-06 05:00:53'),(21,2,'2026-07-02','2026-07-06 05:00:53'),(22,3,'2026-07-02','2026-07-06 05:00:53'),(23,1,'2026-07-03','2026-07-06 05:00:53'),(24,2,'2026-07-03','2026-07-06 05:00:53'),(26,1,'2026-07-04','2026-07-06 05:00:53'),(27,2,'2026-07-04','2026-07-06 05:00:53'),(28,3,'2026-07-04','2026-07-06 05:00:53'),(29,4,'2026-07-04','2026-07-06 05:00:53'),(30,5,'2026-07-04','2026-07-06 05:00:53'),(33,1,'2026-07-05','2026-07-06 05:00:53'),(34,2,'2026-07-05','2026-07-06 05:00:53'),(35,3,'2026-07-05','2026-07-06 05:00:53'),(36,4,'2026-07-05','2026-07-06 05:00:53');
/*!40000 ALTER TABLE `user_daily_activities` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_devices`
--

DROP TABLE IF EXISTS `user_devices`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `user_devices` (
  `device_id` bigint NOT NULL AUTO_INCREMENT COMMENT 'デバイス識別ID',
  `user_id` int NOT NULL COMMENT '所有ユーザーID',
  `push_token` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'FCM登録トークン',
  `token_hash` char(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL COMMENT 'FCM登録トークンのSHA-256ハッシュ',
  `platform` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'web' COMMENT 'プラットフォーム（web / android / ios）',
  `app_type` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pwa' COMMENT 'アプリ種別（pwa / native）',
  `device_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '端末名',
  `browser` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'ブラウザ名',
  `user_agent` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'ユーザーエージェント',
  `is_active` tinyint(1) NOT NULL DEFAULT '1' COMMENT '通知送信対象として有効か',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '作成日時',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新日時',
  `last_used_at` datetime DEFAULT NULL COMMENT '最後に登録・利用した日時',
  `revoked_at` datetime DEFAULT NULL COMMENT '無効化日時',
  PRIMARY KEY (`device_id`),
  UNIQUE KEY `uk_user_devices_token_hash` (`token_hash`),
  KEY `idx_user_devices_user_active` (`user_id`,`is_active`),
  KEY `idx_user_devices_platform_app` (`platform`,`app_type`),
  CONSTRAINT `fk_user_devices_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='ユーザー端末とFCM登録トークン管理';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_devices`
--

LOCK TABLES `user_devices` WRITE;
/*!40000 ALTER TABLE `user_devices` DISABLE KEYS */;
INSERT INTO `user_devices` (`device_id`,`user_id`,`push_token`,`token_hash`,`platform`,`app_type`,`device_name`,`browser`,`user_agent`,`is_active`,`created_at`,`updated_at`,`last_used_at`,`revoked_at`) VALUES (1,1,'test_web_push_2410026','68f068cb140080dc85ba04e9cc71ff509b6f2e65fb04e2d252360eff3b229aec','web','pwa','sample web device','Web',NULL,0,'2026-06-22 15:00:00','2026-06-22 15:00:00','2026-06-22 15:00:00','2026-06-22 15:00:00'),(2,2,'test_web_push_2410041','1b5c4703f21aa746f0ca1a8112b2e9d7790eb7832afa725a14c0eeeeaf7e8aaf','web','pwa','sample web device','Web',NULL,0,'2026-06-22 15:00:00','2026-06-22 15:00:00','2026-06-22 15:00:00','2026-06-22 15:00:00'),(3,3,'test_web_push_2410008','9133cb74a09d7068488013e118f4d65f4677a0beded7cf329d0299b7faea1f93','web','pwa','sample web device','Web',NULL,0,'2026-06-22 15:00:00','2026-06-22 15:00:00','2026-06-22 15:00:00','2026-06-22 15:00:00'),(4,4,'test_web_push_2410017','52c8d1b4e3987a49d95dfbdedd110c45ccfb7351779a3d3ebe6c46ce292d7465','web','pwa','sample web device','Web',NULL,0,'2026-06-22 15:00:00','2026-06-22 15:00:00','2026-06-22 15:00:00','2026-06-22 15:00:00'),(5,5,'test_web_push_2410019','7c1631e0899ff4391215c17d4a2f5d6eb4e6d4faec3a70b6bc1a9d71c1cf764e','web','pwa','sample web device','Web',NULL,0,'2026-06-22 15:00:00','2026-06-22 15:00:00','2026-06-22 15:00:00','2026-06-22 15:00:00'),(6,6,'test_web_push_2410027','6adb4f78ca025a7ff9bcb14287b41847084baae7b2d3cc29b0c32dfea5c56fe8','web','pwa','sample web device','Web',NULL,0,'2026-06-22 15:00:00','2026-06-22 15:00:00','2026-06-22 15:00:00','2026-06-22 15:00:00'),(7,7,'test_web_push_2410056','e718d99048293da4125be99cbc7039485cb9bfb7138dffad1c17c738514bc58b','web','pwa','sample web device','Web',NULL,0,'2026-06-22 15:00:00','2026-06-22 15:00:00','2026-06-22 15:00:00','2026-06-22 15:00:00');
/*!40000 ALTER TABLE `user_devices` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_groups`
--

DROP TABLE IF EXISTS `user_groups`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `user_groups` (
  `group_id` bigint NOT NULL AUTO_INCREMENT COMMENT 'グループID',
  `group_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'グループ名',
  `created_by` bigint NOT NULL COMMENT '作成ユーザーID',
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT 'グループ説明',
  `status` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'active' COMMENT '状態（active / archived）',
  `created_at` datetime NOT NULL COMMENT '作成日時',
  `updated_at` datetime NOT NULL COMMENT '更新日時',
  PRIMARY KEY (`group_id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_groups`
--

LOCK TABLES `user_groups` WRITE;
/*!40000 ALTER TABLE `user_groups` DISABLE KEYS */;
INSERT INTO `user_groups` VALUES (1,'三重旅行メンバー',1,'伊勢・鳥羽を巡る2泊3日の旅行グループです。','active','2026-06-18 10:00:00','2026-06-22 09:00:00'),(2,'北海道旅行メンバー',2,'札幌・小樽を巡る2泊3日の旅行グループです。','active','2026-06-19 13:00:00','2026-06-21 18:00:00'),(3,'山形県',2,NULL,'active','2026-07-13 14:33:55','2026-07-13 14:33:55');
/*!40000 ALTER TABLE `user_groups` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_profiles`
--

DROP TABLE IF EXISTS `user_profiles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `user_profiles` (
  `user_id` bigint NOT NULL COMMENT 'usersテーブルとの1対1紐付け',
  `nickname` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'ニックネーム（表示用・任意）',
  `birthday` date DEFAULT NULL COMMENT '生年月日（年齢計算などで使用）',
  `gender` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '性別（任意・未設定可）',
  `self_introduction` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT '自己紹介文',
  `country_code` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '国コード（例: JP, US）',
  `timezone` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'タイムゾーン（例: Asia/Tokyo）',
  PRIMARY KEY (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_profiles`
--

LOCK TABLES `user_profiles` WRITE;
/*!40000 ALTER TABLE `user_profiles` DISABLE KEYS */;
INSERT INTO `user_profiles` VALUES (1,'大斗',NULL,NULL,'琵琶湖',NULL,'Asia/Tokyo'),(2,'歩希','2005-10-27','男性','こんちゃっちゃ',NULL,'Asia/Tokyo'),(3,'心人',NULL,NULL,'ドパガキです。',NULL,'Asia/Tokyo'),(4,'慎哉',NULL,NULL,'チャットと候補管理を担当します。',NULL,'Asia/Tokyo'),(5,'絃輝',NULL,NULL,'スポット情報の管理を担当します。\n小野です。よろしくお願いします。',NULL,'Asia/Tokyo'),(6,'煌',NULL,NULL,'なますて。\nいやー今日はしゃいんですしねぇー',NULL,'Asia/Tokyo'),(7,'真人',NULL,NULL,'旅行費用の確認を担当します。','JP','Asia/Tokyo'),(8,'管理人',NULL,NULL,'鳥羽シーサイドコテージの管理人です。','JP','Asia/Tokyo');
/*!40000 ALTER TABLE `user_profiles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_roles`
--

DROP TABLE IF EXISTS `user_roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `user_roles` (
  `user_id` bigint NOT NULL COMMENT 'ユーザーID（rolesとの中間テーブル）',
  `role_id` bigint NOT NULL COMMENT '付与されるロールID',
  PRIMARY KEY (`user_id`,`role_id`) COMMENT '同一ユーザーへの重複ロール付与防止'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_roles`
--

LOCK TABLES `user_roles` WRITE;
/*!40000 ALTER TABLE `user_roles` DISABLE KEYS */;
INSERT INTO `user_roles` VALUES (1,1),(1,2),(2,2),(3,2),(4,2),(5,2),(6,2),(7,2),(8,2);
/*!40000 ALTER TABLE `user_roles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `users` (
  `user_id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'ユーザーの表示名（アプリ内で表示される名前）',
  `email` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'ログイン用メールアドレス（一意制約で重複防止）',
  `phone_number` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '電話番号',
  `password_hash` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'ハッシュ化されたパスワード（平文保存禁止）',
  `icon_url` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT 'プロフィール画像のURL（外部ストレージ参照）',
  `language_code` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'ja' COMMENT '言語設定（例: ja, en）',
  `status` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'active' COMMENT 'アカウント状態（active / suspended / deleted）',
  `created_at` datetime NOT NULL COMMENT '作成日時',
  `updated_at` datetime NOT NULL COMMENT '更新日時',
  `deleted_at` datetime DEFAULT NULL COMMENT '論理削除日時（NULLなら有効）',
  `last_active_at` datetime DEFAULT NULL COMMENT '最終アクティブ日時',
  `last_login_at` datetime DEFAULT NULL COMMENT '最終ログイン日時',
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'石垣大斗','2410026@i-seifu.jp',NULL,'2024gakusei','User/1/profile/b4c65ff7357de58b414c172b30ce7e72.jpg','ja','active','2026-06-17 14:40:41','2026-07-13 15:35:11',NULL,'2026-07-16 16:49:09','2026-07-16 14:50:00'),(2,'山口歩希','2410041@i-seifu.jp','070-2327-9256','2024gakusei','User/2/profile/ed4ce8f6437384542494505094b357ad.jpg','ja','active','2026-06-22 15:00:00','2026-07-16 16:10:25',NULL,'2026-07-22 08:32:35','2026-07-16 13:40:39'),(3,'福島心人','2410008@i-seifu.jp',NULL,'2024gakusei','User/3/profile/ce839087c62a0bae3171087d2f287853.jpg','ja','active','2026-06-22 15:00:00','2026-07-13 15:16:32',NULL,'2026-07-13 15:35:19','2026-07-13 15:35:19'),(4,'寺川慎哉','2410017@i-seifu.jp',NULL,'2024gakusei','User/4/profile/1655aa686ee211887ee2977dddb297b1.jpg','ja','active','2026-06-17 15:51:36','2026-07-13 14:40:50',NULL,'2026-07-16 17:48:40','2026-07-16 15:46:01'),(5,'小野絃輝','2410019@i-seifu.jp',NULL,'2024gakusei','User/5/profile/b734928d55d660674e99d36f2628ed8c.jpg','ja','active','2026-06-22 15:00:00','2026-07-13 06:31:45',NULL,'2026-07-15 15:08:08','2026-07-15 12:03:23'),(6,'やきうどん','2410027@i-seifu.jp',NULL,'2024gakusei','User/6/profile/267b765a1d33b49fe716508c46bc0a11.jpg','ja','active','2026-06-22 15:00:00','2026-07-13 15:16:20',NULL,'2026-07-13 17:06:06','2026-07-13 15:14:38'),(7,'志田真人','2410056@i-seifu.jp',NULL,'2024gakusei','User/2/profile/pervere.jpeg','ja','active','2026-06-22 15:00:00','2026-06-22 15:00:00',NULL,NULL,NULL),(8,'コテージ管理人','cottage.manager@example.test',NULL,'2024gakusei','User/2/profile/huurin.jpeg','ja','active','2026-06-20 10:00:00','2026-06-20 10:00:00',NULL,NULL,NULL);
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping events for database 'tabidb'
--

--
-- Dumping routines for database 'tabidb'
--
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-07-22  8:37:50
