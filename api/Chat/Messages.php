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
// 共通設定や別ファイルの関数を読み込み、この API から使えるようにします。
require_once __DIR__ . "/../Groups/S3Common.php";

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

// users.icon_url にはS3キー（例: User/2/profile/xxx.jpeg）が保存されているため、
// 表示可能な署名付きURLへ変換する。変換できない場合は null を返す。
function resolveIconUrl(?string $iconValue): ?string
{
    static $initialized = false, $s3 = null, $aws = null, $cache = [];

    $iconValue = trim((string) $iconValue);

    // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
    if ($iconValue === "") {
        return null;
    }

    // 誤って完全URLが保存されている場合はpath部分をS3キーに戻す
    if (strpos($iconValue, "http://") === 0 || strpos($iconValue, "https://") === 0) {
        $path = parse_url($iconValue, PHP_URL_PATH);

        // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
        if (!$path) {
            return null;
        }

        $iconValue = rawurldecode($path);
    }

    $key = ltrim($iconValue, "/");

    // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
    if ($key === "") {
        return null;
    }

    // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
    if (array_key_exists($key, $cache)) {
        return $cache[$key];
    }

    // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
    if (!$initialized) {
        $initialized = true;

        // データベース処理などでエラーが起きる可能性があるため、例外を受け取れる形で実行します。
        try {
            $aws = loadAwsConfig();
            $s3 = $aws ? createS3Client($aws) : null;
        // エラーが起きた場合は、詳細をログに残し、利用者には安全なメッセージを返します。
        } catch (Throwable $error) {
            $s3 = null;
        }
    }

    // 署名付きURLを作ると、非公開のS3画像をブラウザで一時的に表示できます。期限が切れたら再生成が必要です。
    return $cache[$key] = ($s3 && $aws) ? presignS3Url($s3, $aws["bucket"], $key) : null;
}

/**
 * firstCharacter は、この API 内で何度も使う処理をまとめた関数です。
 * 引数として受け取った値をもとに、確認・取得・更新などの結果を返します。
 */
function firstCharacter(string $value): string
{
    $value = trim($value);

    // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
    if ($value === "") {
        return "?";
    }

    return function_exists("mb_substr") ? mb_substr($value, 0, 1) : substr($value, 0, 1);
}

/**
 * formatDateLabel は、この API 内で何度も使う処理をまとめた関数です。
 * 引数として受け取った値をもとに、確認・取得・更新などの結果を返します。
 */
function formatDateLabel(?string $value): string
{
    // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
    if (!$value) {
        return "";
    }

    $date = new DateTimeImmutable($value);
    $oneYearAgo = (new DateTimeImmutable("now"))->modify("-1 year");

    // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
    if ($date < $oneYearAgo) {
        return $date->format("Y年n月j日");
    }

    return $date->format("n月j日");
}

/**
 * formatTime は、この API 内で何度も使う処理をまとめた関数です。
 * 引数として受け取った値をもとに、確認・取得・更新などの結果を返します。
 */
function formatTime(?string $value): string
{
    // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
    if (!$value) {
        return "";
    }

    return (new DateTimeImmutable($value))->format("H:i");
}

/**
 * normalizeCategory は、この API 内で何度も使う処理をまとめた関数です。
 * 引数として受け取った値をもとに、確認・取得・更新などの結果を返します。
 */
function normalizeCategory(?string $chatType): string
{
    // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
    if ($chatType === "hotel") {
        return "hotel";
    }

    // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
    if ($chatType === "support") {
        return "friend";
    }

    return "group";
}

/**
 * ensureMember は、この API 内で何度も使う処理をまとめた関数です。
 * 引数として受け取った値をもとに、確認・取得・更新などの結果を返します。
 */
function ensureMember(PDO $pdo, int $chatId, int $userId): void
{
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
        respond([
            "success" => false,
            "message" => "You do not have permission to view this chat."
        ], 403);
    }
}

/**
 * resolveChatId は、この API 内で何度も使う処理をまとめた関数です。
 * 引数として受け取った値をもとに、確認・取得・更新などの結果を返します。
 */
function resolveChatId(PDO $pdo, int $userId, $chatIdInput, $groupIdInput): int
{
    $chatId = filter_var($chatIdInput, FILTER_VALIDATE_INT);
    $groupId = filter_var($groupIdInput, FILTER_VALIDATE_INT);

    // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
    if ($chatId && $chatId > 0) {
        ensureMember($pdo, (int) $chatId, $userId);
        return (int) $chatId;
    }

    // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
    if ($groupId && $groupId > 0) {
        // SQL を準備し、あとから値を安全に入れられる形にします。
        $chatStmt = $pdo->prepare("
            SELECT c.chat_id
            FROM chats c
            INNER JOIN trips t ON t.trip_id = c.trip_id
            INNER JOIN chat_members cm ON cm.chat_id = c.chat_id
            WHERE t.group_id = :group_id
              AND c.chat_type = 'group'
              AND cm.user_id = :user_id
            ORDER BY c.chat_id DESC
            LIMIT 1
        ");
        // SQL 内の目印に値を割り当て、入力値が SQL 命令として実行されないようにします。
        $chatStmt->bindValue(":group_id", $groupId, PDO::PARAM_INT);
        // SQL 内の目印に値を割り当て、入力値が SQL 命令として実行されないようにします。
        $chatStmt->bindValue(":user_id", $userId, PDO::PARAM_INT);
        // 準備した SQL を実行し、データベースへの取得・登録・更新を行います。
        $chatStmt->execute();
        $resolvedId = $chatStmt->fetchColumn();

        // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
        if ($resolvedId) {
            return (int) $resolvedId;
        }

        // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
        respond([
            "success" => true,
            "chat_id" => null,
            "member_count" => 0,
            "contact" => null,
            "messages" => []
        ]);
    }

    // SQL を準備し、あとから値を安全に入れられる形にします。
    $chatStmt = $pdo->prepare("
        SELECT c.chat_id
        FROM chats c
        INNER JOIN chat_members cm ON cm.chat_id = c.chat_id
        WHERE cm.user_id = :user_id
          AND c.chat_type = 'hotel'
        ORDER BY c.created_at DESC, c.chat_id DESC
        LIMIT 1
    ");
    // SQL 内の目印に値を割り当て、入力値が SQL 命令として実行されないようにします。
    $chatStmt->bindValue(":user_id", $userId, PDO::PARAM_INT);
    // 準備した SQL を実行し、データベースへの取得・登録・更新を行います。
    $chatStmt->execute();
    $resolvedId = $chatStmt->fetchColumn();

    // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
    if ($resolvedId) {
        return (int) $resolvedId;
    }

    // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
    respond([
        "success" => false,
        "message" => "Hotel chat not found."
    ], 404);
}

/**
 * fetchContact は、この API 内で何度も使う処理をまとめた関数です。
 * 引数として受け取った値をもとに、確認・取得・更新などの結果を返します。
 */
function fetchContact(PDO $pdo, int $chatId): array
{
    // SQL を準備し、あとから値を安全に入れられる形にします。
    $contactStmt = $pdo->prepare("
        SELECT
            c.chat_id,
            c.chat_type,
            c.related_entity_type,
            c.related_entity_id,
            t.title AS trip_title,
            tc.candidate_name,
            tc.img_url,
            latest.body AS last_message,
            latest.sent_at AS last_sent_at,
            COUNT(DISTINCT cm.user_id) AS member_count
        FROM chats c
        LEFT JOIN trips t ON t.trip_id = c.trip_id
        LEFT JOIN trip_candidates tc
          ON c.related_entity_type = 'hotel'
         AND tc.candidate_id = c.related_entity_id
        LEFT JOIN chat_members cm ON cm.chat_id = c.chat_id
        LEFT JOIN messages latest ON latest.message_id = (
            SELECT m2.message_id
            FROM messages m2
            INNER JOIN chat_members cm_sender
              ON cm_sender.chat_id = m2.chat_id
             AND cm_sender.user_id = m2.sender_user_id
            WHERE m2.chat_id = c.chat_id
            ORDER BY m2.sent_at DESC, m2.message_id DESC
            LIMIT 1
        )
        WHERE c.chat_id = :chat_id
        GROUP BY
            c.chat_id,
            c.chat_type,
            c.related_entity_type,
            c.related_entity_id,
            t.title,
            tc.candidate_name,
            tc.img_url,
            latest.body,
            latest.sent_at
        LIMIT 1
    ");
    // SQL 内の目印に値を割り当て、入力値が SQL 命令として実行されないようにします。
    $contactStmt->bindValue(":chat_id", $chatId, PDO::PARAM_INT);
    // 準備した SQL を実行し、データベースへの取得・登録・更新を行います。
    $contactStmt->execute();
    $chat = $contactStmt->fetch(PDO::FETCH_ASSOC);

    // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
    if (!$chat) {
        return [];
    }

    $category = normalizeCategory($chat["chat_type"] ?? null);
    $name = $chat["candidate_name"] ?: ($chat["trip_title"] ?: "Chat #" . $chatId);

    return [
        "id" => $chatId,
        "chat_id" => $chatId,
        "name" => $name,
        "category" => $category,
        "avatar" => resolveIconUrl($chat["img_url"]) ?: firstCharacter($name),
        "lastMessage" => $chat["last_message"] ?: "",
        "time" => formatTime($chat["last_sent_at"]),
        "unread" => 0,
        "memberCount" => (int) $chat["member_count"],
        "related_entity_type" => $chat["related_entity_type"],
        "related_entity_id" => $chat["related_entity_id"] !== null ? (int) $chat["related_entity_id"] : null
    ];
}

/**
 * fetchMessages は、この API 内で何度も使う処理をまとめた関数です。
 * 引数として受け取った値をもとに、確認・取得・更新などの結果を返します。
 */
function fetchMessages(PDO $pdo, int $chatId, int $userId): array
{
    // SQL を準備し、あとから値を安全に入れられる形にします。
    $messageStmt = $pdo->prepare("
        SELECT
            m.message_id,
            m.chat_id,
            m.sender_user_id,
            m.body,
            m.image_url,
            m.sent_at,
            u.name AS sender_name,
            u.icon_url AS sender_icon_url,
            COUNT(DISTINCT CASE
                WHEN mr.user_id <> m.sender_user_id THEN mr.user_id
            END) AS read_count,
            MAX(CASE WHEN mr.user_id = :current_user_id THEN 1 ELSE 0 END) AS is_read
        FROM messages m
        INNER JOIN chat_members cm_sender
          ON cm_sender.chat_id = m.chat_id
         AND cm_sender.user_id = m.sender_user_id
        LEFT JOIN users u ON u.user_id = m.sender_user_id
        LEFT JOIN message_reads mr ON mr.message_id = m.message_id
        WHERE m.chat_id = :chat_id
        GROUP BY
            m.message_id,
            m.chat_id,
            m.sender_user_id,
            m.body,
            m.image_url,
            m.sent_at,
            u.name,
            u.icon_url
        ORDER BY m.sent_at ASC, m.message_id ASC
    ");
    // SQL 内の目印に値を割り当て、入力値が SQL 命令として実行されないようにします。
    $messageStmt->bindValue(":current_user_id", $userId, PDO::PARAM_INT);
    // SQL 内の目印に値を割り当て、入力値が SQL 命令として実行されないようにします。
    $messageStmt->bindValue(":chat_id", $chatId, PDO::PARAM_INT);
    // 準備した SQL を実行し、データベースへの取得・登録・更新を行います。
    $messageStmt->execute();

    $messages = [];

    while ($message = $messageStmt->fetch(PDO::FETCH_ASSOC)) {
        $senderName = $message["sender_name"] ?? "Unknown user";

        // DBに保存されている元のS3オブジェクトキー
        $senderIconKey = trim(
            (string) ($message["sender_icon_url"] ?? "")
        );

        // S3署名付きURLへ変換
        $senderIconUrl = resolveIconUrl($senderIconKey);

        $messages[] = [
            "id" => (int) $message["message_id"],
            "message_id" => (int) $message["message_id"],
            "chat_id" => (int) $message["chat_id"],
            "sender_user_id" => (int) $message["sender_user_id"],
            "sender" => $senderName,
            "sender_name" => $senderName,
            "senderName" => $senderName,

            "avatar" => $senderIconUrl ?: firstCharacter($senderName),
            "sender_icon_url" => $senderIconUrl,

            // 原因確認用
            "text" => $message["body"],
            "body" => $message["body"],
            "image_url" => $message["image_url"],
            "sent_at" => $message["sent_at"],
            "date" => formatDateLabel($message["sent_at"]),
            "time" => formatTime($message["sent_at"]),
            "readCount" => (int) $message["read_count"],
            "read_count" => (int) $message["read_count"],
            "isRead" => (bool) $message["is_read"],
            "isMine" => (int) $message["sender_user_id"] === $userId
        ];
    }

    return $messages;
}

// ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
if ($_SERVER["REQUEST_METHOD"] !== "GET") {
    // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
    respond([
        "success" => false,
        "message" => "Use GET."
    ], 405);
}

// ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
if (!isset($_SESSION["user_id"])) {
    // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
    respond([
        "success" => false,
        "message" => "Login required."
    ], 401);
}

$userId = (int) $_SESSION["user_id"];
// このAPIではセッションの中身を書き換えないため、IDを読んだらロックを解放します。
// 他のチャットAPIを待たせないことで、ブラウザ側で通信が詰まってキャンセルされる可能性を下げます。
session_write_close();

// データベース処理などでエラーが起きる可能性があるため、例外を受け取れる形で実行します。
try {
    $chatId = resolveChatId(
        $pdo,
        $userId,
        $_GET["chat_id"] ?? null,
        $_GET["group_id"] ?? null
    );

    ensureMember($pdo, $chatId, $userId);

    $contact = fetchContact($pdo, $chatId);

    /*
     * 原因調査用
     * Webアプリが実際に接続しているDBの情報を取得する
     */
    /*
     * Webアプリが参照しているusersテーブルから、
     * user_id = 3 のデータを直接取得する
     */
    respond([
        "success" => true,

        // 原因調査用：確認が終わったら削除する
        "chat_id" => $chatId,
        "member_count" => (int) ($contact["memberCount"] ?? 0),
        "contact" => $contact,
        "messages" => fetchMessages($pdo, $chatId, $userId)
    ]);
// エラーが起きた場合は、詳細をログに残し、利用者には安全なメッセージを返します。
} catch (Throwable $error) {
    // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
    respond([
        "success" => false,
        "message" => "Failed to load messages."
    ], 500);
}
