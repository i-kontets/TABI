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
    if ($value === '') {
        return '?';
    }
    return function_exists('mb_substr') ? mb_substr($value, 0, 1) : substr($value, 0, 1);
}

function formatDateLabel(?string $value): string
{
    if (!$value) {
        return '';
    }

    $date = new DateTimeImmutable($value);
    $oneYearAgo = (new DateTimeImmutable('now'))->modify('-1 year');

    if ($date < $oneYearAgo) {
        return $date->format('Y年n月j日');
    }

    return $date->format('n月j日');
}

function formatTime(?string $value): string
{
    if (!$value) {
        return '';
    }

    return (new DateTimeImmutable($value))->format('H:i');
}

function ensureMember(PDO $pdo, int $chatId, int $userId): void
{
    $stmt = $pdo->prepare("
        SELECT 1
        FROM chat_members
        WHERE chat_id = :chat_id
          AND user_id = :user_id
        LIMIT 1
    ");
    $stmt->bindValue(':chat_id', $chatId, PDO::PARAM_INT);
    $stmt->bindValue(':user_id', $userId, PDO::PARAM_INT);
    $stmt->execute();

    if (!$stmt->fetchColumn()) {
        respond(["success" => false, "message" => "このチャットを閲覧する権限がありません"], 403);
    }
}

if ($_SERVER["REQUEST_METHOD"] !== "GET") {
    respond(["success" => false, "message" => "GETで取得してください"], 405);
}

if (!isset($_SESSION["user_id"])) {
    respond(["success" => false, "message" => "ログインが必要です"], 401);
}

$userId = (int) $_SESSION["user_id"];
$chatId = filter_var($_GET["chat_id"] ?? null, FILTER_VALIDATE_INT);
$afterId = filter_var($_GET["after_id"] ?? null, FILTER_VALIDATE_INT);

if (!$chatId || $chatId < 1) {
    respond(["success" => false, "message" => "chat_id を指定してください"], 400);
}

try {
    ensureMember($pdo, (int) $chatId, $userId);

    $sql = "
        SELECT
            m.message_id,
            m.chat_id,
            m.sender_user_id,
            m.body,
            m.image_url,
            m.sent_at,
            u.name AS sender_name,
            u.icon_url AS sender_icon_url,
            COUNT(DISTINCT CASE
                WHEN mr.user_id <> m.sender_user_id THEN mr.user_id
            END) AS read_count,
            MAX(CASE WHEN mr.user_id = :current_user_id THEN 1 ELSE 0 END) AS is_read
        FROM messages m
        LEFT JOIN users u ON u.user_id = m.sender_user_id
        LEFT JOIN message_reads mr ON mr.message_id = m.message_id
        WHERE m.chat_id = :chat_id
    ";
    if ($afterId && $afterId > 0) {
        $sql .= " AND m.message_id > :after_id";
    }
    $sql .= "
        GROUP BY
            m.message_id,
            m.chat_id,
            m.sender_user_id,
            m.body,
            m.image_url,
            m.sent_at,
            u.name,
            u.icon_url
        ORDER BY m.sent_at ASC, m.message_id ASC
    ";

    $stmt = $pdo->prepare($sql);
    $stmt->bindValue(':current_user_id', $userId, PDO::PARAM_INT);
    $stmt->bindValue(':chat_id', $chatId, PDO::PARAM_INT);
    if ($afterId && $afterId > 0) {
        $stmt->bindValue(':after_id', $afterId, PDO::PARAM_INT);
    }
    $stmt->execute();

    $messages = [];
    while ($message = $stmt->fetch(PDO::FETCH_ASSOC)) {
        $senderName = $message['sender_name'] ?? 'Unknown user';

        $messages[] = [
            'id' => (int) $message['message_id'],
            'message_id' => (int) $message['message_id'],
            'chat_id' => (int) $message['chat_id'],
            'sender_user_id' => (int) $message['sender_user_id'],
            'sender' => $senderName,
            'sender_name' => $senderName,
            'senderName' => $senderName,
            'avatar' => $message['sender_icon_url'] ?: firstCharacter($senderName),
            'sender_icon_url' => $message['sender_icon_url'],
            'text' => $message['body'],
            'body' => $message['body'],
            'image_url' => $message['image_url'],
            'sent_at' => $message['sent_at'],
            'date' => formatDateLabel($message['sent_at']),
            'time' => formatTime($message['sent_at']),
            'readCount' => (int) $message['read_count'],
            'read_count' => (int) $message['read_count'],
            'isRead' => (bool) $message['is_read'],
            'isMine' => (int) $message['sender_user_id'] === $userId,
        ];
    }

    respond([
        "success" => true,
        "chat_id" => (int) $chatId,
        "messages" => $messages,
    ]);
} catch (Throwable $error) {
    respond([
        "success" => false,
        "message" => "メッセージの取得に失敗しました",
    ], 500);
}
