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
    if ($value === '') {
        return '?';
    }
    return function_exists('mb_substr') ? mb_substr($value, 0, 1) : substr($value, 0, 1);
}

/**
 * formatDateLabel は、この API 内で何度も使う処理をまとめた関数です。
 * 引数として受け取った値をもとに、確認・取得・更新などの結果を返します。
 */
function formatDateLabel(?string $value): string
{
    // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
    if (!$value) {
        return '';
    }

    $date = new DateTimeImmutable($value);
    $oneYearAgo = (new DateTimeImmutable('now'))->modify('-1 year');

    // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
    if ($date < $oneYearAgo) {
        return $date->format('Y年n月j日');
    }

    return $date->format('n月j日');
}

/**
 * formatTime は、この API 内で何度も使う処理をまとめた関数です。
 * 引数として受け取った値をもとに、確認・取得・更新などの結果を返します。
 */
function formatTime(?string $value): string
{
    // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
    if (!$value) {
        return '';
    }

    return (new DateTimeImmutable($value))->format('H:i');
}

/**
 * ensureMember は、この API 内で何度も使う処理をまとめた関数です。
 * 引数として受け取った値をもとに、確認・取得・更新などの結果を返します。
 */
function ensureMember(PDO $pdo, int $chatId, int $userId): void
{
    // SQL を準備し、あとから値を安全に入れられる形にします。
    $stmt = $pdo->prepare("
        SELECT 1
        FROM chat_members
        WHERE chat_id = :chat_id
          AND user_id = :user_id
        LIMIT 1
    ");
    // SQL 内の目印に値を割り当て、入力値が SQL 命令として実行されないようにします。
    $stmt->bindValue(':chat_id', $chatId, PDO::PARAM_INT);
    // SQL 内の目印に値を割り当て、入力値が SQL 命令として実行されないようにします。
    $stmt->bindValue(':user_id', $userId, PDO::PARAM_INT);
    // 準備した SQL を実行し、データベースへの取得・登録・更新を行います。
    $stmt->execute();

    // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
    if (!$stmt->fetchColumn()) {
        // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
        respond(["success" => false, "message" => "このチャットを閲覧する権限がありません"], 403);
    }
}

// ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
if ($_SERVER["REQUEST_METHOD"] !== "GET") {
    // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
    respond(["success" => false, "message" => "GETで取得してください"], 405);
}

// ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
if (!isset($_SESSION["user_id"])) {
    // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
    respond(["success" => false, "message" => "ログインが必要です"], 401);
}

$userId = (int) $_SESSION["user_id"];
$chatId = filter_var($_GET["chat_id"] ?? null, FILTER_VALIDATE_INT);
$afterId = filter_var($_GET["after_id"] ?? null, FILTER_VALIDATE_INT);

// ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
if (!$chatId || $chatId < 1) {
    // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
    respond(["success" => false, "message" => "chat_id を指定してください"], 400);
}

// データベース処理などでエラーが起きる可能性があるため、例外を受け取れる形で実行します。
try {
    ensureMember($pdo, (int) $chatId, $userId);

    $sql = "
        SELECT
            m.message_id,
            m.chat_id,
            m.sender_user_id,
            m.body,
            m.image_url,
            m.sent_at,
            u.name AS sender_name,
            u.icon_url AS sender_icon_url,
            COUNT(DISTINCT CASE
                WHEN mr.user_id <> m.sender_user_id THEN mr.user_id
            END) AS read_count,
            MAX(CASE WHEN mr.user_id = :current_user_id THEN 1 ELSE 0 END) AS is_read
        FROM messages m
        LEFT JOIN users u ON u.user_id = m.sender_user_id
        LEFT JOIN message_reads mr ON mr.message_id = m.message_id
        WHERE m.chat_id = :chat_id
    ";
    // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
    if ($afterId && $afterId > 0) {
        $sql .= " AND m.message_id > :after_id";
    }
    $sql .= "
        GROUP BY
            m.message_id,
            m.chat_id,
            m.sender_user_id,
            m.body,
            m.image_url,
            m.sent_at,
            u.name,
            u.icon_url
        ORDER BY m.sent_at ASC, m.message_id ASC
    ";

    // SQL を準備し、あとから値を安全に入れられる形にします。
    $stmt = $pdo->prepare($sql);
    // SQL 内の目印に値を割り当て、入力値が SQL 命令として実行されないようにします。
    $stmt->bindValue(':current_user_id', $userId, PDO::PARAM_INT);
    // SQL 内の目印に値を割り当て、入力値が SQL 命令として実行されないようにします。
    $stmt->bindValue(':chat_id', $chatId, PDO::PARAM_INT);
    // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
    if ($afterId && $afterId > 0) {
        // SQL 内の目印に値を割り当て、入力値が SQL 命令として実行されないようにします。
        $stmt->bindValue(':after_id', $afterId, PDO::PARAM_INT);
    }
    // 準備した SQL を実行し、データベースへの取得・登録・更新を行います。
    $stmt->execute();

    $messages = [];
    while ($message = $stmt->fetch(PDO::FETCH_ASSOC)) {
        $senderName = $message['sender_name'] ?? 'Unknown user';

        $messages[] = [
            'id' => (int) $message['message_id'],
            'message_id' => (int) $message['message_id'],
            'chat_id' => (int) $message['chat_id'],
            'sender_user_id' => (int) $message['sender_user_id'],
            'sender' => $senderName,
            'sender_name' => $senderName,
            'senderName' => $senderName,
            'avatar' => $message['sender_icon_url'] ?: firstCharacter($senderName),
            'sender_icon_url' => $message['sender_icon_url'],
            'text' => $message['body'],
            'body' => $message['body'],
            'image_url' => $message['image_url'],
            'sent_at' => $message['sent_at'],
            'date' => formatDateLabel($message['sent_at']),
            'time' => formatTime($message['sent_at']),
            'readCount' => (int) $message['read_count'],
            'read_count' => (int) $message['read_count'],
            'isRead' => (bool) $message['is_read'],
            'isMine' => (int) $message['sender_user_id'] === $userId,
        ];
    }

    // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
    respond([
        "success" => true,
        "chat_id" => (int) $chatId,
        "messages" => $messages,
    ]);
// エラーが起きた場合は、詳細をログに残し、利用者には安全なメッセージを返します。
} catch (Throwable $error) {
    // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
    respond([
        "success" => false,
        "message" => "メッセージの取得に失敗しました",
    ], 500);
}
