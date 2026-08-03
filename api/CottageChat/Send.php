<?php

/**
 * チャットの一覧、メッセージ取得、送信、既読、画像アップロードを扱う API です。
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
 * firstCharacter は、この API 内で何度も使う処理をまとめた関数です。
 * 引数として受け取った値をもとに、確認・取得・更新などの結果を返します。
 */
function firstCharacter(string $value): string
{
    $value = trim($value);
    // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
    if ($value === '') return '?';
    return function_exists('mb_substr') ? mb_substr($value, 0, 1) : substr($value, 0, 1);
}

/**
 * formatDateLabel は、この API 内で何度も使う処理をまとめた関数です。
 * 引数として受け取った値をもとに、確認・取得・更新などの結果を返します。
 */
function formatDateLabel(DateTimeImmutable $date): string
{
    $oneYearAgo = (new DateTimeImmutable('now'))->modify('-1 year');
    return $date < $oneYearAgo ? $date->format('Y年n月j日') : $date->format('n月j日');
}

// ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
    respond(["success" => false, "message" => "POSTで送信してください"], 405);
}

// ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
if (!isset($_SESSION["user_id"])) {
    // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
    respond(["success" => false, "message" => "ログインが必要です"], 401);
}

// フロントエンドから送られた JSON 文字列を、PHP で扱える配列に変換します。
$input = json_decode(file_get_contents("php://input"), true);
// ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
if (!is_array($input)) {
    $input = $_POST;
}

$userId = (int) $_SESSION["user_id"];
$chatId = filter_var($input["chat_id"] ?? null, FILTER_VALIDATE_INT);
$body = trim((string) ($input["body"] ?? $input["message"] ?? $input["text"] ?? ""));
$imageUrl = isset($input["image_url"]) ? trim((string) $input["image_url"]) : null;
// ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
if ($imageUrl === '') $imageUrl = null;

// ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
if (!$chatId || $chatId < 1) {
    // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
    respond(["success" => false, "message" => "chat_id を指定してください"], 400);
}
// ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
if ($body === '' && $imageUrl === null) {
    // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
    respond(["success" => false, "message" => "メッセージまたは画像を入力してください"], 400);
}

// データベース処理などでエラーが起きる可能性があるため、例外を受け取れる形で実行します。
try {
    // SQL を準備し、あとから値を安全に入れられる形にします。
    $memberStmt = $pdo->prepare("
        SELECT 1
        FROM chat_members
        WHERE chat_id = :chat_id
          AND user_id = :user_id
        LIMIT 1
    ");
    // SQL 内の目印に値を割り当て、入力値が SQL 命令として実行されないようにします。
    $memberStmt->bindValue(":chat_id", $chatId, PDO::PARAM_INT);
    // SQL 内の目印に値を割り当て、入力値が SQL 命令として実行されないようにします。
    $memberStmt->bindValue(":user_id", $userId, PDO::PARAM_INT);
    // 準備した SQL を実行し、データベースへの取得・登録・更新を行います。
    $memberStmt->execute();

    // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
    if (!$memberStmt->fetchColumn()) {
        // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
        respond(["success" => false, "message" => "このチャットへ送信する権限がありません"], 403);
    }

    $pdo->beginTransaction();

    $idStmt = $pdo->query("SELECT COALESCE(MAX(message_id), 0) + 1 FROM messages");
    $messageId = (int) $idStmt->fetchColumn();

    // SQL を準備し、あとから値を安全に入れられる形にします。
    $insertStmt = $pdo->prepare("
        INSERT INTO messages (
            message_id,
            chat_id,
            sender_user_id,
            body,
            image_url,
            sent_at
        ) VALUES (
            :message_id,
            :chat_id,
            :sender_user_id,
            :body,
            :image_url,
            NOW()
        )
    ");
    // SQL 内の目印に値を割り当て、入力値が SQL 命令として実行されないようにします。
    $insertStmt->bindValue(":message_id", $messageId, PDO::PARAM_INT);
    // SQL 内の目印に値を割り当て、入力値が SQL 命令として実行されないようにします。
    $insertStmt->bindValue(":chat_id", $chatId, PDO::PARAM_INT);
    // SQL 内の目印に値を割り当て、入力値が SQL 命令として実行されないようにします。
    $insertStmt->bindValue(":sender_user_id", $userId, PDO::PARAM_INT);
    // SQL 内の目印に値を割り当て、入力値が SQL 命令として実行されないようにします。
    $insertStmt->bindValue(":body", $body !== '' ? $body : null, PDO::PARAM_STR);
    // SQL 内の目印に値を割り当て、入力値が SQL 命令として実行されないようにします。
    $insertStmt->bindValue(":image_url", $imageUrl, PDO::PARAM_STR);
    // 準備した SQL を実行し、データベースへの取得・登録・更新を行います。
    $insertStmt->execute();

    // SQL を準備し、あとから値を安全に入れられる形にします。
    $messageStmt = $pdo->prepare("
        SELECT
            m.message_id,
            m.chat_id,
            m.sender_user_id,
            m.body,
            m.image_url,
            m.sent_at,
            u.name AS sender_name,
            u.icon_url AS sender_icon_url
        FROM messages m
        LEFT JOIN users u ON u.user_id = m.sender_user_id
        WHERE m.message_id = :message_id
        LIMIT 1
    ");
    // SQL 内の目印に値を割り当て、入力値が SQL 命令として実行されないようにします。
    $messageStmt->bindValue(":message_id", $messageId, PDO::PARAM_INT);
    // 準備した SQL を実行し、データベースへの取得・登録・更新を行います。
    $messageStmt->execute();
    $message = $messageStmt->fetch(PDO::FETCH_ASSOC);

    $pdo->commit();

    $sentAt = new DateTimeImmutable($message["sent_at"]);
    $senderName = $message["sender_name"] ?? ($_SESSION["user_name"] ?? "自分");

    // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
    respond([
        "success" => true,
        "message" => [
            "id" => (int) $message["message_id"],
            "message_id" => (int) $message["message_id"],
            "chat_id" => (int) $message["chat_id"],
            "sender_user_id" => (int) $message["sender_user_id"],
            "sender" => $senderName,
            "sender_name" => $senderName,
            "senderName" => $senderName,
            "avatar" => firstCharacter($senderName),
            "sender_icon_url" => $message["sender_icon_url"],
            "text" => $message["body"],
            "body" => $message["body"],
            "image_url" => $message["image_url"],
            "sent_at" => $message["sent_at"],
            "date" => formatDateLabel($sentAt),
            "time" => $sentAt->format("H:i"),
            "readCount" => 0,
            "read_count" => 0,
            "isRead" => false,
            "isMine" => true
        ]
    ], 201);
// エラーが起きた場合は、詳細をログに残し、利用者には安全なメッセージを返します。
} catch (Throwable $error) {
    // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
    respond(["success" => false, "message" => "メッセージの送信に失敗しました"], 500);
}
