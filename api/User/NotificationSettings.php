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
    if ($source === "" || $host === "") return;
    $sourceHost = parse_url($source, PHP_URL_HOST);
    if ($sourceHost !== null && strcasecmp($sourceHost, $host) !== 0) respond(["success" => false, "message" => "不正な送信元です。"], 403);
}

function defaultSettings(): array
{
    return [
        "chatNotification" => true,
        "surveyDeadlineNotification" => true,
        "scheduleReminderNotification" => true,
        "memberJoinNotification" => true,
        "splitBillNotification" => true,
    ];
}

function rowToSettings(?array $row): array
{
    if (!$row) return defaultSettings();
    return [
        "chatNotification" => (bool) $row["chat_notification_enabled"],
        "surveyDeadlineNotification" => (bool) $row["survey_deadline_notification_enabled"],
        "scheduleReminderNotification" => (bool) $row["schedule_reminder_notification_enabled"],
        "memberJoinNotification" => (bool) $row["member_join_notification_enabled"],
        "splitBillNotification" => (bool) $row["split_bill_notification_enabled"],
    ];
}

function fetchSettings(PDO $pdo, int $userId): array
{
    $stmt = $pdo->prepare("SELECT chat_notification_enabled, survey_deadline_notification_enabled, schedule_reminder_notification_enabled, member_join_notification_enabled, split_bill_notification_enabled FROM notification_settings WHERE user_id = :user_id LIMIT 1");
    $stmt->bindValue(":user_id", $userId, PDO::PARAM_INT);
    $stmt->execute();
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    return rowToSettings($row ?: null);
}

function readJsonInput(): array
{
    $contentType = $_SERVER["CONTENT_TYPE"] ?? "";
    if (stripos($contentType, "application/json") === false) respond(["success" => false, "message" => "JSONで送信してください。"], 415);
    if ((int) ($_SERVER["CONTENT_LENGTH"] ?? 0) > 4096) respond(["success" => false, "message" => "リクエストが大きすぎます。"], 413);
    $input = json_decode(file_get_contents("php://input"), true);
    if (!is_array($input)) respond(["success" => false, "message" => "JSONの形式が正しくありません。"], 400);
    return $input;
}

if (!isset($_SESSION["user_id"])) {
    // user_idをフロントから受け取ると別ユーザーの設定を変えられる危険があるため、セッションだけを使います。
    respond(["success" => false, "message" => "ログインが必要です。"], 401);
}

$userId = (int) $_SESSION["user_id"];
$method = $_SERVER["REQUEST_METHOD"];

try {
    if ($method === "GET") respond(["success" => true, "settings" => fetchSettings($pdo, $userId)]);
    if (!in_array($method, ["PATCH", "PUT"], true)) respond(["success" => false, "message" => "GET、PATCH、PUTのいずれかで送信してください。"], 405);
    rejectIfCrossOrigin();
    $input = readJsonInput();
    $allowedKeys = array_keys(defaultSettings());
    foreach ($input as $key => $value) {
        if (!in_array($key, $allowedKeys, true)) respond(["success" => false, "message" => "許可されていない通知設定です。"], 400);
        if (!is_bool($value)) respond(["success" => false, "message" => "通知設定はtrueまたはfalseで送信してください。"], 400);
    }
    $next = array_merge(fetchSettings($pdo, $userId), $input);
    // 1ユーザーにつき1レコードにするため、user_idを主キーにしてUPSERTします。
    $stmt = $pdo->prepare("INSERT INTO notification_settings (user_id, chat_notification_enabled, survey_deadline_notification_enabled, schedule_reminder_notification_enabled, member_join_notification_enabled, split_bill_notification_enabled, created_at, updated_at) VALUES (:user_id, :chat_notification_enabled, :survey_deadline_notification_enabled, :schedule_reminder_notification_enabled, :member_join_notification_enabled, :split_bill_notification_enabled, NOW(), NOW()) ON DUPLICATE KEY UPDATE chat_notification_enabled = VALUES(chat_notification_enabled), survey_deadline_notification_enabled = VALUES(survey_deadline_notification_enabled), schedule_reminder_notification_enabled = VALUES(schedule_reminder_notification_enabled), member_join_notification_enabled = VALUES(member_join_notification_enabled), split_bill_notification_enabled = VALUES(split_bill_notification_enabled), updated_at = NOW()");
    $stmt->execute([
        ":user_id" => $userId,
        ":chat_notification_enabled" => $next["chatNotification"] ? 1 : 0,
        ":survey_deadline_notification_enabled" => $next["surveyDeadlineNotification"] ? 1 : 0,
        ":schedule_reminder_notification_enabled" => $next["scheduleReminderNotification"] ? 1 : 0,
        ":member_join_notification_enabled" => $next["memberJoinNotification"] ? 1 : 0,
        ":split_bill_notification_enabled" => $next["splitBillNotification"] ? 1 : 0,
    ]);
    respond(["success" => true, "settings" => fetchSettings($pdo, $userId)]);
} catch (Throwable $error) {
    respond(["success" => false, "message" => "通知設定の取得または保存に失敗しました。"], 500);
}
