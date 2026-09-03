<?php

session_start();

header("Content-Type: application/json; charset=UTF-8");

require_once __DIR__ . "/../config/db.php";
require_once __DIR__ . "/Common.php";

checklistRequireMethod("POST");
$userId = checklistRequireUserId();
$input = checklistReadJsonBody();

try {
    $tripId = checklistPositiveInt($input["trip_id"] ?? null);
    $groupId = checklistPositiveInt($input["group_id"] ?? $input["groupId"] ?? null);
    $name = trim((string) ($input["name"] ?? $input["item_name"] ?? ""));
    $sectionId = (string) ($input["section_id"] ?? $input["sectionId"] ?? "shared");
    $assignedUserId = checklistPositiveInt($input["assigned_user_id"] ?? null);

    if ($name === "" || checklistTextLength($name) > 200) {
        checklistRespond([
            "success" => false,
            "message" => "持ちもの名は1文字以上200文字以内で入力してください",
        ], 400);
    }

    if ($sectionId === "personal" && !$assignedUserId) {
        $assignedUserId = $userId;
    }

    $resolvedTripId = checklistResolveTripId($pdo, $userId, $tripId, $groupId);
    $checklist = checklistEnsurePacking($pdo, $resolvedTripId, $userId);

    $sortStmt = $pdo->prepare("
        SELECT COALESCE(MAX(sort_order), 0) + 1
        FROM checklist_items
        WHERE checklist_id = :checklist_id
    ");
    $sortStmt->execute([":checklist_id" => $checklist["checklist_id"]]);
    $sortOrder = checklistPositiveInt($input["sort_order"] ?? null) ?? (int) $sortStmt->fetchColumn();

    $insertStmt = $pdo->prepare("
        INSERT INTO checklist_items (
            checklist_id,
            item_name,
            is_checked,
            assigned_user_id,
            sort_order
        ) VALUES (
            :checklist_id,
            :item_name,
            0,
            :assigned_user_id,
            :sort_order
        )
    ");
    $insertStmt->bindValue(":checklist_id", $checklist["checklist_id"], PDO::PARAM_INT);
    $insertStmt->bindValue(":item_name", $name, PDO::PARAM_STR);
    $insertStmt->bindValue(":assigned_user_id", $assignedUserId, $assignedUserId ? PDO::PARAM_INT : PDO::PARAM_NULL);
    $insertStmt->bindValue(":sort_order", $sortOrder, PDO::PARAM_INT);
    $insertStmt->execute();

    $itemId = (int) $pdo->lastInsertId();

    checklistRespond([
        "success" => true,
        "item" => [
            "id" => $itemId,
            "checklist_item_id" => $itemId,
            "checklist_id" => (int) $checklist["checklist_id"],
            "name" => $name,
            "item_name" => $name,
            "note" => "",
            "checked" => false,
            "is_checked" => false,
            "assigned_user_id" => $assignedUserId,
            "assignee" => "",
            "sort_order" => $sortOrder,
        ],
    ], 201);
} catch (Throwable $error) {
    checklistRespond([
        "success" => false,
        "message" => "持ちものの追加に失敗しました",
    ], 500);
}
