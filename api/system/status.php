<?php

/**
 * サービス全体の稼働状況を返す API です。
 *
 * 主な流れ:
 * 1. リクエストやセッションなど、処理に必要な情報を読み取る
 * 2. 入力値や権限を確認し、必要に応じてデータベースへ問い合わせる
 * 3. 処理結果を JSON などの形でフロントエンドへ返す
 *
 * 扱うデータ: アプリの設定値や、他のファイルから受け取る値を主に扱います。
 */

/**
 * フロントエンドが「通常画面を表示するか、メンテナンス画面を表示するか」を判断するためのAPIです。
 *
 * 単に現在時刻だけを見るのではなく、実際にDBへ SELECT 1 を実行して接続できるか確認します。
 * DBに接続できる場合は AVAILABLE、接続できない場合はスケジュールを見て
 * SCHEDULED_DB_STOP（予定停止）または DATABASE_UNAVAILABLE（予定外の接続不可）を返します。
 */
header("Content-Type: application/json; charset=UTF-8");
// フロントエンドへ返すデータ形式や通信ルールを、HTTP ヘッダーとして伝えます。
header("Cache-Control: no-store, no-cache, must-revalidate");
// フロントエンドへ返すデータ形式や通信ルールを、HTTP ヘッダーとして伝えます。
header("Pragma: no-cache");

// 共通設定や別ファイルの関数を読み込み、この API から使えるようにします。
require_once __DIR__ . "/../config/serviceSchedule.php";

// まず日本時間の稼働スケジュールを評価し、DB停止が予定内かどうかを後で判定できるようにします。
$scheduleStatus = tabiEvaluateServiceSchedule();
$configPath = __DIR__ . "/../config/env.php";
$config = file_exists($configPath) ? require $configPath : [];
$awsConfig = $config["connections"]["aws"] ?? [];

$host = $awsConfig["DB_HOST"] ?? "";
$dbname = $awsConfig["DB_NAME"] ?? "";
$user = $awsConfig["DB_USER"] ?? "";
$password = $awsConfig["DB_PASSWORD"] ?? "";
$charset = $awsConfig["DB_CHARSET"] ?? "utf8mb4";
$checkedAt = (new DateTimeImmutable("now", new DateTimeZone("Asia/Tokyo")))->format(DateTimeInterface::ATOM);
$databaseAvailable = false;

// DB接続情報がそろっている場合だけ、実際にDBへ接続して軽いSQLを実行します。
if ($host !== "" && $dbname !== "" && $user !== "") {
    // データベース処理などでエラーが起きる可能性があるため、例外を受け取れる形で実行します。
    try {
        $probe = new PDO(
            "mysql:host={$host};dbname={$dbname};charset={$charset}",
            $user,
            $password,
            [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_TIMEOUT => 3,
            ]
        );
        // SELECT 1 はデータを変更せず、DBが応答できるかだけを見るための確認用SQLです。
        $probe->query("SELECT 1");
        $databaseAvailable = true;
    // エラーが起きた場合は、詳細をログに残し、利用者には安全なメッセージを返します。
    } catch (Throwable $error) {
        // 接続失敗やSQL実行失敗は、フロント側では「DB利用不可」として扱います。
        $databaseAvailable = false;
    }
}

$scheduledToRun = (bool) $scheduleStatus["available"];
$statusCode = "AVAILABLE";

// ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
if (!$databaseAvailable) {
    // 稼働予定時間内に落ちていれば障害、予定停止時間なら予定停止として分類します。
    $statusCode = $scheduledToRun ? "DATABASE_UNAVAILABLE" : "SCHEDULED_DB_STOP";
}

// 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
echo json_encode([
    "success" => true,
    // 新しい画面切り替え処理では、主に status と databaseAvailable を見ます。
    "status" => $statusCode,
    "databaseAvailable" => $databaseAvailable,
    "scheduledToRun" => $scheduledToRun,
    "checkedAt" => $checkedAt,
    "nextScheduledOpenAt" => $databaseAvailable ? null : $scheduleStatus["nextOpenAt"],
    "nextScheduledCloseAt" => $scheduledToRun ? $scheduleStatus["nextCloseAt"] : null,
    "timezone" => $scheduleStatus["timezone"],

    // 既存コードとの互換性を保つため、古い名前の項目も同じ意味で返しています。
    "available" => $databaseAvailable,
    "serviceAvailable" => $databaseAvailable,
    "databaseScheduled" => $scheduledToRun,
    "reason" => $statusCode,
    "now" => $checkedAt,
    "nextOpenAt" => $databaseAvailable ? null : $scheduleStatus["nextOpenAt"],
    "nextCloseAt" => $scheduledToRun ? $scheduleStatus["nextCloseAt"] : null,
], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
