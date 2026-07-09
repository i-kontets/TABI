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

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    respond(["success" => false, "message" => "POSTで送信してください。"], 405);
}
if (!isset($_SESSION["user_id"])) {
    respond(["success" => false, "message" => "ログインが必要です。"], 401);
}

$input = json_decode(file_get_contents("php://input"), true) ?: [];
$newEmail = trim((string) ($input["new_email"] ?? ""));
$code = trim((string) ($input["code"] ?? ""));
if (!filter_var($newEmail, FILTER_VALIDATE_EMAIL) || $code === "") {
    respond(["success" => false, "message" => "メールアドレスと認証コードを確認してください。"], 400);
}

$userId = (int) $_SESSION["user_id"];

try {
    $stmt = $pdo->prepare("
        SELECT id, code_hash, expires_at
        FROM email_change_verifications
        WHERE user_id = :user_id
          AND new_email = :new_email
          AND used_at IS NULL
        ORDER BY created_at DESC
        LIMIT 1
    ");
    $stmt->bindValue(":user_id", $userId, PDO::PARAM_INT);
    $stmt->bindValue(":new_email", $newEmail);
    $stmt->execute();
    $verification = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$verification) {
        respond(["success" => false, "message" => "有効な認証コードが見つかりません。"], 400);
    }
    if (strtotime($verification["expires_at"]) < time()) {
        respond(["success" => false, "message" => "認証コードの有効期限が切れています。"], 400);
    }
    if (!password_verify($code, $verification["code_hash"])) {
        respond(["success" => false, "message" => "認証コードが正しくありません。"], 400);
    }

    $pdo->beginTransaction();
    $now = (new DateTimeImmutable("now"))->format("Y-m-d H:i:s");

    $stmt = $pdo->prepare("UPDATE users SET email = :email, updated_at = :updated_at WHERE user_id = :user_id");
    $stmt->bindValue(":email", $newEmail);
    $stmt->bindValue(":updated_at", $now);
    $stmt->bindValue(":user_id", $userId, PDO::PARAM_INT);
    $stmt->execute();

    $stmt = $pdo->prepare("UPDATE email_change_verifications SET used_at = :used_at WHERE id = :id");
    $stmt->bindValue(":used_at", $now);
    $stmt->bindValue(":id", (int) $verification["id"], PDO::PARAM_INT);
    $stmt->execute();

    $pdo->commit();

    respond(["success" => true, "message" => "メールアドレスを変更しました。", "user" => ["email" => $newEmail]]);
} catch (Throwable $error) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    respond(["success" => false, "message" => "メールアドレスの変更に失敗しました。"], 500);
}
