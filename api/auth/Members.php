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
    $sql = "
    SELECT
        u.user_id AS id,
        u.name
    FROM group_members gm
    INNER JOIN users u
        ON u.user_id = gm.user_id
    WHERE gm.group_id = :group_id
";

    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        ":group_id" => $groupId
    ]);

    $members = [];

    foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $member) {
        $name = $member["name"];

        $members[] = [
            "id" => $member["id"],
            "name" => $name,
            "initial" => mb_substr($name, 0, 1, "UTF-8")
        ];
    }

    echo json_encode([
        "success" => true,
        "members" => $members
    ]);
} catch (Throwable $error) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => $error->getMessage()
    ]);
}