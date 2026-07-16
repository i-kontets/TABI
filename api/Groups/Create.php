<?php

/**
 * 旅行グループの作成、一覧、メンバー、画像アップロードを扱う API です。
 *
 * 主な流れ:
 * 1. リクエストやセッションなど、処理に必要な情報を読み取る
 * 2. 入力値や権限を確認し、必要に応じてデータベースへ問い合わせる
 * 3. 処理結果を JSON などの形でフロントエンドへ返す
 *
 * 扱うデータ: アプリの設定値や、他のファイルから受け取る値を主に扱います。
 */

// セッションを開始し、ログイン中のユーザー情報をサーバー側で使えるようにします。
session_start();
// フロントエンドへ返すデータ形式や通信ルールを、HTTP ヘッダーとして伝えます。
header("Content-Type: application/json; charset=UTF-8");

// データベース接続設定を読み込む（$pdo を使用）
require_once __DIR__ . "/../config/db.php";
// 共通設定や別ファイルの関数を読み込み、この API から使えるようにします。
require_once __DIR__ . "/../Admin/includes/config.php";
// 共通設定や別ファイルの関数を読み込み、この API から使えるようにします。
require_once __DIR__ . "/../Admin/services/realtime.php";

// レスポンスをJSONで返して終了する共通関数
function respond(array $payload, int $status = 200): void
{
    http_response_code($status);
    // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

// 「YYYY-MM-DD」形式の日付かどうかを検証する
function isValidDate(?string $value): bool
{
    // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
    if (!$value) {
        return false;
    }

    $date = DateTimeImmutable::createFromFormat("Y-m-d", $value);

    return $date !== false && $date->format("Y-m-d") === $value;
}

// POST 以外は受け付けない
if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
    respond([
        "success" => false,
        "message" => "POSTで送信してください。"
    ], 405);
}

// 未ログインなら401
if (!isset($_SESSION["user_id"])) {
    // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
    respond([
        "success" => false,
        "message" => "ログインが必要です。"
    ], 401);
}

$userId = (int) $_SESSION["user_id"];

// リクエストボディ（JSON）を受け取る
$input = json_decode(file_get_contents("php://input"), true);

// ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
if (!is_array($input)) {
    // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
    respond([
        "success" => false,
        "message" => "リクエスト形式が不正です。"
    ], 400);
}

// グループ名は必須
$groupName = trim((string) ($input["group_name"] ?? ""));

// ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
if ($groupName === "") {
    // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
    respond([
        "success" => false,
        "message" => "グループ名を入力してください。"
    ], 400);
}

// ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
if (function_exists("mb_strlen") ? mb_strlen($groupName) > 100 : strlen($groupName) > 100) {
    // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
    respond([
        "success" => false,
        "message" => "グループ名は100文字以内で入力してください。"
    ], 400);
}

// 開始日・終了日は任意（両方そろっている場合のみ旅行レコードを作成する）
$startDate = isValidDate($input["start_date"] ?? null) ? $input["start_date"] : null;
$endDate = isValidDate($input["end_date"] ?? null) ? $input["end_date"] : null;

// ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
if ($startDate && $endDate && $startDate > $endDate) {
    // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
    respond([
        "success" => false,
        "message" => "終了日は開始日以降にしてください。"
    ], 400);
}

// データベース処理などでエラーが起きる可能性があるため、例外を受け取れる形で実行します。
try {
    // グループ・メンバー・旅行をまとめて作成するためトランザクションを使用
    $pdo->beginTransaction();

    $now = (new DateTimeImmutable("now"))->format("Y-m-d H:i:s");

    // 1. グループ本体を作成
    $stmt = $pdo->prepare("
        INSERT INTO user_groups (group_name, created_by, status, created_at, updated_at)
        VALUES (:group_name, :created_by, 'active', :created_at, :updated_at)
    ");
    // SQL 内の目印に値を割り当て、入力値が SQL 命令として実行されないようにします。
    $stmt->bindValue(":group_name", $groupName);
    // SQL 内の目印に値を割り当て、入力値が SQL 命令として実行されないようにします。
    $stmt->bindValue(":created_by", $userId, PDO::PARAM_INT);
    // SQL 内の目印に値を割り当て、入力値が SQL 命令として実行されないようにします。
    $stmt->bindValue(":created_at", $now);
    // SQL 内の目印に値を割り当て、入力値が SQL 命令として実行されないようにします。
    $stmt->bindValue(":updated_at", $now);
    // 準備した SQL を実行し、データベースへの取得・登録・更新を行います。
    $stmt->execute();

    $groupId = (int) $pdo->lastInsertId();

    // 2. 作成者をグループ管理者として登録
    $stmt = $pdo->prepare("
        INSERT INTO group_members (group_id, user_id, role_in_group, joined_at, invitation_status)
        VALUES (:group_id, :user_id, 'admin', :joined_at, 'accepted')
    ");
    // SQL 内の目印に値を割り当て、入力値が SQL 命令として実行されないようにします。
    $stmt->bindValue(":group_id", $groupId, PDO::PARAM_INT);
    // SQL 内の目印に値を割り当て、入力値が SQL 命令として実行されないようにします。
    $stmt->bindValue(":user_id", $userId, PDO::PARAM_INT);
    // SQL 内の目印に値を割り当て、入力値が SQL 命令として実行されないようにします。
    $stmt->bindValue(":joined_at", $now);
    // 準備した SQL を実行し、データベースへの取得・登録・更新を行います。
    $stmt->execute();

    // 3. 日程が指定されていれば旅行レコードも作成（状態は draft = 計画中）
    $tripId = null;

    // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
    if ($startDate && $endDate) {
        // SQL を準備し、あとから値を安全に入れられる形にします。
        $stmt = $pdo->prepare("
            INSERT INTO trips (group_id, title, start_date, end_date, status, created_by, created_at, updated_at)
            VALUES (:group_id, :title, :start_date, :end_date, 'draft', :created_by, :created_at, :updated_at)
        ");
        // SQL 内の目印に値を割り当て、入力値が SQL 命令として実行されないようにします。
        $stmt->bindValue(":group_id", $groupId, PDO::PARAM_INT);
        // SQL 内の目印に値を割り当て、入力値が SQL 命令として実行されないようにします。
        $stmt->bindValue(":title", $groupName);
        // SQL 内の目印に値を割り当て、入力値が SQL 命令として実行されないようにします。
        $stmt->bindValue(":start_date", $startDate);
        // SQL 内の目印に値を割り当て、入力値が SQL 命令として実行されないようにします。
        $stmt->bindValue(":end_date", $endDate);
        // SQL 内の目印に値を割り当て、入力値が SQL 命令として実行されないようにします。
        $stmt->bindValue(":created_by", $userId, PDO::PARAM_INT);
        // SQL 内の目印に値を割り当て、入力値が SQL 命令として実行されないようにします。
        $stmt->bindValue(":created_at", $now);
        // SQL 内の目印に値を割り当て、入力値が SQL 命令として実行されないようにします。
        $stmt->bindValue(":updated_at", $now);
        // 準備した SQL を実行し、データベースへの取得・登録・更新を行います。
        $stmt->execute();

        $tripId = (int) $pdo->lastInsertId();

        // 作成者を旅行の参加者としても登録
        $stmt = $pdo->prepare("
            INSERT INTO trip_members (trip_id, user_id, participation_status, joined_at)
            VALUES (:trip_id, :user_id, 'joined', :joined_at)
        ");
        // SQL 内の目印に値を割り当て、入力値が SQL 命令として実行されないようにします。
        $stmt->bindValue(":trip_id", $tripId, PDO::PARAM_INT);
        // SQL 内の目印に値を割り当て、入力値が SQL 命令として実行されないようにします。
        $stmt->bindValue(":user_id", $userId, PDO::PARAM_INT);
        // SQL 内の目印に値を割り当て、入力値が SQL 命令として実行されないようにします。
        $stmt->bindValue(":joined_at", $now);
        // 準備した SQL を実行し、データベースへの取得・登録・更新を行います。
        $stmt->execute();
    }

    $pdo->commit();

    // WebSocket通知を送ります。DB更新後に呼ぶことで、他の画面へ「変更があった」ことを伝えます。
    sendRealtimeEvent("admin:global", "group_created", [
        "group_id" => $groupId,
        "trip_id" => $tripId,
    ]);
    sendRealtimeEvent("trip:" . $groupId, "trip_updated", [
        "group_id" => $groupId,
        "trip_id" => $tripId,
    ]);

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
// エラーが起きた場合は、詳細をログに残し、利用者には安全なメッセージを返します。
} catch (Throwable $error) {
    // 途中で失敗した場合はすべて取り消す
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }

    // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
    respond([
        "success" => false,
        "message" => "旅行グループの作成に失敗しました。"
    ], 500);
}
