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

function userProfileColumnExists(PDO $pdo, string $table, string $column): bool
{
    $stmt = $pdo->prepare("
        SELECT COUNT(*)
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = :table_name
          AND COLUMN_NAME = :column_name
    ");
    $stmt->execute([
        "table_name" => $table,
        "column_name" => $column,
    ]);

    return (int) $stmt->fetchColumn() > 0;
}

function normalizePublicIconKey(?string $iconValue): ?string
{
    if (!$iconValue) {
        return null;
    }

    $iconValue = trim($iconValue);
    if ($iconValue === "") {
        return null;
    }

    if (strpos($iconValue, "http://") === 0 || strpos($iconValue, "https://") === 0) {
        $parts = parse_url($iconValue);
        $path = $parts["path"] ?? "";
        $key = ltrim(rawurldecode($path), "/");
        return $key !== "" ? $key : null;
    }

    return ltrim($iconValue, "/");
}

function resolvePublicIconUrl(?string $iconValue): ?string
{
    if (!$iconValue) {
        return null;
    }

    if (strpos($iconValue, "http://") === 0 || strpos($iconValue, "https://") === 0) {
        return $iconValue;
    }

    $aws = loadAwsConfig();
    $s3 = $aws ? createS3Client($aws) : null;

    return ($s3 && $aws) ? presignS3Url($s3, $aws["bucket"], $iconValue) : null;
}

function formatRegisteredDate(?string $value): ?string
{
    if (!$value) {
        return null;
    }

    try {
        return (new DateTimeImmutable($value))->format("Y/m/d");
    } catch (Throwable $error) {
        return null;
    }
}

if ($_SERVER["REQUEST_METHOD"] !== "GET") {
    respond(["success" => false, "message" => "GETで送信してください。"], 405);
}

if (!isset($_SESSION["user_id"])) {
    respond(["success" => false, "message" => "ログインが必要です。"], 401);
}

$currentUserId = (int) $_SESSION["user_id"];
$targetUserId = (int) ($_GET["user_id"] ?? 0);

if ($targetUserId <= 0) {
    respond(["success" => false, "message" => "ユーザーIDが正しくありません。"], 400);
}

try {
    $iconSelect = userProfileColumnExists($pdo, "users", "icon_key")
        ? "COALESCE(u.icon_key, u.icon_url) AS icon_value"
        : "u.icon_url AS icon_value";

    $deletedCondition = userProfileColumnExists($pdo, "users", "deleted_at")
        ? "AND u.deleted_at IS NULL"
        : "";

    $stmt = $pdo->prepare("
        SELECT
            u.user_id,
            u.name,
            {$iconSelect},
            u.created_at,
            p.self_introduction
        FROM users u
        LEFT JOIN user_profiles p ON p.user_id = u.user_id
        WHERE u.user_id = :user_id
          AND COALESCE(u.status, 'active') <> 'deleted'
          {$deletedCondition}
        LIMIT 1
    ");
    $stmt->bindValue(":user_id", $targetUserId, PDO::PARAM_INT);
    $stmt->execute();
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user) {
        respond(["success" => false, "message" => "ユーザーが見つかりません。"], 404);
    }

    $iconKey = normalizePublicIconKey($user["icon_value"] ?? null);
    $iconUrl = resolvePublicIconUrl($iconKey);

    $groupsStmt = $pdo->prepare("
        SELECT
            g.group_id,
            g.group_name
        FROM group_members target_member
        INNER JOIN group_members current_member
          ON current_member.group_id = target_member.group_id
         AND current_member.user_id = :current_user_id
         AND current_member.invitation_status = 'accepted'
        INNER JOIN user_groups g ON g.group_id = target_member.group_id
        WHERE target_member.user_id = :target_user_id
          AND target_member.invitation_status = 'accepted'
          AND COALESCE(g.status, 'active') = 'active'
        ORDER BY g.created_at DESC, g.group_id DESC
    ");
    $groupsStmt->bindValue(":current_user_id", $currentUserId, PDO::PARAM_INT);
    $groupsStmt->bindValue(":target_user_id", $targetUserId, PDO::PARAM_INT);
    $groupsStmt->execute();

    $commonGroups = array_map(static function (array $group): array {
        return [
            "group_id" => (int) $group["group_id"],
            "group_name" => $group["group_name"],
        ];
    }, $groupsStmt->fetchAll());

    respond([
        "success" => true,
        "user" => [
            "user_id" => (int) $user["user_id"],
            "name" => $user["name"],
            "icon_key" => $iconKey,
            "icon_url" => $iconUrl,
            "self_introduction" => $user["self_introduction"] ?? null,
            "registered_at" => formatRegisteredDate($user["created_at"] ?? null),
            "common_groups" => $commonGroups,
        ],
    ]);
} catch (Throwable $error) {
    respond(["success" => false, "message" => "プロフィールの取得に失敗しました。"], 500);
}
