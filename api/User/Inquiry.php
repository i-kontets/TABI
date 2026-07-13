<?php
session_start();
header("Content-Type: application/json; charset=UTF-8");

require_once __DIR__ . "/../config/db.php";
require_once __DIR__ . "/../Admin/includes/config.php";
require_once __DIR__ . "/../Admin/services/realtime.php";

function respond(array $payload, int $status = 200): void
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    respond(["success" => false, "message" => "POSTで送信してください。"], 405);
}

if (!isset($_SESSION["user_id"])) {
    respond(["success" => false, "message" => "ログインが必要です。"], 401);
}

$input = json_decode(file_get_contents("php://input"), true) ?: [];
$category = trim((string) ($input["category"] ?? ""));
$subject = trim((string) ($input["subject"] ?? ""));
$body = trim((string) ($input["body"] ?? ""));

if ($subject === "" || $body === "") {
    respond(["success" => false, "message" => "件名と内容を入力してください。"], 400);
}

try {
    $now = (new DateTimeImmutable("now"))->format("Y-m-d H:i:s");
    $publicId = "INQ-" . (new DateTimeImmutable("now"))->format("YmdHis") . "-" . bin2hex(random_bytes(2));

    $stmt = $pdo->prepare("
        INSERT INTO admin_inquiries
            (public_id, user_id, title, category, body, status, has_attachment, created_at, updated_at)
        VALUES
            (:public_id, :user_id, :title, :category, :body, 'open', 0, :created_at, :updated_at)
    ");
    $stmt->bindValue(":public_id", $publicId);
    $stmt->bindValue(":user_id", (int) $_SESSION["user_id"], PDO::PARAM_INT);
    $stmt->bindValue(":title", $subject);
    $stmt->bindValue(":category", $category !== "" ? $category : null);
    $stmt->bindValue(":body", $body);
    $stmt->bindValue(":created_at", $now);
    $stmt->bindValue(":updated_at", $now);
    $stmt->execute();

    $inquiryId = (int) $pdo->lastInsertId();
    sendRealtimeEvent("admin:global", "inquiry_created", [
        "id" => $inquiryId,
        "public_id" => $publicId,
    ]);

    respond([
        "success" => true,
        "message" => "お問い合わせを送信しました。",
        "public_id" => $publicId,
    ]);
} catch (Throwable $error) {
    respond(["success" => false, "message" => "お問い合わせの保存に失敗しました。"], 500);
}
