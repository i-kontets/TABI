<?php
header("Content-Type: application/json; charset=UTF-8");

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
        $password
    );

    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
} catch (PDOException $e) {
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
