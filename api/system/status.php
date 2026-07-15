<?php
header("Content-Type: application/json; charset=UTF-8");
header("Cache-Control: no-store, no-cache, must-revalidate");
header("Pragma: no-cache");

require_once __DIR__ . "/../config/serviceSchedule.php";

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
        $probe->query("SELECT 1");
        $databaseAvailable = true;
    } catch (Throwable $error) {
        $databaseAvailable = false;
    }
}

$scheduledToRun = (bool) $scheduleStatus["available"];
$statusCode = "AVAILABLE";

if (!$databaseAvailable) {
    $statusCode = $scheduledToRun ? "DATABASE_UNAVAILABLE" : "SCHEDULED_DB_STOP";
}

echo json_encode([
    "success" => true,
    "status" => $statusCode,
    "databaseAvailable" => $databaseAvailable,
    "scheduledToRun" => $scheduledToRun,
    "checkedAt" => $checkedAt,
    "nextScheduledOpenAt" => $databaseAvailable ? null : $scheduleStatus["nextOpenAt"],
    "nextScheduledCloseAt" => $scheduledToRun ? $scheduleStatus["nextCloseAt"] : null,
    "timezone" => $scheduleStatus["timezone"],

    "available" => $databaseAvailable,
    "serviceAvailable" => $databaseAvailable,
    "databaseScheduled" => $scheduledToRun,
    "reason" => $statusCode,
    "now" => $checkedAt,
    "nextOpenAt" => $databaseAvailable ? null : $scheduleStatus["nextOpenAt"],
    "nextCloseAt" => $scheduledToRun ? $scheduleStatus["nextCloseAt"] : null,
], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
