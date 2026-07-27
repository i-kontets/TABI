<?php

/**
 * 管理 API の GET/POST/PATCH/DELETE ごとの処理を担当します。
 *
 * 主な流れ:
 * 1. リクエストやセッションなど、処理に必要な情報を読み取る
 * 2. 入力値や権限を確認し、必要に応じてデータベースへ問い合わせる
 * 3. 処理結果を JSON などの形でフロントエンドへ返す
 *
 * 扱うデータ: アプリの設定値や、他のファイルから受け取る値を主に扱います。
 */

/**
 * handle_admin_delete は、この API 内で何度も使う処理をまとめた関数です。
 * 引数として受け取った値をもとに、確認・取得・更新などの結果を返します。
 */
function handle_admin_delete(PDO $pdo, string $resource, $id): void
{
    // DELETE は論理削除のような「見えなくする」処理に使っています。
    // 実際にレコードを消すのではなく、削除日時を入れて一覧から除外します。
    $numericId = (int) preg_replace("/^[a-z]+/", "", (string) $id);
    // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
    if ($resource === "notices") {
        // お知らせは削除フラグを立てる方式です。
        $pdo->exec("UPDATE admin_notices SET deleted_at = NOW() WHERE notice_id = {$numericId}");
        // WebSocket通知を送ります。DB更新後に呼ぶことで、他の画面へ「変更があった」ことを伝えます。
        sendRealtimeEvent("admin:global", "notice_deleted", [
            "notice_id" => $numericId,
        ]);
        // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
        respond(true);
    }
    // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
    if ($resource === "spots") {
        // スポットも同じく論理削除です。
        $pdo->exec("UPDATE admin_spots SET deleted_at = NOW() WHERE spot_id = {$numericId}");
        sendRealtimeEvent("admin:global", "spot_deleted", [
            "spot_id" => $numericId,
        ]);
        // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
        respond(true);
    }
}
