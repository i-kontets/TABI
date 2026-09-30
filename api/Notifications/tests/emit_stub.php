<?php
// 統合テスト専用のHTTP送信先です。実際のWebSocketサーバーの代用品ではありません。
// テスト親プロセスが渡した一時ファイルに、秘密情報を含まない配信先とイベントだけを記録します。
if (PHP_SAPI !== 'cli-server' || !getenv('NOTICE_TEST_EVENTS')) { http_response_code(404); exit; }
$payload = json_decode(file_get_contents('php://input'), true);
if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST' || !is_array($payload)) { http_response_code(400); exit; }
file_put_contents(getenv('NOTICE_TEST_EVENTS'), json_encode($payload) . "\n", FILE_APPEND | LOCK_EX);
header('Content-Type: application/json');
echo '{"ok":true}';
