<?php
// セッション開始 - ユーザーのセッション管理を初期化
session_start();

// JSONレスポンスの設定
header("Content-Type: application/json; charset=UTF-8");

// データベース接続設定を読み込む
require_once __DIR__ . "/../config/db.php";
require_once __DIR__ . "/../Admin/includes/config.php";
require_once __DIR__ . "/../Admin/services/realtime.php";

function userColumnExists(PDO $pdo, string $column): bool
{
    $stmt = $pdo->prepare("
        SELECT COUNT(*)
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'users'
          AND COLUMN_NAME = :column_name
    ");
    $stmt->execute(["column_name" => $column]);

    return (int) $stmt->fetchColumn() > 0;
}

function notifyUserActiveUpdated(int $userId): void
{
    $result = sendRealtimeEvent("admin:global", "user_active_updated", [
        "user_id" => $userId,
    ]);

    if (!$result["ok"]) {
        error_log(
            "Realtime user_active_updated failed for user_id "
            . $userId
            . ": HTTP "
            . $result["http_code"]
            . " "
            . $result["curl_error"]
        );
    }
}

function updateLoginActivity(PDO $pdo, int $userId): bool
{
    $sets = [];
    if (userColumnExists($pdo, "last_login_at")) {
        $sets[] = "last_login_at = :now";
    }
    if (userColumnExists($pdo, "last_active_at")) {
        $sets[] = "last_active_at = :now";
    }

    if (!$sets) {
        return false;
    }

    $now = (new DateTimeImmutable("now", new DateTimeZone("Asia/Tokyo")))->format("Y-m-d H:i:s");
    $stmt = $pdo->prepare("UPDATE users SET " . implode(", ", $sets) . " WHERE user_id = :user_id");
    $stmt->execute([
        "now" => $now,
        "user_id" => $userId,
    ]);

    return $stmt->rowCount() > 0;
}

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
    if (updateLoginActivity($pdo, (int) $user["user_id"])) {
        notifyUserActiveUpdated((int) $user["user_id"]);
    }

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
    if (function_exists("logSystemError")) {
        logSystemError("auth", "error", "ログイン処理に失敗しました", [
            "error" => $error->getMessage(),
            "email" => $email !== "" ? "provided" : "empty",
        ], null, $_SERVER["REQUEST_URI"] ?? null);
    }

    // データベース接続やクエリ実行時のエラーをキャッチ
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => "ログイン処理に失敗しました"
    ]);
    exit;
}
