<?php

function handle_admin_delete(PDO $pdo, string $resource, $id): void
{
    // DELETE は論理削除のような「見えなくする」処理に使っています。
    // 実際にレコードを消すのではなく、削除日時を入れて一覧から除外します。
    $numericId = (int) preg_replace("/^[a-z]+/", "", (string) $id);
    if ($resource === "notices") {
        // お知らせは削除フラグを立てる方式です。
        $pdo->exec("UPDATE admin_notices SET deleted_at = NOW() WHERE notice_id = {$numericId}");
        sendRealtimeEvent("admin:global", "notice_deleted", [
            "notice_id" => $numericId,
        ]);
        respond(true);
    }
    if ($resource === "spots") {
        // スポットも同じく論理削除です。
        $pdo->exec("UPDATE admin_spots SET deleted_at = NOW() WHERE spot_id = {$numericId}");
        sendRealtimeEvent("admin:global", "spot_deleted", [
            "spot_id" => $numericId,
        ]);
        respond(true);
    }
}
