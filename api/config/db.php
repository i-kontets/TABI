<?php
/**
 * TABI 全体で使用するデータベース接続ファイルです。
 *
 * このファイルを読み込むと、AWS RDS の接続情報を env.php から取得し、
 * PDO という PHP 標準の仕組みで MySQL に接続します。
 * 接続に成功した場合は、以降の API で $pdo を使って SQL を実行できます。
 *
 * DBへ接続できない場合は、スケジュールだけで判断せず、
 * 実際の接続失敗をもとにフロントエンドへ DB 停止状態を返します。
 */
header("Content-Type: application/json; charset=UTF-8");

require_once __DIR__ . "/serviceSchedule.php";

// status.php やエラー記録APIなど、DB停止中でも呼び出したいAPIはここで除外します。
$serviceGuardExempt = tabiIsServiceGuardExempt();

// env.php にはDBホスト名、DB名、ユーザー名、パスワードなどの接続情報が入っています。
$configPath = __DIR__ . "/env.php";
$config = file_exists($configPath) ? require $configPath : [];

// DB access is fixed to the AWS RDS connection profile.
// Secrets stay in env.php or server environment variables.
$appEnv = "aws";
$awsConfig = $config["connections"]["aws"] ?? [];

$host = $awsConfig["DB_HOST"] ?? "";
$dbname = $awsConfig["DB_NAME"] ?? "";
$user = $awsConfig["DB_USER"] ?? "";
$password = $awsConfig["DB_PASSWORD"] ?? "";
$charset = $awsConfig["DB_CHARSET"] ?? "utf8mb4";

// 接続に最低限必要な情報がない場合は、SQLを実行する前にエラーとして終了します。
if ($host === "" || $dbname === "" || $user === "") {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => "AWS RDS config is missing",
        "env" => $appEnv,
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

try {
    // PDOでMySQLへ接続します。ATTR_TIMEOUT は、DB停止中に長く待ちすぎないための秒数です。
    $pdo = new PDO(
        "mysql:host={$host};dbname={$dbname};charset={$charset}",
        $user,
        $password,
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_TIMEOUT => 3,
        ]
    );
} catch (PDOException $e) {
    if (!$serviceGuardExempt) {
        // 接続失敗時だけ、現在時刻が稼働予定内かどうかを見て「予定停止」か「予定外障害」かを分けます。
        $serviceStatus = tabiEvaluateServiceSchedule();
        $scheduledToRun = (bool) $serviceStatus["available"];
        $statusCode = $scheduledToRun ? "DATABASE_UNAVAILABLE" : "SCHEDULED_DB_STOP";
        $checkedAt = (new DateTimeImmutable("now", new DateTimeZone("Asia/Tokyo")))->format(DateTimeInterface::ATOM);

        http_response_code(503);
        header("Cache-Control: no-store, no-cache, must-revalidate");
        header("Pragma: no-cache");

        echo json_encode([
            "success" => false,
            // code/status はフロントエンドが専用画面へ切り替えるために使う状態名です。
            "code" => $statusCode,
            "status" => $statusCode,
            "databaseAvailable" => false,
            "scheduledToRun" => $scheduledToRun,
            "message" => $scheduledToRun ? "現在DBへ接続できません。" : "現在はDBの接続を停止しています。",
            "checkedAt" => $checkedAt,
            "now" => $checkedAt,
            "nextScheduledOpenAt" => $scheduledToRun ? null : $serviceStatus["nextOpenAt"],
            "nextScheduledCloseAt" => $scheduledToRun ? $serviceStatus["nextCloseAt"] : null,
            "nextOpenAt" => $scheduledToRun ? null : $serviceStatus["nextOpenAt"],
            "nextCloseAt" => $scheduledToRun ? $serviceStatus["nextCloseAt"] : null,
            "timezone" => $serviceStatus["timezone"],
        ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

        exit;
    }

    http_response_code(500);

    echo json_encode([
        "success" => false,
        "message" => "DB connection failed",
        "env" => $appEnv,
        "error" => $e->getMessage(),
    ], JSON_UNESCAPED_UNICODE);

    exit;
}
?>
