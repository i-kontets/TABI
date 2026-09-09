<?php

session_start();

header("Content-Type: application/json; charset=UTF-8");

require_once __DIR__ . "/../config/db.php";
require_once __DIR__ . "/Common.php";

checklistRequireMethod("GET");

$userId = checklistRequireUserId();

try {
    $tripId = checklistPositiveInt(
        $_GET["trip_id"] ?? null
    );

    $groupId = checklistPositiveInt(
        $_GET["group_id"]
            ?? $_GET["groupId"]
            ?? null
    );

    $resolvedTripId = checklistResolveTripId(
        $pdo,
        $userId,
        $tripId,
        $groupId
    );

    $checklist = checklistFindPacking(
        $pdo,
        $resolvedTripId
    );

    /*
     * チェックリストがまだ存在しない場合
     */
    if (!$checklist) {
        checklistRespond([
            "success" => true,
            "trip_id" => $resolvedTripId,
            "checklist" => null,
            "sections" => [
                [
                    "id" => "checklist",
                    "title" => "持ちもの",
                    "description" => "旅行に必要な持ちものを確認します。",
                    "items" => [],
                ],
            ],
        ]);
    }

    /*
     * 持ちもの一覧を取得
     */
    $stmt = $pdo->prepare("
        SELECT
            ci.checklist_item_id,
            ci.checklist_id,
            ci.item_name,
            ci.is_checked,
            ci.assigned_user_id,
            ci.sort_order
        FROM checklist_items ci
        WHERE ci.checklist_id = :checklist_id
        ORDER BY
            (ci.sort_order IS NULL) ASC,
            ci.sort_order ASC,
            ci.checklist_item_id ASC
    ");

    $stmt->execute([
        ":checklist_id" => $checklist["checklist_id"],
    ]);

    $items = [];

    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        $item = checklistFormatItem($row);

        /*
         * DBの assigned_user_id から
         * フロント用の scope を作る
         *
         * NULL
         *   → 全員
         *
         * 自分のユーザーID
         *   → 自分
         */
        if ($row["assigned_user_id"] === null) {
            $item["scope"] = "all";
        } elseif ((int) $row["assigned_user_id"] === (int) $userId) {
            $item["scope"] = "self";
        } else {
            /*
             * 旧データなどで他ユーザーのIDが
             * 入っていた場合は、画面上では
             * 「全員」として扱う
             */
            $item["scope"] = "all";
        }

        /*
         * 担当者名は今回の仕様では使用しない
         */
        unset($item["assignee"]);
        unset($item["assignee_name"]);

        $items[] = $item;
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

        /*
         * shared / personal に分けず、
         * すべて同じ場所に表示
         */
        "sections" => [
            [
                "id" => "checklist",
                "title" => "持ちもの",
                "description" => "旅行に必要な持ちものを確認します。",
                "items" => $items,
            ],
        ],
    ]);

} catch (Throwable $error) {

    checklistRespond([
        "success" => false,
        "message" => "チェックリストの取得に失敗しました",
    ], 500);
}