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

function firstCharacter(string $value): string
{
    $value = trim($value);

    if ($value === "") {
        return "?";
    }

    return function_exists("mb_substr") ? mb_substr($value, 0, 1) : substr($value, 0, 1);
}

function formatTime(?string $value): string
{
    if (!$value) {
        return "";
    }

    return (new DateTimeImmutable($value))->format("H:i");
}

function resolveUserIconUrl(?string $iconValue): ?string
{
    static $initialized = false, $s3 = null, $aws = null, $cache = [];

    $iconValue = trim((string) $iconValue);

    if ($iconValue === "") {
        return null;
    }

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

function normalizeCategory(?string $chatType): string
{
    if ($chatType === "hotel") {
        return "hotel";
    }

    if ($chatType === "friend" || $chatType === "direct" || $chatType === "support") {
        return "friend";
    }

    return "group";
}

if ($_SERVER["REQUEST_METHOD"] !== "GET") {
    respond([
        "success" => false,
        "message" => "GETで送信してください。"
    ], 405);
}

if (!isset($_SESSION["user_id"])) {
    respond([
        "success" => false,
        "message" => "ログインが必要です。"
    ], 401);
}

$userId = (int) $_SESSION["user_id"];

try {
    $stmt = $pdo->prepare("
        SELECT
            c.chat_id,
            c.chat_type,
            c.related_entity_type,
            c.related_entity_id,
            t.title AS trip_title,
            tc.candidate_name,
            tc.img_url AS candidate_img_url,
            other_user.name AS other_user_name,
            other_user.icon_url AS other_user_icon_url,
            latest.body AS last_message,
            latest.sent_at AS last_sent_at,
            COUNT(DISTINCT cm_all.user_id) AS member_count,
            COUNT(DISTINCT unread.message_id) AS unread_count
        FROM chat_members cm_self
        INNER JOIN chats c ON c.chat_id = cm_self.chat_id
        LEFT JOIN trips t ON t.trip_id = c.trip_id
        LEFT JOIN trip_candidates tc
          ON c.related_entity_type = 'hotel'
         AND tc.candidate_id = c.related_entity_id
        LEFT JOIN chat_members cm_all ON cm_all.chat_id = c.chat_id
        LEFT JOIN users other_user ON other_user.user_id = (
            SELECT cm_other.user_id
            FROM chat_members cm_other
            WHERE cm_other.chat_id = c.chat_id
              AND cm_other.user_id <> :other_user_id
            ORDER BY cm_other.user_id ASC
            LIMIT 1
        )
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
        LEFT JOIN messages unread ON unread.chat_id = c.chat_id
            AND unread.sender_user_id <> :unread_user_id
            AND EXISTS (
                SELECT 1
                FROM chat_members cm_unread_sender
                WHERE cm_unread_sender.chat_id = unread.chat_id
                  AND cm_unread_sender.user_id = unread.sender_user_id
            )
            AND NOT EXISTS (
                SELECT 1
                FROM message_reads mr
                WHERE mr.message_id = unread.message_id
                  AND mr.user_id = :read_user_id
            )
        WHERE cm_self.user_id = :user_id
        GROUP BY
            c.chat_id,
            c.chat_type,
            c.related_entity_type,
            c.related_entity_id,
            t.title,
            tc.candidate_name,
            tc.img_url,
            other_user.name,
            other_user.icon_url,
            latest.body,
            latest.sent_at
        ORDER BY COALESCE(latest.sent_at, c.created_at) DESC, c.chat_id DESC
    ");
    $stmt->bindValue(":user_id", $userId, PDO::PARAM_INT);
    $stmt->bindValue(":other_user_id", $userId, PDO::PARAM_INT);
    $stmt->bindValue(":unread_user_id", $userId, PDO::PARAM_INT);
    $stmt->bindValue(":read_user_id", $userId, PDO::PARAM_INT);
    $stmt->execute();

    $contacts = [];

    while ($chat = $stmt->fetch(PDO::FETCH_ASSOC)) {
        $chatId = (int) $chat["chat_id"];
        $memberCount = (int) $chat["member_count"];
        $category = normalizeCategory($chat["chat_type"] ?? null);

        if ($category !== "hotel" && $memberCount <= 2) {
            $category = "friend";
        }

        $name = $chat["trip_title"] ?: "チャット #" . $chatId;
        $avatar = "";

        if ($category === "hotel") {
            $name = $chat["candidate_name"] ?: $name;
            $avatar = $chat["candidate_img_url"] ?: "";
        } elseif ($category === "friend") {
            $name = $chat["other_user_name"] ?: $name;
            $avatar = resolveUserIconUrl($chat["other_user_icon_url"] ?? null) ?: "";
        }

        if ($avatar === "") {
            $avatar = firstCharacter($name);
        }

        $contacts[] = [
            "id" => $chatId,
            "chat_id" => $chatId,
            "name" => $name,
            "category" => $category,
            "avatar" => $avatar,
            "lastMessage" => $chat["last_message"] ?: "",
            "time" => formatTime($chat["last_sent_at"]),
            "unread" => (int) $chat["unread_count"],
            "memberCount" => $memberCount,
            "related_entity_type" => $chat["related_entity_type"],
            "related_entity_id" => $chat["related_entity_id"] !== null ? (int) $chat["related_entity_id"] : null
        ];
    }

    respond([
        "success" => true,
        "contacts" => $contacts
    ]);
} catch (Throwable $error) {
    respond([
        "success" => false,
        "message" => "チャット一覧の取得に失敗しました。"
    ], 500);
}
