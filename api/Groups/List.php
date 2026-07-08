<?php
session_start();
header("Content-Type: application/json; charset=UTF-8");

// データベース接続設定を読み込む（$pdo を使用）
require_once __DIR__ . "/../config/db.php";

// レスポンスをJSONで返して終了する共通関数（Chat/List.php と同じ形式）
function respond(array $payload, int $status = 200): void
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

// 旅行の開始日・終了日から表示用ステータスを判定する
// 終了日が過去      → 終了
// 今日が期間内      → 進行中
// それ以外（未来・日程未定） → 計画中
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

// 開始日・終了日を「YYYY/MM/DD - YYYY/MM/DD」形式の表示文字列にする
function formatDateRange(?string $startDate, ?string $endDate): string
{
    if (!$startDate || !$endDate) {
        return "日程未定";
    }

    $start = str_replace("-", "/", $startDate);
    $end = str_replace("-", "/", $endDate);

    return "{$start} - {$end}";
}

// GET 以外は受け付けない
if ($_SERVER["REQUEST_METHOD"] !== "GET") {
    respond([
        "success" => false,
        "message" => "GETで送信してください。"
    ], 405);
}

// 未ログインなら401
if (!isset($_SESSION["user_id"])) {
    respond([
        "success" => false,
        "message" => "ログインが必要です。"
    ], 401);
}

$userId = (int) $_SESSION["user_id"];

try {
    // ログイン中ユーザーが参加している（招待承認済みの）グループ一覧を取得する。
    // - member_count : 承認済みメンバー数
    // - trips        : グループに紐づく最新の旅行（日程・ステータス表示用）
    $stmt = $pdo->prepare("
        SELECT
            g.group_id,
            g.group_name,
            COUNT(DISTINCT gm_all.user_id) AS member_count,
            t.trip_id,
            t.start_date,
            t.end_date
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
            t.start_date,
            t.end_date
        ORDER BY (t.start_date IS NULL) ASC, t.start_date ASC, g.group_id DESC
    ");
    $stmt->bindValue(":user_id", $userId, PDO::PARAM_INT);
    $stmt->execute();

    $groups = [];

    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        $groups[] = [
            // Home画面のカード表示に合わせた形で返す
            "id" => (string) $row["group_id"],
            "trip_id" => $row["trip_id"] !== null ? (int) $row["trip_id"] : null,
            "name" => $row["group_name"],
            "date" => formatDateRange($row["start_date"], $row["end_date"]),
            "members" => (int) $row["member_count"],
            "status" => resolveStatus($row["start_date"], $row["end_date"])
        ];
    }

    respond([
        "success" => true,
        "groups" => $groups
    ]);
} catch (Throwable $error) {
    respond([
        "success" => false,
        "message" => "旅行グループ一覧の取得に失敗しました。"
    ], 500);
}
