<?php
// セッション開始 - ユーザーのセッション管理を初期化
session_start();

// JSONレスポンスの設定
header("Content-Type: application/json; charset=UTF-8");

// データベース接続設定を読み込む
require_once __DIR__ . "/../config/db.php";

// POSTメソッドのみを許可。POST以外のリクエストはエラー
if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    http_response_code(405);
    echo json_encode([
        "success" => false,
        "message" => "POSTメソッドで送信してください"
    ]);
    exit;
}

// JSON形式のリクエストボディを取得してデコード
$input = json_decode(file_get_contents("php://input"), true);

// メールアドレスとパスワードを抽出（デフォルト値は空文字列）
$email = $input["email"] ?? "";
$password = $input["password"] ?? "";

// 入力値の必須チェック：メールアドレスまたはパスワードが空の場合はエラー
if ($email === "" || $password === "") {
    http_response_code(400);
    echo json_encode([
        "success" => false,
        "message" => "メールアドレスとパスワードを入力してください"
    ]);
    exit;
}

try {
    // データベースからメールアドレスに一致するユーザーを検索
    $sql = " SELECT user_id, name, email, password_hash, status FROM users WHERE email = :email LIMIT 1";

    // プリペアドステートメントでSQLインジェクション対策
    $stmt = $pdo->prepare($sql);
    $stmt->bindValue(":email", $email, PDO::PARAM_STR);
    $stmt->execute();

    // 検索結果をユーザー情報として取得
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    // ユーザーが存在しない場合 → 認証失敗エラー
    if (!$user) {
        http_response_code(401);
        echo json_encode([
            "success" => false,
            "message" => "メールアドレスまたはパスワードが違います"
        ]);
        exit;
    }

    // ユーザーステータスが "active" でない場合 → アカウント無効エラー
    if ($user["status"] !== "active") {
        http_response_code(403);
        echo json_encode([
            "success" => false,
            "message" => "このアカウントは利用できません"
        ]);
        exit;
    }

    // 入力されたパスワードがデータベースに保存されたパスワードと一致するかチェック
    if ($password !== $user["password_hash"]) {
        http_response_code(401);
        echo json_encode([
            "success" => false,
            "message" => "メールアドレスまたはパスワードが違います"
        ]);
        exit;
    }

    // ログイン成功：セッション情報を設定
    $_SESSION["user_id"] = $user["user_id"];
    $_SESSION["user_name"] = $user["name"];
    $_SESSION["user_email"] = $user["email"];

    // ログイン成功レスポンスを返す
    echo json_encode([
        "success" => true,
        "message" => "ログイン成功",
        "user" => [
            "user_id" => $user["user_id"],
            "name" => $user["name"],
            "email" => $user["email"]
        ]
    ]);

} catch (PDOException $error) {
    // データベース接続やクエリ実行時のエラーをキャッチ
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => "ログイン処理に失敗しました"
    ]);
    exit;
}