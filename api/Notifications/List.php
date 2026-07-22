<?php

session_start();
header("Content-Type: application/json; charset=UTF-8");
require_once __DIR__ . "/../config/db.php";
require_once __DIR__ . "/Common.php";
notificationRequireMethod("GET");
$userId = notificationRequireLoginUserId();
session_write_close();
$category = notificationReadCategory();
$limit = notificationReadLimit();
$offset = notificationReadOffset();
[$categorySql, $categoryParams] = notificationCategorySql($category);
$fetchLimit = $limit + 1;
try {
    // 通知一覧はログインユーザー宛だけを、受信日時の新しい順で取得します。
    $sql = "SELECT nr.recipient_id, nr.notification_id, nr.is_read, nr.read_at, nr.created_at AS received_at, n.notification_type, n.notification_subtype, n.title, n.body, n.target_type, n.target_id, n.action_path, n.detail_data, n.created_at, n.expires_at FROM notification_recipients AS nr INNER JOIN notifications AS n ON n.notification_id = nr.notification_id WHERE nr.user_id = :user_id AND (n.expires_at IS NULL OR n.expires_at > NOW()) {$categorySql} ORDER BY nr.created_at DESC, nr.recipient_id DESC LIMIT :limit OFFSET :offset";
    $stmt = $pdo->prepare($sql);
    $stmt->bindValue(":user_id", $userId, PDO::PARAM_INT);
    foreach ($categoryParams as $name => $value) $stmt->bindValue($name, $value, PDO::PARAM_STR);
    // limit + 1件を取得し、次ページがあるかだけ判定してから返却件数をlimitに戻します。
    $stmt->bindValue(":limit", $fetchLimit, PDO::PARAM_INT);
    $stmt->bindValue(":offset", $offset, PDO::PARAM_INT);
    $stmt->execute();
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    $hasMore = count($rows) > $limit;
    if ($hasMore) array_pop($rows);
    notificationRespond(["success" => true, "data" => ["notifications" => array_map("notificationRowToResponse", $rows), "pagination" => ["limit" => $limit, "offset" => $offset, "returnedCount" => count($rows), "hasMore" => $hasMore]]]);
} catch (Throwable $error) {
    notificationRespond(["success" => false, "message" => "通知一覧の取得に失敗しました。"], 500);
}
