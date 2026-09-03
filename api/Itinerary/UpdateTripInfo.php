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

function normalizeDateValue($value): ?string
{
    if ($value === null || $value === "") {
        return null;
    }

    if (!is_string($value) || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $value)) {
        respond([
            "success" => false,
            "message" => "日付の形式が正しくありません。"
        ], 400);
    }

    return $value;
}

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    respond([
        "success" => false,
        "message" => "POSTで送信してください。"
    ], 405);
}

if (!isset($_SESSION["user_id"])) {
    respond([
        "success" => false,
        "message" => "ログインが必要です。"
    ], 401);
}

$input = json_decode(file_get_contents("php://input"), true);
$groupId = filter_var($input["group_id"] ?? null, FILTER_VALIDATE_INT);
$title = trim((string) ($input["title"] ?? ""));
$startDate = normalizeDateValue($input["start_date"] ?? null);
$endDate = normalizeDateValue($input["end_date"] ?? null);
$userId = (int) $_SESSION["user_id"];

if (!$groupId || $groupId < 1) {
    respond([
        "success" => false,
        "message" => "group_idが正しくありません。"
    ], 400);
}

if ($title === "") {
    respond([
        "success" => false,
        "message" => "しおりタイトルを入力してください。"
    ], 400);
}

try {
    $adminStmt = $pdo->prepare("
        SELECT 1
        FROM group_members
        WHERE group_id = :group_id
          AND user_id = :user_id
          AND role_in_group = 'admin'
          AND invitation_status = 'accepted'
        LIMIT 1
    ");
    $adminStmt->execute([
        ":group_id" => $groupId,
        ":user_id" => $userId
    ]);

    if (!$adminStmt->fetchColumn()) {
        respond([
            "success" => false,
            "message" => "旅行情報を変更できるのは管理者だけです。"
        ], 403);
    }

    $tripStmt = $pdo->prepare("
        SELECT trip_id
        FROM trips
        WHERE group_id = :group_id
        ORDER BY trip_id DESC
        LIMIT 1
    ");
    $tripStmt->execute([
        ":group_id" => $groupId
    ]);
    $trip = $tripStmt->fetch(PDO::FETCH_ASSOC);

    if (!$trip) {
        respond([
            "success" => false,
            "message" => "対象の旅行が見つかりません。"
        ], 404);
    }

    $updateStmt = $pdo->prepare("
        UPDATE trips
        SET title = :title,
            start_date = :start_date,
            end_date = :end_date
        WHERE trip_id = :trip_id
        LIMIT 1
    ");
    $updateStmt->bindValue(":title", $title, PDO::PARAM_STR);
    $updateStmt->bindValue(":start_date", $startDate, $startDate === null ? PDO::PARAM_NULL : PDO::PARAM_STR);
    $updateStmt->bindValue(":end_date", $endDate, $endDate === null ? PDO::PARAM_NULL : PDO::PARAM_STR);
    $updateStmt->bindValue(":trip_id", (int) $trip["trip_id"], PDO::PARAM_INT);
    $updateStmt->execute();

    respond([
        "success" => true,
        "trip" => [
            "id" => (string) $groupId,
            "trip_id" => (int) $trip["trip_id"],
            "name" => $title,
            "title" => $title,
            "start_date" => $startDate,
            "end_date" => $endDate
        ]
    ]);
} catch (Throwable $error) {
    respond([
        "success" => false,
        "message" => "旅行情報の変更に失敗しました。",
        "error" => $error->getMessage()
    ], 500);
}
