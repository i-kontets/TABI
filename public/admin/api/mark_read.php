<?php
// チャットの未読メッセージを既読にする
// POST /api/mark_read.php  body: { chat_id }
session_start();
header('Content-Type: application/json; charset=UTF-8');

require_once __DIR__ . '/../../api/config/db.php';

function respond(array $p, int $s = 200): void {
    http_response_code($s);
    echo json_encode($p, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

if (!isset($_SESSION['admin_user_id'])) {
    respond(['success' => false, 'message' => 'ログインが必要です'], 401);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respond(['success' => false, 'message' => 'POSTで送信してください'], 405);
}

$userId = (int)$_SESSION['admin_user_id'];
$input  = json_decode(file_get_contents('php://input'), true);
$chatId = filter_var($input['chat_id'] ?? null, FILTER_VALIDATE_INT);

if (!$chatId || $chatId < 1) {
    respond(['success' => false, 'message' => 'chat_idが不正です'], 400);
}

try {
    // 自分以外が送ったメッセージで、まだ既読になっていないものを一括既読
    $stmt = $pdo->prepare("
        INSERT IGNORE INTO message_reads (message_id, user_id, read_at)
        SELECT m.message_id, ?, NOW()
        FROM messages m
        WHERE m.chat_id = ?
          AND m.sender_user_id <> ?
          AND NOT EXISTS (
              SELECT 1 FROM message_reads r
              WHERE r.message_id = m.message_id
                AND r.user_id = ?
          )
    ");
    $stmt->execute([$userId, $chatId, $userId, $userId]);

    respond(['success' => true, 'marked' => $stmt->rowCount()]);

} catch (Throwable $e) {
    respond(['success' => false, 'message' => '既読処理に失敗しました'], 500);
}
