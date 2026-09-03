<?php

/**
 * Itinerary の清算Widgetに表示する、自分が払う必要のある支払いを返すAPIです。
 *
 * 主な流れ:
 * 1. セッションからログイン中のユーザーIDを取得する
 * 2. group_id の旅行グループに参加しているか確認する
 * 3. payments と payment_members を参照し、ログイン中ユーザーの未払いデータを最新順で取得する
 * 4. フロントエンドで表示しやすい形に整えて返す
 */

require_once __DIR__ . "/Common.php";

$userId = requireLoginUserId();
$groupId = $_GET["group_id"] ?? $_GET["groupId"] ?? null;
$limit = filter_var($_GET["limit"] ?? 3, FILTER_VALIDATE_INT);

if (!$groupId) {
    respond([
        "success" => false,
        "message" => "group_id is required",
    ], 400);
}

if (!$limit || $limit < 1) {
    $limit = 3;
}

$limit = min($limit, 10);

try {
    requireGroupMember($pdo, $groupId, $userId);

    $stmt = $pdo->prepare("
        SELECT
            p.payment_id,
            p.title,
            p.created_by,
            payer.name AS payer_name,
            pm.amount,
            p.created_at
        FROM payment_members pm
        INNER JOIN payments p
            ON p.payment_id = pm.payment_id
        INNER JOIN users payer
            ON payer.user_id = p.created_by
        WHERE p.group_id = :group_id
          AND pm.user_id = :target_user_id
          AND pm.is_paid = 0
          AND p.created_by <> :payer_user_id
        ORDER BY p.created_at DESC, p.payment_id DESC
        LIMIT :limit_count
    ");
    $stmt->bindValue(":group_id", $groupId);
    $stmt->bindValue(":target_user_id", $userId, PDO::PARAM_INT);
    $stmt->bindValue(":payer_user_id", $userId, PDO::PARAM_INT);
    $stmt->bindValue(":limit_count", $limit, PDO::PARAM_INT);
    $stmt->execute();

    $debts = array_map(static function (array $row): array {
        return [
            "payment_id" => (int) $row["payment_id"],
            "title" => $row["title"] ?: "支払い",
            "to_user_id" => (int) $row["created_by"],
            "to_user_name" => $row["payer_name"] ?: "メンバー",
            "amount" => (int) $row["amount"],
            "created_at" => $row["created_at"],
        ];
    }, $stmt->fetchAll(PDO::FETCH_ASSOC));

    respond([
        "success" => true,
        "group_id" => (string) $groupId,
        "debts" => $debts,
    ]);
} catch (Throwable $error) {
    respond([
        "success" => false,
        "message" => "Failed to fetch payment debts",
        "error" => $error->getMessage(),
    ], 500);
}
