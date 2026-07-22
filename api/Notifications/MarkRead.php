<?php

session_start();
header("Content-Type: application/json; charset=UTF-8");
require_once __DIR__ . "/../config/db.php";
require_once __DIR__ . "/Common.php";
notificationRequireMethod("PATCH");
notificationRejectIfCrossOrigin();
$userId = notificationRequireLoginUserId();
$recipientId = notificationReadPositiveInt($_GET["recipientId"] ?? $_GET["recipient_id"] ?? null, "recipientId");
session_write_close();
try {
    $current = notificationFetchRecipient($pdo, $recipientId, $userId);
    if (!$current) notificationRespond(["success" => false, "message" => "通知が見つかりません。"], 404);
    // 既読済みの場合でも失敗にしないことで、同じリクエストを複数回送っても安全にします。
    if ((int) $current["is_read"] === 0) {
        $stmt = $pdo->prepare("UPDATE notification_recipients SET is_read = 1, read_at = COALESCE(read_at, NOW()) WHERE recipient_id = :recipient_id AND user_id = :user_id AND is_read = 0");
        $stmt->bindValue(":recipient_id", $recipientId, PDO::PARAM_INT);
        $stmt->bindValue(":user_id", $userId, PDO::PARAM_INT);
        $stmt->execute();
    }
    $updated = notificationFetchRecipient($pdo, $recipientId, $userId);
    notificationRespond(["success" => true, "message" => "通知を既読にしました。", "data" => ["recipientId" => $recipientId, "isRead" => true, "readAt" => $updated["read_at"] ?? $current["read_at"]]]);
} catch (Throwable $error) {
    notificationRespond(["success" => false, "message" => "通知の既読処理に失敗しました。"], 500);
}
