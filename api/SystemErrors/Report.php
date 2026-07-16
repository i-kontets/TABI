<?php
/**
 * Frontend/API failures are saved into system_errors for the admin screen.
 */
session_start();
header("Content-Type: application/json; charset=UTF-8");

require_once __DIR__ . "/../config/db.php";
require_once __DIR__ . "/../Admin/services/system_errors.php";
require_once __DIR__ . "/../Admin/services/realtime.php";

function respond(array $payload, int $status = 200): void
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function limitText($value, int $maxLength): ?string
{
    $text = trim((string) $value);

    if ($text === "") {
        return null;
    }

    return mb_substr($text, 0, $maxLength);
}

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    respond(["success" => false, "message" => "Method not allowed."], 405);
}

$rawBody = file_get_contents("php://input");
$input = json_decode($rawBody ?: "{}", true);

if (!is_array($input)) {
    respond(["success" => false, "message" => "Invalid JSON."], 400);
}

$errorCode = limitText($input["errorCode"] ?? "", 120);
$message = limitText($input["message"] ?? "", 500);

if (!$errorCode || !$message) {
    respond(["success" => false, "message" => "errorCode and message are required."], 400);
}

$userId = isset($_SESSION["user_id"]) ? (int) $_SESSION["user_id"] : null;
$requestUrl = limitText($input["requestUrl"] ?? "", 1000);
$pagePath = limitText($input["pagePath"] ?? ($_SERVER["HTTP_REFERER"] ?? ""), 500);

/*
 * request_method と recovery_key は、自動解消時に「同じAPI処理か」を安全に確認するために保存します。
 * メールアドレスや認証コードなどの個人情報は含めず、URLもクエリを除いた形にしています。
 */
$detail = [
    "error_type" => limitText($input["errorType"] ?? "FRONTEND_ERROR", 80),
    "error_code" => $errorCode,
    "source" => limitText($input["source"] ?? "frontend", 120),
    "page_path" => $pagePath,
    "request_url" => $requestUrl,
    "request_method" => limitText($input["requestMethod"] ?? "", 20),
    "http_status" => isset($input["httpStatus"]) && is_numeric($input["httpStatus"]) ? (int) $input["httpStatus"] : null,
    "user_agent" => limitText($_SERVER["HTTP_USER_AGENT"] ?? ($input["userAgent"] ?? ""), 500),
    "stack_trace" => limitText($input["stack"] ?? "", 2000),
    "fingerprint" => limitText($input["fingerprint"] ?? "", 255),
    "recovery_key" => limitText($input["recoveryKey"] ?? "", 500),
    "component" => limitText($input["component"] ?? "", 120),
];

$errorId = logSystemError(
    "frontend",
    "error",
    $message,
    $detail,
    $userId,
    $pagePath ?: $requestUrl
);

respond([
    "success" => true,
    "error_id" => $errorId,
]);
