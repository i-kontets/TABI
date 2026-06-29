<?php
// チャット一覧取得API（管理人が担当するホテルチャット一覧）
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

try {
    $stmt = $pdo->prepare("
        SELECT
            c.chat_id,
            c.trip_id,
            t.title       AS trip_title,
            t.start_date,
            t.end_date,
            m.body        AS last_body,
            m.image_url   AS last_image_url,
            m.sent_at     AS last_sent_at,
            u.name        AS last_sender,
            (
                SELECT COUNT(*)
                FROM messages unread
                WHERE unread.chat_id = c.chat_id
                  AND unread.sender_user_id != :uid2
                  AND unread.message_id NOT IN (
                      SELECT mr.message_id
                      FROM message_reads mr
                      WHERE mr.user_id = :uid3
                  )
            ) AS unread_count
        FROM chats c
        INNER JOIN chat_members cm ON cm.chat_id = c.chat_id AND cm.user_id = :uid
        LEFT JOIN trips t ON t.trip_id = c.trip_id
        LEFT JOIN messages m ON m.message_id = (
            SELECT MAX(m2.message_id) FROM messages m2 WHERE m2.chat_id = c.chat_id
        )
        LEFT JOIN users u ON u.user_id = m.sender_user_id
        WHERE c.chat_type = 'hotel'
        ORDER BY COALESCE(m.sent_at, c.created_at) DESC
    ");
    $stmt->bindValue(':uid',  $userId, PDO::PARAM_INT);
    $stmt->bindValue(':uid2', $userId, PDO::PARAM_INT);
    $stmt->bindValue(':uid3', $userId, PDO::PARAM_INT);
    $stmt->execute();

    $chats = [];
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        $lastTime = '';
        if (!empty($row['last_sent_at'])) {
            $d = new DateTimeImmutable($row['last_sent_at']);
            $today = new DateTimeImmutable('today');
            $lastTime = $d >= $today ? $d->format('H:i') : $d->format('m/d');
        }
        $startFmt = !empty($row['start_date'])
            ? (new DateTimeImmutable($row['start_date']))->format('Y/m/d') : '';
        $endFmt = !empty($row['end_date'])
            ? (new DateTimeImmutable($row['end_date']))->format('Y/m/d') : '';

        $lastBody = $row['last_image_url'] ? '[画像]' : ($row['last_body'] ?: '');

        $chats[] = [
            'chat_id'      => (int)$row['chat_id'],
            'trip_id'      => (int)$row['trip_id'],
            'trip_title'   => $row['trip_title'] ?? 'コテージ',
            'stay_name'    => $row['trip_title'] ?? 'コテージ',
            'start_date'   => $startFmt,
            'end_date'     => $endFmt,
            'last_body'    => $lastBody,
            'last_time'    => $lastTime,
            'last_sender'  => $row['last_sender'] ?? '',
            'unread_count' => (int)$row['unread_count'],
        ];
    }

    respond(['success' => true, 'chats' => $chats]);

} catch (Throwable $e) {
    respond(['success' => false, 'message' => 'チャット一覧の取得に失敗しました: ' . $e->getMessage()], 500);
}
