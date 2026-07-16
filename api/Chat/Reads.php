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

// セッション開始 - ユーザーのセッション管理を初期化
session_start();

// JSONレスポンスの設定
header("Content-Type: application/json; charset=UTF-8");

// データベース接続設定を読み込む
require_once __DIR__ . "/../config/db.php";

// このAPIは閲覧用(GET)と既読登録用(POST)の両方を受け付ける。
if (!in_array($_SERVER["REQUEST_METHOD"], ["GET", "POST"], true)) {
    http_response_code(405);
    // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
    echo json_encode([
        "success" => false,
        "message" => "GETまたはPOSTメソッドで送信してください"
    ]);
    exit;
}

// ログインしていないユーザーには既読情報を扱わせない。
if (!isset($_SESSION["user_id"])) {
    http_response_code(401);
    // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
    echo json_encode([
        "success" => false,
        "message" => "ログインが必要です"
    ]);
    exit;
}

$userId = (int) $_SESSION["user_id"];

// ここで解除
session_write_close();

// GET の場合はクエリ文字列、POST の場合は JSON / フォームを読む。
$input = $_GET;

// ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
if ($_SERVER["REQUEST_METHOD"] === "POST") {
    // フロントエンドから送られた JSON 文字列を、PHP で扱える配列に変換します。
    $jsonInput = json_decode(file_get_contents("php://input"), true);
    $input = is_array($jsonInput) ? $jsonInput : $_POST;
}

// 操作対象のチャットと、任意で指定されるメッセージID群を取得する。
$chatId = filter_var($input["chat_id"] ?? null, FILTER_VALIDATE_INT);
$groupId = filter_var($input["group_id"] ?? null, FILTER_VALIDATE_INT);
$messageId = filter_var($input["message_id"] ?? null, FILTER_VALIDATE_INT);
$messageIds = $input["message_ids"] ?? [];

// 0 以下は無効値として扱う。
if ($chatId !== null && $chatId !== false && $chatId < 1) {
    $chatId = false;
}

// ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
if ($groupId !== null && $groupId !== false && $groupId < 1) {
    $groupId = false;
}

// chat_id か group_id のどちらかが必須。
if (!$chatId && !$groupId) {
    http_response_code(400);
    // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
    echo json_encode([
        "success" => false,
        "message" => "chat_id または group_id を指定してください"
    ]);
    exit;
}

// message_ids は配列だけを採用し、それ以外は空配列に落とす。
if (!is_array($messageIds)) {
    $messageIds = [];
}

// 単一指定の message_id もまとめて扱う。
if ($messageId) {
    $messageIds[] = $messageId;
}

// 重複を消し、正の整数だけに絞る。
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

// 既読登録の同時実行を避けるため、採番処理を直列化する。
$idLockAcquired = false;

// データベース処理などでエラーが起きる可能性があるため、例外を受け取れる形で実行します。
try {
    // group_id だけ渡された場合は、最新の group チャットを解決する。
    if (!$chatId) {
        // SQL を準備し、あとから値を安全に入れられる形にします。
        $chatStmt = $pdo->prepare("
            SELECT c.chat_id
            FROM chats c
            INNER JOIN trips t ON t.trip_id = c.trip_id
            WHERE t.group_id = :group_id
              AND c.chat_type = 'group'
            ORDER BY c.chat_id DESC
            LIMIT 1
        ");
        // SQL 内の目印に値を割り当て、入力値が SQL 命令として実行されないようにします。
        $chatStmt->bindValue(":group_id", $groupId, PDO::PARAM_INT);
        // 準備した SQL を実行し、データベースへの取得・登録・更新を行います。
        $chatStmt->execute();
        $chatId = $chatStmt->fetchColumn();

        // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
        if (!$chatId) {
            http_response_code(404);
            // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
            echo json_encode([
                "success" => false,
                "message" => "対象のチャットが見つかりません"
            ]);
            exit;
        }
    }

    // そのチャットを閲覧できるメンバーか確認する。
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
        http_response_code(403);
        // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
        echo json_encode([
            "success" => false,
            "message" => "このチャットを閲覧する権限がありません"
        ]);
        exit;
    }

    // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
    if ($_SERVER["REQUEST_METHOD"] === "POST") {
        // message_read_id は AUTO_INCREMENT ではなく、
        // (message_id, user_id) の一意制約もないため、既読登録全体を直列化する。
        $lockStmt = $pdo->query("SELECT GET_LOCK('tabi_message_reads_id_lock', 5)");
        $idLockAcquired = (int) $lockStmt->fetchColumn() === 1;

        // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
        if (!$idLockAcquired) {
            throw new RuntimeException("既読IDの採番ロックを取得できませんでした");
        }

        // ロック取得後にトランザクションを開始して、既読追加をまとめて処理する。
        $pdo->beginTransaction();

        // 既読登録対象のメッセージを、条件に合うものだけ絞り込む。
        $targetSql = "
            SELECT m.message_id
            FROM messages m
            INNER JOIN chat_members cm_sender
              ON cm_sender.chat_id = m.chat_id
             AND cm_sender.user_id = m.sender_user_id
            WHERE m.chat_id = :chat_id
              AND m.sender_user_id <> :user_id
        ";
        $targetParams = [
            ":chat_id" => (int) $chatId,
            ":user_id" => $userId
        ];

        // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
        if ($messageIds !== []) {
            $placeholders = [];

            // 複数のデータを1件ずつ取り出し、同じ確認や変換を繰り返します。
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

        // SQL を準備し、あとから値を安全に入れられる形にします。
        $targetStmt = $pdo->prepare($targetSql);

        // 複数のデータを1件ずつ取り出し、同じ確認や変換を繰り返します。
        foreach ($targetParams as $key => $value) {
            // SQL 内の目印に値を割り当て、入力値が SQL 命令として実行されないようにします。
            $targetStmt->bindValue($key, $value, PDO::PARAM_INT);
        }

        // 準備した SQL を実行し、データベースへの取得・登録・更新を行います。
        $targetStmt->execute();
        $targetMessageIds = array_map("intval", $targetStmt->fetchAll(PDO::FETCH_COLUMN));
        $markedCount = 0;

        // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
        if ($targetMessageIds !== []) {
            // message_reads の採番用に、次に使うIDを決める。
            $idStmt = $pdo->query("
                SELECT COALESCE(MAX(message_read_id), 0) + 1
                FROM message_reads
            ");
            $nextReadId = (int) $idStmt->fetchColumn();

            // 対象メッセージごとに既読レコードを追加する。
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
                $markedCount++;
            }
        }

        // 既読登録が成功したので確定する。
        $pdo->commit();
        $pdo->query("SELECT RELEASE_LOCK('tabi_message_reads_id_lock')");
        $idLockAcquired = false;
    }

    // 各メッセージについて、既読数と自分が既読済みかどうかを集計する。
    $statusStmt = $pdo->prepare("
        SELECT
            m.message_id,
            COUNT(DISTINCT CASE
                WHEN mr.user_id <> m.sender_user_id THEN mr.user_id
            END) AS read_count,
            MAX(CASE WHEN mr.user_id = :user_id THEN 1 ELSE 0 END) AS is_read
        FROM messages m
        INNER JOIN chat_members cm_sender
          ON cm_sender.chat_id = m.chat_id
         AND cm_sender.user_id = m.sender_user_id
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

    // フロント側がそのまま参照できる配列に整形する。
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

    // POST の場合は、今回新しく既読にした件数も返す。
    if ($_SERVER["REQUEST_METHOD"] === "POST") {
        $response["marked_count"] = $markedCount;
    }

    // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
    echo json_encode(
        $response,
        JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES
    );
// エラーが起きた場合は、詳細をログに残し、利用者には安全なメッセージを返します。
} catch (Throwable $error) {
    // エラー時はトランザクションを戻す。
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }

    // 取得したロックは必ず解放する。
    if ($idLockAcquired) {
        $pdo->query("SELECT RELEASE_LOCK('tabi_message_reads_id_lock')");
    }

    // 詳細な内部例外は返さず、共通メッセージにまとめる。
    http_response_code(500);
    // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
    echo json_encode([
        "success" => false,
        "message" => "既読状態の処理に失敗しました"
    ]);
}
