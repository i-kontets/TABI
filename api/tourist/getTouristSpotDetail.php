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
        "spot" => null,
    ], 405);
}

$id = isset($_GET["id"]) ? trim($_GET["id"]) : "";

if ($id === "" || !ctype_digit($id) || (int) $id <= 0) {
    respond([
        "success" => false,
        "message" => "観光地IDを正しく指定してください。",
        "spot" => null,
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
        WHERE tourist_spot_id = :id
        LIMIT 1
    ");

    $stmt->execute([
        ":id" => (int) $id,
    ]);

    $spot = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$spot) {
        respond([
            "success" => false,
            "message" => "指定された観光地が見つかりません。",
            "spot" => null,
        ], 404);
    }

    respond([
        "success" => true,
        "message" => "",
        "spot" => [
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
            "lat" => $spot["lat"] === null ? null : (float) $spot["lat"],
            "lon" => $spot["lon"] === null ? null : (float) $spot["lon"],
            "image_url" => $spot["image_url"],
            "source" => $spot["source"],
            "osm_updated_at" => $spot["osm_updated_at"],
            "created_at" => $spot["created_at"],
            "updated_at" => $spot["updated_at"],
        ],
    ]);
} catch (PDOException $error) {
    error_log($error->getMessage());

    respond([
        "success" => false,
        "message" => "観光地データの取得に失敗しました。",
        "spot" => null,
    ], 500);
}
