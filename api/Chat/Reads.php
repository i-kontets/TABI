<?php
// セッション開始 - ユーザーのセッション管理を初期化
session_start();

// JSONレスポンスの設定
header("Content-Type: application/json; charset=UTF-8");

// データベース接続設定を読み込む
require_once __DIR__ . "/../config/db.php";

if (!in_array($_SERVER["REQUEST_METHOD"], ["GET", "POST"], true)) {
    http_response_code(405);
    echo json_encode([
        "success" => false,
        "message" => "GETまたはPOSTメソッドで送信してください"
    ]);
    exit;
}

if (!isset($_SESSION["user_id"])) {
    http_response_code(401);
    echo json_encode([
        "success" => false,
        "message" => "ログインが必要です"
    ]);
    exit;
}

$input = $_GET;

if ($_SERVER["REQUEST_METHOD"] === "POST") {
    $jsonInput = json_decode(file_get_contents("php://input"), true);
    $input = is_array($jsonInput) ? $jsonInput : $_POST;
}

$userId = (int) $_SESSION["user_id"];
$chatId = filter_var($input["chat_id"] ?? null, FILTER_VALIDATE_INT);
$groupId = filter_var($input["group_id"] ?? null, FILTER_VALIDATE_INT);
$messageId = filter_var($input["message_id"] ?? null, FILTER_VALIDATE_INT);
$messageIds = $input["message_ids"] ?? [];

if ($chatId !== null && $chatId !== false && $chatId < 1) {
    $chatId = false;
}

if ($groupId !== null && $groupId !== false && $groupId < 1) {
    $groupId = false;
}

if (!$chatId && !$groupId) {
    http_response_code(400);
    echo json_encode([
        "success" => false,
        "message" => "chat_id または group_id を指定してください"
    ]);
    exit;
}

if (!is_array($messageIds)) {
    $messageIds = [];
}

if ($messageId) {
    $messageIds[] = $messageId;
}

$messageIds = array_values(array_unique(array_filter(
    array_map(
        static function ($id) {
            $validatedId = filter_var($id, FILTER_VALIDATE_INT);
            return $validatedId !== false && $validatedId > 0
                ? $validatedId
                : false;
        },
        $messageIds
    )
)));

$idLockAcquired = false;

try {
    if (!$chatId) {
        $chatStmt = $pdo->prepare("
            SELECT c.chat_id
            FROM chats c
            INNER JOIN trips t ON t.trip_id = c.trip_id
            WHERE t.group_id = :group_id
              AND c.chat_type = 'group'
            ORDER BY c.chat_id DESC
            LIMIT 1
        ");
        $chatStmt->bindValue(":group_id", $groupId, PDO::PARAM_INT);
        $chatStmt->execute();
        $chatId = $chatStmt->fetchColumn();

        if (!$chatId) {
            http_response_code(404);
            echo json_encode([
                "success" => false,
                "message" => "対象のチャットが見つかりません"
            ]);
            exit;
        }
    }

    $memberStmt = $pdo->prepare("
        SELECT 1
        FROM chat_members
        WHERE chat_id = :chat_id
          AND user_id = :user_id
        LIMIT 1
    ");
    $memberStmt->bindValue(":chat_id", $chatId, PDO::PARAM_INT);
    $memberStmt->bindValue(":user_id", $userId, PDO::PARAM_INT);
    $memberStmt->execute();

    if (!$memberStmt->fetchColumn()) {
        http_response_code(403);
        echo json_encode([
            "success" => false,
            "message" => "このチャットを閲覧する権限がありません"
        ]);
        exit;
    }

    if ($_SERVER["REQUEST_METHOD"] === "POST") {
        // SQL定義上 message_read_id はAUTO_INCREMENTではなく、
        // (message_id, user_id) の一意制約もないため、既読登録全体を直列化する。
        $lockStmt = $pdo->query("SELECT GET_LOCK('tabi_message_reads_id_lock', 5)");
        $idLockAcquired = (int) $lockStmt->fetchColumn() === 1;

        if (!$idLockAcquired) {
            throw new RuntimeException("既読IDの採番ロックを取得できませんでした");
        }

        $pdo->beginTransaction();

        $targetSql = "
            SELECT m.message_id
            FROM messages m
            WHERE m.chat_id = :chat_id
              AND m.sender_user_id <> :user_id
        ";
        $targetParams = [
            ":chat_id" => (int) $chatId,
            ":user_id" => $userId
        ];

        if ($messageIds !== []) {
            $placeholders = [];

            foreach ($messageIds as $index => $id) {
                $placeholder = ":message_id_" . $index;
                $placeholders[] = $placeholder;
                $targetParams[$placeholder] = (int) $id;
            }

            $targetSql .= " AND m.message_id IN (" . implode(", ", $placeholders) . ")";
        }

        $targetSql .= "
            AND NOT EXISTS (
                SELECT 1
                FROM message_reads mr
                WHERE mr.message_id = m.message_id
                  AND mr.user_id = :read_user_id
            )
            ORDER BY m.message_id ASC
        ";
        $targetParams[":read_user_id"] = $userId;

        $targetStmt = $pdo->prepare($targetSql);

        foreach ($targetParams as $key => $value) {
            $targetStmt->bindValue($key, $value, PDO::PARAM_INT);
        }

        $targetStmt->execute();
        $targetMessageIds = array_map("intval", $targetStmt->fetchAll(PDO::FETCH_COLUMN));
        $markedCount = 0;

        if ($targetMessageIds !== []) {
            $idStmt = $pdo->query("
                SELECT COALESCE(MAX(message_read_id), 0) + 1
                FROM message_reads
            ");
            $nextReadId = (int) $idStmt->fetchColumn();

            $insertStmt = $pdo->prepare("
                INSERT INTO message_reads (
                    message_read_id,
                    message_id,
                    user_id,
                    read_at
                ) VALUES (
                    :message_read_id,
                    :message_id,
                    :user_id,
                    NOW()
                )
            ");

            foreach ($targetMessageIds as $targetMessageId) {
                $insertStmt->bindValue(":message_read_id", $nextReadId, PDO::PARAM_INT);
                $insertStmt->bindValue(":message_id", $targetMessageId, PDO::PARAM_INT);
                $insertStmt->bindValue(":user_id", $userId, PDO::PARAM_INT);
                $insertStmt->execute();
                $nextReadId++;
                $markedCount++;
            }
        }

        $pdo->commit();
        $pdo->query("SELECT RELEASE_LOCK('tabi_message_reads_id_lock')");
        $idLockAcquired = false;
    }

    $statusStmt = $pdo->prepare("
        SELECT
            m.message_id,
            COUNT(DISTINCT CASE
                WHEN mr.user_id <> m.sender_user_id THEN mr.user_id
            END) AS read_count,
            MAX(CASE WHEN mr.user_id = :user_id THEN 1 ELSE 0 END) AS is_read
        FROM messages m
        LEFT JOIN message_reads mr ON mr.message_id = m.message_id
        WHERE m.chat_id = :chat_id
        GROUP BY m.message_id
        ORDER BY m.sent_at ASC, m.message_id ASC
    ");
    $statusStmt->bindValue(":user_id", $userId, PDO::PARAM_INT);
    $statusStmt->bindValue(":chat_id", $chatId, PDO::PARAM_INT);
    $statusStmt->execute();

    $reads = array_map(
        static fn($read) => [
            "message_id" => (int) $read["message_id"],
            "read_count" => (int) $read["read_count"],
            "is_read" => (bool) $read["is_read"]
        ],
        $statusStmt->fetchAll(PDO::FETCH_ASSOC)
    );

    $response = [
        "success" => true,
        "chat_id" => (int) $chatId,
        "reads" => $reads
    ];

    if ($_SERVER["REQUEST_METHOD"] === "POST") {
        $response["marked_count"] = $markedCount;
    }

    echo json_encode(
        $response,
        JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES
    );
} catch (Throwable $error) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }

    if ($idLockAcquired) {
        $pdo->query("SELECT RELEASE_LOCK('tabi_message_reads_id_lock')");
    }

    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => "既読状態の処理に失敗しました"
    ]);
}
