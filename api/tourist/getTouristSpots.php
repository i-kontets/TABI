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
        "city" => "",
        "spots" => [],
    ], 405);
}

$city = isset($_GET["city"]) ? trim($_GET["city"]) : "";

if ($city === "") {
    respond([
        "success" => false,
        "message" => "地域名を入力してください。",
        "city" => "",
        "spots" => [],
    ], 400);
}

try {
    $stmt = $pdo->prepare("
        SELECT
            tourist_spot_id,
            osm_type,
            osm_id,
            name,
            prefecture,
            city,
            address,
            description,
            category,
            type,
            lat,
            lon,
            image_url,
            source,
            osm_updated_at,
            created_at,
            updated_at
        FROM tourist_spots
        WHERE city LIKE :locationKeyword
            OR prefecture LIKE :locationKeyword
            OR name LIKE :keyword
            OR category LIKE :keyword
            OR type LIKE :keyword
        ORDER BY name ASC, tourist_spot_id ASC
    ");

    $stmt->execute([
        ":locationKeyword" => $city . "%",
        ":keyword" => "%" . $city . "%",
    ]);

    $spots = array_map(static function (array $spot): array {
        return [
            "tourist_spot_id" => (int) $spot["tourist_spot_id"],
            "osm_type" => $spot["osm_type"],
            "osm_id" => $spot["osm_id"] === null ? null : (int) $spot["osm_id"],
            "name" => $spot["name"],
            "prefecture" => $spot["prefecture"],
            "city" => $spot["city"],
            "address" => $spot["address"],
            "description" => $spot["description"],
            "category" => $spot["category"],
            "type" => $spot["type"],
            "lat" => (float) $spot["lat"],
            "lon" => (float) $spot["lon"],
            "image_url" => $spot["image_url"],
            "source" => $spot["source"],
            "osm_updated_at" => $spot["osm_updated_at"],
            "created_at" => $spot["created_at"],
            "updated_at" => $spot["updated_at"],
        ];
    }, $stmt->fetchAll(PDO::FETCH_ASSOC));

    respond([
        "success" => true,
        "message" => count($spots) > 0 ? "" : "該当する観光地がありません。",
        "city" => $city,
        "spots" => $spots,
    ]);
} catch (PDOException $error) {
    error_log($error->getMessage());

    respond([
        "success" => false,
        "message" => "観光地データの取得に失敗しました。",
        "city" => $city,
        "spots" => [],
    ], 500);
}
