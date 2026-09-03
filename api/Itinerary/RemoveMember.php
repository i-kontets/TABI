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

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    respond([
        "success" => false,
        "message" => "POSTで送信してください。"
    ], 405);
}

if (!isset($_SESSION["user_id"])) {
    respond([
        "success" => false,
        "message" => "ログインが必要です。"
    ], 401);
}

$input = json_decode(file_get_contents("php://input"), true);
$groupId = filter_var($input["group_id"] ?? null, FILTER_VALIDATE_INT);
$memberId = filter_var($input["member_id"] ?? null, FILTER_VALIDATE_INT);
$userId = (int) $_SESSION["user_id"];

if (!$groupId || $groupId < 1 || !$memberId || $memberId < 1) {
    respond([
        "success" => false,
        "message" => "メンバー変更に必要な値が正しくありません。"
    ], 400);
}

if ($memberId === $userId) {
    respond([
        "success" => false,
        "message" => "自分自身はこの画面から外せません。"
    ], 400);
}

try {
    $pdo->beginTransaction();

    $adminStmt = $pdo->prepare("
        SELECT 1
        FROM group_members
        WHERE group_id = :group_id
          AND user_id = :user_id
          AND role_in_group = 'admin'
          AND invitation_status = 'accepted'
        LIMIT 1
    ");
    $adminStmt->execute([
        ":group_id" => $groupId,
        ":user_id" => $userId
    ]);

    if (!$adminStmt->fetchColumn()) {
        $pdo->rollBack();
        respond([
            "success" => false,
            "message" => "メンバーを変更できるのは管理者だけです。"
        ], 403);
    }

    $memberStmt = $pdo->prepare("
        SELECT gm.user_id, gm.role_in_group, u.name
        FROM group_members gm
        INNER JOIN users u ON u.user_id = gm.user_id
        WHERE gm.group_id = :group_id
          AND gm.user_id = :member_id
          AND gm.invitation_status = 'accepted'
        LIMIT 1
    ");
    $memberStmt->execute([
        ":group_id" => $groupId,
        ":member_id" => $memberId
    ]);
    $member = $memberStmt->fetch(PDO::FETCH_ASSOC);

    if (!$member) {
        $pdo->rollBack();
        respond([
            "success" => false,
            "message" => "対象のメンバーが見つかりません。"
        ], 404);
    }

    if ($member["role_in_group"] === "admin") {
        $adminCountStmt = $pdo->prepare("
            SELECT COUNT(*)
            FROM group_members
            WHERE group_id = :group_id
              AND role_in_group = 'admin'
              AND invitation_status = 'accepted'
        ");
        $adminCountStmt->execute([
            ":group_id" => $groupId
        ]);

        if ((int) $adminCountStmt->fetchColumn() <= 1) {
            $pdo->rollBack();
            respond([
                "success" => false,
                "message" => "最後の管理者は外せません。"
            ], 400);
        }
    }

    $deleteGroupMemberStmt = $pdo->prepare("
        DELETE FROM group_members
        WHERE group_id = :group_id
          AND user_id = :member_id
        LIMIT 1
    ");
    $deleteGroupMemberStmt->execute([
        ":group_id" => $groupId,
        ":member_id" => $memberId
    ]);

    $deleteTripMemberStmt = $pdo->prepare("
        DELETE tm
        FROM trip_members tm
        INNER JOIN trips t ON t.trip_id = tm.trip_id
        WHERE t.group_id = :group_id
          AND tm.user_id = :member_id
    ");
    $deleteTripMemberStmt->execute([
        ":group_id" => $groupId,
        ":member_id" => $memberId
    ]);

    $pdo->commit();

    respond([
        "success" => true,
        "removed_member" => [
            "id" => (int) $member["user_id"],
            "name" => $member["name"]
        ]
    ]);
} catch (Throwable $error) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }

    respond([
        "success" => false,
        "message" => "メンバーの変更に失敗しました。",
        "error" => $error->getMessage()
    ], 500);
}
