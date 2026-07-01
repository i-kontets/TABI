<?php
session_start();

header("Content-Type: application/json; charset=UTF-8");

require_once __DIR__ . "/../config/db.php";

function respond(array $payload, int $status = 200): void
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

if ($_SERVER["REQUEST_METHOD"] !== "DELETE") {
    respond([
        "success" => false,
        "message" => "DELETEで送信してください。",
    ], 405);
}

if (!isset($_SESSION["user_id"])) {
    respond([
        "success" => false,
        "message" => "ログインしてください。",
    ], 401);
}

$input = json_decode(file_get_contents("php://input"), true);
$touristSpotId = null;

if (is_array($input) && array_key_exists("tourist_spot_id", $input)) {
    $touristSpotId = $input["tourist_spot_id"];
} elseif (isset($_GET["tourist_spot_id"])) {
    $touristSpotId = $_GET["tourist_spot_id"];
}

if (is_string($touristSpotId)) {
    $touristSpotId = trim($touristSpotId);
}

if (
    $touristSpotId === null
    || (is_string($touristSpotId) && ($touristSpotId === "" || !ctype_digit($touristSpotId)))
    || (!is_int($touristSpotId) && !is_string($touristSpotId))
    || (int) $touristSpotId <= 0
) {
    respond([
        "success" => false,
        "message" => "観光地IDを正しく指定してください。",
    ], 400);
}

$userId = (int) $_SESSION["user_id"];
$touristSpotId = (int) $touristSpotId;

try {
    $favoriteStmt = $pdo->prepare("
        SELECT favorite_id
        FROM favorites
        WHERE user_id = :user_id
            AND tourist_spot_id = :tourist_spot_id
        LIMIT 1
    ");

    $favoriteStmt->execute([
        ":user_id" => $userId,
        ":tourist_spot_id" => $touristSpotId,
    ]);

    if (!$favoriteStmt->fetch(PDO::FETCH_ASSOC)) {
        respond([
            "success" => false,
            "message" => "お気に入りに登録されていません。",
        ], 404);
    }

    $deleteStmt = $pdo->prepare("
        DELETE FROM favorites
        WHERE user_id = :user_id
            AND tourist_spot_id = :tourist_spot_id
    ");

    $deleteStmt->execute([
        ":user_id" => $userId,
        ":tourist_spot_id" => $touristSpotId,
    ]);

    respond([
        "success" => true,
        "message" => "お気に入りから削除しました。",
    ]);
} catch (PDOException $error) {
    error_log($error->getMessage());

    respond([
        "success" => false,
        "message" => "お気に入り削除に失敗しました。",
    ], 500);
}
