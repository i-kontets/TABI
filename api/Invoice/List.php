<?php

/**
 * 指定された旅行グループの支払い一覧を返すAPIです。
 */

require_once __DIR__ . "/Common.php";

$userId = requireLoginUserId();
$groupId = $_GET["group_id"] ?? $_GET["groupId"] ?? null;

if (!$groupId) {
    respond([
        "success" => false,
        "message" => "group_id is required",
    ], 400);
}

try {
    $invoiceData = fetchInvoiceData($pdo, $groupId, $userId);

    respond([
        "success" => true,
        "group_id" => (string) $groupId,
        "pay" => $invoiceData["pay"],
        "members" => $invoiceData["members"],
    ]);
} catch (Throwable $error) {
    respond([
        "success" => false,
        "message" => "Failed to fetch invoice data",
        "error" => $error->getMessage(),
    ], 500);
}

