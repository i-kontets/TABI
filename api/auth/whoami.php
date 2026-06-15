<?php
// セッション開始
session_start();

// JSONレスポンスの設定
header("Content-Type: application/json; charset=UTF-8");

// データベース接続設定を読み込む
require_once __DIR__ . "/../config/db.php";

// セッションにユーザーIDが保存されているか確認
if (!isset($_SESSION["user_id"])) {
    http_response_code(401);
    echo json_encode([
        "success" => false,
        "message" => "ログインしてください"
    ]);
    exit;
}

// ユーザーIDからユーザー情報を取得
$user_id = $_SESSION["user_id"];

if ($user_id == "") {
    $sql = "INSERT INTO users (name, email, password_hash, language_code) VALUES (?, ?, ?, ?)";
} else {
    $sql = "SELECT user_id, name, email FROM users WHERE user_id = :user_id LIMIT 1";
}

$stmt = $pdo->prepare($sql);
$stmt->bindValue(":user_id", $user_id, PDO::PARAM_STR);
$stmt->execute();
$user = $stmt->fetch(PDO::FETCH_ASSOC);

// ユーザーが見つからない場合はエラー
if (!$user) {
    http_response_code(404);
    echo json_encode([
        "success" => false,
        "message" => "ユーザーが見つかりません"
    ]);
    exit;
}

// ユーザー情報をJSONで返す
echo json_encode([
    "success" => true,
    "user" => $user
]);
exit;

?>