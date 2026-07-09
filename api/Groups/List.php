<?php
ini_set("display_errors", 1);
ini_set("display_startup_errors", 1);
error_reporting(E_ALL);

session_start();

header("Content-Type: application/json; charset=UTF-8");

require_once __DIR__ . "/../config/db.php";

// S3Common.php が api/Groups/S3Common.php にある場合
require_once __DIR__ . "/S3Common.php";

// S3Common.php が api/S3Common.php にある場合は上ではなくこっち
// require_once __DIR__ . "/../S3Common.php";

function respond(array $payload, int $status = 200): void
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function resolveStatus(?string $startDate, ?string $endDate): string
{
    $today = (new DateTimeImmutable("today"))->format("Y-m-d");

    if ($endDate && $endDate < $today) {
        return "終了";
    }

    if ($startDate && $endDate && $startDate <= $today && $today <= $endDate) {
        return "進行中";
    }

    return "計画中";
}

function formatDateRange(?string $startDate, ?string $endDate): string
{
    if (!$startDate || !$endDate) {
        return "日程未定";
    }

    return str_replace("-", "/", $startDate) . " - " . str_replace("-", "/", $endDate);
}

if ($_SERVER["REQUEST_METHOD"] !== "GET") {
    respond([
        "success" => false,
        "message" => "GET method is required",
    ], 405);
}

if (!isset($_SESSION["user_id"])) {
    respond([
        "success" => false,
        "message" => "Login is required",
    ], 401);
}

$userId = (int) $_SESSION["user_id"];

try {
    $stmt = $pdo->prepare("
        SELECT
            g.group_id,
            g.group_name,
            COUNT(DISTINCT gm_all.user_id) AS member_count,
            t.trip_id,
            t.title AS trip_title,
            t.start_date,
            t.end_date,
            t.group_icon
        FROM group_members gm_self
        INNER JOIN user_groups g ON g.group_id = gm_self.group_id
        LEFT JOIN group_members gm_all
            ON gm_all.group_id = g.group_id
           AND gm_all.invitation_status = 'accepted'
        LEFT JOIN trips t ON t.trip_id = (
            SELECT t2.trip_id
            FROM trips t2
            WHERE t2.group_id = g.group_id
            ORDER BY (t2.start_date IS NULL) ASC, t2.start_date DESC, t2.trip_id DESC
            LIMIT 1
        )
        WHERE gm_self.user_id = :user_id
          AND gm_self.invitation_status = 'accepted'
          AND g.status = 'active'
        GROUP BY
            g.group_id,
            g.group_name,
            t.trip_id,
            t.title,
            t.start_date,
            t.end_date,
            t.group_icon
        ORDER BY (t.start_date IS NULL) ASC, t.start_date ASC, g.group_id DESC
    ");
    $stmt->bindValue(":user_id", $userId, PDO::PARAM_INT);
    $stmt->execute();

    $aws = loadAwsConfig();
    $s3 = $aws ? createS3Client($aws) : null;
    $bucket = $aws ? $aws["bucket"] : null;

    $groups = [];

    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        $imageUrl = null;

        if (!empty($row["group_icon"]) && $s3 && $bucket) {
            $imageUrl = presignS3Url($s3, $bucket, $row["group_icon"]);
        }

        $groups[] = [
            "id" => (string) $row["group_id"],
            "trip_id" => $row["trip_id"] !== null ? (int) $row["trip_id"] : null,
            "name" => $row["trip_title"] ?: $row["group_name"],
            "date" => formatDateRange($row["start_date"], $row["end_date"]),
            "members" => (int) $row["member_count"],
            "status" => resolveStatus($row["start_date"], $row["end_date"]),
            "image_url" => $imageUrl,
        ];
    }

    respond([
        "success" => true,
        "groups" => $groups,
    ]);
} catch (Throwable $error) {
    respond([
        "success" => false,
        "message" => "Failed to fetch groups",
        "error" => $error->getMessage(),
    ], 500);
}
