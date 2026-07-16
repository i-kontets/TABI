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

if (!$fingerprint) {
    respond(["success" => false, "message" => "fingerprint is required."], 400);
}

// Only resolve errors whose stored failed fingerprint and request context match.
$resolvedCount = resolveSystemErrorByFingerprint(
    $fingerprint,
    limitText($input["requestUrl"] ?? "", 1000),
    limitText($input["pagePath"] ?? ($_SERVER["HTTP_REFERER"] ?? ""), 500),
    isset($input["httpStatus"]) && is_numeric($input["httpStatus"]) ? (int) $input["httpStatus"] : null
);

respond([
    "success" => true,
    "resolved_count" => $resolvedCount,
]);
