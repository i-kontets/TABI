<?php
session_start();
header('Content-Type: application/json; charset=UTF-8');

require_once __DIR__ . '/../../api/config/db.php';

if (!isset($_SESSION['admin_user_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'ログインが必要です'], JSON_UNESCAPED_UNICODE);
    exit;
}

$userId = (int)$_SESSION['admin_user_id'];

try {
    $stmt = $pdo->prepare("SELECT user_id, name, email, icon_url FROM users WHERE user_id = :id LIMIT 1");
    $stmt->bindValue(':id', $userId, PDO::PARAM_INT);
    $stmt->execute();
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user) {
        session_destroy();
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'ユーザーが見つかりません'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    echo json_encode([
        'success' => true,
        'user' => [
            'user_id'  => (int)$user['user_id'],
            'name'     => $user['name'],
            'email'    => $user['email'],
            'icon_url' => $user['icon_url'],
        ],
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'エラーが発生しました'], JSON_UNESCAPED_UNICODE);
}
