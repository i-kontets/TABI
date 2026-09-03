-- TABIのパスワード再設定URLを管理するための追加実行用SQLです。
-- 既存の統合SQLファイルは変更せず、このファイルだけをDBへ追加実行します。
-- usersテーブルの既存データや既存カラムは変更しません。

CREATE TABLE IF NOT EXISTS password_reset_tokens (
    password_reset_token_id BIGINT NOT NULL AUTO_INCREMENT
        COMMENT 'パスワード再設定データを識別するID',

    user_id INT NOT NULL
        COMMENT 'パスワードを再設定するユーザーID。users.user_idと紐付ける',

    reset_token VARCHAR(255) NOT NULL
        COMMENT 'パスワード再設定URLで使用する一時トークン。今回の開発方針ではハッシュ化せず保存する',

    expires_at DATETIME NOT NULL
        COMMENT '再設定URLを使用できる期限。今回はメール送信から1時間後に設定する',

    used_at DATETIME DEFAULT NULL
        COMMENT '再設定URLを使用した日時。未使用の場合はNULL',

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        COMMENT '再設定メールの発行日時',

    PRIMARY KEY (password_reset_token_id)
        COMMENT '各トークン行を一意に識別する主キー',

    UNIQUE KEY uq_password_reset_tokens_token (reset_token)
        COMMENT '同じ再設定トークンが重複しないようにする',

    KEY idx_password_reset_tokens_user_id (user_id)
        COMMENT 'ユーザーごとの未使用トークンを探しやすくする',

    KEY idx_password_reset_tokens_expires_at (expires_at)
        COMMENT '有効期限切れトークンを確認しやすくする',

    CONSTRAINT fk_password_reset_tokens_user
        FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE
)
ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='パスワード再設定用の一時URLを管理するテーブル';
