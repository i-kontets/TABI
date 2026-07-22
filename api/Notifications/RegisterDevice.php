<?php

session_start();
header("Content-Type: application/json; charset=UTF-8");

require_once __DIR__ . "/../config/db.php";

function respond(array $payload, int $status = 200): void
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function rejectIfCrossOrigin(): void
{
    $host = $_SERVER["HTTP_HOST"] ?? "";
    $origin = $_SERVER["HTTP_ORIGIN"] ?? "";
    $referer = $_SERVER["HTTP_REFERER"] ?? "";
    $source = $origin !== "" ? $origin : $referer;

    if ($source === "" || $host === "") {
        return;
    }

    $sourceHost = parse_url($source, PHP_URL_HOST);
    if ($sourceHost !== null && strcasecmp($sourceHost, $host) !== 0) {
        respond(["success" => false, "message" => "不正な送信元です。"], 403);
    }
}

function readJsonInput(int $maxBytes = 8192): array
{
    $contentType = $_SERVER["CONTENT_TYPE"] ?? "";
    if (stripos($contentType, "application/json") === false) {
        respond(["success" => false, "message" => "JSONで送信してください。"], 415);
    }

    $contentLength = (int) ($_SERVER["CONTENT_LENGTH"] ?? 0);
    if ($contentLength > $maxBytes) {
        respond(["success" => false, "message" => "リクエストが大きすぎます。"], 413);
    }

    $input = json_decode(file_get_contents("php://input"), true);
    if (!is_array($input)) {
        respond(["success" => false, "message" => "JSONの形式が正しくありません。"], 400);
    }

    return $input;
}

function optionalString($value, int $maxLength): ?string
{
    if ($value === null || $value === "") return null;
    if (!is_string($value)) respond(["success" => false, "message" => "端末情報の形式が正しくありません。"], 400);
    $value = trim($value);
    if ($value === "") return null;
    if (mb_strlen($value, "UTF-8") > $maxLength) respond(["success" => false, "message" => "端末情報が長すぎます。"], 400);
    return $value;
}

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    respond(["success" => false, "message" => "POSTで送信してください。"], 405);
}

rejectIfCrossOrigin();

if (!isset($_SESSION["user_id"])) {
    // user_idはリクエストから受け取らず、ログイン中のセッションから取得します。
    respond(["success" => false, "message" => "ログインが必要です。"], 401);
}

$input = readJsonInput();
$userId = (int) $_SESSION["user_id"];
$token = $input["token"] ?? null;

if (!is_string($token) || trim($token) === "" || strlen($token) > 4096 || preg_match('/[\x00-\x1F\x7F]/', $token)) {
    respond(["success" => false, "message" => "通知トークンの形式が正しくありません。"], 400);
}

$platform = $input["platform"] ?? "web";
$appType = $input["appType"] ?? "pwa";

if (!in_array($platform, ["web", "android", "ios"], true)) respond(["success" => false, "message" => "platformの値が正しくありません。"], 400);
if (!in_array($appType, ["pwa", "native"], true)) respond(["success" => false, "message" => "appTypeの値が正しくありません。"], 400);

$deviceName = optionalString($input["deviceName"] ?? null, 100);
$browser = optionalString($input["browser"] ?? null, 100);
$userAgent = substr((string) ($_SERVER["HTTP_USER_AGENT"] ?? ""), 0, 500) ?: null;
$tokenHash = hash("sha256", $token);
$now = (new DateTimeImmutable("now"))->format("Y-m-d H:i:s");

try {
    $pdo->beginTransaction();
    // token_hashで同じトークンを見分け、同じ端末を重複登録しないようにします。
    $stmt = $pdo->prepare("INSERT INTO user_devices (user_id, push_token, token_hash, platform, app_type, device_name, browser, user_agent, is_active, created_at, updated_at, last_used_at, revoked_at) VALUES (:user_id, :push_token, :token_hash, :platform, :app_type, :device_name, :browser, :user_agent, 1, :created_at, :updated_at, :last_used_at, NULL) ON DUPLICATE KEY UPDATE user_id = VALUES(user_id), push_token = VALUES(push_token), platform = VALUES(platform), app_type = VALUES(app_type), device_name = VALUES(device_name), browser = VALUES(browser), user_agent = VALUES(user_agent), is_active = 1, updated_at = VALUES(updated_at), last_used_at = VALUES(last_used_at), revoked_at = NULL");
    $stmt->execute([
        ":user_id" => $userId,
        ":push_token" => $token,
        ":token_hash" => $tokenHash,
        ":platform" => $platform,
        ":app_type" => $appType,
        ":device_name" => $deviceName,
        ":browser" => $browser,
        ":user_agent" => $userAgent,
        ":created_at" => $now,
        ":updated_at" => $now,
        ":last_used_at" => $now,
    ]);
    $pdo->commit();
    respond(["success" => true, "message" => "通知端末を登録しました。", "data" => ["registered" => true]]);
} catch (Throwable $error) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    respond(["success" => false, "message" => "通知端末の登録に失敗しました。"], 500);
}
