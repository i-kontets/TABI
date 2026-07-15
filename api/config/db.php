<?php
header("Content-Type: application/json; charset=UTF-8");

require_once __DIR__ . "/serviceSchedule.php";

$serviceGuardExempt = tabiIsServiceGuardExempt();

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
        $serviceStatus = tabiEvaluateServiceSchedule();
        $scheduledToRun = (bool) $serviceStatus["available"];
        $statusCode = $scheduledToRun ? "DATABASE_UNAVAILABLE" : "SCHEDULED_DB_STOP";
        $checkedAt = (new DateTimeImmutable("now", new DateTimeZone("Asia/Tokyo")))->format(DateTimeInterface::ATOM);

        http_response_code(503);
        header("Cache-Control: no-store, no-cache, must-revalidate");
        header("Pragma: no-cache");

        echo json_encode([
            "success" => false,
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
