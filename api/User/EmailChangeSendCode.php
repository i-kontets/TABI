<?php
session_start();
header("Content-Type: application/json; charset=UTF-8");

require_once __DIR__ . "/../config/db.php";

function respond(array $payload, int $status = 200): void
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function sendSmsVerificationCode(string $phoneNumber, string $code): bool
{
    // SMS送信サービス接続後に実装する。認証コードはレスポンスへ返却しない。
    return false;
}

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    respond(["success" => false, "message" => "POSTで送信してください。"], 405);
}

if (!isset($_SESSION["user_id"])) {
    respond(["success" => false, "message" => "ログインが必要です。"], 401);
}

$input = json_decode(file_get_contents("php://input"), true) ?: [];
$newEmail = trim((string) ($input["new_email"] ?? ""));

if (!filter_var($newEmail, FILTER_VALIDATE_EMAIL)) {
    respond(["success" => false, "message" => "メールアドレスの形式を確認してください。"], 400);
}

$userId = (int) $_SESSION["user_id"];

try {
    $stmt = $pdo->prepare("SELECT user_id FROM users WHERE email = :email AND user_id <> :user_id LIMIT 1");
    $stmt->bindValue(":email", $newEmail);
    $stmt->bindValue(":user_id", $userId, PDO::PARAM_INT);
    $stmt->execute();
    if ($stmt->fetch()) {
        respond(["success" => false, "message" => "このメールアドレスは既に使用されています。"], 409);
    }

    $stmt = $pdo->prepare("SHOW COLUMNS FROM users LIKE 'phone_number'");
    $stmt->execute();
    if (!$stmt->fetch()) {
        respond([
            "success" => false,
            "message" => "LAA1658851-web.sqlの現行usersテーブルにphone_numberカラムがないため、SMS認証コードを送信できません。"
        ], 400);
    }

    $stmt = $pdo->prepare("SELECT phone_number FROM users WHERE user_id = :user_id LIMIT 1");
    $stmt->bindValue(":user_id", $userId, PDO::PARAM_INT);
    $stmt->execute();
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    $phoneNumber = trim((string) ($user["phone_number"] ?? ""));

    if ($phoneNumber === "") {
        respond(["success" => false, "message" => "登録済み電話番号がありません。"], 400);
    }

    $stmt = $pdo->prepare("SHOW TABLES LIKE 'email_change_verifications'");
    $stmt->execute();
    if (!$stmt->fetch()) {
        respond(["success" => false, "message" => "email_change_verificationsテーブルがありません。"], 500);
    }

    $stmt = $pdo->prepare("
        SELECT created_at
        FROM email_change_verifications
        WHERE user_id = :user_id
          AND used_at IS NULL
        ORDER BY created_at DESC
        LIMIT 1
    ");
    $stmt->bindValue(":user_id", $userId, PDO::PARAM_INT);
    $stmt->execute();
    $latest = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($latest && strtotime($latest["created_at"]) > time() - 60) {
        respond(["success" => false, "message" => "認証コードは短時間に連続送信できません。少し待ってから再送信してください。"], 429);
    }

    $code = (string) random_int(100000, 999999);
    if (!sendSmsVerificationCode($phoneNumber, $code)) {
        respond(["success" => false, "message" => "SMS送信処理が未接続です。"], 500);
    }

    $stmt = $pdo->prepare("
        INSERT INTO email_change_verifications
            (user_id, new_email, phone_number, code_hash, expires_at, created_at)
        VALUES
            (:user_id, :new_email, :phone_number, :code_hash, :expires_at, :created_at)
    ");
    $stmt->bindValue(":user_id", $userId, PDO::PARAM_INT);
    $stmt->bindValue(":new_email", $newEmail);
    $stmt->bindValue(":phone_number", $phoneNumber);
    $stmt->bindValue(":code_hash", password_hash($code, PASSWORD_DEFAULT));
    $stmt->bindValue(":expires_at", (new DateTimeImmutable("+10 minutes"))->format("Y-m-d H:i:s"));
    $stmt->bindValue(":created_at", (new DateTimeImmutable("now"))->format("Y-m-d H:i:s"));
    $stmt->execute();

    respond(["success" => true, "message" => "登録済み電話番号へ認証コードを送信しました。"]);
} catch (Throwable $error) {
    respond(["success" => false, "message" => "認証コードの送信に失敗しました。"], 500);
}
