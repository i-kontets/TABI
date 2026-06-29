<?php
// メッセージ送信API（管理人→旅行者）
// POST /api/chat_send.php  body: { chat_id, body } or { chat_id, image_url }
session_start();
header('Content-Type: application/json; charset=UTF-8');

require_once __DIR__ . '/../../api/config/db.php';

function respond(array $p, int $s = 200): void {
    http_response_code($s);
    echo json_encode($p, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respond(['success' => false, 'message' => 'POSTで送信してください'], 405);
}
if (!isset($_SESSION['admin_user_id'])) {
    respond(['success' => false, 'message' => 'ログインが必要です'], 401);
}

$input    = json_decode(file_get_contents('php://input'), true);
if (!is_array($input)) $input = $_POST;

$userId   = (int)$_SESSION['admin_user_id'];
$chatId   = filter_var($input['chat_id'] ?? null, FILTER_VALIDATE_INT);
$body     = trim((string)($input['body'] ?? ''));
$imageUrl = isset($input['image_url']) ? trim((string)$input['image_url']) : null;
if ($imageUrl === '') $imageUrl = null;

if (!$chatId || $chatId < 1) {
    respond(['success' => false, 'message' => 'chat_idが無効です'], 400);
}
if ($body === '' && $imageUrl === null) {
    respond(['success' => false, 'message' => 'メッセージまたは画像を入力してください'], 400);
}
if (mb_strlen($body) > 1000) {
    respond(['success' => false, 'message' => 'メッセージは1000文字以内で入力してください'], 400);
}

$lockAcquired = false;

try {
    // 参加チェック
    $memStmt = $pdo->prepare("SELECT 1 FROM chat_members WHERE chat_id=:c AND user_id=:u LIMIT 1");
    $memStmt->bindValue(':c', $chatId, PDO::PARAM_INT);
    $memStmt->bindValue(':u', $userId, PDO::PARAM_INT);
    $memStmt->execute();
    if (!$memStmt->fetchColumn()) {
        respond(['success' => false, 'message' => 'このチャットへの送信権限がありません'], 403);
    }

    // 採番ロック取得
    $lr = $pdo->query("SELECT GET_LOCK('tabi_messages_id_lock', 5)");
    $lockAcquired = (int)$lr->fetchColumn() === 1;
    if (!$lockAcquired) throw new RuntimeException('採番ロック取得に失敗しました');

    $pdo->beginTransaction();

    // 次のmessage_id
    $idR   = $pdo->query("SELECT COALESCE(MAX(message_id),0)+1 FROM messages");
    $msgId = (int)$idR->fetchColumn();

    // 挿入
    $ins = $pdo->prepare("
        INSERT INTO messages (message_id, chat_id, sender_user_id, body, image_url, sent_at)
        VALUES (:mid, :cid, :uid, :body, :image_url, NOW())
    ");
    $ins->bindValue(':mid',       $msgId,                      PDO::PARAM_INT);
    $ins->bindValue(':cid',       $chatId,                     PDO::PARAM_INT);
    $ins->bindValue(':uid',       $userId,                     PDO::PARAM_INT);
    $ins->bindValue(':body',      $body !== '' ? $body : null, PDO::PARAM_STR);
    $ins->bindValue(':image_url', $imageUrl,                   PDO::PARAM_STR);
    $ins->execute();

    // 保存後のレコード取得
    $sel = $pdo->prepare("
        SELECT m.message_id, m.sender_user_id, m.body, m.image_url, m.sent_at,
               u.name AS sender_name, u.icon_url
        FROM messages m LEFT JOIN users u ON u.user_id=m.sender_user_id
        WHERE m.message_id=:mid LIMIT 1
    ");
    $sel->bindValue(':mid', $msgId, PDO::PARAM_INT);
    $sel->execute();
    $msg = $sel->fetch(PDO::FETCH_ASSOC);

    $pdo->commit();
    $pdo->query("SELECT RELEASE_LOCK('tabi_messages_id_lock')");
    $lockAcquired = false;

    $sentAt = new DateTimeImmutable($msg['sent_at']);

    respond([
        'success' => true,
        'message' => [
            'message_id'      => (int)$msg['message_id'],
            'sender_user_id'  => (int)$msg['sender_user_id'],
            'sender_name'     => $msg['sender_name'] ?? '管理人',
            'sender_icon_url' => $msg['icon_url'],
            'sender_type'     => 'manager',
            'body'            => $msg['body'],
            'image_url'       => $msg['image_url'],
            'sent_at'         => $msg['sent_at'],
            'time'            => $sentAt->format('H:i'),
            'date'            => $sentAt->format('n月j日'),
            'isMine'          => true,
            'is_read'         => false,
        ],
    ]);

} catch (Throwable $e) {
    if ($lockAcquired) {
        try { $pdo->rollBack(); } catch (Throwable $_) {}
        try { $pdo->query("SELECT RELEASE_LOCK('tabi_messages_id_lock')"); } catch (Throwable $_) {}
    }
    respond(['success' => false, 'message' => '送信に失敗しました: ' . $e->getMessage()], 500);
}
