<?php
header("Content-Type: application/json; charset=UTF-8");

$configPath = __DIR__ . '/env.php';
$config = file_exists($configPath) ? require $configPath : [];

$host = $config['DB_HOST'] ?? getenv('DB_HOST') ?: 'db';
$dbname = $config['DB_NAME'] ?? getenv('DB_NAME') ?: 'tabi';
$user = $config['DB_USER'] ?? getenv('DB_USER') ?: 'tabi_user';
$password = $config['DB_PASSWORD'] ?? getenv('DB_PASSWORD') ?: 'tabi_password';

try {

    $pdo = new PDO(
        "mysql:host=$host;dbname=$dbname;charset=utf8mb4",
        $user,
        $password
    );

    $pdo->setAttribute(
        PDO::ATTR_ERRMODE,
        PDO::ERRMODE_EXCEPTION
    );

} catch (PDOException $e) {

    http_response_code(500);

    echo json_encode([
        "success" => false,
        "message" => "DB接続失敗"
    ]);

    exit;
}
?>
