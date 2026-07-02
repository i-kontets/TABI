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

if ($_SERVER["REQUEST_METHOD"] !== "GET") {
    respond([
        "success" => false,
        "message" => "GETで送信してください。",
        "favorites" => [],
    ], 405);
}

if (!isset($_SESSION["user_id"])) {
    respond([
        "success" => false,
        "message" => "ログインしてください。",
        "favorites" => [],
    ], 401);
}

$userId = (int) $_SESSION["user_id"];

try {
    $stmt = $pdo->prepare("
        SELECT
            f.favorite_id,
            f.created_at AS favorited_at,
            s.tourist_spot_id,
            s.osm_type,
            s.osm_id,
            s.name,
            s.prefecture,
            s.city,
            s.address,
            s.description,
            s.category,
            s.type,
            s.lat,
            s.lon,
            s.image_url,
            s.source,
            s.osm_updated_at,
            s.created_at,
            s.updated_at
        FROM favorites f
        INNER JOIN tourist_spots s
            ON f.tourist_spot_id = s.tourist_spot_id
        WHERE f.user_id = :user_id
        ORDER BY f.created_at DESC, f.favorite_id DESC
    ");

    $stmt->execute([
        ":user_id" => $userId,
    ]);

    $favorites = array_map(static function (array $favorite): array {
        return [
            "favorite_id" => (int) $favorite["favorite_id"],
            "favorited_at" => $favorite["favorited_at"],
            "tourist_spot_id" => (int) $favorite["tourist_spot_id"],
            "osm_type" => $favorite["osm_type"],
            "osm_id" => $favorite["osm_id"] === null ? null : (int) $favorite["osm_id"],
            "name" => $favorite["name"],
            "prefecture" => $favorite["prefecture"],
            "city" => $favorite["city"],
            "address" => $favorite["address"],
            "description" => $favorite["description"],
            "category" => $favorite["category"],
            "type" => $favorite["type"],
            "lat" => $favorite["lat"] === null ? null : (float) $favorite["lat"],
            "lon" => $favorite["lon"] === null ? null : (float) $favorite["lon"],
            "image_url" => $favorite["image_url"],
            "source" => $favorite["source"],
            "osm_updated_at" => $favorite["osm_updated_at"],
            "created_at" => $favorite["created_at"],
            "updated_at" => $favorite["updated_at"],
        ];
    }, $stmt->fetchAll(PDO::FETCH_ASSOC));

    respond([
        "success" => true,
        "message" => count($favorites) > 0 ? "" : "お気に入りはまだありません。",
        "favorites" => $favorites,
    ]);
} catch (PDOException $error) {
    error_log($error->getMessage());

    respond([
        "success" => false,
        "message" => "お気に入り一覧の取得に失敗しました。",
        "favorites" => [],
    ], 500);
}
