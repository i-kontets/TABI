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

if ($_SERVER["REQUEST_METHOD"] !== "PUT") {
    respond([
        "success" => false,
        "message" => "PUTで送信してください。"
    ], 405);
}

if (!isset($_SESSION["user_id"])) {
    respond([
        "success" => false,
        "message" => "ログインしてください。"
    ], 401);
}

$userId = (int)$_SESSION["user_id"];

$input = json_decode(file_get_contents("php://input"), true);

$touristSpotId = (int)($input["tourist_spot_id"] ?? 0);
$rating = (int)($input["rating"] ?? 0);
$comment = trim($input["comment"] ?? "");

if ($touristSpotId <= 0) {
    respond([
        "success" => false,
        "message" => "観光地IDが不正です。"
    ], 400);
}

if ($rating < 1 || $rating > 5) {
    respond([
        "success" => false,
        "message" => "評価は1〜5で入力してください。"
    ], 400);
}

if (mb_strlen($comment) > 1000) {
    respond([
        "success" => false,
        "message" => "コメントは1000文字以内で入力してください。"
    ], 400);
}

try {

    // 自分のレビュー存在確認
    $stmt = $pdo->prepare("
        SELECT review_id
        FROM reviews
        WHERE user_id = :user_id
          AND tourist_spot_id = :tourist_spot_id
        LIMIT 1
    ");

    $stmt->execute([
        ":user_id" => $userId,
        ":tourist_spot_id" => $touristSpotId,
    ]);

    if (!$stmt->fetch(PDO::FETCH_ASSOC)) {
        respond([
            "success" => false,
            "message" => "レビューが見つかりません。"
        ], 404);
    }

    // 更新
    $stmt = $pdo->prepare("
        UPDATE reviews
        SET
            rating = :rating,
            comment = :comment,
            updated_at = CURRENT_TIMESTAMP
        WHERE
            user_id = :user_id
        AND tourist_spot_id = :tourist_spot_id
    ");

    $stmt->execute([
        ":rating" => $rating,
        ":comment" => $comment,
        ":user_id" => $userId,
        ":tourist_spot_id" => $touristSpotId,
    ]);

    respond([
        "success" => true,
        "message" => "レビューを更新しました。"
    ]);

} catch (PDOException $error) {

    respond([
        "success" => false,
        "message" => "レビューの更新に失敗しました。"
    ], 500);
}