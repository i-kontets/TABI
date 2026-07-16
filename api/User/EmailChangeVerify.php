<?php
session_start();
header("Content-Type: application/json; charset=UTF-8");

require_once __DIR__ . "/../config/db.php";
require_once __DIR__ . "/emailChangeMailer.php";

const EMAIL_CHANGE_MAX_FAILED_ATTEMPTS = 5;

function respond(array $payload, int $status = 200): void
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function emailChangeVerifyTableExists(PDO $pdo): bool
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
$code = preg_replace("/\D/", "", (string) ($input["code"] ?? ""));
if (!filter_var($newEmail, FILTER_VALIDATE_EMAIL) || !preg_match("/^\d{6}$/", $code)) {
    respond(["success" => false, "message" => "メールアドレスと認証コードを確認してください。"], 400);
}

$userId = (int) $_SESSION["user_id"];

try {
    if (!emailChangeVerifyTableExists($pdo)) {
        respond(["success" => false, "message" => "メールアドレス変更用テーブルがありません。管理者へ連絡してください。"], 500);
    }

    $userStmt = $pdo->prepare("SELECT user_id, name, email FROM users WHERE user_id = :user_id LIMIT 1");
    $userStmt->bindValue(":user_id", $userId, PDO::PARAM_INT);
    $userStmt->execute();
    $currentUser = $userStmt->fetch(PDO::FETCH_ASSOC);
    if (!$currentUser) {
        respond(["success" => false, "message" => "ユーザーが見つかりません。"], 404);
    }

    if (strcasecmp($newEmail, (string) $currentUser["email"]) === 0) {
        respond(["success" => false, "message" => "現在のメールアドレスとは別のメールアドレスを入力してください。"], 400);
    }

    $duplicateStmt = $pdo->prepare("SELECT user_id FROM users WHERE email = :email AND user_id <> :user_id LIMIT 1");
    $duplicateStmt->bindValue(":email", $newEmail);
    $duplicateStmt->bindValue(":user_id", $userId, PDO::PARAM_INT);
    $duplicateStmt->execute();
    if ($duplicateStmt->fetch()) {
        respond(["success" => false, "message" => "このメールアドレスは既に使用されています。"], 409);
    }

    $stmt = $pdo->prepare("
        SELECT id, old_email, new_email, verification_code, expires_at, attempt_count
        FROM email_change_verifications
        WHERE user_id = :user_id
          AND new_email = :new_email
          AND used_at IS NULL
          AND invalidated_at IS NULL
          AND expires_at >= NOW()
        ORDER BY id DESC
        LIMIT 1
    ");
    $stmt->bindValue(":user_id", $userId, PDO::PARAM_INT);
    $stmt->bindValue(":new_email", $newEmail);
    $stmt->execute();
    $verification = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$verification) {
        respond(["success" => false, "message" => "有効な認証コードが見つかりません。"], 400);
    }
    if ((int) ($verification["attempt_count"] ?? 0) >= EMAIL_CHANGE_MAX_FAILED_ATTEMPTS) {
        respond(["success" => false, "message" => "入力回数の上限を超えました。認証コードを再送信してください。"], 429);
    }
    if (!hash_equals((string) $verification["verification_code"], $code)) {
        // 認証コードを間違えた回数を attempt_count に残し、5回目で invalidated_at を入れて無効化します。
        $nextAttempts = (int) ($verification["attempt_count"] ?? 0) + 1;
        $updateSql = "
            UPDATE email_change_verifications
            SET attempt_count = :attempt_count,
                updated_at = :updated_at
        ";
        if ($nextAttempts >= EMAIL_CHANGE_MAX_FAILED_ATTEMPTS) {
            $updateSql .= ", invalidated_at = :invalidated_at";
        }
        $updateSql .= " WHERE id = :id";
        $updateStmt = $pdo->prepare($updateSql);
        $nowText = emailChangeNow()->format("Y-m-d H:i:s");
        $updateStmt->bindValue(":attempt_count", $nextAttempts, PDO::PARAM_INT);
        $updateStmt->bindValue(":updated_at", $nowText);
        if ($nextAttempts >= EMAIL_CHANGE_MAX_FAILED_ATTEMPTS) {
            $updateStmt->bindValue(":invalidated_at", $nowText);
        }
        $updateStmt->bindValue(":id", (int) $verification["id"], PDO::PARAM_INT);
        $updateStmt->execute();

        if ($nextAttempts >= EMAIL_CHANGE_MAX_FAILED_ATTEMPTS) {
            respond(["success" => false, "message" => "入力回数の上限を超えました。認証コードを再送信してください。"], 429);
        }
        respond(["success" => false, "message" => "認証コードが正しくありません。"], 400);
    }

    $pdo->beginTransaction();
    $now = emailChangeNow();
    $nowText = $now->format("Y-m-d H:i:s");
    $oldEmail = (string) $verification["old_email"];
    $verifiedNewEmail = (string) $verification["new_email"];

    $stmt = $pdo->prepare("UPDATE users SET email = :email, updated_at = :updated_at WHERE user_id = :user_id");
    $stmt->bindValue(":email", $verifiedNewEmail);
    $stmt->bindValue(":updated_at", $nowText);
    $stmt->bindValue(":user_id", $userId, PDO::PARAM_INT);
    $stmt->execute();

    $stmt = $pdo->prepare("UPDATE email_change_verifications SET used_at = :used_at WHERE id = :id");
    $stmt->bindValue(":used_at", $nowText);
    $stmt->bindValue(":id", (int) $verification["id"], PDO::PARAM_INT);
    $stmt->execute();

    // 変更前メールアドレスへ通知を送ります。認証コードは送らず、変更事実だけを知らせます。
    sendEmailChangeMail([
        "action" => "email_change_completed",
        "to" => $oldEmail,
        "userName" => $currentUser["name"] ?? "ユーザー",
        "newMaskedEmail" => maskEmailForDisplay($verifiedNewEmail),
        "changedAt" => $now->format("Y/m/d H:i"),
    ]);

    $pdo->commit();

    respond([
        "success" => true,
        "message" => "メールアドレスを変更しました。",
        "user" => ["email" => $verifiedNewEmail],
        "changedAt" => $now->format("Y/m/d H:i"),
    ]);
} catch (Throwable $error) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    respond(["success" => false, "message" => "メールアドレスの変更に失敗しました。"], 500);
}
