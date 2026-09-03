<?php

/**
 * 割り勘APIで共通して使う処理をまとめたファイルです。
 *
 * ログイン確認、入力JSONの読み取り、旅行グループ参加確認、
 * 支払い一覧の整形をここに集約します。
 */

session_start();

header("Content-Type: application/json; charset=UTF-8");

require_once __DIR__ . "/../config/db.php";

function respond(array $payload, int $status = 200): void
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function requireLoginUserId(): int
{
    if (!isset($_SESSION["user_id"])) {
        respond([
            "success" => false,
            "message" => "Login required",
        ], 401);
    }

    return (int) $_SESSION["user_id"];
}

function readJsonInput(): array
{
    $input = json_decode(file_get_contents("php://input"), true);

    return is_array($input) ? $input : [];
}

function requireGroupMember(PDO $pdo, int|string $groupId, int $userId): void
{
    $stmt = $pdo->prepare("
        SELECT 1
        FROM group_members
        WHERE group_id = :group_id
          AND user_id = :user_id
          AND invitation_status = 'accepted'
        LIMIT 1
    ");
    $stmt->execute([
        ":group_id" => $groupId,
        ":user_id" => $userId,
    ]);

    if (!$stmt->fetchColumn()) {
        respond([
            "success" => false,
            "message" => "You are not a member of this group",
        ], 403);
    }
}

function fetchGroupMembers(PDO $pdo, int|string $groupId): array
{
    $stmt = $pdo->prepare("
        SELECT
            u.user_id,
            u.name
        FROM group_members gm
        INNER JOIN users u
            ON u.user_id = gm.user_id
        WHERE gm.group_id = :group_id
          AND gm.invitation_status = 'accepted'
        ORDER BY gm.joined_at ASC, u.user_id ASC
    ");
    $stmt->execute([
        ":group_id" => $groupId,
    ]);

    $members = [];

    foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $member) {
        $members[(int) $member["user_id"]] = [
            "id" => (int) $member["user_id"],
            "name" => $member["name"] ?: "メンバー",
            "paidPayIds" => [],
        ];
    }

    return $members;
}

function fetchInvoiceData(PDO $pdo, int|string $groupId, int $userId): array
{
    requireGroupMember($pdo, $groupId, $userId);

    $members = fetchGroupMembers($pdo, $groupId);

    $stmt = $pdo->prepare("
        SELECT
            p.payment_id,
            p.group_id,
            p.created_by,
            creator.name AS created_by_name,
            p.title,
            p.amount AS total_amount,
            p.category,
            p.created_at,
            pm.payment_member_id,
            pm.user_id AS target_user_id,
            target.name AS target_user_name,
            pm.amount AS member_amount,
            pm.is_paid,
            pm.paid_at
        FROM payments p
        LEFT JOIN users creator
            ON creator.user_id = p.created_by
        LEFT JOIN payment_members pm
            ON pm.payment_id = p.payment_id
        LEFT JOIN users target
            ON target.user_id = pm.user_id
        WHERE p.group_id = :group_id
        ORDER BY p.created_at DESC, p.payment_id DESC, pm.payment_member_id ASC
    ");
    $stmt->execute([
        ":group_id" => $groupId,
    ]);

    $payments = [];

    foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
        $paymentId = (int) $row["payment_id"];

        if (!isset($payments[$paymentId])) {
            $payments[$paymentId] = [
                "id" => $paymentId,
                "payment_id" => $paymentId,
                "groupId" => (string) $row["group_id"],
                "storeName" => $row["title"],
                "title" => $row["title"],
                "amount" => (int) $row["total_amount"],
                "totalAmount" => (int) $row["total_amount"],
                "paidById" => (int) $row["created_by"],
                "paidByName" => $row["created_by_name"] ?: "メンバー",
                "category" => $row["category"] ?: "other",
                "members" => [],
                "participantCount" => 0,
                "createdAt" => $row["created_at"],
                "created_at" => $row["created_at"],
            ];
        }

        if ($row["target_user_id"] !== null) {
            $targetUserId = (int) $row["target_user_id"];
            $payments[$paymentId]["members"][] = [
                "id" => $targetUserId,
                "user_id" => $targetUserId,
                "name" => $row["target_user_name"] ?: "メンバー",
                "amount" => (int) $row["member_amount"],
                "isPaid" => (int) $row["is_paid"] === 1,
                "is_paid" => (int) $row["is_paid"],
                "paidAt" => $row["paid_at"],
                "paid_at" => $row["paid_at"],
            ];

            if ((int) $row["is_paid"] === 1 && isset($members[$targetUserId])) {
                $members[$targetUserId]["paidPayIds"][] = $paymentId;
            }
        }
    }

    foreach ($payments as &$payment) {
        $payment["participantCount"] = count($payment["members"]);
    }
    unset($payment);

    return [
        "pay" => array_values($payments),
        "members" => array_values($members),
    ];
}

