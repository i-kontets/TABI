<?php

session_start();

header("Content-Type: application/json; charset=UTF-8");

require_once __DIR__ . "/../config/db.php";
require_once __DIR__ . "/Common.php";

checklistRequireMethod("PATCH");

$userId = checklistRequireUserId();

$input = checklistReadJsonBody();

try {
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

    $item = checklistRequireItemAccess(
        $pdo,
        $userId,
        $itemId
    );

    /*
     * 持ちもの名
     */
    $name = array_key_exists("name", $input)
        || array_key_exists("item_name", $input)
        ? trim(
            (string) (
                $input["name"]
                    ?? $input["item_name"]
                    ?? ""
            )
        )
        : $item["item_name"];

    /*
     * チェック状態
     *
     * checked が送られてきた場合だけ更新。
     * 送られてこなければ現在の状態を維持。
     */
    $checked = array_key_exists("checked", $input)
        || array_key_exists("is_checked", $input)
        ? checklistNormalizeChecked(
            $input["checked"]
                ?? $input["is_checked"]
                ?? null
        )
        : (int) $item["is_checked"];

    /*
     * 自分 / 全員
     *
     * scope が送られてきた場合だけ変更する。
     *
     * self → ログイン中のユーザー
     * all  → NULL
     */
    if (array_key_exists("scope", $input)) {
        $scope = (string) $input["scope"];

        if (!in_array($scope, ["self", "all"], true)) {
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
         * scope が送られていない場合は
         * 現在の設定をそのまま維持
         */
        $assignedUserId = $item["assigned_user_id"] !== null
            ? (int) $item["assigned_user_id"]
            : null;
    }

    /*
     * 並び順
     */
    $sortOrder = array_key_exists("sort_order", $input)
        ? checklistPositiveInt($input["sort_order"])
        : (
            $item["sort_order"] !== null
                ? (int) $item["sort_order"]
                : null
        );

    /*
     * 持ちもの名のチェック
     */
    if (
        $name === ""
        || checklistTextLength($name) > 200
    ) {
        checklistRespond([
            "success" => false,
            "message" => "持ちもの名は1文字以上200文字以内で入力してください",
        ], 400);
    }

    /*
     * 更新
     */
    $updateStmt = $pdo->prepare("
        UPDATE checklist_items
        SET
            item_name = :item_name,
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
        ":is_checked",
        $checked,
        PDO::PARAM_INT
    );

    $updateStmt->bindValue(
        ":assigned_user_id",
        $assignedUserId,
        $assignedUserId !== null
            ? PDO::PARAM_INT
            : PDO::PARAM_NULL
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