<?php
/**
 * Resolves an unresolved system error after the same API operation succeeds.
 */
session_start();
header("Content-Type: application/json; charset=UTF-8");

require_once __DIR__ . "/../config/db.php";
require_once __DIR__ . "/../Admin/services/realtime.php";
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

if (!isset($_SESSION["user_id"])) {
    respond(["success" => false, "message" => "Authentication required."], 401);
}

$rawBody = file_get_contents("php://input");
$input = json_decode($rawBody ?: "{}", true);

if (!is_array($input)) {
    respond(["success" => false, "message" => "Invalid JSON."], 400);
}

$fingerprint = limitText($input["fingerprint"] ?? "", 255);
$requestUrl = limitText($input["requestUrl"] ?? "", 1000);
$pagePath = limitText($input["pagePath"] ?? ($_SERVER["HTTP_REFERER"] ?? ""), 500);
$httpStatus = isset($input["httpStatus"]) && is_numeric($input["httpStatus"]) ? (int) $input["httpStatus"] : null;
$errorCode = limitText($input["errorCode"] ?? "API_HTTP_ERROR", 120);
$source = limitText($input["source"] ?? "frontend", 80);
$requestMethod = limitText($input["requestMethod"] ?? "", 20);
$recoveryKey = limitText($input["recoveryKey"] ?? "", 500);

$resolvedCount = 0;

if ($fingerprint) {
    $resolvedCount += resolveSystemErrorByFingerprint($fingerprint, $requestUrl, $pagePath, $httpStatus);
}

/* fingerprintがない古いエラーでも、request_url・page_path・error_codeなどが安全に一致すれば解消します。 */
$resolvedCount += resolveSystemErrorsByRecoveryContext($requestUrl, $pagePath, $errorCode, $source, $requestMethod, $recoveryKey);

respond([
    "success" => true,
    "resolvedCount" => $resolvedCount,
    "resolved_count" => $resolvedCount,
]);
