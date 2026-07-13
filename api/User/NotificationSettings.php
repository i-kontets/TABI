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

if (!isset($_SESSION["user_id"])) {
    respond(["success" => false, "message" => "ログインが必要です。"], 401);
}

$userId = (int) $_SESSION["user_id"];
$settingKey = "notification_settings:" . $userId;

try {
    if ($_SERVER["REQUEST_METHOD"] === "GET") {
        $stmt = $pdo->prepare("SELECT setting_value FROM system_settings WHERE setting_key = :setting_key LIMIT 1");
        $stmt->bindValue(":setting_key", $settingKey);
        $stmt->execute();
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        $settings = $row ? json_decode((string) $row["setting_value"], true) : [];
        respond(["success" => true, "settings" => is_array($settings) ? $settings : []]);
    }

    if ($_SERVER["REQUEST_METHOD"] !== "POST") {
        respond(["success" => false, "message" => "GETまたはPOSTで送信してください。"], 405);
    }

    $input = json_decode(file_get_contents("php://input"), true);
    if (!is_array($input) || !isset($input["settings"]) || !is_array($input["settings"])) {
        respond(["success" => false, "message" => "通知設定を送信してください。"], 400);
    }

    $now = (new DateTimeImmutable("now"))->format("Y-m-d H:i:s");
    $stmt = $pdo->prepare("
        INSERT INTO system_settings (setting_key, setting_value, updated_at)
        VALUES (:setting_key, :setting_value, :updated_at)
        ON DUPLICATE KEY UPDATE
            setting_value = VALUES(setting_value),
            updated_at = VALUES(updated_at)
    ");
    $stmt->bindValue(":setting_key", $settingKey);
    $stmt->bindValue(":setting_value", json_encode($input["settings"], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
    $stmt->bindValue(":updated_at", $now);
    $stmt->execute();

    respond(["success" => true, "settings" => $input["settings"]]);
} catch (Throwable $error) {
    respond(["success" => false, "message" => "通知設定の取得または保存に失敗しました。"], 500);
}
