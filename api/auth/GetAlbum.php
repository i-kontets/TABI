<?php

header('Access-Control-Allow-Origin: http://localhost:5173');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

header('Content-Type: application/json; charset=UTF-8');

require_once __DIR__ . '/../config/db.php';

function json_response($success, $message, $data = [], $status = 200) {
    http_response_code($status);
    echo json_encode(array_merge([
        'success' => $success,
        'message' => $message,
    ], $data), JSON_UNESCAPED_UNICODE);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    json_response(false, 'GETメソッドで送信してください', [], 405);
}

$groupId = $_GET['group_id'] ?? $_GET['groupId'] ?? null;

if (!$groupId || !is_numeric($groupId)) {
    json_response(false, 'group_id が不正です', [], 400);
}

try {
    $stmt = $pdo->prepare(
        'SELECT album_id, trip_id, title
         FROM albums
         WHERE trip_id = :trip_id
         LIMIT 1'
    );

    $stmt->execute([
        ':trip_id' => (int)$groupId,
    ]);

    $album = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$album) {
        json_response(false, 'アルバムが見つかりません', [], 404);
    }

    json_response(true, 'アルバム取得成功', [
        'album' => [
            'album_id' => (int)$album['album_id'],
            'trip_id' => (int)$album['trip_id'],
            'title' => $album['title'],
        ],
    ]);
} catch (PDOException $e) {
    json_response(false, 'アルバム取得に失敗しました', [
        'error' => $e->getMessage(),
    ], 500);
}