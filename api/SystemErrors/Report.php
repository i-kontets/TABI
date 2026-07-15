<?php
session_start();
header("Content-Type: application/json; charset=UTF-8");

require_once __DIR__ . "/../config/db.php";
require_once __DIR__ . "/../Admin/services/system_errors.php";

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

$detail = [
    "error_type" => limitText($input["errorType"] ?? "FRONTEND_ERROR", 80),
    "error_code" => $errorCode,
    "source" => limitText($input["source"] ?? "frontend", 120),
    "page_path" => $pagePath,
    "request_url" => $requestUrl,
    "http_status" => isset($input["httpStatus"]) && is_numeric($input["httpStatus"]) ? (int) $input["httpStatus"] : null,
    "user_agent" => limitText($_SERVER["HTTP_USER_AGENT"] ?? ($input["userAgent"] ?? ""), 500),
    "stack_trace" => limitText($input["stack"] ?? "", 2000),
    "fingerprint" => limitText($input["fingerprint"] ?? "", 255),
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
