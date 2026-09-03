<?php

/**
 * ログイン中ユーザーの支払い対象行を支払い済みにするAPIです。
 */

require_once __DIR__ . "/Common.php";

$userId = requireLoginUserId();
$input = readJsonInput();
$paymentId = (int) ($input["payment_id"] ?? $input["paymentId"] ?? 0);
$targetUserId = (int) ($input["user_id"] ?? $input["userId"] ?? $userId);

if ($paymentId <= 0) {
    respond([
        "success" => false,
        "message" => "payment_id is required",
    ], 400);
}

if ($targetUserId <= 0) {
    respond([
        "success" => false,
        "message" => "user_id is required",
    ], 400);
}

try {
    $paymentStmt = $pdo->prepare("
        SELECT group_id, created_by
        FROM payments
        WHERE payment_id = :payment_id
        LIMIT 1
    ");
    $paymentStmt->execute([
        ":payment_id" => $paymentId,
    ]);
    $payment = $paymentStmt->fetch(PDO::FETCH_ASSOC);

    if (!$payment) {
        respond([
            "success" => false,
            "message" => "payment not found",
        ], 404);
    }

    requireGroupMember($pdo, $payment["group_id"], $userId);
    requireGroupMember($pdo, $payment["group_id"], $targetUserId);

    if ((int) $payment["created_by"] !== $userId && $targetUserId !== $userId) {
        respond([
            "success" => false,
            "message" => "Only creator or target user can mark this payment as paid",
        ], 403);
    }

    $stmt = $pdo->prepare("
        UPDATE payment_members
        SET
            is_paid = 1,
            paid_at = COALESCE(paid_at, NOW()),
            updated_at = NOW()
        WHERE payment_id = :payment_id
          AND user_id = :user_id
    ");
    $stmt->execute([
        ":payment_id" => $paymentId,
        ":user_id" => $targetUserId,
    ]);

    if ($stmt->rowCount() === 0) {
        respond([
            "success" => false,
            "message" => "payment member not found",
        ], 404);
    }

    $invoiceData = fetchInvoiceData($pdo, $payment["group_id"], $userId);

    respond([
        "success" => true,
        "group_id" => (string) $payment["group_id"],
        "pay" => $invoiceData["pay"],
        "members" => $invoiceData["members"],
    ]);
} catch (Throwable $error) {
    respond([
        "success" => false,
        "message" => "Failed to mark payment as paid",
        "error" => $error->getMessage(),
    ], 500);
}
