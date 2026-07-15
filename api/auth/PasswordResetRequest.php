<?php
session_start();
header("Content-Type: application/json; charset=UTF-8");

require_once __DIR__ . "/../config/db.php";
require_once __DIR__ . "/../Admin/includes/config.php";
require_once __DIR__ . "/../Admin/services/realtime.php";

const PASSWORD_RESET_SUCCESS_MESSAGE = "入力されたメールアドレスが登録されている場合、パスワード再設定メールを送信しました。";
const PASSWORD_RESET_COOLDOWN_SECONDS = 60;

function respond(array $payload, int $status = 200): void
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function currentDateTime(): DateTimeImmutable
{
    return new DateTimeImmutable("now", new DateTimeZone("Asia/Tokyo"));
}

function postJsonToGas(string $url, array $payload): array
{
    $json = json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

    if (function_exists("curl_init")) {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST => true,
            CURLOPT_HTTPHEADER => ["Content-Type: application/json"],
            CURLOPT_POSTFIELDS => $json,
            CURLOPT_TIMEOUT => 15,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_MAXREDIRS => 5,
        ]);

        $body = curl_exec($ch);
        $error = curl_error($ch);
        $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($body === false) {
            throw new RuntimeException("GASへの送信に失敗しました。HTTP {$status} {$error}");
        }

        if ($error !== "") {
            throw new RuntimeException("GASへの送信に失敗しました。HTTP {$status} {$error}");
        }

        return ["status" => $status, "body" => $body];
    }

    $context = stream_context_create([
        "http" => [
            "method" => "POST",
            "header" => "Content-Type: application/json\r\n",
            "content" => $json,
            "timeout" => 15,
            "ignore_errors" => true,
        ],
    ]);
    $body = file_get_contents($url, false, $context);
    $status = 0;

    if (isset($http_response_header[0]) && preg_match("/\s(\d{3})\s/", $http_response_header[0], $matches)) {
        $status = (int) $matches[1];
    }

    if ($body === false) {
        throw new RuntimeException("GASへの送信に失敗しました。HTTP {$status}");
    }

    return ["status" => $status, "body" => $body];
}

function buildResetUrl(string $resetToken): string
{
    $configuredBaseUrl = rtrim((string) app_config("APP_BASE_URL", ""), "/");

    if ($configuredBaseUrl === "") {
        $isHttps = (!empty($_SERVER["HTTPS"]) && $_SERVER["HTTPS"] !== "off")
            || (($_SERVER["HTTP_X_FORWARDED_PROTO"] ?? "") === "https");
        $scheme = $isHttps ? "https" : "http";
        $host = $_SERVER["HTTP_HOST"] ?? "genshin.mond.jp";
        $configuredBaseUrl = "{$scheme}://{$host}/TABI";
    }

    return $configuredBaseUrl . "/ResetPassword?token=" . rawurlencode($resetToken);
}

function sendPasswordResetMail(string $email, string $userName, string $resetUrl): void
{
    $gasUrl = app_config("GAS_PASSWORD_RESET_URL", app_config("GAS_INQUIRY_REPLY_URL", ""));
    $gasToken = app_config(
        "GAS_PASSWORD_RESET_TOKEN",
        app_config("GAS_SHARED_TOKEN", app_config("GAS_INQUIRY_REPLY_TOKEN", ""))
    );

    if ($gasUrl === "") {
        throw new RuntimeException("GASのURLが設定されていません。");
    }

    // 認証用トークンはPHPからGASへ直接送る。フロントエンドへ返さないことでNetworkタブに出ないようにする。
    $response = postJsonToGas($gasUrl, [
        "action" => "password_reset",
        "token" => $gasToken,
        "to" => $email,
        "userName" => $userName,
        "resetUrl" => $resetUrl,
    ]);
    $decoded = json_decode($response["body"], true);

    if ($response["status"] < 200 || $response["status"] >= 300) {
        throw new RuntimeException("GASがメール送信を受け付けませんでした。HTTP " . $response["status"]);
    }

    if (!is_array($decoded)) {
        throw new RuntimeException("GASの応答をJSONとして読み取れませんでした。response=" . mb_substr((string) $response["body"], 0, 300));
    }

    if (($decoded["ok"] ?? false) !== true) {
        throw new RuntimeException("GAS側でメール送信に失敗しました: " . (string) ($decoded["message"] ?? "unknown"));
    }
}

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    respond(["success" => false, "message" => "POSTで送信してください。"], 405);
}

// JSONで送られたメールアドレスを受け取る。空のJSONでも落ちないよう配列にして扱う。
$input = json_decode(file_get_contents("php://input"), true) ?: [];
$email = trim((string) ($input["email"] ?? ""));

if ($email === "") {
    respond(["success" => false, "message" => "登録メールアドレスを入力してください。"], 400);
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    respond(["success" => false, "message" => "メールアドレスの形式を確認してください。"], 400);
}

try {
    $stmt = $pdo->prepare("
        SELECT user_id, name, email
        FROM users
        WHERE email = :email
        LIMIT 1
    ");
    $stmt->bindValue(":email", $email, PDO::PARAM_STR);
    $stmt->execute();
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user) {
        // 登録状況を外部から判別できないよう、未登録メールでも成功時と同じ文言だけ返す。
        respond(["success" => true, "message" => PASSWORD_RESET_SUCCESS_MESSAGE]);
    }

    $stmt = $pdo->prepare("
        SELECT created_at
        FROM password_reset_tokens
        WHERE user_id = :user_id
          AND used_at IS NULL
        ORDER BY created_at DESC
        LIMIT 1
    ");
    $stmt->bindValue(":user_id", (int) $user["user_id"], PDO::PARAM_INT);
    $stmt->execute();
    $latestToken = $stmt->fetch(PDO::FETCH_ASSOC);
    $now = currentDateTime();

    if ($latestToken) {
        $latestCreatedAt = new DateTimeImmutable($latestToken["created_at"], new DateTimeZone("Asia/Tokyo"));

        if ($latestCreatedAt->getTimestamp() > $now->getTimestamp() - PASSWORD_RESET_COOLDOWN_SECONDS) {
            respond(["success" => false, "message" => "短時間に連続して送信できません。少し待ってから再度お試しください。"], 429);
        }
    }

    $resetToken = bin2hex(random_bytes(32));
    $nowText = $now->format("Y-m-d H:i:s");
    $expiresAt = $now->modify("+1 hour")->format("Y-m-d H:i:s");
    $resetUrl = buildResetUrl($resetToken);

    $pdo->beginTransaction();

    // 新しいメールを発行したら、同じユーザーの古い未使用トークンは使えないようにする。
    $stmt = $pdo->prepare("
        UPDATE password_reset_tokens
        SET used_at = :used_at
        WHERE user_id = :user_id
          AND used_at IS NULL
    ");
    $stmt->execute([
        "used_at" => $nowText,
        "user_id" => (int) $user["user_id"],
    ]);

    // 今回の開発方針では、トークンはハッシュ化せずそのまま保存する。
    $stmt = $pdo->prepare("
        INSERT INTO password_reset_tokens
            (user_id, reset_token, expires_at, created_at)
        VALUES
            (:user_id, :reset_token, :expires_at, :created_at)
    ");
    $stmt->execute([
        "user_id" => (int) $user["user_id"],
        "reset_token" => $resetToken,
        "expires_at" => $expiresAt,
        "created_at" => $nowText,
    ]);

    sendPasswordResetMail($user["email"], $user["name"] ?? "ユーザー", $resetUrl);

    $pdo->commit();

    respond(["success" => true, "message" => PASSWORD_RESET_SUCCESS_MESSAGE]);
} catch (Throwable $error) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }

    error_log("Password reset request failed: " . $error->getMessage());
    if (function_exists("logSystemError")) {
        logSystemError("auth", "error", "パスワード再設定メールの送信に失敗しました", [
            "error_type" => "PASSWORD_RESET_MAIL_FAILED",
            "error_code" => "PASSWORD_RESET_MAIL_FAILED",
            "reason" => $error->getMessage(),
            "email" => $email !== "" ? "provided" : "empty",
            "request_url" => $_SERVER["REQUEST_URI"] ?? "",
            "fingerprint" => hash("sha256", "password_reset_mail|" . $email . "|" . $error->getMessage()),
        ], isset($user["user_id"]) ? (int) $user["user_id"] : null, $_SERVER["REQUEST_URI"] ?? null);
    }
    respond(["success" => false, "message" => "メール送信の受付に失敗しました。時間をおいて再度お試しください。"], 500);
}
