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
 * Resolves an unresolved system error after the same API operation succeeds.
 */
session_start();
// フロントエンドへ返すデータ形式や通信ルールを、HTTP ヘッダーとして伝えます。
header("Content-Type: application/json; charset=UTF-8");

// 共通設定や別ファイルの関数を読み込み、この API から使えるようにします。
require_once __DIR__ . "/../config/db.php";
// 共通設定や別ファイルの関数を読み込み、この API から使えるようにします。
require_once __DIR__ . "/../Admin/services/realtime.php";
// 共通設定や別ファイルの関数を読み込み、この API から使えるようにします。
require_once __DIR__ . "/../Admin/services/system_errors.php";

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

// ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
if (!isset($_SESSION["user_id"])) {
    // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
    respond(["success" => false, "message" => "Authentication required."], 401);
}

$rawBody = file_get_contents("php://input");
// フロントエンドから送られた JSON 文字列を、PHP で扱える配列に変換します。
$input = json_decode($rawBody ?: "{}", true);

// ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
if (!is_array($input)) {
    // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
    respond(["success" => false, "message" => "Invalid JSON."], 400);
}

$fingerprint = limitText($input["fingerprint"] ?? "", 255);
$requestUrl = limitText($input["requestUrl"] ?? "", 1000);
$pagePath = limitText($input["pagePath"] ?? ($_SERVER["HTTP_REFERER"] ?? ""), 500);
$httpStatus = isset($input["httpStatus"]) && is_numeric($input["httpStatus"]) ? (int) $input["httpStatus"] : null;
$errorCode = limitText($input["errorCode"] ?? "API_HTTP_ERROR", 120);
$source = limitText($input["source"] ?? "frontend", 80);
$requestMethod = limitText($input["requestMethod"] ?? "", 20);
$recoveryKey = limitText($input["recoveryKey"] ?? "", 500);

$resolvedCount = 0;

// ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
if ($fingerprint) {
    $resolvedCount += resolveSystemErrorByFingerprint($fingerprint, $requestUrl, $pagePath, $httpStatus);
}

/* fingerprintがない古いエラーでも、request_url・page_path・error_codeなどが安全に一致すれば解消します。 */
$resolvedCount += resolveSystemErrorsByRecoveryContext($requestUrl, $pagePath, $errorCode, $source, $requestMethod, $recoveryKey);

// 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
respond([
    "success" => true,
    "resolvedCount" => $resolvedCount,
    "resolved_count" => $resolvedCount,
]);
