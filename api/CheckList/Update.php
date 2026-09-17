<?php

session_start();

header("Content-Type: application/json; charset=UTF-8");

require_once __DIR__ . "/../config/db.php";
require_once __DIR__ . "/Common.php";

checklistRequireMethod("PATCH");

$userId = checklistRequireUserId();
$input = checklistReadJsonBody();

try {
    /*
     * 更新対象のID
     */
    $itemId = checklistPositiveInt(
        $input["item_id"]
            ?? $input["checklist_item_id"]
            ?? $input["id"]
            ?? null
    );

    if (!$itemId) {
        checklistRespond([
            "success" => false,
            "message" => "item_id を指定してください",
        ], 400);
    }

    /*
     * 編集対象の持ちものを取得
     */
    $item = checklistRequireItemAccess(
        $pdo,
        $userId,
        $itemId
    );

    /*
     * 名前
     *
     * name が送られてきた場合だけ変更。
     * チェックだけ更新するときは元の名前を維持。
     */
    $name = array_key_exists(
        "name",
        $input
    )
        || array_key_exists(
            "item_name",
            $input
        )
        ? trim(
            (string) (
                $input["name"]
                    ?? $input["item_name"]
                    ?? ""
            )
        )
        : $item["item_name"];

    /*
     * メモ
     *
     * note が送られてきた場合だけ変更。
     * チェック状態だけ更新した場合は
     * 元のメモをそのまま維持。
     */
    $note = array_key_exists(
        "note",
        $input
    )
        ? trim(
            (string) $input["note"]
        )
        : ($item["note"] ?? "");

    /*
     * チェック状態
     */
    $checked = array_key_exists(
        "checked",
        $input
    )
        || array_key_exists(
            "is_checked",
            $input
        )
        ? checklistNormalizeChecked(
            $input["checked"]
                ?? $input["is_checked"]
                ?? null
        )
        : (int) $item["is_checked"];

    /*
     * 自分のみ / 全員
     *
     * self = 0
     * all  = 1
     */
    if (array_key_exists("scope", $input)) {

        $scope = (string) $input["scope"];

        if (!in_array(
            $scope,
            ["self", "all"],
            true
        )) {
            checklistRespond([
                "success" => false,
                "message" => "対象の指定が不正です",
            ], 400);
        }

        $assignedUserId = $scope === "self"
            ? $userId
            : null;

    } else {

        /*
         * scope が送られてこなかった場合は
         * 現在の値をそのまま維持。
         *
         * NULL の旧データは全員扱い。
         */
        $assignedUserId =
            $item["assigned_user_id"] !== null
                ? (int) $item["assigned_user_id"]
                : null;
    }

    /*
     * 表示順
     */
    $sortOrder = array_key_exists(
        "sort_order",
        $input
    )
        ? checklistPositiveInt(
            $input["sort_order"]
        )
        : (
            $item["sort_order"] !== null
                ? (int) $item["sort_order"]
                : null
        );

    /*
     * 名前チェック
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
     * 持ちもの更新
     */
    $updateStmt = $pdo->prepare("
        UPDATE checklist_items
        SET
            item_name = :item_name,
            note = :note,
            is_checked = :is_checked,
            assigned_user_id = :assigned_user_id,
            sort_order = :sort_order
        WHERE checklist_item_id = :item_id
    ");

    $updateStmt->bindValue(
        ":item_name",
        $name,
        PDO::PARAM_STR
    );

    $updateStmt->bindValue(
        ":note",
        $note,
        PDO::PARAM_STR
    );

    $updateStmt->bindValue(
        ":is_checked",
        $checked,
        PDO::PARAM_INT
    );

    $updateStmt->bindValue(
        ":assigned_user_id",
        $assignedUserId,
        $assignedUserId === null
            ? PDO::PARAM_NULL
            : PDO::PARAM_INT
    );

    $updateStmt->bindValue(
        ":sort_order",
        $sortOrder,
        $sortOrder !== null
            ? PDO::PARAM_INT
            : PDO::PARAM_NULL
    );

    $updateStmt->bindValue(
        ":item_id",
        $itemId,
        PDO::PARAM_INT
    );

    $updateStmt->execute();

    checklistRespond([
        "success" => true,
        "item" => [
            "id" => $itemId,
            "checklist_item_id" => $itemId,

            "name" => $name,
            "item_name" => $name,

            "note" => $note,

            "checked" => (bool) $checked,
            "is_checked" => (bool) $checked,

            "scope" => $assignedUserId === null
                ? "all"
                : (
                    (int) $assignedUserId === (int) $userId
                        ? "self"
                        : "all"
                ),

            "assigned_user_id" => $assignedUserId,

            "sort_order" => $sortOrder,
        ],
    ]);

} catch (Throwable $error) {

    checklistRespond([
        "success" => false,
        "message" => "持ちものの更新に失敗しました",
    ], 500);
}
