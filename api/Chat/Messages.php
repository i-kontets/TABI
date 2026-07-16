<?php
session_start();
header("Content-Type: application/json; charset=UTF-8");

require_once __DIR__ . "/../config/db.php";
require_once __DIR__ . "/../Groups/S3Common.php";

function respond(array $payload, int $status = 200): void
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

// users.icon_url にはS3キー（例: User/2/profile/xxx.jpeg）が保存されているため、
// 表示可能な署名付きURLへ変換する。変換できない場合は null を返す。
function resolveIconUrl(?string $iconValue): ?string
{
    static $initialized = false, $s3 = null, $aws = null, $cache = [];

    $iconValue = trim((string) $iconValue);

    if ($iconValue === "") {
        return null;
    }

    // 誤って完全URLが保存されている場合はpath部分をS3キーに戻す
    if (strpos($iconValue, "http://") === 0 || strpos($iconValue, "https://") === 0) {
        $path = parse_url($iconValue, PHP_URL_PATH);

        if (!$path) {
            return null;
        }

        $iconValue = rawurldecode($path);
    }

    $key = ltrim($iconValue, "/");

    if ($key === "") {
        return null;
    }

    if (array_key_exists($key, $cache)) {
        return $cache[$key];
    }

    if (!$initialized) {
        $initialized = true;

        try {
            $aws = loadAwsConfig();
            $s3 = $aws ? createS3Client($aws) : null;
        } catch (Throwable $error) {
            $s3 = null;
        }
    }

    return $cache[$key] = ($s3 && $aws) ? presignS3Url($s3, $aws["bucket"], $key) : null;
}

function firstCharacter(string $value): string
{
    $value = trim($value);

    if ($value === "") {
        return "?";
    }

    return function_exists("mb_substr") ? mb_substr($value, 0, 1) : substr($value, 0, 1);
}

function formatDateLabel(?string $value): string
{
    if (!$value) {
        return "";
    }

    $date = new DateTimeImmutable($value);
    $oneYearAgo = (new DateTimeImmutable("now"))->modify("-1 year");

    if ($date < $oneYearAgo) {
        return $date->format("Y年n月j日");
    }

    return $date->format("n月j日");
}

function formatTime(?string $value): string
{
    if (!$value) {
        return "";
    }

    return (new DateTimeImmutable($value))->format("H:i");
}

function normalizeCategory(?string $chatType): string
{
    if ($chatType === "hotel") {
        return "hotel";
    }

    if ($chatType === "support") {
        return "friend";
    }

    return "group";
}

function ensureMember(PDO $pdo, int $chatId, int $userId): void
{
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
        respond([
            "success" => false,
            "message" => "You do not have permission to view this chat."
        ], 403);
    }
}

function resolveChatId(PDO $pdo, int $userId, $chatIdInput, $groupIdInput): int
{
    $chatId = filter_var($chatIdInput, FILTER_VALIDATE_INT);
    $groupId = filter_var($groupIdInput, FILTER_VALIDATE_INT);

    if ($chatId && $chatId > 0) {
        ensureMember($pdo, (int) $chatId, $userId);
        return (int) $chatId;
    }

    if ($groupId && $groupId > 0) {
        $chatStmt = $pdo->prepare("
            SELECT c.chat_id
            FROM chats c
            INNER JOIN trips t ON t.trip_id = c.trip_id
            INNER JOIN chat_members cm ON cm.chat_id = c.chat_id
            WHERE t.group_id = :group_id
              AND c.chat_type = 'group'
              AND cm.user_id = :user_id
            ORDER BY c.chat_id DESC
            LIMIT 1
        ");
        $chatStmt->bindValue(":group_id", $groupId, PDO::PARAM_INT);
        $chatStmt->bindValue(":user_id", $userId, PDO::PARAM_INT);
        $chatStmt->execute();
        $resolvedId = $chatStmt->fetchColumn();

        if ($resolvedId) {
            return (int) $resolvedId;
        }

        respond([
            "success" => true,
            "chat_id" => null,
            "member_count" => 0,
            "contact" => null,
            "messages" => []
        ]);
    }

    $chatStmt = $pdo->prepare("
        SELECT c.chat_id
        FROM chats c
        INNER JOIN chat_members cm ON cm.chat_id = c.chat_id
        WHERE cm.user_id = :user_id
          AND c.chat_type = 'hotel'
        ORDER BY c.created_at DESC, c.chat_id DESC
        LIMIT 1
    ");
    $chatStmt->bindValue(":user_id", $userId, PDO::PARAM_INT);
    $chatStmt->execute();
    $resolvedId = $chatStmt->fetchColumn();

    if ($resolvedId) {
        return (int) $resolvedId;
    }

    respond([
        "success" => false,
        "message" => "Hotel chat not found."
    ], 404);
}

function fetchContact(PDO $pdo, int $chatId): array
{
    $contactStmt = $pdo->prepare("
        SELECT
            c.chat_id,
            c.chat_type,
            c.related_entity_type,
            c.related_entity_id,
            t.title AS trip_title,
            tc.candidate_name,
            tc.img_url,
            latest.body AS last_message,
            latest.sent_at AS last_sent_at,
            COUNT(DISTINCT cm.user_id) AS member_count
        FROM chats c
        LEFT JOIN trips t ON t.trip_id = c.trip_id
        LEFT JOIN trip_candidates tc
          ON c.related_entity_type = 'hotel'
         AND tc.candidate_id = c.related_entity_id
        LEFT JOIN chat_members cm ON cm.chat_id = c.chat_id
        LEFT JOIN messages latest ON latest.message_id = (
            SELECT m2.message_id
            FROM messages m2
            INNER JOIN chat_members cm_sender
              ON cm_sender.chat_id = m2.chat_id
             AND cm_sender.user_id = m2.sender_user_id
            WHERE m2.chat_id = c.chat_id
            ORDER BY m2.sent_at DESC, m2.message_id DESC
            LIMIT 1
        )
        WHERE c.chat_id = :chat_id
        GROUP BY
            c.chat_id,
            c.chat_type,
            c.related_entity_type,
            c.related_entity_id,
            t.title,
            tc.candidate_name,
            tc.img_url,
            latest.body,
            latest.sent_at
        LIMIT 1
    ");
    $contactStmt->bindValue(":chat_id", $chatId, PDO::PARAM_INT);
    $contactStmt->execute();
    $chat = $contactStmt->fetch(PDO::FETCH_ASSOC);

    if (!$chat) {
        return [];
    }

    $category = normalizeCategory($chat["chat_type"] ?? null);
    $name = $chat["candidate_name"] ?: ($chat["trip_title"] ?: "Chat #" . $chatId);

    return [
        "id" => $chatId,
        "chat_id" => $chatId,
        "name" => $name,
        "category" => $category,
        "avatar" => resolveIconUrl($chat["img_url"]) ?: firstCharacter($name),
        "lastMessage" => $chat["last_message"] ?: "",
        "time" => formatTime($chat["last_sent_at"]),
        "unread" => 0,
        "memberCount" => (int) $chat["member_count"],
        "related_entity_type" => $chat["related_entity_type"],
        "related_entity_id" => $chat["related_entity_id"] !== null ? (int) $chat["related_entity_id"] : null
    ];
}

function fetchMessages(PDO $pdo, int $chatId, int $userId): array
{
    $messageStmt = $pdo->prepare("
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
        INNER JOIN chat_members cm_sender
          ON cm_sender.chat_id = m.chat_id
         AND cm_sender.user_id = m.sender_user_id
        LEFT JOIN users u ON u.user_id = m.sender_user_id
        LEFT JOIN message_reads mr ON mr.message_id = m.message_id
        WHERE m.chat_id = :chat_id
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
    ");
    $messageStmt->bindValue(":current_user_id", $userId, PDO::PARAM_INT);
    $messageStmt->bindValue(":chat_id", $chatId, PDO::PARAM_INT);
    $messageStmt->execute();

    $messages = [];

    while ($message = $messageStmt->fetch(PDO::FETCH_ASSOC)) {
        $senderName = $message["sender_name"] ?? "Unknown user";

        // DBに保存されている元のS3オブジェクトキー
        $senderIconKey = trim(
            (string) ($message["sender_icon_url"] ?? "")
        );

        // S3署名付きURLへ変換
        $senderIconUrl = resolveIconUrl($senderIconKey);

        $messages[] = [
            "id" => (int) $message["message_id"],
            "message_id" => (int) $message["message_id"],
            "chat_id" => (int) $message["chat_id"],
            "sender_user_id" => (int) $message["sender_user_id"],
            "sender" => $senderName,
            "sender_name" => $senderName,
            "senderName" => $senderName,

            "avatar" => $senderIconUrl ?: firstCharacter($senderName),
            "sender_icon_url" => $senderIconUrl,

            // 原因確認用
            "text" => $message["body"],
            "body" => $message["body"],
            "image_url" => $message["image_url"],
            "sent_at" => $message["sent_at"],
            "date" => formatDateLabel($message["sent_at"]),
            "time" => formatTime($message["sent_at"]),
            "readCount" => (int) $message["read_count"],
            "read_count" => (int) $message["read_count"],
            "isRead" => (bool) $message["is_read"],
            "isMine" => (int) $message["sender_user_id"] === $userId
        ];
    }

    return $messages;
}

if ($_SERVER["REQUEST_METHOD"] !== "GET") {
    respond([
        "success" => false,
        "message" => "Use GET."
    ], 405);
}

if (!isset($_SESSION["user_id"])) {
    respond([
        "success" => false,
        "message" => "Login required."
    ], 401);
}

$userId = (int) $_SESSION["user_id"];

try {
    $chatId = resolveChatId(
        $pdo,
        $userId,
        $_GET["chat_id"] ?? null,
        $_GET["group_id"] ?? null
    );

    ensureMember($pdo, $chatId, $userId);

    $contact = fetchContact($pdo, $chatId);

    /*
     * 原因調査用
     * Webアプリが実際に接続しているDBの情報を取得する
     */
    /*
     * Webアプリが参照しているusersテーブルから、
     * user_id = 3 のデータを直接取得する
     */
    respond([
        "success" => true,

        // 原因調査用：確認が終わったら削除する
        "chat_id" => $chatId,
        "member_count" => (int) ($contact["memberCount"] ?? 0),
        "contact" => $contact,
        "messages" => fetchMessages($pdo, $chatId, $userId)
    ]);
} catch (Throwable $error) {
    respond([
        "success" => false,
        "message" => "Failed to load messages."
    ], 500);
}
