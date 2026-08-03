<?php

/**
 * チャットの一覧、メッセージ取得、送信、既読、画像アップロードを扱う API です。
 *
 * 主な流れ:
 * 1. リクエストやセッションなど、処理に必要な情報を読み取る
 * 2. 入力値や権限を確認し、必要に応じてデータベースへ問い合わせる
 * 3. 処理結果を JSON などの形でフロントエンドへ返す
 *
 * 扱うデータ: アプリの設定値や、他のファイルから受け取る値を主に扱います。
 */

// セッションを開始し、ログイン中のユーザー情報をサーバー側で使えるようにします。
session_start();
// フロントエンドへ返すデータ形式や通信ルールを、HTTP ヘッダーとして伝えます。
header("Content-Type: application/json; charset=UTF-8");

// 共通設定や別ファイルの関数を読み込み、この API から使えるようにします。
require_once __DIR__ . "/../config/db.php";

/**
 * respond は、この API 内で何度も使う処理をまとめた関数です。
 * 引数として受け取った値をもとに、確認・取得・更新などの結果を返します。
 */
function respond(array $payload, int $status = 200): void
{
    http_response_code($status);
    // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

// ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
    respond(["success" => false, "message" => "POSTで送信してください"], 405);
}

// ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
if (!isset($_SESSION["user_id"])) {
    // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
    respond(["success" => false, "message" => "ログインが必要です"], 401);
}

// フロントエンドから送られた JSON 文字列を、PHP で扱える配列に変換します。
$input = json_decode(file_get_contents("php://input"), true);
// ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
if (!is_array($input)) {
    $input = $_POST;
}

$userId = (int) $_SESSION["user_id"];
$chatId = filter_var($input["chat_id"] ?? null, FILTER_VALIDATE_INT);

// ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
if (!$chatId || $chatId < 1) {
    // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
    respond(["success" => false, "message" => "chat_id を指定してください"], 400);
}

// データベース処理などでエラーが起きる可能性があるため、例外を受け取れる形で実行します。
try {
    // SQL を準備し、あとから値を安全に入れられる形にします。
    $memberStmt = $pdo->prepare("
        SELECT 1
        FROM chat_members
        WHERE chat_id = :chat_id
          AND user_id = :user_id
        LIMIT 1
    ");
    // SQL 内の目印に値を割り当て、入力値が SQL 命令として実行されないようにします。
    $memberStmt->bindValue(":chat_id", $chatId, PDO::PARAM_INT);
    // SQL 内の目印に値を割り当て、入力値が SQL 命令として実行されないようにします。
    $memberStmt->bindValue(":user_id", $userId, PDO::PARAM_INT);
    // 準備した SQL を実行し、データベースへの取得・登録・更新を行います。
    $memberStmt->execute();

    // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
    if (!$memberStmt->fetchColumn()) {
        // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
        respond(["success" => false, "message" => "このチャットを閲覧する権限がありません"], 403);
    }

    $pdo->beginTransaction();

    // SQL を準備し、あとから値を安全に入れられる形にします。
    $targetStmt = $pdo->prepare("
        SELECT m.message_id
        FROM messages m
        WHERE m.chat_id = :chat_id
          AND m.sender_user_id <> :user_id
          AND NOT EXISTS (
              SELECT 1
              FROM message_reads mr
              WHERE mr.message_id = m.message_id
                AND mr.user_id = :user_id2
          )
        ORDER BY m.message_id ASC
    ");
    // SQL 内の目印に値を割り当て、入力値が SQL 命令として実行されないようにします。
    $targetStmt->bindValue(":chat_id", $chatId, PDO::PARAM_INT);
    // SQL 内の目印に値を割り当て、入力値が SQL 命令として実行されないようにします。
    $targetStmt->bindValue(":user_id", $userId, PDO::PARAM_INT);
    // SQL 内の目印に値を割り当て、入力値が SQL 命令として実行されないようにします。
    $targetStmt->bindValue(":user_id2", $userId, PDO::PARAM_INT);
    // 準備した SQL を実行し、データベースへの取得・登録・更新を行います。
    $targetStmt->execute();
    $targetMessageIds = array_map("intval", $targetStmt->fetchAll(PDO::FETCH_COLUMN));

    // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
    if ($targetMessageIds !== []) {
        $idStmt = $pdo->query("SELECT COALESCE(MAX(message_read_id), 0) + 1 FROM message_reads");
        $nextReadId = (int) $idStmt->fetchColumn();

        // SQL を準備し、あとから値を安全に入れられる形にします。
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

        // 複数のデータを1件ずつ取り出し、同じ確認や変換を繰り返します。
        foreach ($targetMessageIds as $targetMessageId) {
            // SQL 内の目印に値を割り当て、入力値が SQL 命令として実行されないようにします。
            $insertStmt->bindValue(":message_read_id", $nextReadId, PDO::PARAM_INT);
            // SQL 内の目印に値を割り当て、入力値が SQL 命令として実行されないようにします。
            $insertStmt->bindValue(":message_id", $targetMessageId, PDO::PARAM_INT);
            // SQL 内の目印に値を割り当て、入力値が SQL 命令として実行されないようにします。
            $insertStmt->bindValue(":user_id", $userId, PDO::PARAM_INT);
            // 準備した SQL を実行し、データベースへの取得・登録・更新を行います。
            $insertStmt->execute();
            $nextReadId++;
        }
    }

    // SQL を準備し、あとから値を安全に入れられる形にします。
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
    // SQL 内の目印に値を割り当て、入力値が SQL 命令として実行されないようにします。
    $statusStmt->bindValue(":user_id", $userId, PDO::PARAM_INT);
    // SQL 内の目印に値を割り当て、入力値が SQL 命令として実行されないようにします。
    $statusStmt->bindValue(":chat_id", $chatId, PDO::PARAM_INT);
    // 準備した SQL を実行し、データベースへの取得・登録・更新を行います。
    $statusStmt->execute();

    $reads = array_map(
        static fn($read) => [
            "message_id" => (int) $read["message_id"],
            "read_count" => (int) $read["read_count"],
            "is_read" => (bool) $read["is_read"],
        ],
        $statusStmt->fetchAll(PDO::FETCH_ASSOC)
    );

    $pdo->commit();

    // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
    respond([
        "success" => true,
        "chat_id" => (int) $chatId,
        "reads" => $reads,
        "marked_count" => count($targetMessageIds),
    ]);
// エラーが起きた場合は、詳細をログに残し、利用者には安全なメッセージを返します。
} catch (Throwable $error) {
    // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
    respond(["success" => false, "message" => "既読更新に失敗しました"], 500);
}
