<?php
session_start();
header("Content-Type: application/json; charset=UTF-8");

require_once __DIR__ . "/../config/db.php";
require_once __DIR__ . "/emailChangeMailer.php";

const EMAIL_CHANGE_COOLDOWN_SECONDS = 60;
const EMAIL_CHANGE_EXPIRES_MINUTES = 10;

function respond(array $payload, int $status = 200): void
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function emailChangeTableExists(PDO $pdo): bool
{
    $stmt = $pdo->prepare("SHOW TABLES LIKE 'email_change_verifications'");
    $stmt->execute();
    return (bool) $stmt->fetch();
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
    if (!emailChangeTableExists($pdo)) {
        respond(["success" => false, "message" => "メールアドレス変更用テーブルがありません。管理者へ連絡してください。"], 500);
    }

    $stmt = $pdo->prepare("SELECT user_id, name, email FROM users WHERE user_id = :user_id LIMIT 1");
    $stmt->bindValue(":user_id", $userId, PDO::PARAM_INT);
    $stmt->execute();
    $currentUser = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$currentUser) {
        respond(["success" => false, "message" => "ユーザーが見つかりません。"], 404);
    }

    if (strcasecmp($newEmail, (string) $currentUser["email"]) === 0) {
        respond(["success" => false, "message" => "現在のメールアドレスとは別のメールアドレスを入力してください。"], 400);
    }

    $stmt = $pdo->prepare("SELECT user_id FROM users WHERE email = :email AND user_id <> :user_id LIMIT 1");
    $stmt->bindValue(":email", $newEmail);
    $stmt->bindValue(":user_id", $userId, PDO::PARAM_INT);
    $stmt->execute();
    if ($stmt->fetch()) {
        respond(["success" => false, "message" => "このメールアドレスは既に使用されています。"], 409);
    }

    $stmt = $pdo->prepare("
        SELECT resend_available_at
        FROM email_change_verifications
        WHERE user_id = :user_id
          AND used_at IS NULL
          AND invalidated_at IS NULL
        ORDER BY id DESC
        LIMIT 1
    ");
    $stmt->bindValue(":user_id", $userId, PDO::PARAM_INT);
    $stmt->execute();
    $latest = $stmt->fetch(PDO::FETCH_ASSOC);
    $now = emailChangeNow();

    if ($latest) {
        $resendAt = new DateTimeImmutable($latest["resend_available_at"], new DateTimeZone("Asia/Tokyo"));

        if ($resendAt->getTimestamp() > $now->getTimestamp()) {
            respond([
                "success" => false,
                "message" => "認証コードは短時間に連続送信できません。少し待ってから再送信してください。",
                "resendAvailableAt" => $resendAt->format(DateTimeInterface::ATOM),
            ], 429);
        }
    }

    $code = (string) random_int(100000, 999999);
    $nowText = $now->format("Y-m-d H:i:s");
    $expiresAt = $now->modify("+" . EMAIL_CHANGE_EXPIRES_MINUTES . " minutes");
    $resendAvailableAt = $now->modify("+" . EMAIL_CHANGE_COOLDOWN_SECONDS . " seconds");

    $pdo->beginTransaction();

    // 新しい認証コードを発行したら、古い未使用コードは invalidated_at で無効化します。
    $stmt = $pdo->prepare("
        UPDATE email_change_verifications
        SET invalidated_at = :invalidated_at
        WHERE user_id = :user_id
          AND used_at IS NULL
          AND invalidated_at IS NULL
    ");
    $stmt->execute([
        "invalidated_at" => $nowText,
        "user_id" => $userId,
    ]);

    $stmt = $pdo->prepare("
        INSERT INTO email_change_verifications
            (user_id, old_email, new_email, verification_code, expires_at, attempt_count, resend_available_at, created_at, updated_at)
        VALUES
            (:user_id, :old_email, :new_email, :verification_code, :expires_at, 0, :resend_available_at, :created_at, :updated_at)
    ");
    $stmt->bindValue(":user_id", $userId, PDO::PARAM_INT);
    $stmt->bindValue(":old_email", (string) $currentUser["email"]);
    $stmt->bindValue(":new_email", $newEmail);
    $stmt->bindValue(":verification_code", $code);
    $stmt->bindValue(":expires_at", $expiresAt->format("Y-m-d H:i:s"));
    $stmt->bindValue(":created_at", $nowText);
    $stmt->bindValue(":updated_at", $nowText);
    $stmt->bindValue(":resend_available_at", $resendAvailableAt->format("Y-m-d H:i:s"));
    $stmt->execute();

    // DBに認証情報を保存したあと、GASへメール送信を依頼します。コードはレスポンスには含めません。
    sendEmailChangeMail([
        "action" => "email_change_verification",
        "to" => $newEmail,
        "userName" => $currentUser["name"] ?? "ユーザー",
        "verificationCode" => $code,
        "expiresMinutes" => EMAIL_CHANGE_EXPIRES_MINUTES,
    ]);

    $pdo->commit();

    respond([
        "success" => true,
        "message" => "認証コードを新しいメールアドレスへ送信しました。",
        "expiresAt" => $expiresAt->format(DateTimeInterface::ATOM),
        "resendAvailableAt" => $resendAvailableAt->format(DateTimeInterface::ATOM),
        "maskedEmail" => maskEmailForDisplay($newEmail),
    ]);
} catch (Throwable $error) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    respond(["success" => false, "message" => "認証コードの送信に失敗しました。"], 500);
}
