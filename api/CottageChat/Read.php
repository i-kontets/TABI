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

if (!$chatId || $chatId < 1) {
    respond(["success" => false, "message" => "chat_id を指定してください"], 400);
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
        respond(["success" => false, "message" => "このチャットを閲覧する権限がありません"], 403);
    }

    $pdo->beginTransaction();

    $targetStmt = $pdo->prepare("
        SELECT m.message_id
        FROM messages m
        WHERE m.chat_id = :chat_id
          AND m.sender_user_id <> :user_id
          AND NOT EXISTS (
              SELECT 1
              FROM message_reads mr
              WHERE mr.message_id = m.message_id
                AND mr.user_id = :user_id2
          )
        ORDER BY m.message_id ASC
    ");
    $targetStmt->bindValue(":chat_id", $chatId, PDO::PARAM_INT);
    $targetStmt->bindValue(":user_id", $userId, PDO::PARAM_INT);
    $targetStmt->bindValue(":user_id2", $userId, PDO::PARAM_INT);
    $targetStmt->execute();
    $targetMessageIds = array_map("intval", $targetStmt->fetchAll(PDO::FETCH_COLUMN));

    if ($targetMessageIds !== []) {
        $idStmt = $pdo->query("SELECT COALESCE(MAX(message_read_id), 0) + 1 FROM message_reads");
        $nextReadId = (int) $idStmt->fetchColumn();

        $insertStmt = $pdo->prepare("
            INSERT INTO message_reads (
                message_read_id,
                message_id,
                user_id,
                read_at
            ) VALUES (
                :message_read_id,
                :message_id,
                :user_id,
                NOW()
            )
        ");

        foreach ($targetMessageIds as $targetMessageId) {
            $insertStmt->bindValue(":message_read_id", $nextReadId, PDO::PARAM_INT);
            $insertStmt->bindValue(":message_id", $targetMessageId, PDO::PARAM_INT);
            $insertStmt->bindValue(":user_id", $userId, PDO::PARAM_INT);
            $insertStmt->execute();
            $nextReadId++;
        }
    }

    $statusStmt = $pdo->prepare("
        SELECT
            m.message_id,
            COUNT(DISTINCT CASE
                WHEN mr.user_id <> m.sender_user_id THEN mr.user_id
            END) AS read_count,
            MAX(CASE WHEN mr.user_id = :user_id THEN 1 ELSE 0 END) AS is_read
        FROM messages m
        LEFT JOIN message_reads mr ON mr.message_id = m.message_id
        WHERE m.chat_id = :chat_id
        GROUP BY m.message_id
        ORDER BY m.sent_at ASC, m.message_id ASC
    ");
    $statusStmt->bindValue(":user_id", $userId, PDO::PARAM_INT);
    $statusStmt->bindValue(":chat_id", $chatId, PDO::PARAM_INT);
    $statusStmt->execute();

    $reads = array_map(
        static fn($read) => [
            "message_id" => (int) $read["message_id"],
            "read_count" => (int) $read["read_count"],
            "is_read" => (bool) $read["is_read"],
        ],
        $statusStmt->fetchAll(PDO::FETCH_ASSOC)
    );

    $pdo->commit();

    respond([
        "success" => true,
        "chat_id" => (int) $chatId,
        "reads" => $reads,
        "marked_count" => count($targetMessageIds),
    ]);
} catch (Throwable $error) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    respond(["success" => false, "message" => "既読更新に失敗しました"], 500);
}
