<?php

session_start();
header("Content-Type: application/json; charset=UTF-8");
require_once __DIR__ . "/../config/db.php";
require_once __DIR__ . "/Common.php";
notificationRequireMethod("PATCH");
notificationRejectIfCrossOrigin();
$userId = notificationRequireLoginUserId();
session_write_close();
try {
    $pdo->beginTransaction();
    // 現在表示対象になる未読通知だけを既読にし、期限切れ通知は更新しません。
    $stmt = $pdo->prepare("UPDATE notification_recipients AS nr INNER JOIN notifications AS n ON n.notification_id = nr.notification_id SET nr.is_read = 1, nr.read_at = COALESCE(nr.read_at, NOW()) WHERE nr.user_id = :user_id AND nr.is_read = 0 AND (n.expires_at IS NULL OR n.expires_at > NOW())");
    $stmt->bindValue(":user_id", $userId, PDO::PARAM_INT);
    $stmt->execute();
    $updatedCount = $stmt->rowCount();
    $unreadCount = notificationUnreadCount($pdo, $userId);
    $pdo->commit();
    notificationRespond(["success" => true, "message" => $updatedCount > 0 ? "すべての通知を既読にしました。" : "未読の通知はありません。", "data" => ["updatedCount" => $updatedCount, "unreadCount" => $unreadCount]]);
} catch (Throwable $error) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    notificationRespond(["success" => false, "message" => "通知の一括既読処理に失敗しました。"], 500);
}
