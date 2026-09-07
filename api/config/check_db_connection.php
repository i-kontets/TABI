<?php

/**
 * 現在PHPがどのDBへ接続しているか確認するための一時デバッグ用APIです。
 *
 * 注意:
 * - DBパスワードは絶対に返しません。
 * - 確認が終わったら、公開環境から削除してください。
 */

header("Content-Type: application/json; charset=UTF-8");

$configPath = __DIR__ . "/env.php";
$config = file_exists($configPath) ? require $configPath : [];
$appEnv = $config["APP_ENV"] ?? "aws";
$dbConfig = $config["connections"][$appEnv] ?? [];

require_once __DIR__ . "/db.php";

try {
    $databaseStmt = $pdo->query("SELECT DATABASE() AS current_database");
    $database = $databaseStmt->fetch(PDO::FETCH_ASSOC);

    $paymentsStmt = $pdo->query("SHOW TABLES LIKE 'payments'");
    $paymentMembersStmt = $pdo->query("SHOW TABLES LIKE 'payment_members'");

    echo json_encode([
        "success" => true,
        "app_env" => $appEnv,
        "configured_host" => $dbConfig["DB_HOST"] ?? null,
        "configured_database" => $dbConfig["DB_NAME"] ?? null,
        "current_database" => $database["current_database"] ?? null,
        "tables" => [
            "payments_exists" => (bool) $paymentsStmt->fetchColumn(),
            "payment_members_exists" => (bool) $paymentMembersStmt->fetchColumn(),
        ],
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
} catch (Throwable $error) {
    http_response_code(500);

    echo json_encode([
        "success" => false,
        "message" => "DB connection check failed",
        "app_env" => $appEnv,
        "configured_host" => $dbConfig["DB_HOST"] ?? null,
        "configured_database" => $dbConfig["DB_NAME"] ?? null,
        "error" => $error->getMessage(),
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
}
