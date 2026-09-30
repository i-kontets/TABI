<?php
declare(strict_types=1);

// Socket.IOの接続・再接続直前に呼びます。既存PHP Sessionを使い、別ログイン方式は作りません。
header('Content-Type: application/json; charset=UTF-8');
header('Cache-Control: no-store, private');
header('Pragma: no-cache');
function wsTokenRespond(int $status, array $body): never
{
    http_response_code($status);
    echo json_encode($body, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
    exit;
}
if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') wsTokenRespond(405, ['message'=>'POSTが必要です。']);
if (stripos($_SERVER['CONTENT_TYPE'] ?? '', 'application/json') !== 0) wsTokenRespond(415, ['message'=>'JSONが必要です。']);
$source = $_SERVER['HTTP_ORIGIN'] ?? $_SERVER['HTTP_REFERER'] ?? '';
$host = parse_url('http://' . ($_SERVER['HTTP_HOST'] ?? ''), PHP_URL_HOST);
if (($_SERVER['HTTP_SEC_FETCH_SITE'] ?? '') === 'cross-site' || ($source !== '' && parse_url($source, PHP_URL_HOST) !== $host)) {
    wsTokenRespond(403, ['message'=>'許可されていない送信元です。']);
}
session_start();
$userId = filter_var($_SESSION['user_id'] ?? null, FILTER_VALIDATE_INT);
session_write_close();
if (!$userId || $userId < 1) wsTokenRespond(401, ['message'=>'ログインが必要です。']);
try {
    $raw = file_get_contents('php://input', false, null, 0, 4097);
    if (strlen($raw) > 4096) wsTokenRespond(413, ['message'=>'要求が大きすぎます。']);
    $input = json_decode($raw, true, 16, JSON_THROW_ON_ERROR);
    if (!is_array($input) || !is_array($input['rooms'] ?? null) || !array_is_list($input['rooms'])) {
        wsTokenRespond(422, ['message'=>'rooms配列が必要です。']);
    }
    require_once __DIR__ . '/WebSocketAuth.php';
    // 環境変数または公開外の秘密ファイルだけから読み、VITE_設定やリクエスト値は利用しません。
    $secret = wsReadAuthSecret();
    if (strlen($secret) < 32) wsTokenRespond(503, ['message'=>'WebSocket認証を準備中です。']);
    require __DIR__ . '/../config/db.php';
    $rooms = wsAllowedRooms($pdo, (int)$userId, $input['rooms']);
    wsTokenRespond(200, wsIssueToken((int)$userId, $rooms, $secret));
} catch (DomainException) {
    wsTokenRespond(401, ['message'=>'有効なログインが必要です。']);
} catch (InvalidArgumentException | JsonException) {
    wsTokenRespond(422, ['message'=>'接続要求が不正です。']);
} catch (Throwable) {
    // DB設定・token・Cookie・例外本文はレスポンスやログへ出しません。
    wsTokenRespond(503, ['message'=>'リアルタイム接続を利用できません。']);
}
