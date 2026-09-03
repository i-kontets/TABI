<?php

/**
 * 支払い記録を削除するAPIです。
 *
 * 削除できるのは、その支払いを追加した本人だけです。
 */

require_once __DIR__ . "/Common.php";

$userId = requireLoginUserId();
$input = readJsonInput();
$paymentId = (int) ($input["payment_id"] ?? $input["paymentId"] ?? 0);

if ($paymentId <= 0) {
    respond([
        "success" => false,
        "message" => "payment_id is required",
    ], 400);
}

try {
    $stmt = $pdo->prepare("
        SELECT group_id, created_by
        FROM payments
        WHERE payment_id = :payment_id
        LIMIT 1
    ");
    $stmt->execute([
        ":payment_id" => $paymentId,
    ]);
    $payment = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$payment) {
        respond([
            "success" => false,
            "message" => "payment not found",
        ], 404);
    }

    requireGroupMember($pdo, $payment["group_id"], $userId);

    if ((int) $payment["created_by"] !== $userId) {
        respond([
            "success" => false,
            "message" => "Only creator can delete this payment",
        ], 403);
    }

    $deleteStmt = $pdo->prepare("
        DELETE FROM payments
        WHERE payment_id = :payment_id
    ");
    $deleteStmt->execute([
        ":payment_id" => $paymentId,
    ]);

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
        "message" => "Failed to delete payment",
        "error" => $error->getMessage(),
    ], 500);
}

