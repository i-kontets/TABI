<?php
session_start();
header("Content-Type: application/json");

require_once __DIR__ . "/../config/db.php";

$data = json_decode(file_get_contents("php://input"), true);
$group_id = $data["group_id"] ?? null;

if (!$group_id) {
  echo json_encode([
    "success" => false,
    "message" => "group_id is required"
  ]);
  exit;
}

try {
  $stmt = $pdo->prepare("
    SELECT start_date, end_date
    FROM trips
    WHERE group_id = ?
  ");
  $stmt->execute([$group_id]);

  $trip = $stmt->fetch(PDO::FETCH_ASSOC);

  if ($trip) {
    echo json_encode([
      "success" => true,
      "start_date" => $trip["start_date"],
      "end_date" => $trip["end_date"]
    ]);
  } else {
    echo json_encode([
      "success" => false,
      "message" => "trip not found"
    ]);
  }
} catch (PDOException $e) {
  echo json_encode([
    "success" => false,
    "message" => "database error",
    "error" => $e->getMessage()
  ]);
}
