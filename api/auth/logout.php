<?php
// ログアウト処理
session_start();

$_SESSION = [];

session_destroy();

echo json_encode([
    "success" => true,
    "message" => "ログアウトしました"
]);

exit;