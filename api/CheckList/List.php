<?php

session_start();

header("Content-Type: application/json; charset=UTF-8");

require_once __DIR__ . "/../config/db.php";
require_once __DIR__ . "/Common.php";

checklistRequireMethod("GET");
$userId = checklistRequireUserId();

try {
    $tripId = checklistPositiveInt($_GET["trip_id"] ?? null);
    $groupId = checklistPositiveInt($_GET["group_id"] ?? $_GET["groupId"] ?? null);
    $resolvedTripId = checklistResolveTripId($pdo, $userId, $tripId, $groupId);
    $checklist = checklistFindPacking($pdo, $resolvedTripId);

    if (!$checklist) {
        checklistRespond([
            "success" => true,
            "trip_id" => $resolvedTripId,
            "checklist" => null,
            "sections" => [
                [
                    "id" => "shared",
                    "title" => "全員が必要なもの",
                    "description" => "旅行メンバー全員で確認する持ちものです。",
                    "items" => [],
                ],
                [
                    "id" => "personal",
                    "title" => "個人で必要なもの",
                    "description" => "自分が担当する持ちものです。",
                    "items" => [],
                ],
            ],
        ]);
    }

    $stmt = $pdo->prepare("
        SELECT
            ci.checklist_item_id,
            ci.checklist_id,
            ci.item_name,
            ci.is_checked,
            ci.assigned_user_id,
            ci.sort_order,
            u.name AS assignee_name
        FROM checklist_items ci
        LEFT JOIN users u ON u.user_id = ci.assigned_user_id
        WHERE ci.checklist_id = :checklist_id
        ORDER BY
            (ci.sort_order IS NULL) ASC,
            ci.sort_order ASC,
            ci.checklist_item_id ASC
    ");
    $stmt->execute([":checklist_id" => $checklist["checklist_id"]]);

    $sharedItems = [];
    $personalItems = [];

    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        $item = checklistFormatItem($row);
        $sharedItems[] = $item;

        if ($item["assigned_user_id"] === $userId) {
            $personalItems[] = $item;
        }
    }

    checklistRespond([
        "success" => true,
        "trip_id" => $resolvedTripId,
        "checklist" => [
            "id" => (int) $checklist["checklist_id"],
            "checklist_id" => (int) $checklist["checklist_id"],
            "type" => $checklist["checklist_type"],
            "title" => $checklist["title"],
        ],
        "sections" => [
            [
                "id" => "shared",
                "title" => "全員が必要なもの",
                "description" => "旅行メンバー全員で確認する持ちものです。",
                "items" => $sharedItems,
            ],
            [
                "id" => "personal",
                "title" => "個人で必要なもの",
                "description" => "自分が担当する持ちものです。",
                "items" => $personalItems,
            ],
        ],
    ]);
} catch (Throwable $error) {
    checklistRespond([
        "success" => false,
        "message" => "チェックリストの取得に失敗しました",
    ], 500);
}
