<?php
session_start();
header("Content-Type: application/json; charset=UTF-8");

require_once __DIR__ . "/../config/db.php";

function respond(array $payload, int $status = 200): void
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function firstCharacter(string $value): string
{
    $value = trim($value);
    if ($value === '') {
        return '?';
    }
    return function_exists('mb_substr') ? mb_substr($value, 0, 1) : substr($value, 0, 1);
}

function formatTime(?string $value): string
{
    if (!$value) return '';
    return (new DateTimeImmutable($value))->format('H:i');
}

if ($_SERVER["REQUEST_METHOD"] !== "GET") {
    respond(["success" => false, "message" => "GETで取得してください"], 405);
}

if (!isset($_SESSION["user_id"])) {
    respond(["success" => false, "message" => "ログインが必要です"], 401);
}

$userId = (int) $_SESSION["user_id"];

try {
    $stmt = $pdo->prepare("
        SELECT
            c.chat_id,
            c.trip_id,
            c.chat_type,
            t.title AS trip_title,
            t.start_date,
            t.end_date,
            tc.candidate_name,
            tc.img_url AS candidate_img_url,
            (
                SELECT u.name
                FROM trip_members tm
                INNER JOIN user_roles ur
                    ON ur.user_id = tm.user_id
                INNER JOIN roles r
                    ON r.role_id = ur.role_id
                INNER JOIN users u
                    ON u.user_id = tm.user_id
                WHERE tm.trip_id = c.trip_id
                    AND r.role_name = 'admin'
                LIMIT 1
            ) AS representative_name,
            latest.body AS last_message,
            latest.sent_at AS last_sent_at,
            COUNT(DISTINCT cm_all.user_id) AS member_count,
            (
                SELECT COUNT(*)
                FROM trip_members tm
                WHERE tm.trip_id = c.trip_id
            ) AS people_count,
            COUNT(DISTINCT unread.message_id) AS unread_count
        FROM chats c
        INNER JOIN chat_members cm_self
            ON cm_self.chat_id = c.chat_id
           AND cm_self.user_id = :user_id
        LEFT JOIN trips t ON t.trip_id = c.trip_id
        LEFT JOIN trip_candidates tc
            ON c.related_entity_type = 'hotel'
           AND tc.candidate_id = c.related_entity_id
        LEFT JOIN chat_members cm_all ON cm_all.chat_id = c.chat_id
        LEFT JOIN messages latest ON latest.message_id = (
            SELECT m2.message_id
            FROM messages m2
            WHERE m2.chat_id = c.chat_id
            ORDER BY m2.sent_at DESC, m2.message_id DESC
            LIMIT 1
        )
        LEFT JOIN messages unread ON unread.chat_id = c.chat_id
            AND unread.sender_user_id <> :user_id_unread
            AND NOT EXISTS (
                SELECT 1
                FROM message_reads mr
                WHERE mr.message_id = unread.message_id
                  AND mr.user_id = :user_id_read
            )
        WHERE c.chat_type = 'hotel'
        GROUP BY
            c.chat_id,
            c.trip_id,
            c.chat_type,
            t.title,
            tc.candidate_name,
            tc.img_url,
            latest.body,
            latest.sent_at
        ORDER BY COALESCE(latest.sent_at, c.created_at) DESC, c.chat_id DESC
    ");
    $stmt->bindValue(":user_id", $userId, PDO::PARAM_INT);
    $stmt->bindValue(":user_id_unread", $userId, PDO::PARAM_INT);
    $stmt->bindValue(":user_id_read", $userId, PDO::PARAM_INT);
    $stmt->execute();

    $contacts = [];

    while ($chat = $stmt->fetch(PDO::FETCH_ASSOC)) {
        $chatId = (int) $chat["chat_id"];

        $representativeName = $chat["representative_name"] ?: "代表者";

        $avatar = $chat["candidate_img_url"] ?: firstCharacter($representativeName);

        $stayPeriod = "";

        if (!empty($chat["start_date"]) && !empty($chat["end_date"])) {
            $stayPeriod =
                (new DateTimeImmutable($chat["start_date"]))->format("n/j")
                . "～"
                . (new DateTimeImmutable($chat["end_date"]))->format("n/j");
        }

        $contacts[] = [
            "id" => $chatId,
            "chat_id" => $chatId,

            "representative_name" => $representativeName,
            "people_count" => (int)$chat["people_count"],
            "stay_period" => $stayPeriod,

            "category" => "hotel",
            "avatar" => $avatar,

            "lastMessage" => $chat["last_message"] ?: "",
            "time" => formatTime($chat["last_sent_at"]),
            "unread" => (int)$chat["unread_count"],

            "trip_title" => $chat["trip_title"] ?: "",
        ];
    }

    respond([
        "success" => true,
        "contacts" => $contacts,
    ]);
} catch (Throwable $error) {
    respond([
        "success" => false,
        "message" => "コテージチャット一覧の取得に失敗しました",
    ], 500);
}
