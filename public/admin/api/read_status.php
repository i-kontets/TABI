<?php
// 自分が送ったメッセージのうち相手が既読したIDを返す
// GET /api/read_status.php?chat_id=2
session_start();
header('Content-Type: application/json; charset=UTF-8');

require_once __DIR__ . '/../../api/config/db.php';

function respond(array $p, int $s = 200): void {
    http_response_code($s);
    echo json_encode($p, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

if (!isset($_SESSION['admin_user_id'])) {
    respond(['success' => false], 401);
}

$userId = (int)$_SESSION['admin_user_id'];
$chatId = filter_var($_GET['chat_id'] ?? null, FILTER_VALIDATE_INT);
if (!$chatId || $chatId < 1) respond(['success' => false], 400);

try {
    // 自分が送ったメッセージで、自分以外が既読したものを取得
    $stmt = $pdo->prepare("
        SELECT m.message_id
        FROM messages m
        WHERE m.chat_id = ?
          AND m.sender_user_id = ?
          AND EXISTS (
              SELECT 1 FROM message_reads r
              WHERE r.message_id = m.message_id
                AND r.user_id <> ?
          )
    ");
    $stmt->execute([$chatId, $userId, $userId]);
    $readIds = array_map('intval', $stmt->fetchAll(PDO::FETCH_COLUMN));

    respond(['success' => true, 'read_message_ids' => $readIds]);

} catch (Throwable $e) {
    respond(['success' => false], 500);
}
