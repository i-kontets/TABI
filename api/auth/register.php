<?php
// 新規登録
// セッション開始
session_start();

header("Content-Type: application/json; charset=UTF-8");

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

$input = json_decode(file_get_contents("php://input"), true);

// 入力値の抽出とデフォルト値の設定
$name = $input["name"] ?? "";
$email = $input["email"] ?? "";
$password = $input["password"] ?? "";
$languageCode = $input["language_code"] ?? "ja";

// 入力値の必須チェック：名前、メールアドレス、パスワードが空の場合はエラー
if ($name === "" || $email === "" || $password === "") {
    http_response_code(400);

    echo json_encode([
        "success" => false,
        "message" => "名前、メールアドレス、パスワードを入力してください"
    ]);

    exit;
}

try {
    $checkSql = " SELECT user_id FROM users WHERE email = :email LIMIT 1";

    $checkStmt = $pdo->prepare($checkSql);
    $checkStmt->bindValue(":email", $email, PDO::PARAM_STR);
    $checkStmt->execute();

    $existingUser = $checkStmt->fetch(PDO::FETCH_ASSOC);

    if ($existingUser) {
        http_response_code(409);

        echo json_encode([
            "success" => false,
            "message" => "このメールアドレスはすでに登録されています"
        ]);

        exit;
    }

    // 今は開発中なので平文保存。
    // 本番前には password_hash($password, PASSWORD_DEFAULT) に戻す。
    $passwordHash = $password;

    $insertSql = "
        INSERT INTO users (
            name, email, password_hash, language_code,
            status, created_at, updated_at
        ) VALUES (
            :name, :email, :password_hash,
            :language_code, 'active', NOW(), NOW()
        )
    ";

    $insertStmt = $pdo->prepare($insertSql);
    $insertStmt->bindValue(":name", $name, PDO::PARAM_STR);
    $insertStmt->bindValue(":email", $email, PDO::PARAM_STR);
    $insertStmt->bindValue(":password_hash", $passwordHash, PDO::PARAM_STR);
    $insertStmt->bindValue(":language_code", $languageCode, PDO::PARAM_STR);
    $insertStmt->execute();

    $userId = $pdo->lastInsertId();

    $_SESSION["user_id"] = $userId;
    $_SESSION["user_name"] = $name;
    $_SESSION["user_email"] = $email;

    echo json_encode([
        "success" => true,
        "message" => "新規登録が完了しました",
        "user" => [
            "user_id" => $userId,
            "name" => $name,
            "email" => $email
        ]
    ]);

    exit;

} catch (PDOException $error) {
    http_response_code(500);

    echo json_encode([
        "success" => false,
        "message" => "新規登録処理に失敗しました"
    ]);

    exit;
}
?>
