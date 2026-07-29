<?php
session_start();
header("Content-Type: application/json; charset=UTF-8");

require_once __DIR__ . "/../config/db.php";

if (!isset($_SESSION["user_id"])) {
    http_response_code(401);
    echo json_encode([
        "success" => false,
        "message" => "Login required"
    ]);
    exit;
}

$input = json_decode(file_get_contents("php://input"), true);
$groupId = $input["group_id"] ?? null;

if (!$groupId) {
    http_response_code(400);
    echo json_encode([
        "success" => false,
        "message" => "group_id is required"
    ]);
    exit;
}

try {
    $stmt = $pdo->prepare("
        SELECT
            trip_id,
            group_id,
            title,
            start_date,
            end_date
        FROM trips
        WHERE group_id = :group_id
        ORDER BY trip_id DESC
        LIMIT 1
    ");
    $stmt->execute([
        ":group_id" => $groupId
    ]);

    $trip = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$trip) {
        echo json_encode([
            "success" => false,
            "message" => "trip not found"
        ]);
        exit;
    }

    echo json_encode([
        "success" => true,
        "trip" => [
            "id" => (string) $trip["group_id"],
            "trip_id" => (int) $trip["trip_id"],
            "name" => $trip["title"],
            "title" => $trip["title"],
            "start_date" => $trip["start_date"],
            "end_date" => $trip["end_date"]
        ]
    ]);
} catch (Throwable $error) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => "database error",
        "error" => $error->getMessage()
    ]);
}
