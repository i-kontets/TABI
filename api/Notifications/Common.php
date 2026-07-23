<?php

declare(strict_types=1);

/**
 * 通知履歴APIだけで使う小さな共通処理です。
 * user_idはリクエストから受け取らず、ログイン中のセッションだけを信頼します。
 */
function notificationRespond(array $payload, int $status = 200): void
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function notificationRequireLoginUserId(): int
{
    if (!isset($_SESSION["user_id"])) {
        notificationRespond(["success" => false, "message" => "ログインが必要です。"], 401);
    }
    return (int) $_SESSION["user_id"];
}

function notificationRequireMethod(string $expectedMethod): void
{
    if (($_SERVER["REQUEST_METHOD"] ?? "") !== $expectedMethod) {
        notificationRespond(["success" => false, "message" => "許可されていないメソッドです。"], 405);
    }
}

function notificationRejectIfCrossOrigin(): void
{
    $host = $_SERVER["HTTP_HOST"] ?? "";
    $origin = $_SERVER["HTTP_ORIGIN"] ?? "";
    $referer = $_SERVER["HTTP_REFERER"] ?? "";
    $source = $origin !== "" ? $origin : $referer;
    if ($source === "" || $host === "") return;
    $sourceHost = parse_url($source, PHP_URL_HOST);
    if ($sourceHost !== null && strcasecmp($sourceHost, $host) !== 0) {
        notificationRespond(["success" => false, "message" => "不正な送信元です。"], 403);
    }
}

function notificationReadPositiveInt($value, string $name): int
{
    $intValue = filter_var($value, FILTER_VALIDATE_INT);
    if ($intValue === false || $intValue < 1) notificationRespond(["success" => false, "message" => $name . "の値が正しくありません。"], 400);
    return (int) $intValue;
}

function notificationReadLimit(): int
{
    $limit = filter_var($_GET["limit"] ?? 20, FILTER_VALIDATE_INT);
    if ($limit === false || $limit < 1 || $limit > 50) notificationRespond(["success" => false, "message" => "limitの値が正しくありません。"], 400);
    return (int) $limit;
}

function notificationReadOffset(): int
{
    $offset = filter_var($_GET["offset"] ?? 0, FILTER_VALIDATE_INT);
    if ($offset === false || $offset < 0) notificationRespond(["success" => false, "message" => "offsetの値が正しくありません。"], 400);
    return (int) $offset;
}

function notificationReadCategory(): string
{
    $category = (string) ($_GET["category"] ?? "all");
    if (!in_array($category, ["all", "unread", "chat", "schedule", "survey", "system"], true)) notificationRespond(["success" => false, "message" => "categoryの値が正しくありません。"], 400);
    return $category;
}

function notificationCategorySql(string $category): array
{
    if ($category === "unread") return [" AND nr.is_read = 0", []];
    if (in_array($category, ["chat", "schedule", "survey", "system"], true)) return [" AND n.notification_type = :category", [":category" => $category]];
    return ["", []];
}

function notificationDecodeDetailData($value)
{
    if ($value === null || $value === "") return null;
    $decoded = json_decode((string) $value, true);
    if (json_last_error() !== JSON_ERROR_NONE || !is_array($decoded)) return null;
    return $decoded;
}

function notificationSafeActionPath($path): ?string
{
    if ($path === null || $path === "" || !is_string($path)) return null;
    $path = trim($path);
    if ($path === "") return null;
    // action_pathはTABI内部の遷移先だけとして扱います。外部URLやjavascript:は返しません。
    if (preg_match('#^/TABI(?:/|$)#', $path) !== 1) return null;
    return $path;
}

function notificationRowToResponse(array $row): array
{
    return [
        "recipientId" => (int) $row["recipient_id"], "notificationId" => (int) $row["notification_id"], "category" => (string) $row["notification_type"], "subtype" => $row["notification_subtype"] !== null ? (string) $row["notification_subtype"] : null,
        "title" => (string) $row["title"], "body" => (string) $row["body"], "targetType" => $row["target_type"] !== null ? (string) $row["target_type"] : null, "targetId" => $row["target_id"] !== null ? (int) $row["target_id"] : null,
        "actionPath" => notificationSafeActionPath($row["action_path"] ?? null), "detailData" => notificationDecodeDetailData($row["detail_data"] ?? null), "isRead" => (bool) $row["is_read"], "readAt" => $row["read_at"], "createdAt" => $row["created_at"], "receivedAt" => $row["received_at"], "expiresAt" => $row["expires_at"],
    ];
}

function notificationFetchRecipient(PDO $pdo, int $recipientId, int $userId): ?array
{
    // recipient_id and user_id are both required to protect other users' notifications.
    $stmt = $pdo->prepare("SELECT recipient_id, is_read, read_at FROM notification_recipients WHERE recipient_id = :recipient_id AND user_id = :user_id LIMIT 1");
    $stmt->bindValue(":recipient_id", $recipientId, PDO::PARAM_INT);
    $stmt->bindValue(":user_id", $userId, PDO::PARAM_INT);
    $stmt->execute();
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    return $row ?: null;
}

function notificationUnreadCount(PDO $pdo, int $userId): int
{
    // 期限切れ通知は現在画面に出ないため、未読件数にも含めません。
    $stmt = $pdo->prepare("SELECT COUNT(*) AS unread_count FROM notification_recipients AS nr INNER JOIN notifications AS n ON n.notification_id = nr.notification_id WHERE nr.user_id = :user_id AND nr.is_read = 0 AND (n.expires_at IS NULL OR n.expires_at > NOW())");
    $stmt->bindValue(":user_id", $userId, PDO::PARAM_INT);
    $stmt->execute();
    return (int) $stmt->fetchColumn();
}

function notificationBadgeText(int $unreadCount): ?string
{
    if ($unreadCount <= 0) return null;
    return $unreadCount >= 100 ? "99+" : (string) $unreadCount;
}
