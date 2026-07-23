<?php

/**
 * プッシュ通知を受け取る端末(FCMトークン)を登録するAPIです。
 *
 * 主な流れ:
 * 1. ログイン中ユーザーを確認し、JSONで送られてきたFCMトークンと端末情報を検証する
 * 2. トークンのハッシュ値で同一端末を判定し、user_devices テーブルへ登録または更新する
 * 3. 登録結果をJSONで返す
 *
 * 扱うデータ: FCMプッシュトークン、端末名・ブラウザ名・OS種別などの端末情報。
 */

// セッションを開始し、ログイン情報(ユーザーID)を読み取れるようにします。
session_start();

// レスポンスがJSON形式であることをフロントエンドへ伝えます。
header("Content-Type: application/json; charset=UTF-8");

// DB接続($pdo)を読み込みます。
require_once __DIR__ . "/../config/db.php";

/**
 * 処理結果をJSONで出力し、そこで処理を終了(exit)する関数です。
 */
function respond(array $payload, int $status = 200): void
{
    http_response_code($status);
    // 日本語をそのまま出力できるようにエンコードします。
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

/**
 * 別ドメインのサイトからの書き込みリクエスト(CSRF攻撃)を拒否します。
 * リクエスト元(Origin/Referer)のホスト名と自サイトのホスト名を比較します。
 */
function rejectIfCrossOrigin(): void
{
    // 自サイトのホスト名と、リクエスト元の情報を取得します。
    $host = $_SERVER["HTTP_HOST"] ?? "";
    $origin = $_SERVER["HTTP_ORIGIN"] ?? "";
    $referer = $_SERVER["HTTP_REFERER"] ?? "";
    // Originヘッダーを優先し、なければRefererを使います。
    $source = $origin !== "" ? $origin : $referer;

    // どちらも取得できない場合は判定できないため通します。
    if ($source === "" || $host === "") {
        return;
    }

    // ホスト名が一致しない場合は不正な送信元として403で拒否します。
    $sourceHost = parse_url($source, PHP_URL_HOST);
    if ($sourceHost !== null && strcasecmp($sourceHost, $host) !== 0) {
        respond(["success" => false, "message" => "不正な送信元です。"], 403);
    }
}

/**
 * リクエストボディのJSONを読み取り、配列にして返します。
 * JSON以外・サイズ超過・形式不正の場合はエラー終了します。
 */
function readJsonInput(int $maxBytes = 8192): array
{
    // Content-Type が application/json であることを確認します。
    $contentType = $_SERVER["CONTENT_TYPE"] ?? "";
    if (stripos($contentType, "application/json") === false) {
        respond(["success" => false, "message" => "JSONで送信してください。"], 415);
    }

    // 想定外に大きいリクエストは処理前に拒否します(サーバー負荷対策)。
    $contentLength = (int) ($_SERVER["CONTENT_LENGTH"] ?? 0);
    if ($contentLength > $maxBytes) {
        respond(["success" => false, "message" => "リクエストが大きすぎます。"], 413);
    }

    // ボディを読み取ってJSONとして解析します。配列にならなければ形式エラーです。
    $input = json_decode(file_get_contents("php://input"), true);
    if (!is_array($input)) {
        respond(["success" => false, "message" => "JSONの形式が正しくありません。"], 400);
    }

    return $input;
}

/**
 * 任意入力の文字列項目(端末名など)を検証して返します。
 * 未入力なら null、文字列以外や長すぎる場合はエラー終了します。
 */
function optionalString($value, int $maxLength): ?string
{
    // 未入力(null/空文字)は「値なし」として扱います。
    if ($value === null || $value === "") return null;
    // 文字列以外(数値や配列など)は形式エラーです。
    if (!is_string($value)) respond(["success" => false, "message" => "端末情報の形式が正しくありません。"], 400);
    // 前後の空白を取り除き、空になったら「値なし」扱いにします。
    $value = trim($value);
    if ($value === "") return null;
    // マルチバイト文字を考慮した文字数で上限チェックします。
    if (mb_strlen($value, "UTF-8") > $maxLength) respond(["success" => false, "message" => "端末情報が長すぎます。"], 400);
    return $value;
}

// このAPIは登録(書き込み)専用のため、POST以外は405エラーで拒否します。
if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    respond(["success" => false, "message" => "POSTで送信してください。"], 405);
}

// 別サイトからの不正な登録リクエストを拒否します。
rejectIfCrossOrigin();

// ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
if (!isset($_SESSION["user_id"])) {
    // user_idはリクエストから受け取らず、ログイン中のセッションから取得します。
    respond(["success" => false, "message" => "ログインが必要です。"], 401);
}

// リクエストボディ(JSON)を読み取り、ログインユーザーIDとトークンを取り出します。
$input = readJsonInput();
$userId = (int) $_SESSION["user_id"];
$token = $input["token"] ?? null;

// FCMトークンの形式を検証します。
// 空・4096文字超・制御文字(改行やNULL文字など)を含むものは不正として拒否します。
if (!is_string($token) || trim($token) === "" || strlen($token) > 4096 || preg_match('/[\x00-\x1F\x7F]/', $token)) {
    respond(["success" => false, "message" => "通知トークンの形式が正しくありません。"], 400);
}

// プラットフォーム(web/android/ios)とアプリ種別(pwa/native)を読み取ります。未指定時はWebのPWAとみなします。
$platform = $input["platform"] ?? "web";
$appType = $input["appType"] ?? "pwa";

// 許可された値以外は400エラーで拒否します。
if (!in_array($platform, ["web", "android", "ios"], true)) respond(["success" => false, "message" => "platformの値が正しくありません。"], 400);
if (!in_array($appType, ["pwa", "native"], true)) respond(["success" => false, "message" => "appTypeの値が正しくありません。"], 400);

// 任意の端末情報を検証しつつ取得します(未入力なら null)。
$deviceName = optionalString($input["deviceName"] ?? null, 100);
$browser = optionalString($input["browser"] ?? null, 100);
// User-Agentはブラウザが自動で送るヘッダーから取得し、長すぎる場合は500文字で切り詰めます。
$userAgent = substr((string) ($_SERVER["HTTP_USER_AGENT"] ?? ""), 0, 500) ?: null;
// トークンそのものではなくSHA-256ハッシュを重複判定キーに使います(インデックスを短く保つため)。
$tokenHash = hash("sha256", $token);
// 登録日時・更新日時に使う現在時刻を1回だけ取得します。
$now = (new DateTimeImmutable("now"))->format("Y-m-d H:i:s");

// データベース処理などでエラーが起きる可能性があるため、例外を受け取れる形で実行します。
try {
    // 登録処理を1つのまとまりとして扱うため、トランザクションを開始します。
    $pdo->beginTransaction();

    // token_hashで同じトークンを見分け、同じ端末を重複登録しないようにします。
    // 既に同じトークンがある場合は ON DUPLICATE KEY UPDATE により上書き更新され、
    // 無効化されていた端末(revoked_at あり)も再び有効(is_active = 1)に戻ります。
    $stmt = $pdo->prepare("INSERT INTO user_devices (user_id, push_token, token_hash, platform, app_type, device_name, browser, user_agent, is_active, created_at, updated_at, last_used_at, revoked_at) VALUES (:user_id, :push_token, :token_hash, :platform, :app_type, :device_name, :browser, :user_agent, 1, :created_at, :updated_at, :last_used_at, NULL) ON DUPLICATE KEY UPDATE user_id = VALUES(user_id), push_token = VALUES(push_token), platform = VALUES(platform), app_type = VALUES(app_type), device_name = VALUES(device_name), browser = VALUES(browser), user_agent = VALUES(user_agent), is_active = 1, updated_at = VALUES(updated_at), last_used_at = VALUES(last_used_at), revoked_at = NULL");

    // SQLインジェクション対策として、すべての値はプレースホルダ経由で渡します。
    $stmt->execute([
        ":user_id" => $userId,
        ":push_token" => $token,
        ":token_hash" => $tokenHash,
        ":platform" => $platform,
        ":app_type" => $appType,
        ":device_name" => $deviceName,
        ":browser" => $browser,
        ":user_agent" => $userAgent,
        ":created_at" => $now,
        ":updated_at" => $now,
        ":last_used_at" => $now,
    ]);

    // 問題なければ変更を確定し、成功レスポンスを返します。
    $pdo->commit();
    respond(["success" => true, "message" => "通知端末を登録しました。", "data" => ["registered" => true]]);
} catch (Throwable $error) {
    // 途中で失敗した場合は変更を取り消し、安全なメッセージだけを500エラーで返します。
    if ($pdo->inTransaction()) $pdo->rollBack();
    respond(["success" => false, "message" => "通知端末の登録に失敗しました。"], 500);
}
