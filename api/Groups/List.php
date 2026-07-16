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

ini_set("display_errors", 1);
ini_set("display_startup_errors", 1);
error_reporting(E_ALL);

// セッションを開始し、ログイン中のユーザー情報をサーバー側で使えるようにします。
session_start();

// フロントエンドへ返すデータ形式や通信ルールを、HTTP ヘッダーとして伝えます。
header("Content-Type: application/json; charset=UTF-8");

// 共通設定や別ファイルの関数を読み込み、この API から使えるようにします。
require_once __DIR__ . "/../config/db.php";

// S3Common.php が api/Groups/S3Common.php にある場合
require_once __DIR__ . "/S3Common.php";

// S3Common.php が api/S3Common.php にある場合は上ではなくこっち
// require_once __DIR__ . "/../S3Common.php";

/**
 * respond は、この API 内で何度も使う処理をまとめた関数です。
 * 引数として受け取った値をもとに、確認・取得・更新などの結果を返します。
 */
function respond(array $payload, int $status = 200): void
{
    http_response_code($status);
    // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

/**
 * resolveStatus は、この API 内で何度も使う処理をまとめた関数です。
 * 引数として受け取った値をもとに、確認・取得・更新などの結果を返します。
 */
function resolveStatus(?string $startDate, ?string $endDate): string
{
    $today = (new DateTimeImmutable("today"))->format("Y-m-d");

    // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
    if ($endDate && $endDate < $today) {
        return "終了";
    }

    // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
    if ($startDate && $endDate && $startDate <= $today && $today <= $endDate) {
        return "進行中";
    }

    return "計画中";
}

/**
 * formatDateRange は、この API 内で何度も使う処理をまとめた関数です。
 * 引数として受け取った値をもとに、確認・取得・更新などの結果を返します。
 */
function formatDateRange(?string $startDate, ?string $endDate): string
{
    // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
    if (!$startDate || !$endDate) {
        return "日程未定";
    }

    return str_replace("-", "/", $startDate) . " - " . str_replace("-", "/", $endDate);
}

// ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
if ($_SERVER["REQUEST_METHOD"] !== "GET") {
    // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
    respond([
        "success" => false,
        "message" => "GET method is required",
    ], 405);
}

// ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
if (!isset($_SESSION["user_id"])) {
    // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
    respond([
        "success" => false,
        "message" => "Login is required",
    ], 401);
}

$userId = (int) $_SESSION["user_id"];

// データベース処理などでエラーが起きる可能性があるため、例外を受け取れる形で実行します。
try {
    // SQL を準備し、あとから値を安全に入れられる形にします。
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
    // SQL 内の目印に値を割り当て、入力値が SQL 命令として実行されないようにします。
    $stmt->bindValue(":user_id", $userId, PDO::PARAM_INT);
    // 準備した SQL を実行し、データベースへの取得・登録・更新を行います。
    $stmt->execute();

    $aws = loadAwsConfig();
    $s3 = $aws ? createS3Client($aws) : null;
    $bucket = $aws ? $aws["bucket"] : null;

    $groups = [];

    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        $imageUrl = null;

        // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
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

    // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
    respond([
        "success" => true,
        "groups" => $groups,
    ]);
// エラーが起きた場合は、詳細をログに残し、利用者には安全なメッセージを返します。
} catch (Throwable $error) {
    // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
    respond([
        "success" => false,
        "message" => "Failed to fetch groups",
        "error" => $error->getMessage(),
    ], 500);
}
