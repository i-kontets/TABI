<?php
session_start();

header("Content-Type: application/json; charset=UTF-8");
require_once __DIR__ . "/../config/db.php";

function respond(int $status, array $body): void
{
    http_response_code($status);
    echo json_encode($body, JSON_UNESCAPED_UNICODE);
    exit;
}

function findTrip(PDO $pdo, int $groupId): array
{
    $stmt = $pdo->prepare(
        "SELECT trip_id, group_id, title, status
         FROM trips
         WHERE group_id = :group_id
         ORDER BY updated_at DESC, trip_id DESC
         LIMIT 1"
    );
    $stmt->execute([":group_id" => $groupId]);
    $trip = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$trip) {
        respond(404, [
            "success" => false,
            "message" => "対象グループの旅行が見つかりません",
        ]);
    }

    return $trip;
}

function requireUserId(): int
{
    if (!isset($_SESSION["user_id"])) {
        respond(401, [
            "success" => false,
            "message" => "候補の追加・投票にはログインが必要です",
        ]);
    }

    return (int) $_SESSION["user_id"];
}

try {
    if ($_SERVER["REQUEST_METHOD"] === "GET") {
        $groupId = filter_input(INPUT_GET, "group_id", FILTER_VALIDATE_INT) ?: 1;
        $trip = findTrip($pdo, $groupId);
        $userId = isset($_SESSION["user_id"]) ? (int) $_SESSION["user_id"] : 0;

        $stmt = $pdo->prepare(
            "SELECT
                candidate.candidate_id,
                candidate.candidate_type,
                candidate.candidate_name,
                candidate.description,
                candidate.img_url,
                candidate.status,
                COUNT(DISTINCT vote.user_id) AS vote_count,
                MAX(CASE WHEN vote.user_id = :user_id THEN 1 ELSE 0 END) AS has_voted
             FROM trip_candidates candidate
             LEFT JOIN trip_candidate_votes vote
                ON vote.candidate_id = candidate.candidate_id
                AND vote.vote_type = 'like'
             WHERE candidate.trip_id = :trip_id
                AND (candidate.status IS NULL OR candidate.status <> 'rejected')
             GROUP BY
                candidate.candidate_id,
                candidate.candidate_type,
                candidate.candidate_name,
                candidate.description,
                candidate.img_url,
                candidate.status,
                candidate.created_at
             ORDER BY candidate.candidate_type, candidate.created_at DESC, candidate.candidate_id DESC"
        );
        $stmt->execute([
            ":user_id" => $userId,
            ":trip_id" => $trip["trip_id"],
        ]);

        $candidates = array_map(static function (array $candidate): array {
            $candidate["candidate_id"] = (int) $candidate["candidate_id"];
            $candidate["vote_count"] = (int) $candidate["vote_count"];
            $candidate["has_voted"] = (bool) $candidate["has_voted"];
            return $candidate;
        }, $stmt->fetchAll(PDO::FETCH_ASSOC));

        respond(200, [
            "success" => true,
            "trip" => $trip,
            "candidates" => $candidates,
        ]);
    }

    if ($_SERVER["REQUEST_METHOD"] !== "POST") {
        respond(405, ["success" => false, "message" => "許可されていないメソッドです"]);
    }

    $input = json_decode(file_get_contents("php://input"), true) ?: [];
    $action = $input["action"] ?? "";
    $groupId = filter_var($input["group_id"] ?? 1, FILTER_VALIDATE_INT) ?: 1;
    $userId = requireUserId();
    $trip = findTrip($pdo, $groupId);

    if ($action === "add_candidate") {
        $candidateType = $input["candidate_type"] ?? "";
        $candidateName = trim($input["candidate_name"] ?? "");
        $description = trim($input["description"] ?? "");

        if ($candidateType !== "destination") {
            respond(400, [
                "success" => false,
                "message" => "旅行先のみ手入力できます。スポット・宿泊先はお気に入りから追加してください",
            ]);
        }

        if ($candidateName === "") {
            respond(400, ["success" => false, "message" => "旅行先を入力してください"]);
        }

        $stmt = $pdo->prepare(
            "INSERT INTO trip_candidates
                (trip_id, candidate_type, candidate_name, description, created_by, status, created_at)
             VALUES
                (:trip_id, 'destination', :candidate_name, :description, :created_by, 'candidate', NOW())"
        );
        $stmt->execute([
            ":trip_id" => $trip["trip_id"],
            ":candidate_name" => $candidateName,
            ":description" => $description !== "" ? $description : null,
            ":created_by" => $userId,
        ]);

        respond(201, [
            "success" => true,
            "candidate_id" => (int) $pdo->lastInsertId(),
        ]);
    }

    if ($action === "vote") {
        $candidateId = filter_var($input["candidate_id"] ?? null, FILTER_VALIDATE_INT);

        if (!$candidateId) {
            respond(400, ["success" => false, "message" => "候補が正しくありません"]);
        }

        $candidateStmt = $pdo->prepare(
            "SELECT candidate_id, candidate_type
             FROM trip_candidates
             WHERE candidate_id = :candidate_id
                AND trip_id = :trip_id
                AND (status IS NULL OR status <> 'rejected')
             LIMIT 1"
        );
        $candidateStmt->execute([
            ":candidate_id" => $candidateId,
            ":trip_id" => $trip["trip_id"],
        ]);
        $candidate = $candidateStmt->fetch(PDO::FETCH_ASSOC);

        if (!$candidate) {
            respond(404, ["success" => false, "message" => "候補が見つかりません"]);
        }

        $pdo->beginTransaction();

        $deleteStmt = $pdo->prepare(
            "DELETE vote
             FROM trip_candidate_votes vote
             INNER JOIN trip_candidates candidate
                ON candidate.candidate_id = vote.candidate_id
             WHERE vote.user_id = :user_id
                AND candidate.trip_id = :trip_id
                AND candidate.candidate_type = :candidate_type"
        );
        $deleteStmt->execute([
            ":user_id" => $userId,
            ":trip_id" => $trip["trip_id"],
            ":candidate_type" => $candidate["candidate_type"],
        ]);

        $insertStmt = $pdo->prepare(
            "INSERT INTO trip_candidate_votes
                (candidate_id, user_id, vote_type, created_at)
             VALUES
                (:candidate_id, :user_id, 'like', NOW())"
        );
        $insertStmt->execute([
            ":candidate_id" => $candidateId,
            ":user_id" => $userId,
        ]);

        $pdo->commit();
        respond(200, ["success" => true]);
    }

    respond(400, ["success" => false, "message" => "操作内容が正しくありません"]);
} catch (PDOException $error) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }

    respond(500, [
        "success" => false,
        "message" => "候補データの処理に失敗しました",
    ]);
}
