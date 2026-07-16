<?php

/**
 * 画面やサーバーで起きたシステムエラーを記録・解決済みにする API です。
 *
 * 主な流れ:
 * 1. リクエストやセッションなど、処理に必要な情報を読み取る
 * 2. 入力値や権限を確認し、必要に応じてデータベースへ問い合わせる
 * 3. 処理結果を JSON などの形でフロントエンドへ返す
 *
 * 扱うデータ: アプリの設定値や、他のファイルから受け取る値を主に扱います。
 */

/**
 * Frontend/API failures are saved into system_errors for the admin screen.
 */
session_start();
// フロントエンドへ返すデータ形式や通信ルールを、HTTP ヘッダーとして伝えます。
header("Content-Type: application/json; charset=UTF-8");

// 共通設定や別ファイルの関数を読み込み、この API から使えるようにします。
require_once __DIR__ . "/../config/db.php";
// 共通設定や別ファイルの関数を読み込み、この API から使えるようにします。
require_once __DIR__ . "/../Admin/services/system_errors.php";
// 共通設定や別ファイルの関数を読み込み、この API から使えるようにします。
require_once __DIR__ . "/../Admin/services/realtime.php";

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
 * limitText は、この API 内で何度も使う処理をまとめた関数です。
 * 引数として受け取った値をもとに、確認・取得・更新などの結果を返します。
 */
function limitText($value, int $maxLength): ?string
{
    $text = trim((string) $value);

    // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
    if ($text === "") {
        return null;
    }

    return mb_substr($text, 0, $maxLength);
}

// ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
    respond(["success" => false, "message" => "Method not allowed."], 405);
}

$rawBody = file_get_contents("php://input");
// フロントエンドから送られた JSON 文字列を、PHP で扱える配列に変換します。
$input = json_decode($rawBody ?: "{}", true);

// ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
if (!is_array($input)) {
    // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
    respond(["success" => false, "message" => "Invalid JSON."], 400);
}

$errorCode = limitText($input["errorCode"] ?? "", 120);
$message = limitText($input["message"] ?? "", 500);

// ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
if (!$errorCode || !$message) {
    // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
    respond(["success" => false, "message" => "errorCode and message are required."], 400);
}

$userId = isset($_SESSION["user_id"]) ? (int) $_SESSION["user_id"] : null;
$requestUrl = limitText($input["requestUrl"] ?? "", 1000);
$pagePath = limitText($input["pagePath"] ?? ($_SERVER["HTTP_REFERER"] ?? ""), 500);

/*
 * request_method と recovery_key は、自動解消時に「同じAPI処理か」を安全に確認するために保存します。
 * メールアドレスや認証コードなどの個人情報は含めず、URLもクエリを除いた形にしています。
 */
$detail = [
    "error_type" => limitText($input["errorType"] ?? "FRONTEND_ERROR", 80),
    "error_code" => $errorCode,
    "source" => limitText($input["source"] ?? "frontend", 120),
    "page_path" => $pagePath,
    "request_url" => $requestUrl,
    "request_method" => limitText($input["requestMethod"] ?? "", 20),
    "http_status" => isset($input["httpStatus"]) && is_numeric($input["httpStatus"]) ? (int) $input["httpStatus"] : null,
    "user_agent" => limitText($_SERVER["HTTP_USER_AGENT"] ?? ($input["userAgent"] ?? ""), 500),
    "stack_trace" => limitText($input["stack"] ?? "", 2000),
    "fingerprint" => limitText($input["fingerprint"] ?? "", 255),
    "recovery_key" => limitText($input["recoveryKey"] ?? "", 500),
    "component" => limitText($input["component"] ?? "", 120),
];

$errorId = logSystemError(
    "frontend",
    "error",
    $message,
    $detail,
    $userId,
    $pagePath ?: $requestUrl
);

// 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
respond([
    "success" => true,
    "error_id" => $errorId,
]);
