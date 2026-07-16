<?php
session_start();
header("Content-Type: application/json; charset=UTF-8");

require_once __DIR__ . "/../config/db.php";
require_once __DIR__ . "/../Admin/includes/config.php";
require_once __DIR__ . "/../Admin/services/realtime.php";

function respond(array $payload, int $status = 200): void
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function cleanReportText($value, int $maxLength): string
{
    $text = trim((string) $value);
    if ($text === "") {
        return "";
    }

    if (function_exists("mb_substr")) {
        return mb_substr($text, 0, $maxLength);
    }

    return substr($text, 0, $maxLength);
}

function fetchReportTargetUser(PDO $pdo, string $targetType, int $targetId, int $reporterUserId): ?array
{
    if ($targetType === "user") {
        if ($targetId === $reporterUserId) {
            return null;
        }

        $stmt = $pdo->prepare("
            SELECT user_id, name
            FROM users
            WHERE user_id = :user_id
              AND COALESCE(status, 'active') <> 'deleted'
              AND deleted_at IS NULL
            LIMIT 1
        ");
        $stmt->bindValue(":user_id", $targetId, PDO::PARAM_INT);
        $stmt->execute();
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        return $user ?: null;
    }

    if ($targetType === "message") {
        $stmt = $pdo->prepare("
            SELECT
                m.message_id,
                m.sender_user_id,
                m.body,
                c.chat_id
            FROM messages m
            INNER JOIN chats c ON c.chat_id = m.chat_id
            INNER JOIN chat_members reporter_member
              ON reporter_member.chat_id = c.chat_id
             AND reporter_member.user_id = :reporter_user_id
            WHERE m.message_id = :message_id
              AND m.sender_user_id <> :sender_not_reporter_id
              AND m.admin_deleted_at IS NULL
            LIMIT 1
        ");
        $stmt->bindValue(":message_id", $targetId, PDO::PARAM_INT);
        $stmt->bindValue(":reporter_user_id", $reporterUserId, PDO::PARAM_INT);
        $stmt->bindValue(":sender_not_reporter_id", $reporterUserId, PDO::PARAM_INT);
        $stmt->execute();
        $message = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$message) {
            return null;
        }

        return [
            "user_id" => (int) $message["sender_user_id"],
            "message_id" => (int) $message["message_id"],
            "body" => $message["body"],
            "chat_id" => (int) $message["chat_id"],
        ];
    }

    return null;
}

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    respond(["success" => false, "message" => "POSTで送信してください。"], 405);
}

if (!isset($_SESSION["user_id"])) {
    respond(["success" => false, "message" => "ログインが必要です。"], 401);
}

$input = json_decode(file_get_contents("php://input"), true);
if (!is_array($input)) {
    respond(["success" => false, "message" => "JSON形式で送信してください。"], 400);
}

$reporterUserId = (int) $_SESSION["user_id"];
$targetType = cleanReportText($input["target_type"] ?? "", 20);
$targetId = (int) ($input["target_id"] ?? 0);
$reason = cleanReportText($input["reason"] ?? "", 255);
$detail = cleanReportText($input["detail"] ?? "", 2000);

if (!in_array($targetType, ["user", "message"], true) || $targetId <= 0) {
    respond(["success" => false, "message" => "通報対象が正しくありません。"], 400);
}

if ($reason === "") {
    respond(["success" => false, "message" => "通報理由を選択してください。"], 400);
}

try {
    $target = fetchReportTargetUser($pdo, $targetType, $targetId, $reporterUserId);
    if (!$target) {
        respond(["success" => false, "message" => "通報対象が見つかりません。"], 404);
    }

    $targetUserId = (int) $target["user_id"];
    $targetMessageId = $targetType === "message" ? (int) $target["message_id"] : null;
    $reportType = $targetType === "message" ? "不適切な投稿" : "迷惑行為";
    $now = (new DateTimeImmutable("now", new DateTimeZone("Asia/Tokyo")))->format("Y-m-d H:i:s");

    if ($targetType === "message") {
        $messageBody = cleanReportText($target["body"] ?? "", 500);
        $detailParts = [];
        if ($detail !== "") {
            $detailParts[] = $detail;
        }
        if ($messageBody !== "") {
            $detailParts[] = "対象メッセージ: " . $messageBody;
        }
        $detail = implode("\n\n", $detailParts);
    }

    $stmt = $pdo->prepare("
        INSERT INTO admin_reports (
            report_type,
            status,
            target_user_id,
            target_message_id,
            reporter_user_id,
            reason,
            detail,
            admin_note,
            reported_at,
            resolved_at,
            updated_at
        ) VALUES (
            :report_type,
            'open',
            :target_user_id,
            :target_message_id,
            :reporter_user_id,
            :reason,
            :detail,
            '',
            :reported_at,
            NULL,
            :updated_at
        )
    ");
    $stmt->bindValue(":report_type", $reportType);
    $stmt->bindValue(":target_user_id", $targetUserId, PDO::PARAM_INT);
    if ($targetMessageId === null) {
        $stmt->bindValue(":target_message_id", null, PDO::PARAM_NULL);
    } else {
        $stmt->bindValue(":target_message_id", $targetMessageId, PDO::PARAM_INT);
    }
    $stmt->bindValue(":reporter_user_id", $reporterUserId, PDO::PARAM_INT);
    $stmt->bindValue(":reason", $reason);
    $stmt->bindValue(":detail", $detail !== "" ? $detail : null);
    $stmt->bindValue(":reported_at", $now);
    $stmt->bindValue(":updated_at", $now);
    $stmt->execute();

    $reportId = (int) $pdo->lastInsertId();

    sendRealtimeEvent("admin:global", "report_created", [
        "report_id" => $reportId,
    ]);

    respond([
        "success" => true,
        "message" => "通報を送信しました。",
        "report_id" => $reportId,
    ]);
} catch (Throwable $error) {
    respond(["success" => false, "message" => "通報の送信に失敗しました。"], 500);
}
