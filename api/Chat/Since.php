<?php
// 差分メッセージ取得（ポーリング用）
// GET /api/Chat/Since.php?chat_id=2&after_id=10
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
    if ($value === "") return "?";
    return function_exists("mb_substr") ? mb_substr($value, 0, 1) : substr($value, 0, 1);
}

function formatDateLabel(?string $value): string
{
    if (!$value) return "";
    $date = new DateTimeImmutable($value);
    $oneYearAgo = (new DateTimeImmutable("now"))->modify("-1 year");
    return $date < $oneYearAgo ? $date->format("Y年n月j日") : $date->format("n月j日");
}

function formatTime(?string $value): string
{
    if (!$value) return "";
    return (new DateTimeImmutable($value))->format("H:i");
}

if ($_SERVER["REQUEST_METHOD"] !== "GET") {
    respond(["success" => false, "message" => "Use GET."], 405);
}

if (!isset($_SESSION["user_id"])) {
    respond(["success" => false, "message" => "Login required."], 401);
}

$userId  = (int) $_SESSION["user_id"];
$chatId  = filter_var($_GET["chat_id"]  ?? null, FILTER_VALIDATE_INT);
$afterId = filter_var($_GET["after_id"] ?? 0,    FILTER_VALIDATE_INT);

if (!$chatId || $chatId < 1) {
    respond(["success" => false, "message" => "chat_id is required."], 400);
}
if ($afterId === false || $afterId < 0) {
    $afterId = 0;
}

try {
    // 参加チェック
    $memStmt = $pdo->prepare("
        SELECT 1 FROM chat_members
        WHERE chat_id = :chat_id AND user_id = :user_id
        LIMIT 1
    ");
    $memStmt->bindValue(":chat_id", $chatId, PDO::PARAM_INT);
    $memStmt->bindValue(":user_id", $userId, PDO::PARAM_INT);
    $memStmt->execute();

    if (!$memStmt->fetchColumn()) {
        respond(["success" => false, "message" => "Permission denied."], 403);
    }

    // after_id 以降のメッセージだけ取得
    $msgStmt = $pdo->prepare("
        SELECT
            m.message_id,
            m.chat_id,
            m.sender_user_id,
            m.body,
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
          AND m.message_id > :after_id
        GROUP BY
            m.message_id, m.chat_id, m.sender_user_id,
            m.body, m.sent_at, u.name, u.icon_url
        ORDER BY m.sent_at ASC, m.message_id ASC
    ");
    $msgStmt->bindValue(":current_user_id", $userId, PDO::PARAM_INT);
    $msgStmt->bindValue(":chat_id",         $chatId,  PDO::PARAM_INT);
    $msgStmt->bindValue(":after_id",        $afterId, PDO::PARAM_INT);
    $msgStmt->execute();

    $messages = [];
    $lastId   = $afterId;

    while ($row = $msgStmt->fetch(PDO::FETCH_ASSOC)) {
        $mid        = (int) $row["message_id"];
        $senderName = $row["sender_name"] ?? "Unknown user";
        if ($mid > $lastId) $lastId = $mid;

        $messages[] = [
            "id"              => $mid,
            "message_id"      => $mid,
            "chat_id"         => (int) $row["chat_id"],
            "sender_user_id"  => (int) $row["sender_user_id"],
            "sender"          => $senderName,
            "sender_name"     => $senderName,
            "senderName"      => $senderName,
            "avatar"          => $row["sender_icon_url"] ?: firstCharacter($senderName),
            "sender_icon_url" => $row["sender_icon_url"],
            "text"            => $row["body"],
            "body"            => $row["body"],
            "sent_at"         => $row["sent_at"],
            "date"            => formatDateLabel($row["sent_at"]),
            "time"            => formatTime($row["sent_at"]),
            "readCount"       => (int) $row["read_count"],
            "read_count"      => (int) $row["read_count"],
            "isRead"          => (bool) $row["is_read"],
            "isMine"          => (int) $row["sender_user_id"] === $userId,
        ];
    }

    respond([
        "success"         => true,
        "messages"        => $messages,
        "last_message_id" => $lastId,
    ]);

} catch (Throwable $error) {
    respond(["success" => false, "message" => "Failed to fetch new messages."], 500);
}
