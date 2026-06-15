<?php
header("Content-Type: application/json; charset=UTF-8");

$host = "mysql327.phy.lolipop.lan";
$dbname = "LAA1658851-web";
$user = "LAA1658851";
$password = "2024gakusei";

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