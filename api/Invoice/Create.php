<?php

/**
 * 支払い記録を追加するAPIです。
 *
 * payments に支払い本体を登録し、payment_members に対象メンバーごとの負担額を登録します。
 */

require_once __DIR__ . "/Common.php";

$userId = requireLoginUserId();
$input = readJsonInput();

$groupId = $input["group_id"] ?? $input["groupId"] ?? null;
$title = trim((string) ($input["title"] ?? $input["storeName"] ?? ""));
$amount = (int) ($input["amount"] ?? $input["totalAmount"] ?? 0);
$category = trim((string) ($input["category"] ?? "other"));
$members = $input["members"] ?? [];

if (!$groupId) {
    respond([
        "success" => false,
        "message" => "group_id is required",
    ], 400);
}

if ($title === "") {
    respond([
        "success" => false,
        "message" => "title is required",
    ], 400);
}

if ($amount <= 0) {
    respond([
        "success" => false,
        "message" => "amount must be greater than 0",
    ], 400);
}

if (!is_array($members) || count($members) === 0) {
    respond([
        "success" => false,
        "message" => "members are required",
    ], 400);
}

try {
    requireGroupMember($pdo, $groupId, $userId);

    $groupMembers = fetchGroupMembers($pdo, $groupId);
    $memberRows = [];

    foreach ($members as $member) {
        $targetUserId = (int) ($member["user_id"] ?? $member["id"] ?? 0);
        $memberAmount = (int) ($member["amount"] ?? 0);

        if ($targetUserId <= 0 || $memberAmount < 0 || !isset($groupMembers[$targetUserId])) {
            respond([
                "success" => false,
                "message" => "invalid member data",
            ], 400);
        }

        $memberRows[] = [
            "user_id" => $targetUserId,
            "amount" => $memberAmount,
        ];
    }

    $memberAmountTotal = array_sum(array_column($memberRows, "amount"));

    if ($memberAmountTotal !== $amount) {
        respond([
            "success" => false,
            "message" => "member amount total does not match payment amount",
        ], 400);
    }

    $pdo->beginTransaction();

    $paymentStmt = $pdo->prepare("
        INSERT INTO payments (
            group_id,
            created_by,
            title,
            amount,
            category,
            created_at,
            updated_at
        )
        VALUES (
            :group_id,
            :created_by,
            :title,
            :amount,
            :category,
            NOW(),
            NOW()
        )
    ");
    $paymentStmt->execute([
        ":group_id" => $groupId,
        ":created_by" => $userId,
        ":title" => $title,
        ":amount" => $amount,
        ":category" => $category !== "" ? $category : "other",
    ]);

    $paymentId = (int) $pdo->lastInsertId();

    $memberStmt = $pdo->prepare("
        INSERT INTO payment_members (
            payment_id,
            user_id,
            amount,
            is_paid,
            paid_at,
            created_at,
            updated_at
        )
        VALUES (
            :payment_id,
            :user_id,
            :amount,
            :is_paid,
            :paid_at,
            NOW(),
            NOW()
        )
    ");

    foreach ($memberRows as $memberRow) {
        $isPaid = $memberRow["user_id"] === $userId ? 1 : 0;
        $memberStmt->execute([
            ":payment_id" => $paymentId,
            ":user_id" => $memberRow["user_id"],
            ":amount" => $memberRow["amount"],
            ":is_paid" => $isPaid,
            ":paid_at" => $isPaid ? date("Y-m-d H:i:s") : null,
        ]);
    }

    $pdo->commit();

    $invoiceData = fetchInvoiceData($pdo, $groupId, $userId);

    respond([
        "success" => true,
        "payment_id" => $paymentId,
        "pay" => $invoiceData["pay"],
        "members" => $invoiceData["members"],
    ]);
} catch (Throwable $error) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }

    respond([
        "success" => false,
        "message" => "Failed to create payment",
        "error" => $error->getMessage(),
    ], 500);
}

