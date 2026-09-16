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

if (!$groupId || $groupId < 1) {
    respond([
        "success" => false,
        "message" => "group_idが不正です。"
    ], 400);
}

$userId = (int) $_SESSION["user_id"];
$now = (new DateTimeImmutable("now"))->format("Y-m-d H:i:s");

try {
    $pdo->beginTransaction();

    $groupStmt = $pdo->prepare("
        SELECT
            g.group_id,
            g.group_name,
            t.trip_id,
            t.title
        FROM user_groups g
        LEFT JOIN trips t ON t.trip_id = (
            SELECT t2.trip_id
            FROM trips t2
            WHERE t2.group_id = g.group_id
            ORDER BY t2.trip_id DESC
            LIMIT 1
        )
        WHERE g.group_id = :group_id
        LIMIT 1
    ");
    $groupStmt->execute([
        ":group_id" => $groupId
    ]);
    $group = $groupStmt->fetch(PDO::FETCH_ASSOC);

    if (!$group) {
        $pdo->rollBack();
        respond([
            "success" => false,
            "message" => "対象の旅行グループが見つかりません。"
        ], 404);
    }

    $memberStmt = $pdo->prepare("
        SELECT invitation_status
        FROM group_members
        WHERE group_id = :group_id
          AND user_id = :user_id
        LIMIT 1
    ");
    $memberStmt->execute([
        ":group_id" => $groupId,
        ":user_id" => $userId
    ]);
    $existingMember = $memberStmt->fetch(PDO::FETCH_ASSOC);

    if ($existingMember && $existingMember["invitation_status"] === "accepted") {
        $pdo->rollBack();
        respond([
            "success" => false,
            "status" => "already-joined",
            "message" => "この旅行グループには既に参加しています。"
        ], 409);
    }

    if ($existingMember) {
        $updateMemberStmt = $pdo->prepare("
            UPDATE group_members
            SET invitation_status = 'accepted',
                joined_at = COALESCE(joined_at, :joined_at)
            WHERE group_id = :group_id
              AND user_id = :user_id
        ");
        $updateMemberStmt->execute([
            ":joined_at" => $now,
            ":group_id" => $groupId,
            ":user_id" => $userId
        ]);
    } else {
        $insertMemberStmt = $pdo->prepare("
            INSERT INTO group_members (group_id, user_id, role_in_group, joined_at, invitation_status)
            VALUES (:group_id, :user_id, 'member', :joined_at, 'accepted')
        ");
        $insertMemberStmt->execute([
            ":group_id" => $groupId,
            ":user_id" => $userId,
            ":joined_at" => $now
        ]);
    }

    if (!empty($group["trip_id"])) {
        $tripMemberStmt = $pdo->prepare("
            SELECT 1
            FROM trip_members
            WHERE trip_id = :trip_id
              AND user_id = :user_id
            LIMIT 1
        ");
        $tripMemberStmt->execute([
            ":trip_id" => (int) $group["trip_id"],
            ":user_id" => $userId
        ]);

        if ($tripMemberStmt->fetchColumn()) {
            $updateTripMemberStmt = $pdo->prepare("
                UPDATE trip_members
                SET participation_status = 'joined',
                    joined_at = COALESCE(joined_at, :joined_at)
                WHERE trip_id = :trip_id
                  AND user_id = :user_id
            ");
            $updateTripMemberStmt->execute([
                ":joined_at" => $now,
                ":trip_id" => (int) $group["trip_id"],
                ":user_id" => $userId
            ]);
        } else {
            $insertTripMemberStmt = $pdo->prepare("
                INSERT INTO trip_members (trip_id, user_id, participation_status, joined_at)
                VALUES (:trip_id, :user_id, 'joined', :joined_at)
            ");
            $insertTripMemberStmt->execute([
                ":trip_id" => (int) $group["trip_id"],
                ":user_id" => $userId,
                ":joined_at" => $now
            ]);
        }
    }

    if (!empty($group["trip_id"])) {
        // 招待参加が確定したメンバーを、対象プロジェクトのグループチャットにも追加します。
        $chatStmt = $pdo->prepare("\n            SELECT c.chat_id\n            FROM chats c\n            WHERE c.trip_id = :trip_id AND c.chat_type = 'group'\n            ORDER BY c.chat_id ASC\n            LIMIT 1\n        ");
        $chatStmt->execute([":trip_id" => (int) $group["trip_id"]]);
        $chatId = $chatStmt->fetchColumn();

        if ($chatId) {
            $chatMemberExistsStmt = $pdo->prepare("\n                SELECT 1 FROM chat_members\n                WHERE chat_id = :chat_id AND user_id = :user_id\n                LIMIT 1\n            ");
            $chatMemberExistsStmt->execute([
                ":chat_id" => (int) $chatId,
                ":user_id" => $userId,
            ]);

            if (!$chatMemberExistsStmt->fetchColumn()) {
                $chatMemberInsertStmt = $pdo->prepare("\n                    INSERT INTO chat_members (chat_id, user_id, joined_at)\n                    VALUES (:chat_id, :user_id, :joined_at)\n                ");
                $chatMemberInsertStmt->execute([
                    ":chat_id" => (int) $chatId,
                    ":user_id" => $userId,
                    ":joined_at" => $now,
                ]);
            }
        }
    }

    $pdo->commit();

    respond([
        "success" => true,
        "status" => "joined",
        "group" => [
            "id" => (string) $groupId,
            "name" => $group["title"] ?: $group["group_name"],
            "trip_id" => isset($group["trip_id"]) ? (int) $group["trip_id"] : null
        ]
    ]);
} catch (Throwable $error) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }

    respond([
        "success" => false,
        "message" => "旅行グループへの参加に失敗しました。",
        "error" => $error->getMessage()
    ], 500);
}
