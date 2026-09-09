<?php

session_start();
header("Content-Type: application/json; charset=UTF-8");

require_once __DIR__ . "/../config/db.php";
require_once __DIR__ . "/CandidateCommon.php";

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    respond(405, ["success" => false, "message" => "許可されていないメソッドです"]);
}

try {
    $userId = requireUserId();
    $input = json_decode(file_get_contents("php://input"), true) ?: [];
    $candidateId = filter_var($input["candidate_id"] ?? null, FILTER_VALIDATE_INT);
    $status = $input["status"] ?? "candidate";

    if (!$candidateId || !in_array($status, ["candidate", "selected", "rejected"], true)) {
        respond(400, ["success" => false, "message" => "候補IDまたは状態が正しくありません"]);
    }

    $stmt = $pdo->prepare(
        "UPDATE trip_candidates
         SET status = :status
         WHERE candidate_id = :candidate_id"
    );
    $stmt->execute([
        ":status" => $status,
        ":candidate_id" => $candidateId,
    ]);

    if ($stmt->rowCount() === 0) {
        $existsStmt = $pdo->prepare("SELECT candidate_id FROM trip_candidates WHERE candidate_id = :candidate_id");
        $existsStmt->execute([":candidate_id" => $candidateId]);
        if (!$existsStmt->fetch()) {
            respond(404, ["success" => false, "message" => "候補が見つかりません"]);
        }
    }

    respond(200, [
        "success" => true,
        "candidate_id" => $candidateId,
        "status" => $status,
        "updated_by" => $userId,
    ]);
} catch (PDOException $error) {
    respond(500, ["success" => false, "message" => "候補の状態を更新できませんでした"]);
}
