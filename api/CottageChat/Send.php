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

function firstCharacter(string $value): string
{
    $value = trim($value);
    if ($value === '') return '?';
    return function_exists('mb_substr') ? mb_substr($value, 0, 1) : substr($value, 0, 1);
}

function formatDateLabel(DateTimeImmutable $date): string
{
    $oneYearAgo = (new DateTimeImmutable('now'))->modify('-1 year');
    return $date < $oneYearAgo ? $date->format('Y年n月j日') : $date->format('n月j日');
}

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    respond(["success" => false, "message" => "POSTで送信してください"], 405);
}

if (!isset($_SESSION["user_id"])) {
    respond(["success" => false, "message" => "ログインが必要です"], 401);
}

$input = json_decode(file_get_contents("php://input"), true);
if (!is_array($input)) {
    $input = $_POST;
}

$userId = (int) $_SESSION["user_id"];
$chatId = filter_var($input["chat_id"] ?? null, FILTER_VALIDATE_INT);
$body = trim((string) ($input["body"] ?? $input["message"] ?? $input["text"] ?? ""));
$imageUrl = isset($input["image_url"]) ? trim((string) $input["image_url"]) : null;
if ($imageUrl === '') $imageUrl = null;

if (!$chatId || $chatId < 1) {
    respond(["success" => false, "message" => "chat_id を指定してください"], 400);
}
if ($body === '' && $imageUrl === null) {
    respond(["success" => false, "message" => "メッセージまたは画像を入力してください"], 400);
}

try {
    $memberStmt = $pdo->prepare("
        SELECT 1
        FROM chat_members
        WHERE chat_id = :chat_id
          AND user_id = :user_id
        LIMIT 1
    ");
    $memberStmt->bindValue(":chat_id", $chatId, PDO::PARAM_INT);
    $memberStmt->bindValue(":user_id", $userId, PDO::PARAM_INT);
    $memberStmt->execute();

    if (!$memberStmt->fetchColumn()) {
        respond(["success" => false, "message" => "このチャットへ送信する権限がありません"], 403);
    }

    $pdo->beginTransaction();

    $idStmt = $pdo->query("SELECT COALESCE(MAX(message_id), 0) + 1 FROM messages");
    $messageId = (int) $idStmt->fetchColumn();

    $insertStmt = $pdo->prepare("
        INSERT INTO messages (
            message_id,
            chat_id,
            sender_user_id,
            body,
            image_url,
            sent_at
        ) VALUES (
            :message_id,
            :chat_id,
            :sender_user_id,
            :body,
            :image_url,
            NOW()
        )
    ");
    $insertStmt->bindValue(":message_id", $messageId, PDO::PARAM_INT);
    $insertStmt->bindValue(":chat_id", $chatId, PDO::PARAM_INT);
    $insertStmt->bindValue(":sender_user_id", $userId, PDO::PARAM_INT);
    $insertStmt->bindValue(":body", $body !== '' ? $body : null, PDO::PARAM_STR);
    $insertStmt->bindValue(":image_url", $imageUrl, PDO::PARAM_STR);
    $insertStmt->execute();

    $messageStmt = $pdo->prepare("
        SELECT
            m.message_id,
            m.chat_id,
            m.sender_user_id,
            m.body,
            m.image_url,
            m.sent_at,
            u.name AS sender_name,
            u.icon_url AS sender_icon_url
        FROM messages m
        LEFT JOIN users u ON u.user_id = m.sender_user_id
        WHERE m.message_id = :message_id
        LIMIT 1
    ");
    $messageStmt->bindValue(":message_id", $messageId, PDO::PARAM_INT);
    $messageStmt->execute();
    $message = $messageStmt->fetch(PDO::FETCH_ASSOC);

    $pdo->commit();

    $sentAt = new DateTimeImmutable($message["sent_at"]);
    $senderName = $message["sender_name"] ?? ($_SESSION["user_name"] ?? "自分");

    respond([
        "success" => true,
        "message" => [
            "id" => (int) $message["message_id"],
            "message_id" => (int) $message["message_id"],
            "chat_id" => (int) $message["chat_id"],
            "sender_user_id" => (int) $message["sender_user_id"],
            "sender" => $senderName,
            "sender_name" => $senderName,
            "senderName" => $senderName,
            "avatar" => firstCharacter($senderName),
            "sender_icon_url" => $message["sender_icon_url"],
            "text" => $message["body"],
            "body" => $message["body"],
            "image_url" => $message["image_url"],
            "sent_at" => $message["sent_at"],
            "date" => formatDateLabel($sentAt),
            "time" => $sentAt->format("H:i"),
            "readCount" => 0,
            "read_count" => 0,
            "isRead" => false,
            "isMine" => true
        ]
    ], 201);
} catch (Throwable $error) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    respond(["success" => false, "message" => "メッセージの送信に失敗しました"], 500);
}
