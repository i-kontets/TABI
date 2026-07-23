```php
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
        "message" => "DELETEで送信してください。"
    ], 405);
}

if (!isset($_SESSION["user_id"])) {
    respond([
        "success" => false,
        "message" => "ログインしてください。"
    ], 401);
}

$userId = (int)$_SESSION["user_id"];

// JSON または クエリパラメータの両方に対応
$input = json_decode(file_get_contents("php://input"), true);

$touristSpotId = 0;

if (is_array($input) && isset($input["tourist_spot_id"])) {
    $touristSpotId = (int)$input["tourist_spot_id"];
} elseif (isset($_GET["tourist_spot_id"])) {
    $touristSpotId = (int)$_GET["tourist_spot_id"];
}

if ($touristSpotId <= 0) {
    respond([
        "success" => false,
        "message" => "観光地IDが不正です。"
    ], 400);
}

try {

    // 自分のレビューが存在するか確認
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

    // 削除
    $stmt = $pdo->prepare("
        DELETE FROM reviews
        WHERE user_id = :user_id
          AND tourist_spot_id = :tourist_spot_id
    ");

    $stmt->execute([
        ":user_id" => $userId,
        ":tourist_spot_id" => $touristSpotId,
    ]);

    respond([
        "success" => true,
        "message" => "レビューを削除しました。"
    ]);

} catch (PDOException $error) {

    respond([
        "success" => false,
        "message" => "レビューの削除に失敗しました。"
    ], 500);
}