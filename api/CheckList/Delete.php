<?php

session_start();

header("Content-Type: application/json; charset=UTF-8");

require_once __DIR__ . "/../config/db.php";
require_once __DIR__ . "/Common.php";

checklistRequireMethod("DELETE");
$userId = checklistRequireUserId();
$input = checklistReadJsonBody();

try {
    $itemIds = checklistReadItemIds($input);
    if (count($itemIds) === 0) {
        checklistRespond(["success" => false, "message" => "削除する item_id を指定してください"], 400);
    }

    $deletedCount = 0;
    $deleteStmt = $pdo->prepare("
        DELETE FROM checklist_items
        WHERE checklist_item_id = :item_id
    ");

    foreach ($itemIds as $itemId) {
        checklistRequireItemAccess($pdo, $userId, $itemId);
        $deleteStmt->execute([":item_id" => $itemId]);
        $deletedCount += $deleteStmt->rowCount();
    }

    checklistRespond([
        "success" => true,
        "deleted_count" => $deletedCount,
    ]);
} catch (Throwable $error) {
    checklistRespond([
        "success" => false,
        "message" => "持ちものの削除に失敗しました",
    ], 500);
}
