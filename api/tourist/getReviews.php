<?php
header("Content-Type: application/json; charset=UTF-8");

require_once __DIR__ . "/../config/db.php";

function respond(array $payload, int $status = 200): void
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

if ($_SERVER["REQUEST_METHOD"] !== "GET") {
    respond([
        "success" => false,
        "message" => "GETで送信してください。",
        "review_count" => 0,
        "average_rating" => null,
        "reviews" => [],
    ], 405);
}

$touristSpotId = isset($_GET["tourist_spot_id"])
    ? trim($_GET["tourist_spot_id"])
    : "";

if ($touristSpotId === "" || !ctype_digit($touristSpotId) || (int)$touristSpotId <= 0) {
    respond([
        "success" => false,
        "message" => "観光地IDを正しく指定してください。",
        "review_count" => 0,
        "average_rating" => null,
        "reviews" => [],
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
        ":tourist_spot_id" => (int)$touristSpotId,
    ]);

    if (!$stmt->fetch(PDO::FETCH_ASSOC)) {
        respond([
            "success" => false,
            "message" => "指定された観光地が見つかりません。",
            "review_count" => 0,
            "average_rating" => null,
            "reviews" => [],
        ], 404);
    }

    // 件数・平均評価取得
    $stmt = $pdo->prepare("
        SELECT
            COUNT(*) AS review_count,
            AVG(rating) AS average_rating
        FROM reviews
        WHERE tourist_spot_id = :tourist_spot_id
    ");

    $stmt->execute([
        ":tourist_spot_id" => (int)$touristSpotId,
    ]);

    $summary = $stmt->fetch(PDO::FETCH_ASSOC);

    // レビュー一覧取得
    $stmt = $pdo->prepare("
        SELECT
            r.review_id,
            r.user_id,
            u.name AS user_name,
            r.rating,
            r.comment,
            r.created_at,
            r.updated_at
        FROM reviews r
        INNER JOIN users u
            ON r.user_id = u.user_id
        WHERE r.tourist_spot_id = :tourist_spot_id
        ORDER BY r.created_at DESC, r.review_id DESC
    ");

    $stmt->execute([
        ":tourist_spot_id" => (int)$touristSpotId,
    ]);

    $reviews = array_map(static function (array $review): array {
        return [
            "review_id" => (int)$review["review_id"],
            "user_id" => (int)$review["user_id"],
            "user_name" => $review["user_name"],
            "rating" => (int)$review["rating"],
            "comment" => $review["comment"],
            "created_at" => $review["created_at"],
            "updated_at" => $review["updated_at"],
        ];
    }, $stmt->fetchAll(PDO::FETCH_ASSOC));

    respond([
        "success" => true,
        "message" => "",
        "review_count" => (int)$summary["review_count"],
        "average_rating" => $summary["average_rating"] !== null
            ? round((float)$summary["average_rating"], 1)
            : null,
        "reviews" => $reviews,
    ]);

} catch (PDOException $error) {

    respond([
        "success" => false,
        "message" => "レビューの取得に失敗しました。",
        "review_count" => 0,
        "average_rating" => null,
        "reviews" => [],
    ], 500);
}