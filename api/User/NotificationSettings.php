<?php

/**
 * マイページ用: ユーザーごとの通知設定を取得・保存するAPIです。
 * (api/Notifications/Settings.php と同等の機能を持つ、User配下のエンドポイントです)
 *
 * 主な流れ:
 * 1. ログイン中ユーザーを確認する(user_idはセッションのみを信頼)
 * 2. GETなら現在の設定を返し、PATCH/PUTなら送られてきた項目だけを検証して保存する
 * 3. 保存後の最新設定をJSONで返す
 *
 * 扱うデータ: notification_settings テーブル(1ユーザー1レコード、各通知のON/OFFフラグ)。
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
    if ($source === "" || $host === "") return;
    // ホスト名が一致しない場合は不正な送信元として403で拒否します。
    $sourceHost = parse_url($source, PHP_URL_HOST);
    if ($sourceHost !== null && strcasecmp($sourceHost, $host) !== 0) respond(["success" => false, "message" => "不正な送信元です。"], 403);
}

/**
 * 通知設定の初期値(すべてON)を返します。
 * DBにまだレコードがないユーザーには、この初期値が使われます。
 */
function defaultSettings(): array
{
    return [
        "chatNotification" => true,              // チャットの新着メッセージ通知
        "surveyDeadlineNotification" => true,    // アンケート締め切り通知
        "scheduleReminderNotification" => true,  // スケジュールのリマインド通知
        "memberJoinNotification" => true,        // メンバー参加通知
        "splitBillNotification" => true,         // 割り勘関連の通知
    ];
}

/**
 * DBの1行(0/1のフラグ)を、フロントエンド向けの形式(true/false)へ変換します。
 * 行がない場合(未登録ユーザー)は初期値を返します。
 */
function rowToSettings(?array $row): array
{
    // レコードがなければ初期値をそのまま返します。
    if (!$row) return defaultSettings();
    // DBカラム(スネークケース・0/1)をキャメルケース・真偽値に変換します。
    return [
        "chatNotification" => (bool) $row["chat_notification_enabled"],
        "surveyDeadlineNotification" => (bool) $row["survey_deadline_notification_enabled"],
        "scheduleReminderNotification" => (bool) $row["schedule_reminder_notification_enabled"],
        "memberJoinNotification" => (bool) $row["member_join_notification_enabled"],
        "splitBillNotification" => (bool) $row["split_bill_notification_enabled"],
    ];
}

/**
 * 指定ユーザーの通知設定をDBから取得して、フロントエンド向けの形式で返します。
 */
function fetchSettings(PDO $pdo, int $userId): array
{
    // SQLインジェクション対策として、ユーザーIDはプレースホルダ経由で渡します。
    $stmt = $pdo->prepare("SELECT chat_notification_enabled, survey_deadline_notification_enabled, schedule_reminder_notification_enabled, member_join_notification_enabled, split_bill_notification_enabled FROM notification_settings WHERE user_id = :user_id LIMIT 1");
    $stmt->bindValue(":user_id", $userId, PDO::PARAM_INT);
    $stmt->execute();
    // 見つからなければ null を渡し、初期値に変換してもらいます。
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    return rowToSettings($row ?: null);
}

/**
 * リクエストボディのJSONを読み取り、配列にして返します。
 * JSON以外・サイズ超過(4KB)・形式不正の場合はエラー終了します。
 */
function readJsonInput(): array
{
    // Content-Type が application/json であることを確認します。
    $contentType = $_SERVER["CONTENT_TYPE"] ?? "";
    if (stripos($contentType, "application/json") === false) respond(["success" => false, "message" => "JSONで送信してください。"], 415);
    // 設定変更に4KBを超えるデータは不要なため、大きいリクエストは拒否します。
    if ((int) ($_SERVER["CONTENT_LENGTH"] ?? 0) > 4096) respond(["success" => false, "message" => "リクエストが大きすぎます。"], 413);
    // ボディを読み取ってJSONとして解析します。配列にならなければ形式エラーです。
    $input = json_decode(file_get_contents("php://input"), true);
    if (!is_array($input)) respond(["success" => false, "message" => "JSONの形式が正しくありません。"], 400);
    return $input;
}

// ログイン確認: 未ログインの場合は401エラーで終了します。
if (!isset($_SESSION["user_id"])) {
    // user_idをフロントから受け取ると別ユーザーの設定を変えられる危険があるため、セッションだけを使います。
    respond(["success" => false, "message" => "ログインが必要です。"], 401);
}

// ログインユーザーIDとHTTPメソッドを取得します。
$userId = (int) $_SESSION["user_id"];
$method = $_SERVER["REQUEST_METHOD"];

// データベース処理などでエラーが起きる可能性があるため、例外を受け取れる形で実行します。
try {
    // GETの場合: 現在の設定を返すだけです(未登録ユーザーには初期値を返します)。
    if ($method === "GET") respond(["success" => true, "settings" => fetchSettings($pdo, $userId)]);

    // GET以外で許可するのは PATCH と PUT(設定の更新)だけです。
    if (!in_array($method, ["PATCH", "PUT"], true)) respond(["success" => false, "message" => "GET、PATCH、PUTのいずれかで送信してください。"], 405);

    // 書き込み処理なので、別サイトからの不正リクエストを拒否します。
    rejectIfCrossOrigin();

    // リクエストボディ(JSON)を読み取り、許可されたキー一覧を用意します。
    $input = readJsonInput();
    $allowedKeys = array_keys(defaultSettings());

    // 送られてきた各項目を検証します。
    foreach ($input as $key => $value) {
        // 想定外のキー(タイプミスや不正な項目)は400エラーで拒否します。
        if (!in_array($key, $allowedKeys, true)) respond(["success" => false, "message" => "許可されていない通知設定です。"], 400);
        // 値は true / false のみ許可します(文字列の "true" などは不可)。
        if (!is_bool($value)) respond(["success" => false, "message" => "通知設定はtrueまたはfalseで送信してください。"], 400);
    }

    // 現在の設定に送られてきた項目だけを上書きし、送られていない項目は現状維持にします(部分更新)。
    $next = array_merge(fetchSettings($pdo, $userId), $input);

    // 1ユーザーにつき1レコードにするため、user_idを主キーにしてUPSERTします。
    // (レコードがなければINSERT、あればON DUPLICATE KEY UPDATEで更新)
    $stmt = $pdo->prepare("INSERT INTO notification_settings (user_id, chat_notification_enabled, survey_deadline_notification_enabled, schedule_reminder_notification_enabled, member_join_notification_enabled, split_bill_notification_enabled, created_at, updated_at) VALUES (:user_id, :chat_notification_enabled, :survey_deadline_notification_enabled, :schedule_reminder_notification_enabled, :member_join_notification_enabled, :split_bill_notification_enabled, NOW(), NOW()) ON DUPLICATE KEY UPDATE chat_notification_enabled = VALUES(chat_notification_enabled), survey_deadline_notification_enabled = VALUES(survey_deadline_notification_enabled), schedule_reminder_notification_enabled = VALUES(schedule_reminder_notification_enabled), member_join_notification_enabled = VALUES(member_join_notification_enabled), split_bill_notification_enabled = VALUES(split_bill_notification_enabled), updated_at = NOW()");

    // 真偽値をDB用の 1 / 0 に変換して保存します。
    $stmt->execute([
        ":user_id" => $userId,
        ":chat_notification_enabled" => $next["chatNotification"] ? 1 : 0,
        ":survey_deadline_notification_enabled" => $next["surveyDeadlineNotification"] ? 1 : 0,
        ":schedule_reminder_notification_enabled" => $next["scheduleReminderNotification"] ? 1 : 0,
        ":member_join_notification_enabled" => $next["memberJoinNotification"] ? 1 : 0,
        ":split_bill_notification_enabled" => $next["splitBillNotification"] ? 1 : 0,
    ]);

    // 保存後の最新設定を取り直して返します。
    respond(["success" => true, "settings" => fetchSettings($pdo, $userId)]);
} catch (Throwable $error) {
    // 失敗時は詳細を出さず、安全なメッセージだけを500エラーで返します。
    respond(["success" => false, "message" => "通知設定の取得または保存に失敗しました。"], 500);
}
