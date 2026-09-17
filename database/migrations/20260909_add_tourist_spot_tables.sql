-- TABI tourist spot feature tables
-- 2026-09-09
--
-- 現行 API は tourist_spots / reviews / favorites を参照します。
-- 現行 DB に admin_spots しかない環境向けに、観光地マスターとレビュー・お気に入りを追加します。

CREATE TABLE IF NOT EXISTS `tourist_spots` (
  `tourist_spot_id` bigint NOT NULL AUTO_INCREMENT COMMENT '観光地ID',
  `osm_type` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'OSM種別',
  `osm_id` bigint DEFAULT NULL COMMENT 'OSM ID',
  `name` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '観光地名',
  `prefecture` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '都道府県',
  `city` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '市区町村',
  `address` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '住所',
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '説明',
  `category` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'カテゴリ',
  `type` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '種別',
  `lat` decimal(10,7) DEFAULT NULL COMMENT '緯度',
  `lon` decimal(10,7) DEFAULT NULL COMMENT '経度',
  `image_url` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '画像URL',
  `source` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'データ取得元',
  `osm_updated_at` datetime DEFAULT NULL COMMENT 'OSM更新日時',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '作成日時',
  `updated_at` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP COMMENT '更新日時',
  PRIMARY KEY (`tourist_spot_id`),
  UNIQUE KEY `uk_tourist_spots_osm` (`osm_type`, `osm_id`),
  KEY `idx_tourist_spots_prefecture_city` (`prefecture`, `city`),
  KEY `idx_tourist_spots_name` (`name`),
  KEY `idx_tourist_spots_category` (`category`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='観光地マスターテーブル';

CREATE TABLE IF NOT EXISTS `reviews` (
  `review_id` bigint NOT NULL AUTO_INCREMENT COMMENT 'レビューID',
  `user_id` int NOT NULL COMMENT '投稿ユーザーID',
  `tourist_spot_id` bigint NOT NULL COMMENT '観光地ID',
  `rating` tinyint NOT NULL COMMENT '評価（1〜5）',
  `comment` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'コメント',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '作成日時',
  `updated_at` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP COMMENT '更新日時',
  PRIMARY KEY (`review_id`),
  UNIQUE KEY `uk_reviews_user_spot` (`user_id`, `tourist_spot_id`),
  KEY `idx_reviews_spot_created` (`tourist_spot_id`, `created_at`),
  KEY `idx_reviews_user` (`user_id`),
  CONSTRAINT `fk_reviews_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_reviews_tourist_spot` FOREIGN KEY (`tourist_spot_id`) REFERENCES `tourist_spots` (`tourist_spot_id`) ON DELETE CASCADE,
  CONSTRAINT `chk_reviews_rating` CHECK (`rating` BETWEEN 1 AND 5)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='観光地レビューテーブル';

CREATE TABLE IF NOT EXISTS `favorites` (
  `favorite_id` bigint NOT NULL AUTO_INCREMENT COMMENT 'お気に入りID',
  `user_id` int NOT NULL COMMENT '登録ユーザーID',
  `tourist_spot_id` bigint NOT NULL COMMENT '観光地ID',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '作成日時',
  PRIMARY KEY (`favorite_id`),
  UNIQUE KEY `uk_favorites_user_spot` (`user_id`, `tourist_spot_id`),
  KEY `idx_favorites_spot` (`tourist_spot_id`),
  KEY `idx_favorites_user_created` (`user_id`, `created_at`),
  CONSTRAINT `fk_favorites_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_favorites_tourist_spot` FOREIGN KEY (`tourist_spot_id`) REFERENCES `tourist_spots` (`tourist_spot_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='観光地お気に入りテーブル';

INSERT INTO `tourist_spots` (
  `tourist_spot_id`,
  `name`,
  `prefecture`,
  `city`,
  `address`,
  `category`,
  `type`,
  `lat`,
  `lon`,
  `source`,
  `created_at`,
  `updated_at`
)
SELECT
  `spot_id`,
  `name`,
  `prefecture`,
  NULL,
  `address`,
  `category`,
  `category`,
  `latitude`,
  `longitude`,
  'admin_spots',
  COALESCE(`created_at`, CURRENT_TIMESTAMP),
  `updated_at`
FROM `admin_spots`
WHERE `status` = 'published'
  AND `deleted_at` IS NULL
  AND NOT EXISTS (
    SELECT 1
    FROM `tourist_spots`
    WHERE `tourist_spots`.`tourist_spot_id` = `admin_spots`.`spot_id`
  );
