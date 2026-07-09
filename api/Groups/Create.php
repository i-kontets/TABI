<?php
session_start();
header("Content-Type: application/json; charset=UTF-8");

// データベース接続設定を読み込む（$pdo を使用）
require_once __DIR__ . "/../config/db.php";

// レスポンスをJSONで返して終了する共通関数
function respond(array $payload, int $status = 200): void
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

// 「YYYY-MM-DD」形式の日付かどうかを検証する
function isValidDate(?string $value): bool
{
    if (!$value) {
        return false;
    }

    $date = DateTimeImmutable::createFromFormat("Y-m-d", $value);

    return $date !== false && $date->format("Y-m-d") === $value;
}

// POST 以外は受け付けない
if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    respond([
        "success" => false,
        "message" => "POSTで送信してください。"
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

// リクエストボディ（JSON）を受け取る
$input = json_decode(file_get_contents("php://input"), true);

if (!is_array($input)) {
    respond([
        "success" => false,
        "message" => "リクエスト形式が不正です。"
    ], 400);
}

// グループ名は必須
$groupName = trim((string) ($input["group_name"] ?? ""));

if ($groupName === "") {
    respond([
        "success" => false,
        "message" => "グループ名を入力してください。"
    ], 400);
}

if (function_exists("mb_strlen") ? mb_strlen($groupName) > 100 : strlen($groupName) > 100) {
    respond([
        "success" => false,
        "message" => "グループ名は100文字以内で入力してください。"
    ], 400);
}

// 開始日・終了日は任意（両方そろっている場合のみ旅行レコードを作成する）
$startDate = isValidDate($input["start_date"] ?? null) ? $input["start_date"] : null;
$endDate = isValidDate($input["end_date"] ?? null) ? $input["end_date"] : null;

if ($startDate && $endDate && $startDate > $endDate) {
    respond([
        "success" => false,
        "message" => "終了日は開始日以降にしてください。"
    ], 400);
}

try {
    // グループ・メンバー・旅行をまとめて作成するためトランザクションを使用
    $pdo->beginTransaction();

    $now = (new DateTimeImmutable("now"))->format("Y-m-d H:i:s");

    // 1. グループ本体を作成
    $stmt = $pdo->prepare("
        INSERT INTO user_groups (group_name, created_by, status, created_at, updated_at)
        VALUES (:group_name, :created_by, 'active', :created_at, :updated_at)
    ");
    $stmt->bindValue(":group_name", $groupName);
    $stmt->bindValue(":created_by", $userId, PDO::PARAM_INT);
    $stmt->bindValue(":created_at", $now);
    $stmt->bindValue(":updated_at", $now);
    $stmt->execute();

    $groupId = (int) $pdo->lastInsertId();

    // 2. 作成者をグループ管理者として登録
    $stmt = $pdo->prepare("
        INSERT INTO group_members (group_id, user_id, role_in_group, joined_at, invitation_status)
        VALUES (:group_id, :user_id, 'admin', :joined_at, 'accepted')
    ");
    $stmt->bindValue(":group_id", $groupId, PDO::PARAM_INT);
    $stmt->bindValue(":user_id", $userId, PDO::PARAM_INT);
    $stmt->bindValue(":joined_at", $now);
    $stmt->execute();

    // 3. 日程が指定されていれば旅行レコードも作成（状態は draft = 計画中）
    $tripId = null;

    if ($startDate && $endDate) {
        $stmt = $pdo->prepare("
            INSERT INTO trips (group_id, title, start_date, end_date, status, created_by, created_at, updated_at)
            VALUES (:group_id, :title, :start_date, :end_date, 'draft', :created_by, :created_at, :updated_at)
        ");
        $stmt->bindValue(":group_id", $groupId, PDO::PARAM_INT);
        $stmt->bindValue(":title", $groupName);
        $stmt->bindValue(":start_date", $startDate);
        $stmt->bindValue(":end_date", $endDate);
        $stmt->bindValue(":created_by", $userId, PDO::PARAM_INT);
        $stmt->bindValue(":created_at", $now);
        $stmt->bindValue(":updated_at", $now);
        $stmt->execute();

        $tripId = (int) $pdo->lastInsertId();

        // 作成者を旅行の参加者としても登録
        $stmt = $pdo->prepare("
            INSERT INTO trip_members (trip_id, user_id, participation_status, joined_at)
            VALUES (:trip_id, :user_id, 'joined', :joined_at)
        ");
        $stmt->bindValue(":trip_id", $tripId, PDO::PARAM_INT);
        $stmt->bindValue(":user_id", $userId, PDO::PARAM_INT);
        $stmt->bindValue(":joined_at", $now);
        $stmt->execute();
    }

    $pdo->commit();

    // Home画面のカード表示に合わせた形で作成結果を返す
    respond([
        "success" => true,
        "group" => [
            "id" => (string) $groupId,
            "trip_id" => $tripId,
            "name" => $groupName,
            "date" => ($startDate && $endDate)
                ? str_replace("-", "/", $startDate) . " - " . str_replace("-", "/", $endDate)
                : "日程未定",
            "members" => 1,
            "status" => "計画中"
        ]
    ], 201);
} catch (Throwable $error) {
    // 途中で失敗した場合はすべて取り消す
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }

    respond([
        "success" => false,
        "message" => "旅行グループの作成に失敗しました。"
    ], 500);
}
