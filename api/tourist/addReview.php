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
        "message" => "POSTで送信してください。"
    ], 405);
}

if (!isset($_SESSION["user_id"])) {
    respond([
        "success" => false,
        "message" => "ログインしてください。"
    ], 401);
}

$userId = (int) $_SESSION["user_id"];

$input = json_decode(file_get_contents("php://input"), true);

$touristSpotId = $input["tourist_spot_id"] ?? null;
$rating = $input["rating"] ?? null;
$comment = trim($input["comment"] ?? "");

if (
    !is_numeric($touristSpotId) ||
    !is_numeric($rating) ||
    $rating < 1 ||
    $rating > 5
) {
    respond([
        "success" => false,
        "message" => "入力内容が正しくありません。"
    ], 400);
}

try {

    // 観光地存在確認
    $stmt = $pdo->prepare("
        SELECT tourist_spot_id
        FROM tourist_spots
        WHERE tourist_spot_id = :tourist_spot_id
        LIMIT 1
    ");

    $stmt->execute([
        ":tourist_spot_id" => $touristSpotId
    ]);

    if (!$stmt->fetch()) {
        respond([
            "success" => false,
            "message" => "観光地が存在しません。"
        ], 404);
    }

    // 既にレビュー済みか確認
    $stmt = $pdo->prepare("
        SELECT review_id
        FROM reviews
        WHERE user_id = :user_id
          AND tourist_spot_id = :tourist_spot_id
        LIMIT 1
    ");

    $stmt->execute([
        ":user_id" => $userId,
        ":tourist_spot_id" => $touristSpotId
    ]);

    if ($stmt->fetch()) {
        respond([
            "success" => false,
            "message" => "既にレビュー済みです。"
        ], 409);
    }

    // 登録
    $stmt = $pdo->prepare("
        INSERT INTO reviews
        (
            user_id,
            tourist_spot_id,
            rating,
            comment
        )
        VALUES
        (
            :user_id,
            :tourist_spot_id,
            :rating,
            :comment
        )
    ");

    $stmt->execute([
        ":user_id" => $userId,
        ":tourist_spot_id" => $touristSpotId,
        ":rating" => (int)$rating,
        ":comment" => $comment === "" ? null : $comment
    ]);

    respond([
        "success" => true,
        "message" => "レビューを投稿しました。"
    ]);

} catch (PDOException $e) {

    error_log($e->getMessage());

    respond([
        "success" => false,
        "message" => "レビュー投稿に失敗しました。"
    ], 500);
}