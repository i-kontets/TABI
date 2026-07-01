<?php
// セッション開始 - ユーザーのセッション管理を初期化
session_start();

// JSONレスポンスの設定
header("Content-Type: application/json; charset=UTF-8");

// データベース接続設定を読み込む
require_once __DIR__ . "/../config/db.php";

// 文字列の先頭1文字を取り出す。
// ユーザー名のアイコン代わりに使うため、マルチバイト文字にも対応する。
function firstCharacter(string $value): string
{
    return function_exists("mb_substr")
        ? mb_substr($value, 0, 1)
        : substr($value, 0, 1);
}

// 文字数を数える。
// 日本語などのマルチバイト文字を含んでも、入力上限の判定を正しく行うために使う。
function textLength(string $value): int
{
    return function_exists("mb_strlen")
        ? mb_strlen($value)
        : strlen($value);
}

function formatDateLabel(DateTimeImmutable $date): string
{
    $oneYearAgo = (new DateTimeImmutable("now"))->modify("-1 year");

    if ($date < $oneYearAgo) {
        return $date->format("Y年n月j日");
    }

    return $date->format("n月j日");
}

// 送信は POST のみ受け付ける。
if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    http_response_code(405);
    echo json_encode([
        "success" => false,
        "message" => "POSTメソッドで送信してください"
    ]);
    exit;
}

// ログイン済みユーザーだけがメッセージを送れる。
if (!isset($_SESSION["user_id"])) {
    http_response_code(401);
    echo json_encode([
        "success" => false,
        "message" => "ログインが必要です"
    ]);
    exit;
}

// JSON ボディがあればそれを優先し、なければ通常の POST フォームを読む。
$input = json_decode(file_get_contents("php://input"), true);

if (!is_array($input)) {
    $input = $_POST;
}

// 送信者のユーザーID、送信先チャットID / グループID、本文を取り出す。
$userId   = (int) $_SESSION["user_id"];
$chatId   = filter_var($input["chat_id"]  ?? null, FILTER_VALIDATE_INT);
$groupId  = filter_var($input["group_id"] ?? null, FILTER_VALIDATE_INT);
$body     = trim((string) ($input["body"] ?? $input["message"] ?? $input["text"] ?? ""));
$imageUrl = isset($input["image_url"]) ? trim((string) $input["image_url"]) : null;
if ($imageUrl === '') $imageUrl = null;

// 0 以下の値は無効として扱う。
if ($chatId !== null && $chatId !== false && $chatId < 1) {
    $chatId = false;
}

if ($groupId !== null && $groupId !== false && $groupId < 1) {
    $groupId = false;
}

// chat_id か group_id のどちらかは必須。
if (!$chatId && !$groupId) {
    http_response_code(400);
    echo json_encode([
        "success" => false,
        "message" => "chat_id または group_id を指定してください"
    ]);
    exit;
}

// 本文と画像の両方が空なら送信しない。
if ($body === "" && $imageUrl === null) {
    http_response_code(400);
    echo json_encode([
        "success" => false,
        "message" => "メッセージまたは画像を入力してください"
    ]);
    exit;
}

// 長すぎる本文は受け付けない。
if (textLength($body) > 5000) {
    http_response_code(400);
    echo json_encode([
        "success" => false,
        "message" => "メッセージは5000文字以内で入力してください"
    ]);
    exit;
}

// message_id を手動採番しているため、同時送信時の重複を避けるためにロック状態を管理する。
$idLockAcquired = false;

try {
    // chat_id が未指定なら、group_id から対象グループのチャットを引く。
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

    // このユーザーが対象チャットの参加メンバーかを確認する。
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

    // message_id は AUTO_INCREMENT ではないため、
    // 同時送信で同じIDが採番されないよう、DB全体で使う採番ロックを取得する。
    $lockStmt = $pdo->query("SELECT GET_LOCK('tabi_messages_id_lock', 5)");
    $idLockAcquired = (int) $lockStmt->fetchColumn() === 1;

    if (!$idLockAcquired) {
        throw new RuntimeException("メッセージIDの採番ロックを取得できませんでした");
    }

    // ロック取得後にトランザクションを開始し、採番から挿入までをひとまとまりで処理する。
    $pdo->beginTransaction();

    // 現在の最大 message_id に 1 を足して、次に使うIDを決める。
    $idStmt = $pdo->query("
        SELECT COALESCE(MAX(message_id), 0) + 1
        FROM messages
    ");
    $messageId = (int) $idStmt->fetchColumn();

    // メッセージ本体を保存する。
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
    $insertStmt->bindValue(":message_id", $messageId, PDO::PARAM_INT);
    $insertStmt->bindValue(":chat_id", $chatId, PDO::PARAM_INT);
    $insertStmt->bindValue(":sender_user_id", $userId, PDO::PARAM_INT);
    $insertStmt->bindValue(":body", $body !== '' ? $body : null, PDO::PARAM_STR);
    $insertStmt->bindValue(":image_url", $imageUrl, PDO::PARAM_STR);
    $insertStmt->execute();

    // 保存直後のレコードを読み直して、送信者名やアイコン情報も含めたレスポンスを組み立てる。
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
    $messageStmt->bindValue(":message_id", $messageId, PDO::PARAM_INT);
    $messageStmt->execute();
    $message = $messageStmt->fetch(PDO::FETCH_ASSOC);

    // ここまで成功したら確定する。
    $pdo->commit();
    $pdo->query("SELECT RELEASE_LOCK('tabi_messages_id_lock')");
    $idLockAcquired = false;

    // 画面表示で使いやすいように、日付ラベルと時刻を生成する。
    $sentAt = new DateTimeImmutable($message["sent_at"]);
    $senderName = $message["sender_name"] ?? ($_SESSION["user_name"] ?? "自分");
    $dateLabel = formatDateLabel($sentAt);
// フロント側でそのまま利用できる形に整えて返す。
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
            "image_url" => $message["image_url"],
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
    // 途中で失敗したら、未確定の変更を破棄する。
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }

    // 取得済みならロックを必ず返す。
    if ($idLockAcquired) {
        $pdo->query("SELECT RELEASE_LOCK('tabi_messages_id_lock')");
    }

    // 詳細は外へ出しすぎず、送信失敗だけを通知する。
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => "メッセージの送信に失敗しました"
    ]);
}
