<?php

/**
 * 認証やアカウント登録、パスワード再設定に関係する API です。
 *
 * 主な流れ:
 * 1. リクエストやセッションなど、処理に必要な情報を読み取る
 * 2. 入力値や権限を確認し、必要に応じてデータベースへ問い合わせる
 * 3. 処理結果を JSON などの形でフロントエンドへ返す
 *
 * 扱うデータ: アプリの設定値や、他のファイルから受け取る値を主に扱います。
 */

// セッションを開始し、ログイン中のユーザー情報をサーバー側で使えるようにします。
session_start();
// フロントエンドへ返すデータ形式や通信ルールを、HTTP ヘッダーとして伝えます。
header("Content-Type: application/json; charset=UTF-8");

// 共通設定や別ファイルの関数を読み込み、この API から使えるようにします。
require_once __DIR__ . "/../config/db.php";
// 共通設定や別ファイルの関数を読み込み、この API から使えるようにします。
require_once __DIR__ . "/../Admin/includes/config.php";
// 共通設定や別ファイルの関数を読み込み、この API から使えるようにします。
require_once __DIR__ . "/../Admin/services/realtime.php";

const PASSWORD_RESET_SUCCESS_MESSAGE = "入力されたメールアドレスが登録されている場合、パスワード再設定メールを送信しました。";
const PASSWORD_RESET_COOLDOWN_SECONDS = 60;

/**
 * passwordResetLog は、この API 内で何度も使う処理をまとめた関数です。
 * 引数として受け取った値をもとに、確認・取得・更新などの結果を返します。
 */
function passwordResetLog(string $message): void
{
    error_log("[PasswordResetRequest] " . $message);
}

/**
 * respond は、この API 内で何度も使う処理をまとめた関数です。
 * 引数として受け取った値をもとに、確認・取得・更新などの結果を返します。
 */
function respond(array $payload, int $status = 200): void
{
    http_response_code($status);
    // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

/**
 * currentDateTime は、この API 内で何度も使う処理をまとめた関数です。
 * 引数として受け取った値をもとに、確認・取得・更新などの結果を返します。
 */
function currentDateTime(): DateTimeImmutable
{
    return new DateTimeImmutable("now", new DateTimeZone("Asia/Tokyo"));
}

/**
 * logPasswordResetDatabaseDiagnostics は、この API 内で何度も使う処理をまとめた関数です。
 * 引数として受け取った値をもとに、確認・取得・更新などの結果を返します。
 */
function logPasswordResetDatabaseDiagnostics(PDO $pdo): void
{
    // データベース処理などでエラーが起きる可能性があるため、例外を受け取れる形で実行します。
    try {
        $dbInfo = $pdo->query(
            "SELECT DATABASE() AS database_name, @@hostname AS database_host"
        )->fetch(PDO::FETCH_ASSOC) ?: [];

        $tableStmt = $pdo->query("SHOW TABLES LIKE 'password_reset_tokens'");
        $tableExists = $tableStmt && $tableStmt->fetchColumn() !== false;

        // PHPがどのDBへ接続しているか確認するため、DB名・DBサーバー名・接続先種別だけをログへ記録する。
        // DBパスワード、GAS認証値、ユーザーのパスワード、再設定トークンはログへ出力しない。
        passwordResetLog(
            "database="
            . ($dbInfo["database_name"] ?? "unknown")
            . ", host="
            . ($dbInfo["database_host"] ?? "unknown")
            . ", app_env="
            . (function_exists("app_config") ? app_config("APP_ENV", "unknown") : "unknown")
            . ", password_reset_tokens="
            . ($tableExists ? "exists" : "missing")
        );

        // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
        if ($tableExists) {
            $columns = $pdo->query("DESCRIBE password_reset_tokens")->fetchAll(PDO::FETCH_COLUMN);
            passwordResetLog("password_reset_tokens columns=" . implode(",", $columns));
        }
    // エラーが起きた場合は、詳細をログに残し、利用者には安全なメッセージを返します。
    } catch (Throwable $diagnosticError) {
        // 診断ログの失敗で本来の処理を止めない。原因調査用に、診断自体の失敗だけを残す。
        passwordResetLog(
            "database diagnostics failed: "
            . get_class($diagnosticError)
            . ": "
            . $diagnosticError->getMessage()
        );
    }
}

/**
 * postJsonToGas は、この API 内で何度も使う処理をまとめた関数です。
 * 引数として受け取った値をもとに、確認・取得・更新などの結果を返します。
 */
function postJsonToGas(string $url, array $payload): array
{
    // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
    $json = json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

    // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
    if ($json === false) {
        throw new RuntimeException("GAS送信用JSONの作成に失敗しました: " . json_last_error_msg());
    }

    // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
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

        // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
        if ($body === false) {
            throw new RuntimeException("GASへの送信に失敗しました。HTTP {$status} {$error}");
        }

        // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
        if ($error !== "") {
            throw new RuntimeException("GASへの送信に失敗しました。HTTP {$status} {$error}");
        }

        // GASのHTTPステータスだけをログに残す。本文には認証情報が含まれる可能性があるため、ここでは出力しない。
        passwordResetLog("[GAS] HTTP status={$status}");

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

    // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
    if (isset($http_response_header[0]) && preg_match("/\s(\d{3})\s/", $http_response_header[0], $matches)) {
        $status = (int) $matches[1];
    }

    // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
    if ($body === false) {
        throw new RuntimeException("GASへの送信に失敗しました。HTTP {$status}");
    }

    passwordResetLog("[GAS] HTTP status={$status}");

    return ["status" => $status, "body" => $body];
}

/**
 * buildResetUrl は、この API 内で何度も使う処理をまとめた関数です。
 * 引数として受け取った値をもとに、確認・取得・更新などの結果を返します。
 */
function buildResetUrl(string $resetToken): string
{
    $configuredBaseUrl = rtrim((string) app_config("APP_BASE_URL", ""), "/");

    // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
    if ($configuredBaseUrl === "") {
        $isHttps = (!empty($_SERVER["HTTPS"]) && $_SERVER["HTTPS"] !== "off")
            || (($_SERVER["HTTP_X_FORWARDED_PROTO"] ?? "") === "https");
        $scheme = $isHttps ? "https" : "http";
        $host = $_SERVER["HTTP_HOST"] ?? "genshin.mond.jp";
        $configuredBaseUrl = "{$scheme}://{$host}/TABI";
    }

    return $configuredBaseUrl . "/ResetPassword?token=" . rawurlencode($resetToken);
}

/**
 * sendPasswordResetMail は、この API 内で何度も使う処理をまとめた関数です。
 * 引数として受け取った値をもとに、確認・取得・更新などの結果を返します。
 */
function sendPasswordResetMail(string $email, string $userName, string $resetUrl): void
{
    $gasUrl = app_config("GAS_PASSWORD_RESET_URL", app_config("GAS_INQUIRY_REPLY_URL", ""));
    $gasToken = app_config(
        "GAS_PASSWORD_RESET_TOKEN",
        app_config("GAS_SHARED_TOKEN", app_config("GAS_INQUIRY_REPLY_TOKEN", ""))
    );

    // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
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
    // フロントエンドから送られた JSON 文字列を、PHP で扱える配列に変換します。
    $decoded = json_decode($response["body"], true);

    // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
    if ($response["status"] < 200 || $response["status"] >= 300) {
        throw new RuntimeException("GASがメール送信を受け付けませんでした。HTTP " . $response["status"]);
    }

    // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
    if (!is_array($decoded)) {
        throw new RuntimeException("GASの応答をJSONとして読み取れませんでした。response=" . mb_substr((string) $response["body"], 0, 300));
    }

    // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
    if (($decoded["ok"] ?? false) !== true) {
        throw new RuntimeException("GAS側でメール送信に失敗しました: " . (string) ($decoded["message"] ?? "unknown"));
    }
}

// ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
    respond(["success" => false, "message" => "POSTで送信してください。"], 405);
}

// JSONで送られたメールアドレスを受け取る。空のJSONでも落ちないよう配列にして扱う。
$rawBody = file_get_contents("php://input");
// フロントエンドから送られた JSON 文字列を、PHP で扱える配列に変換します。
$input = json_decode($rawBody ?: "{}", true);

// ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
if (!is_array($input)) {
    // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
    respond(["success" => false, "message" => "送信内容を確認してください。"], 400);
}

$email = trim((string) ($input["email"] ?? ""));

// ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
if ($email === "") {
    // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
    respond(["success" => false, "message" => "登録メールアドレスを入力してください。"], 400);
}

// ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
    respond(["success" => false, "message" => "メールアドレスの形式を確認してください。"], 400);
}

// データベース処理などでエラーが起きる可能性があるため、例外を受け取れる形で実行します。
try {
    logPasswordResetDatabaseDiagnostics($pdo);

    // SQL を準備し、あとから値を安全に入れられる形にします。
    $stmt = $pdo->prepare("
        SELECT user_id, name, email
        FROM users
        WHERE email = :email
        LIMIT 1
    ");
    // SQL 内の目印に値を割り当て、入力値が SQL 命令として実行されないようにします。
    $stmt->bindValue(":email", $email, PDO::PARAM_STR);
    // 準備した SQL を実行し、データベースへの取得・登録・更新を行います。
    $stmt->execute();
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
    if (!$user) {
        // 登録状況を外部から判別できないよう、未登録メールでも成功時と同じ文言だけ返す。
        respond(["success" => true, "message" => PASSWORD_RESET_SUCCESS_MESSAGE]);
    }

    // SQL を準備し、あとから値を安全に入れられる形にします。
    $stmt = $pdo->prepare("
        SELECT created_at
        FROM password_reset_tokens
        WHERE user_id = :user_id
          AND used_at IS NULL
        ORDER BY created_at DESC
        LIMIT 1
    ");
    // SQL 内の目印に値を割り当て、入力値が SQL 命令として実行されないようにします。
    $stmt->bindValue(":user_id", (int) $user["user_id"], PDO::PARAM_INT);
    // 準備した SQL を実行し、データベースへの取得・登録・更新を行います。
    $stmt->execute();
    $latestToken = $stmt->fetch(PDO::FETCH_ASSOC);
    $now = currentDateTime();

    // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
    if ($latestToken) {
        $latestCreatedAt = new DateTimeImmutable($latestToken["created_at"], new DateTimeZone("Asia/Tokyo"));

        // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
        if ($latestCreatedAt->getTimestamp() > $now->getTimestamp() - PASSWORD_RESET_COOLDOWN_SECONDS) {
            // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
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
    // 準備した SQL を実行し、データベースへの取得・登録・更新を行います。
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
    // 準備した SQL を実行し、データベースへの取得・登録・更新を行います。
    $stmt->execute([
        "user_id" => (int) $user["user_id"],
        "reset_token" => $resetToken,
        "expires_at" => $expiresAt,
        "created_at" => $nowText,
    ]);

    // このAPIは、GAS送信が成功した場合だけDB更新を確定する方式にしている。
    // メールが届かないのに有効な再設定URLだけがDBへ残ることを防ぐため、GAS失敗時はcatchでロールバックする。
    sendPasswordResetMail($user["email"], $user["name"] ?? "ユーザー", $resetUrl);

    // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
    if (function_exists("resolveSystemErrorsByRecoveryContext")) {
        /*
         * PASSWORD_RESET_MAIL_FAILED は、HTTP 200 だけではなく「GASへのメール送信が成功した」
         * ことを確認できた直後だけ解決済みにします。メール送信が失敗した場合はこの行に到達せず、
         * catch 側で未対応エラーとして記録されます。
         */
        resolveSystemErrorsByRecoveryContext(
            $_SERVER["REQUEST_URI"] ?? "/TABI/api/Auth/PasswordResetRequest.php",
            null,
            "PASSWORD_RESET_MAIL_FAILED",
            "auth",
            "POST"
        );
    }

    $pdo->commit();

    // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
    respond(["success" => true, "message" => PASSWORD_RESET_SUCCESS_MESSAGE]);
// エラーが起きた場合は、詳細をログに残し、利用者には安全なメッセージを返します。
} catch (Throwable $error) {
    // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
    if ($pdo->inTransaction()) {
        // 処理途中で失敗した場合に、不完全なDB更新が残らないよう開始済みのトランザクションだけ戻す。
        $pdo->rollBack();
    }

    // 詳細な原因はサーバーログにだけ記録する。ブラウザには内部情報を返さない。
    passwordResetLog(
        get_class($error)
        . ": "
        . $error->getMessage()
        . " in "
        . $error->getFile()
        . ":"
        . $error->getLine()
    );

    // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
    if (function_exists("logSystemError")) {
        logSystemError("auth", "error", "パスワード再設定メールの送信に失敗しました", [
            "error_type" => "PASSWORD_RESET_MAIL_FAILED",
            "error_code" => "PASSWORD_RESET_MAIL_FAILED",
            "source" => "auth",
            "request_method" => "POST",
            "reason" => $error->getMessage(),
            "email" => $email !== "" ? "provided" : "empty",
            "request_url" => $_SERVER["REQUEST_URI"] ?? "",
            "fingerprint" => hash("sha256", "password_reset_mail|POST|" . ($_SERVER["REQUEST_URI"] ?? "/TABI/api/Auth/PasswordResetRequest.php") . "|PASSWORD_RESET_MAIL_FAILED"),
        ], isset($user["user_id"]) ? (int) $user["user_id"] : null, $_SERVER["REQUEST_URI"] ?? null);
    }
    // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
    respond(["success" => false, "message" => "メール送信の受付に失敗しました。時間をおいて再度お試しください。"], 500);
}
