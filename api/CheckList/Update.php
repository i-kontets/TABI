<?php

session_start();

header("Content-Type: application/json; charset=UTF-8");

require_once __DIR__ . "/../config/db.php";
require_once __DIR__ . "/Common.php";

checklistRequireMethod("PATCH");
$userId = checklistRequireUserId();
$input = checklistReadJsonBody();

try {
    $itemId = checklistPositiveInt($input["item_id"] ?? $input["checklist_item_id"] ?? $input["id"] ?? null);
    if (!$itemId) {
        checklistRespond(["success" => false, "message" => "item_id を指定してください"], 400);
    }

    $item = checklistRequireItemAccess($pdo, $userId, $itemId);
    $name = array_key_exists("name", $input) || array_key_exists("item_name", $input)
        ? trim((string) ($input["name"] ?? $input["item_name"] ?? ""))
        : $item["item_name"];
    $checked = checklistNormalizeChecked($input["checked"] ?? $input["is_checked"] ?? null);
    $assignedUserId = array_key_exists("assigned_user_id", $input)
        ? checklistPositiveInt($input["assigned_user_id"])
        : ($item["assigned_user_id"] !== null ? (int) $item["assigned_user_id"] : null);
    $sortOrder = array_key_exists("sort_order", $input)
        ? checklistPositiveInt($input["sort_order"])
        : ($item["sort_order"] !== null ? (int) $item["sort_order"] : null);

    if ($name === "" || checklistTextLength($name) > 200) {
        checklistRespond([
            "success" => false,
            "message" => "持ちもの名は1文字以上200文字以内で入力してください",
        ], 400);
    }

    $updateStmt = $pdo->prepare("
        UPDATE checklist_items
        SET item_name = :item_name,
            is_checked = :is_checked,
            assigned_user_id = :assigned_user_id,
            sort_order = :sort_order
        WHERE checklist_item_id = :item_id
    ");
    $updateStmt->bindValue(":item_name", $name, PDO::PARAM_STR);
    $updateStmt->bindValue(":is_checked", $checked ?? (int) $item["is_checked"], PDO::PARAM_INT);
    $updateStmt->bindValue(":assigned_user_id", $assignedUserId, $assignedUserId ? PDO::PARAM_INT : PDO::PARAM_NULL);
    $updateStmt->bindValue(":sort_order", $sortOrder, $sortOrder ? PDO::PARAM_INT : PDO::PARAM_NULL);
    $updateStmt->bindValue(":item_id", $itemId, PDO::PARAM_INT);
    $updateStmt->execute();

    checklistRespond(["success" => true]);
} catch (Throwable $error) {
    checklistRespond([
        "success" => false,
        "message" => "持ちものの更新に失敗しました",
    ], 500);
}
