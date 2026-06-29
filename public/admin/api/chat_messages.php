<?php
// チャットの全メッセージ取得（初期ロード）
// GET /api/chat_messages.php?chat_id=4
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

$userId = (int)$_SESSION['admin_user_id'];
$chatId = filter_var($_GET['chat_id'] ?? null, FILTER_VALIDATE_INT);
if (!$chatId || $chatId < 1) {
    respond(['success' => false, 'message' => 'chat_idが無効です'], 400);
}

try {
    // 参加チェック
    $memStmt = $pdo->prepare("SELECT 1 FROM chat_members WHERE chat_id=:c AND user_id=:u LIMIT 1");
    $memStmt->bindValue(':c', $chatId, PDO::PARAM_INT);
    $memStmt->bindValue(':u', $userId, PDO::PARAM_INT);
    $memStmt->execute();
    if (!$memStmt->fetchColumn()) {
        respond(['success' => false, 'message' => 'アクセス権限がありません'], 403);
    }

    // trip_id 取得（管理人判定に使用）
    $ci = $pdo->prepare("SELECT trip_id FROM chats WHERE chat_id=:c LIMIT 1");
    $ci->bindValue(':c', $chatId, PDO::PARAM_INT);
    $ci->execute();
    $tripId = (int)($ci->fetchColumn() ?: 0);

    // 管理人user_id（trip_membersにいないchat_member）
    $mgrStmt = $pdo->prepare("
        SELECT cm.user_id FROM chat_members cm
        WHERE cm.chat_id = :c
          AND NOT EXISTS (SELECT 1 FROM trip_members tm WHERE tm.trip_id=:t AND tm.user_id=cm.user_id)
        LIMIT 1
    ");
    $mgrStmt->bindValue(':c', $chatId, PDO::PARAM_INT);
    $mgrStmt->bindValue(':t', $tripId, PDO::PARAM_INT);
    $mgrStmt->execute();
    $managerUid = (int)($mgrStmt->fetchColumn() ?: 0);

    // メッセージ取得（既読フラグ付き）
    $msgStmt = $pdo->prepare("
        SELECT m.message_id, m.sender_user_id, m.body, m.image_url, m.sent_at,
               u.name AS sender_name, u.icon_url AS sender_icon_url,
               EXISTS (
                   SELECT 1 FROM message_reads r
                   WHERE r.message_id = m.message_id
                     AND r.user_id <> m.sender_user_id
               ) AS is_read
        FROM messages m
        LEFT JOIN users u ON u.user_id = m.sender_user_id
        WHERE m.chat_id = :c
        ORDER BY m.sent_at ASC, m.message_id ASC
    ");
    $msgStmt->bindValue(':c', $chatId, PDO::PARAM_INT);
    $msgStmt->execute();

    $messages = [];
    $lastId   = 0;

    while ($row = $msgStmt->fetch(PDO::FETCH_ASSOC)) {
        $mid  = (int)$row['message_id'];
        $suid = (int)$row['sender_user_id'];
        $d    = new DateTimeImmutable($row['sent_at']);

        if ($mid > $lastId) $lastId = $mid;

        $messages[] = [
            'message_id'      => $mid,
            'sender_user_id'  => $suid,
            'sender_name'     => $row['sender_name'] ?? 'Unknown',
            'sender_icon_url' => $row['sender_icon_url'],
            'sender_type'     => ($managerUid > 0 && $suid === $managerUid) ? 'manager' : 'member',
            'body'            => $row['body'],
            'image_url'       => $row['image_url'],
            'sent_at'         => $row['sent_at'],
            'time'            => $d->format('H:i'),
            'date'            => $d->format('n月j日'),
            'isMine'          => ($suid === $userId),
            'is_read'         => (bool)$row['is_read'],
        ];
    }

    respond([
        'success'         => true,
        'messages'        => $messages,
        'last_message_id' => $lastId,
    ]);

} catch (Throwable $e) {
    respond(['success' => false, 'message' => 'メッセージの取得に失敗しました'], 500);
}
