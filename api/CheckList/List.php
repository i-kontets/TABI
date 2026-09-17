<?php

session_start();

header("Content-Type: application/json; charset=UTF-8");

require_once __DIR__ . "/../config/db.php";
require_once __DIR__ . "/Common.php";

checklistRequireMethod("GET");

$userId = checklistRequireUserId();

try {
    /*
     * 旅行ID
     */
    $tripId = checklistPositiveInt(
        $_GET["trip_id"] ?? null
    );

    /*
     * グループID
     */
    $groupId = checklistPositiveInt(
        $_GET["group_id"]
            ?? $_GET["groupId"]
            ?? null
    );

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
     * 持ちものチェックリスト取得
     */
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

            /*
             * 確認用
             * PHPが現在どのuser_idでログイン中と
             * 判断しているかを返す
             */
            "debug_user_id" => $userId,

            "trip_id" => $resolvedTripId,

            "checklist" => null,

            "sections" => [
                [
                    "id" => "checklist",
                    "title" => "持ちもの",
                    "description" =>
                        "旅行に必要な持ちものを確認します。",
                    "items" => [],
                ],
            ],
        ]);
    }

    /*
     * 持ちもの取得
     *
     * assigned_user_id が NULL
     * → 全員に表示
     *
     * assigned_user_id がログインユーザーID
     * → そのユーザーだけに表示
     *
     * 他ユーザーの assigned_user_id
     * → 表示しない
     */
    $stmt = $pdo->prepare("
        SELECT
            ci.checklist_item_id,
            ci.checklist_id,
            ci.item_name,
            ci.note,
            ci.is_checked,
            ci.assigned_user_id,
            ci.sort_order
        FROM checklist_items ci
        INNER JOIN checklists c
            ON c.checklist_id = ci.checklist_id
        INNER JOIN trips t
            ON t.trip_id = c.trip_id
        INNER JOIN group_members gm
            ON gm.group_id = t.group_id
           AND gm.user_id = :member_user_id
           AND gm.invitation_status = 'accepted'
        WHERE ci.checklist_id = :checklist_id
          AND (
              ci.assigned_user_id IS NULL
              OR ci.assigned_user_id = :visible_user_id
          )
        ORDER BY
            (ci.sort_order IS NULL) ASC,
            ci.sort_order ASC,
            ci.checklist_item_id ASC
    ");

    $stmt->execute([
        ":checklist_id" =>
            $checklist["checklist_id"],
        ":member_user_id" =>
            $userId,
        ":visible_user_id" =>
            $userId,
    ]);

    $items = [];

    while (
        $row = $stmt->fetch(
            PDO::FETCH_ASSOC
        )
    ) {
        /*
         * 共通フォーマット
         */
        $item = checklistFormatItem($row);

        /*
         * メモ
         */
        $item["note"] =
            $row["note"] ?? "";

        /*
         * 自分のみ / 全員
         *
         * NULL
         * → 全員
         *
         * ログインユーザーID
         * → 自分のみ
         */
        if ($row["assigned_user_id"] === null) {
            $item["scope"] = "all";
        } else {
            $item["scope"] = "self";
        }

        /*
         * 担当者表示は使用しない
         */
        unset($item["assignee"]);
        unset($item["assignee_name"]);

        /*
         * DB上の assigned_user_id
         */
        $item["assigned_user_id"] =
            $row["assigned_user_id"] !== null
                ? (int) $row["assigned_user_id"]
                : null;

        $items[] = $item;
    }

    /*
     * レスポンス
     */
    checklistRespond([
        "success" => true,

        /*
         * 確認用
         *
         * 問題が解決したら削除してOK
         */
        "debug_user_id" => $userId,

        "trip_id" => $resolvedTripId,

        "checklist" => [
            "id" =>
                (int) $checklist["checklist_id"],

            "checklist_id" =>
                (int) $checklist["checklist_id"],

            "type" =>
                $checklist["checklist_type"],

            "title" =>
                $checklist["title"],
        ],

        "sections" => [
            [
                "id" => "checklist",

                "title" => "持ちもの",

                "description" =>
                    "旅行に必要な持ちものを確認します。",

                "items" => $items,
            ],
        ],
    ]);

} catch (Throwable $error) {
    checklistRespond([
        "success" => false,
        "message" =>
            "チェックリストの取得に失敗しました",
    ], 500);
}
