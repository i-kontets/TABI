<?php

/**
 * 旅行グループ内の個人チャットを作成、または既存の同一グループのチャットを返します。
 */
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

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    respond(["success" => false, "message" => "POSTで送信してください。"], 405);
}

$input = json_decode(file_get_contents("php://input"), true) ?: [];
$groupId = filter_var($input["group_id"] ?? null, FILTER_VALIDATE_INT);
$targetUserId = filter_var($input["user_id"] ?? null, FILTER_VALIDATE_INT);
$currentUserId = (int) $_SESSION["user_id"];

if (!$groupId || !$targetUserId || $targetUserId === $currentUserId) {
    respond(["success" => false, "message" => "チャット対象が正しくありません。"], 400);
}

try {
    $pdo->beginTransaction();

    $tripStmt = $pdo->prepare("SELECT trip_id FROM trips WHERE group_id = :group_id ORDER BY trip_id DESC LIMIT 1");
    $tripStmt->execute([":group_id" => $groupId]);
    $tripId = (int) $tripStmt->fetchColumn();
    if (!$tripId) {
        $pdo->rollBack();
        respond(["success" => false, "message" => "対象の旅行が見つかりません。"], 404);
    }

    $memberStmt = $pdo->prepare("SELECT COUNT(*) FROM group_members WHERE group_id = :group_id AND user_id = :user_id AND invitation_status = 'accepted'");
    $memberStmt->execute([":group_id" => $groupId, ":user_id" => $currentUserId]);
    $targetStmt = $pdo->prepare("SELECT COUNT(*) FROM group_members WHERE group_id = :group_id AND user_id = :user_id AND invitation_status = 'accepted'");
    $targetStmt->execute([":group_id" => $groupId, ":user_id" => $targetUserId]);

    if ((int) $memberStmt->fetchColumn() === 0 || (int) $targetStmt->fetchColumn() === 0) {
        $pdo->rollBack();
        respond(["success" => false, "message" => "同じ旅行グループのメンバーではありません。"], 403);
    }

    $existingStmt = $pdo->prepare("\n        SELECT c.chat_id\n        FROM chats c\n        INNER JOIN chat_members mine ON mine.chat_id = c.chat_id AND mine.user_id = :current_user_id\n        INNER JOIN chat_members target ON target.chat_id = c.chat_id AND target.user_id = :target_user_id\n        WHERE c.trip_id = :trip_id AND c.chat_type = 'direct'\n        LIMIT 1\n    ");
    $existingStmt->execute([
        ":current_user_id" => $currentUserId,
        ":target_user_id" => $targetUserId,
        ":trip_id" => $tripId,
    ]);
    $existingChatId = $existingStmt->fetchColumn();

    if ($existingChatId) {
        $pdo->commit();
        respond(["success" => true, "chat_id" => (int) $existingChatId, "created" => false]);
    }

    $idStmt = $pdo->query("SELECT COALESCE(MAX(chat_id), 0) + 1 FROM chats FOR UPDATE");
    $chatId = (int) $idStmt->fetchColumn();

    $chatStmt = $pdo->prepare("INSERT INTO chats (chat_id, trip_id, chat_type, related_entity_type, related_entity_id, created_at) VALUES (:chat_id, :trip_id, 'direct', NULL, NULL, NOW())");
    $chatStmt->execute([":chat_id" => $chatId, ":trip_id" => $tripId]);

    $memberInsert = $pdo->prepare("INSERT INTO chat_members (chat_id, user_id, joined_at) VALUES (:chat_id, :user_id, NOW())");
    $memberInsert->execute([":chat_id" => $chatId, ":user_id" => $currentUserId]);
    $memberInsert->execute([":chat_id" => $chatId, ":user_id" => $targetUserId]);

    $pdo->commit();
    respond(["success" => true, "chat_id" => $chatId, "created" => true]);
} catch (Throwable $error) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    respond(["success" => false, "message" => "個人チャットの作成に失敗しました。"], 500);
}
