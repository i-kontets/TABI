<?php

session_start();

header("Content-Type: application/json; charset=UTF-8");

require_once __DIR__ . "/../config/db.php";
require_once __DIR__ . "/Common.php";

checklistRequireMethod("POST");

$userId = checklistRequireUserId();
$input = checklistReadJsonBody();

try {
    $tripId = checklistPositiveInt(
        $input["trip_id"] ?? null
    );

    $groupId = checklistPositiveInt(
        $input["group_id"]
            ?? $input["groupId"]
            ?? null
    );

    $name = trim(
        (string) (
            $input["name"]
                ?? $input["item_name"]
                ?? ""
        )
    );

    $note = trim(
        (string) ($input["note"] ?? "")
    );

    $scope = (string) (
        $input["scope"] ?? "all"
    );

    /*
     * 持ちもの名チェック
     */
    if (
        $name === ""
        || checklistTextLength($name) > 200
    ) {
        checklistRespond([
            "success" => false,
            "message" =>
                "持ちもの名は1文字以上200文字以内で入力してください",
        ], 400);
    }

    /*
     * メモチェック
     */
    if (checklistTextLength($note) > 2000) {
        checklistRespond([
            "success" => false,
            "message" =>
                "メモは2000文字以内で入力してください",
        ], 400);
    }

    /*
     * 自分のみ / 全員
     *
     * self = 0
     * all  = 1
     */
    if (!in_array($scope, ["self", "all"], true)) {
        checklistRespond([
            "success" => false,
            "message" => "対象の指定が不正です",
        ], 400);
    }

    $assignedUserId = $scope === "self"
        ? $userId
        : null;

    /*
     * 旅行IDを決定
     */
    $resolvedTripId = checklistResolveTripId(
        $pdo,
        $userId,
        $tripId,
        $groupId
    );

    /*
     * 持ちものチェックリストを取得 / 作成
     */
    $checklist = checklistEnsurePacking(
        $pdo,
        $resolvedTripId,
        $userId
    );

    /*
     * 表示順を決定
     */
    $sortStmt = $pdo->prepare("
        SELECT COALESCE(MAX(sort_order), 0) + 1
        FROM checklist_items
        WHERE checklist_id = :checklist_id
    ");

    $sortStmt->execute([
        ":checklist_id" =>
            $checklist["checklist_id"],
    ]);

    $sortOrder =
        checklistPositiveInt(
            $input["sort_order"] ?? null
        )
        ?? (int) $sortStmt->fetchColumn();

    /*
     * 持ちもの追加
     */
    $insertStmt = $pdo->prepare("
        INSERT INTO checklist_items (
            checklist_id,
            item_name,
            note,
            is_checked,
            assigned_user_id,
            sort_order
        ) VALUES (
            :checklist_id,
            :item_name,
            :note,
            0,
            :assigned_user_id,
            :sort_order
        )
    ");

    $insertStmt->bindValue(
        ":checklist_id",
        $checklist["checklist_id"],
        PDO::PARAM_INT
    );

    $insertStmt->bindValue(
        ":item_name",
        $name,
        PDO::PARAM_STR
    );

    $insertStmt->bindValue(
        ":note",
        $note,
        PDO::PARAM_STR
    );

    $insertStmt->bindValue(
        ":assigned_user_id",
        $assignedUserId,
        $assignedUserId === null
            ? PDO::PARAM_NULL
            : PDO::PARAM_INT
    );

    $insertStmt->bindValue(
        ":sort_order",
        $sortOrder,
        PDO::PARAM_INT
    );

    $insertStmt->execute();

    $itemId = (int) $pdo->lastInsertId();

    checklistRespond([
        "success" => true,
        "item" => [
            "id" => $itemId,
            "checklist_item_id" => $itemId,
            "checklist_id" =>
                (int) $checklist["checklist_id"],

            "name" => $name,
            "item_name" => $name,

            "note" => $note,

            "checked" => false,
            "is_checked" => false,

            "scope" => $scope,

            "assigned_user_id" =>
                $assignedUserId,

            "sort_order" => $sortOrder,
        ],
    ], 201);

} catch (Throwable $error) {

    checklistRespond([
        "success" => false,
        "message" => "持ちものの追加に失敗しました",
    ], 500);
}
