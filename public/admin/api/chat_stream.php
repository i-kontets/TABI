<?php
// SSEストリーム（管理画面のリアルタイム受信）
// GET /api/chat_stream.php?chat_id=4&after_id=10

// PHP実行時間制限を解除・クライアント切断後も継続
set_time_limit(0);
ignore_user_abort(true);

session_start();

if (!isset($_SESSION['admin_user_id'])) {
    header('Content-Type: text/event-stream');
    echo "event: error\ndata: " . json_encode(['message' => 'ログインが必要です'], JSON_UNESCAPED_UNICODE) . "\n\n";
    flush(); exit;
}

$chatId  = filter_var($_GET['chat_id']  ?? null, FILTER_VALIDATE_INT);
$afterId = filter_var($_GET['after_id'] ?? 0,    FILTER_VALIDATE_INT);
if (!$chatId || $chatId < 1) {
    header('Content-Type: text/event-stream');
    echo "event: error\ndata: " . json_encode(['message' => 'chat_idが無効です'], JSON_UNESCAPED_UNICODE) . "\n\n";
    flush(); exit;
}
if ($afterId === false || $afterId < 0) $afterId = 0;

require_once __DIR__ . '/../../api/config/db.php';

// db.php が Content-Type を上書きするため、ここで改めて設定
header('Content-Type: text/event-stream');
header('Cache-Control: no-cache');
header('Connection: keep-alive');
header('X-Accel-Buffering: no');

$userId = (int)$_SESSION['admin_user_id'];

// セッションロックを解放（chat_send.php の遅延防止）
session_write_close();

while (ob_get_level() > 0) ob_end_clean();

try {
    // 参加チェック
    $memStmt = $pdo->prepare("SELECT 1 FROM chat_members WHERE chat_id=:c AND user_id=:u LIMIT 1");
    $memStmt->bindValue(':c', $chatId, PDO::PARAM_INT);
    $memStmt->bindValue(':u', $userId, PDO::PARAM_INT);
    $memStmt->execute();
    if (!$memStmt->fetchColumn()) {
        echo "event: error\ndata: " . json_encode(['message' => 'アクセス権限がありません'], JSON_UNESCAPED_UNICODE) . "\n\n";
        flush(); exit;
    }

    // trip_id & 管理人ID
    $ci = $pdo->prepare("SELECT trip_id FROM chats WHERE chat_id=:c LIMIT 1");
    $ci->bindValue(':c', $chatId, PDO::PARAM_INT);
    $ci->execute();
    $tripId = (int)($ci->fetchColumn() ?: 0);

    $mgrStmt = $pdo->prepare("
        SELECT cm.user_id FROM chat_members cm
        WHERE cm.chat_id=:c AND NOT EXISTS(
            SELECT 1 FROM trip_members tm WHERE tm.trip_id=:t AND tm.user_id=cm.user_id
        ) LIMIT 1
    ");
    $mgrStmt->bindValue(':c', $chatId, PDO::PARAM_INT);
    $mgrStmt->bindValue(':t', $tripId, PDO::PARAM_INT);
    $mgrStmt->execute();
    $mgrUid = (int)($mgrStmt->fetchColumn() ?: 0);

    $currentId = $afterId;
    $start     = time();
    $maxSec    = 25;

    // 接続確認
    echo "event: connected\ndata: " . json_encode(['chat_id' => $chatId]) . "\n\n";
    flush();

    while (true) {
        if (connection_aborted()) break;
        if ((time() - $start) >= $maxSec) {
            echo "event: close\ndata: " . json_encode(['reason' => 'timeout']) . "\n\n";
            flush(); break;
        }

        $msgStmt = $pdo->prepare("
            SELECT m.message_id, m.sender_user_id, m.body, m.image_url, m.sent_at,
                   u.name AS sender_name, u.icon_url AS sender_icon_url
            FROM messages m LEFT JOIN users u ON u.user_id=m.sender_user_id
            WHERE m.chat_id=:c AND m.message_id > :after
            ORDER BY m.sent_at ASC, m.message_id ASC
        ");
        $msgStmt->bindValue(':c',     $chatId,    PDO::PARAM_INT);
        $msgStmt->bindValue(':after', $currentId, PDO::PARAM_INT);
        $msgStmt->execute();

        $fresh = [];
        while ($row = $msgStmt->fetch(PDO::FETCH_ASSOC)) {
            $mid  = (int)$row['message_id'];
            $suid = (int)$row['sender_user_id'];
            $d    = new DateTimeImmutable($row['sent_at']);
            if ($mid > $currentId) $currentId = $mid;

            $fresh[] = [
                'message_id'      => $mid,
                'sender_user_id'  => $suid,
                'sender_name'     => $row['sender_name']     ?? 'Unknown',
                'sender_icon_url' => $row['sender_icon_url'],
                'sender_type'     => ($mgrUid > 0 && $suid === $mgrUid) ? 'manager' : 'member',
                'body'            => $row['body'],
                'image_url'       => $row['image_url'],
                'sent_at'         => $row['sent_at'],
                'time'            => $d->format('H:i'),
                'date'            => $d->format('n月j日'),
                'isMine'          => ($suid === $userId),
            ];
        }

        if (!empty($fresh)) {
            echo "event: messages\ndata: " . json_encode($fresh, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . "\n\n";
        } else {
            echo ": heartbeat\n\n";
        }

        flush();
        sleep(1);
    }
} catch (Throwable $e) {
    echo "event: error\ndata: " . json_encode(['message' => 'サーバーエラーが発生しました'], JSON_UNESCAPED_UNICODE) . "\n\n";
    flush();
}
