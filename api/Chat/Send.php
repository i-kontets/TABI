<?php
// セッション開始 - ユーザーのセッション管理を初期化
session_start();

// JSONレスポンスの設定
header("Content-Type: application/json; charset=UTF-8");

// データベース接続設定を読み込む
require_once __DIR__ . "/../config/db.php";

function firstCharacter(string $value): string
{
    return function_exists("mb_substr")
        ? mb_substr($value, 0, 1)
        : substr($value, 0, 1);
}

function textLength(string $value): int
{
    return function_exists("mb_strlen")
        ? mb_strlen($value)
        : strlen($value);
}

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    http_response_code(405);
    echo json_encode([
        "success" => false,
        "message" => "POSTメソッドで送信してください"
    ]);
    exit;
}

if (!isset($_SESSION["user_id"])) {
    http_response_code(401);
    echo json_encode([
        "success" => false,
        "message" => "ログインが必要です"
    ]);
    exit;
}

$input = json_decode(file_get_contents("php://input"), true);

if (!is_array($input)) {
    $input = $_POST;
}

$userId = (int) $_SESSION["user_id"];
$chatId = filter_var($input["chat_id"] ?? null, FILTER_VALIDATE_INT);
$groupId = filter_var($input["group_id"] ?? null, FILTER_VALIDATE_INT);
$body = trim((string) ($input["body"] ?? $input["message"] ?? $input["text"] ?? ""));

if ($chatId !== null && $chatId !== false && $chatId < 1) {
    $chatId = false;
}

if ($groupId !== null && $groupId !== false && $groupId < 1) {
    $groupId = false;
}

if (!$chatId && !$groupId) {
    http_response_code(400);
    echo json_encode([
        "success" => false,
        "message" => "chat_id または group_id を指定してください"
    ]);
    exit;
}

if ($body === "") {
    http_response_code(400);
    echo json_encode([
        "success" => false,
        "message" => "メッセージを入力してください"
    ]);
    exit;
}

if (textLength($body) > 5000) {
    http_response_code(400);
    echo json_encode([
        "success" => false,
        "message" => "メッセージは5000文字以内で入力してください"
    ]);
    exit;
}

$idLockAcquired = false;

try {
    if (!$chatId) {
        $chatStmt = $pdo->prepare("
            SELECT c.chat_id
            FROM chats c
            INNER JOIN trips t ON t.trip_id = c.trip_id
            WHERE t.group_id = :group_id
              AND c.chat_type = 'group'
            ORDER BY c.chat_id DESC
            LIMIT 1
        ");
        $chatStmt->bindValue(":group_id", $groupId, PDO::PARAM_INT);
        $chatStmt->execute();
        $chatId = $chatStmt->fetchColumn();

        if (!$chatId) {
            http_response_code(404);
            echo json_encode([
                "success" => false,
                "message" => "対象のチャットが見つかりません"
            ]);
            exit;
        }
    }

    $memberStmt = $pdo->prepare("
        SELECT 1
        FROM chat_members
        WHERE chat_id = :chat_id
          AND user_id = :user_id
        LIMIT 1
    ");
    $memberStmt->bindValue(":chat_id", $chatId, PDO::PARAM_INT);
    $memberStmt->bindValue(":user_id", $userId, PDO::PARAM_INT);
    $memberStmt->execute();

    if (!$memberStmt->fetchColumn()) {
        http_response_code(403);
        echo json_encode([
            "success" => false,
            "message" => "このチャットへ送信する権限がありません"
        ]);
        exit;
    }

    // SQL定義上 message_id はAUTO_INCREMENTではないため、
    // 同時送信で同じIDが採番されないようDB接続間の排他ロックを取得する。
    $lockStmt = $pdo->query("SELECT GET_LOCK('tabi_messages_id_lock', 5)");
    $idLockAcquired = (int) $lockStmt->fetchColumn() === 1;

    if (!$idLockAcquired) {
        throw new RuntimeException("メッセージIDの採番ロックを取得できませんでした");
    }

    $pdo->beginTransaction();

    $idStmt = $pdo->query("
        SELECT COALESCE(MAX(message_id), 0) + 1
        FROM messages
    ");
    $messageId = (int) $idStmt->fetchColumn();

    $insertStmt = $pdo->prepare("
        INSERT INTO messages (
            message_id,
            chat_id,
            sender_user_id,
            body,
            sent_at
        ) VALUES (
            :message_id,
            :chat_id,
            :sender_user_id,
            :body,
            NOW()
        )
    ");
    $insertStmt->bindValue(":message_id", $messageId, PDO::PARAM_INT);
    $insertStmt->bindValue(":chat_id", $chatId, PDO::PARAM_INT);
    $insertStmt->bindValue(":sender_user_id", $userId, PDO::PARAM_INT);
    $insertStmt->bindValue(":body", $body, PDO::PARAM_STR);
    $insertStmt->execute();

    $messageStmt = $pdo->prepare("
        SELECT
            m.message_id,
            m.chat_id,
            m.sender_user_id,
            m.body,
            m.sent_at,
            u.name AS sender_name,
            u.icon_url AS sender_icon_url
        FROM messages m
        LEFT JOIN users u ON u.user_id = m.sender_user_id
        WHERE m.message_id = :message_id
        LIMIT 1
    ");
    $messageStmt->bindValue(":message_id", $messageId, PDO::PARAM_INT);
    $messageStmt->execute();
    $message = $messageStmt->fetch(PDO::FETCH_ASSOC);

    $pdo->commit();
    $pdo->query("SELECT RELEASE_LOCK('tabi_messages_id_lock')");
    $idLockAcquired = false;

    $sentAt = new DateTimeImmutable($message["sent_at"]);
    $senderName = $message["sender_name"] ?? ($_SESSION["user_name"] ?? "自分");
    $weekdays = ["日", "月", "火", "水", "木", "金", "土"];
    $dateLabel = $sentAt->format("Y年n月j日")
        . " "
        . $weekdays[(int) $sentAt->format("w")]
        . "曜日";

    http_response_code(201);
    echo json_encode([
        "success" => true,
        "message" => [
            "id" => (int) $message["message_id"],
            "message_id" => (int) $message["message_id"],
            "chat_id" => (int) $message["chat_id"],
            "sender_user_id" => (int) $message["sender_user_id"],
            "sender" => $senderName,
            "sender_name" => $senderName,
            "avatar" => firstCharacter($senderName),
            "sender_icon_url" => $message["sender_icon_url"],
            "text" => $message["body"],
            "body" => $message["body"],
            "sent_at" => $message["sent_at"],
            "date" => $dateLabel,
            "time" => $sentAt->format("H:i"),
            "readCount" => 0,
            "read_count" => 0,
            "isRead" => false,
            "isMine" => true
        ]
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
} catch (Throwable $error) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }

    if ($idLockAcquired) {
        $pdo->query("SELECT RELEASE_LOCK('tabi_messages_id_lock')");
    }

    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => "メッセージの送信に失敗しました"
    ]);
}
