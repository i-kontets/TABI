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

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    respond([
        "success" => false,
        "message" => "POSTで送信してください。",
    ], 405);
}

if (!isset($_SESSION["user_id"])) {
    respond([
        "success" => false,
        "message" => "ログインしてください。",
    ], 401);
}

$input = json_decode(file_get_contents("php://input"), true);

if (!is_array($input)) {
    respond([
        "success" => false,
        "message" => "JSON形式で送信してください。",
    ], 400);
}

$touristSpotId = $input["tourist_spot_id"] ?? null;

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
    $spotStmt = $pdo->prepare("
        SELECT tourist_spot_id
        FROM tourist_spots
        WHERE tourist_spot_id = :tourist_spot_id
        LIMIT 1
    ");

    $spotStmt->execute([
        ":tourist_spot_id" => $touristSpotId,
    ]);

    if (!$spotStmt->fetch(PDO::FETCH_ASSOC)) {
        respond([
            "success" => false,
            "message" => "指定された観光地が見つかりません。",
        ], 404);
    }

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

    if ($favoriteStmt->fetch(PDO::FETCH_ASSOC)) {
        respond([
            "success" => false,
            "message" => "既にお気に入り登録済みです。",
        ], 409);
    }

    $insertStmt = $pdo->prepare("
        INSERT INTO favorites
            (user_id, tourist_spot_id)
        VALUES
            (:user_id, :tourist_spot_id)
    ");

    $insertStmt->execute([
        ":user_id" => $userId,
        ":tourist_spot_id" => $touristSpotId,
    ]);

    respond([
        "success" => true,
        "message" => "お気に入りに追加しました。",
    ]);
} catch (PDOException $error) {
    error_log($error->getMessage());

    if ($error->getCode() === "23000") {
        respond([
            "success" => false,
            "message" => "既にお気に入り登録済みです。",
        ], 409);
    }

    respond([
        "success" => false,
        "message" => "お気に入り登録に失敗しました。",
    ], 500);
}
