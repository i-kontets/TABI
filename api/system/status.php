<?php
/**
 * フロントエンドが「通常画面を表示するか、メンテナンス画面を表示するか」を判断するためのAPIです。
 *
 * 単に現在時刻だけを見るのではなく、実際にDBへ SELECT 1 を実行して接続できるか確認します。
 * DBに接続できる場合は AVAILABLE、接続できない場合はスケジュールを見て
 * SCHEDULED_DB_STOP（予定停止）または DATABASE_UNAVAILABLE（予定外の接続不可）を返します。
 */
header("Content-Type: application/json; charset=UTF-8");
header("Cache-Control: no-store, no-cache, must-revalidate");
header("Pragma: no-cache");

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
    } catch (Throwable $error) {
        // 接続失敗やSQL実行失敗は、フロント側では「DB利用不可」として扱います。
        $databaseAvailable = false;
    }
}

$scheduledToRun = (bool) $scheduleStatus["available"];
$statusCode = "AVAILABLE";

if (!$databaseAvailable) {
    // 稼働予定時間内に落ちていれば障害、予定停止時間なら予定停止として分類します。
    $statusCode = $scheduledToRun ? "DATABASE_UNAVAILABLE" : "SCHEDULED_DB_STOP";
}

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
