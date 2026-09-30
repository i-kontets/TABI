-- 既存のお知らせ・通知を作り直さず、配信対象と通知履歴の対応を追加します。
-- 適用前に SHOW CREATE TABLE admin_notices / notifications を確認してください。
-- 既存行はすべて NULL のまま残り、過去のお知らせを自動配信しません。
-- 同じSQLの再実行は不可です。既に列がある環境には適用しないでください。
ALTER TABLE admin_notices
    ADD COLUMN target_id bigint NULL COMMENT '特定ユーザーまたは特定グループのID',
    ADD COLUMN notification_id bigint NULL COMMENT '作成済みの通知本体ID',
    ADD COLUMN request_key varchar(64) CHARACTER SET ascii COLLATE ascii_bin NULL COMMENT '登録リクエストの重複防止キー',
    ADD COLUMN realtime_published_at datetime NULL COMMENT '公開時のWebSocket送信依頼が全件成功した日時',
    ADD UNIQUE KEY uq_admin_notice_notification (notification_id),
    ADD UNIQUE KEY uq_admin_notice_request (request_key),
    ADD KEY idx_admin_notice_publish (realtime_published_at, start_at),
    ADD CONSTRAINT fk_admin_notice_notification FOREIGN KEY (notification_id)
        REFERENCES notifications (notification_id) ON DELETE SET NULL;
