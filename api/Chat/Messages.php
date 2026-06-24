<?php
// セッション開始 - ユーザーのセッション管理を初期化
session_start();

// JSONレスポンスの設定
header("Content-Type: application/json; charset=UTF-8");

// データベース接続設定を読み込む
require_once __DIR__ . "/../config/db.php";

// 先頭1文字を抜き出して、ユーザー名の頭文字アイコンとして使う。
function firstCharacter(string $value): string
{
    return function_exists("mb_substr")
        ? mb_substr($value, 0, 1)
        : substr($value, 0, 1);
}

// メッセージ一覧は閲覧専用なので GET のみ受け付ける。
if ($_SERVER["REQUEST_METHOD"] !== "GET") {
    http_response_code(405);
    echo json_encode([
        "success" => false,
        "message" => "GETメソッドで送信してください"
    ]);
    exit;
}

// 未ログインなら閲覧できない。
if (!isset($_SESSION["user_id"])) {
    http_response_code(401);
    echo json_encode([
        "success" => false,
        "message" => "ログインが必要です"
    ]);
    exit;
}

// 現在ログイン中のユーザーIDと、対象チャット/グループIDを受け取る。
$userId = (int) $_SESSION["user_id"];
$chatId = filter_input(INPUT_GET, "chat_id", FILTER_VALIDATE_INT);
$groupId = filter_input(INPUT_GET, "group_id", FILTER_VALIDATE_INT);

// 無効なIDは未指定扱いにする。
if ($chatId !== null && $chatId !== false && $chatId < 1) {
    $chatId = false;
}

if ($groupId !== null && $groupId !== false && $groupId < 1) {
    $groupId = false;
}

// chat_id か group_id のどちらかが必要。
if (!$chatId && !$groupId) {
    http_response_code(400);
    echo json_encode([
        "success" => false,
        "message" => "chat_id または group_id を指定してください"
    ]);
    exit;
}

try {
    // group_id しかなければ、そのグループの最新チャットIDを解決する。
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

    // ログインユーザーがこのチャットのメンバーか確認する。
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
            "message" => "このチャットを閲覧する権限がありません"
        ]);
        exit;
    }

    // メッセージ本体と、既読数・自分が既読済みかどうかをまとめて取得する。
    $messageStmt = $pdo->prepare("
        SELECT
            m.message_id,
            m.chat_id,
            m.sender_user_id,
            m.body,
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
        GROUP BY
            m.message_id,
            m.chat_id,
            m.sender_user_id,
            m.body,
            m.sent_at,
            u.name,
            u.icon_url
        ORDER BY m.sent_at ASC, m.message_id ASC
    ");
    $messageStmt->bindValue(":current_user_id", $userId, PDO::PARAM_INT);
    $messageStmt->bindValue(":chat_id", $chatId, PDO::PARAM_INT);
    $messageStmt->execute();

    $messages = [];
    $weekdays = ["日", "月", "火", "水", "木", "金", "土"];

    // 1件ずつ読み取り、フロントで使いやすい配列形式に変換する。
    while ($message = $messageStmt->fetch(PDO::FETCH_ASSOC)) {
        $sentAt = $message["sent_at"] ? new DateTimeImmutable($message["sent_at"]) : null;
        $senderName = $message["sender_name"] ?? "不明なユーザー";
        $dateLabel = $sentAt
            ? $sentAt->format("Y年n月j日") . " " . $weekdays[(int) $sentAt->format("w")] . "曜日"
            : "";

        // 表示用の補助情報も合わせて付与する。
        $messages[] = [
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
            "time" => $sentAt ? $sentAt->format("H:i") : "",
            "readCount" => (int) $message["read_count"],
            "read_count" => (int) $message["read_count"],
            "isRead" => (bool) $message["is_read"],
            "isMine" => (int) $message["sender_user_id"] === $userId
        ];
    }

    // 会話画面でそのまま使える形で返す。
    echo json_encode([
        "success" => true,
        "chat_id" => (int) $chatId,
        "messages" => $messages
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
} catch (Throwable $error) {
    // 内部エラーは詳細を隠し、取得失敗のみ通知する。
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => "メッセージ一覧の取得に失敗しました"
    ]);
}
