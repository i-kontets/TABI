<?php

session_start();
header("Content-Type: application/json; charset=UTF-8");
require_once __DIR__ . "/../config/db.php";
require_once __DIR__ . "/Common.php";
notificationRequireMethod("GET");
$userId = notificationRequireLoginUserId();
session_write_close();
try {
    $unreadCount = notificationUnreadCount($pdo, $userId);
    notificationRespond(["success" => true, "data" => ["unreadCount" => $unreadCount, "badgeText" => notificationBadgeText($unreadCount)]]);
} catch (Throwable $error) {
    notificationRespond(["success" => false, "message" => "未読件数の取得に失敗しました。"], 500);
}
