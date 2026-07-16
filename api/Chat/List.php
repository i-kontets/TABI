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
 * resolveUserIconUrl は、この API 内で何度も使う処理をまとめた関数です。
 * 引数として受け取った値をもとに、確認・取得・更新などの結果を返します。
 */
function resolveUserIconUrl(?string $iconValue): ?string
{
    static $initialized = false, $s3 = null, $aws = null, $cache = [];

    $iconValue = trim((string) $iconValue);

    // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
    if ($iconValue === "") {
        return null;
    }

    // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
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
    if ($chatType === "friend" || $chatType === "direct" || $chatType === "support") {
        return "friend";
    }

    return "group";
}

// ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
if ($_SERVER["REQUEST_METHOD"] !== "GET") {
    // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
    respond([
        "success" => false,
        "message" => "GETで送信してください。"
    ], 405);
}

// ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
if (!isset($_SESSION["user_id"])) {
    // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
    respond([
        "success" => false,
        "message" => "ログインが必要です。"
    ], 401);
}

$userId = (int) $_SESSION["user_id"];

// データベース処理などでエラーが起きる可能性があるため、例外を受け取れる形で実行します。
try {
    // SQL を準備し、あとから値を安全に入れられる形にします。
    $stmt = $pdo->prepare("
        SELECT
            c.chat_id,
            c.chat_type,
            c.related_entity_type,
            c.related_entity_id,
            t.title AS trip_title,
            tc.candidate_name,
            tc.img_url AS candidate_img_url,
            other_user.name AS other_user_name,
            other_user.icon_url AS other_user_icon_url,
            latest.body AS last_message,
            latest.sent_at AS last_sent_at,
            COUNT(DISTINCT cm_all.user_id) AS member_count,
            COUNT(DISTINCT unread.message_id) AS unread_count
        FROM chat_members cm_self
        INNER JOIN chats c ON c.chat_id = cm_self.chat_id
        LEFT JOIN trips t ON t.trip_id = c.trip_id
        LEFT JOIN trip_candidates tc
          ON c.related_entity_type = 'hotel'
         AND tc.candidate_id = c.related_entity_id
        LEFT JOIN chat_members cm_all ON cm_all.chat_id = c.chat_id
        LEFT JOIN users other_user ON other_user.user_id = (
            SELECT cm_other.user_id
            FROM chat_members cm_other
            WHERE cm_other.chat_id = c.chat_id
              AND cm_other.user_id <> :other_user_id
            ORDER BY cm_other.user_id ASC
            LIMIT 1
        )
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
        LEFT JOIN messages unread ON unread.chat_id = c.chat_id
            AND unread.sender_user_id <> :unread_user_id
            AND EXISTS (
                SELECT 1
                FROM chat_members cm_unread_sender
                WHERE cm_unread_sender.chat_id = unread.chat_id
                  AND cm_unread_sender.user_id = unread.sender_user_id
            )
            AND NOT EXISTS (
                SELECT 1
                FROM message_reads mr
                WHERE mr.message_id = unread.message_id
                  AND mr.user_id = :read_user_id
            )
        WHERE cm_self.user_id = :user_id
        GROUP BY
            c.chat_id,
            c.chat_type,
            c.related_entity_type,
            c.related_entity_id,
            t.title,
            tc.candidate_name,
            tc.img_url,
            other_user.name,
            other_user.icon_url,
            latest.body,
            latest.sent_at
        ORDER BY COALESCE(latest.sent_at, c.created_at) DESC, c.chat_id DESC
    ");
    // SQL 内の目印に値を割り当て、入力値が SQL 命令として実行されないようにします。
    $stmt->bindValue(":user_id", $userId, PDO::PARAM_INT);
    // SQL 内の目印に値を割り当て、入力値が SQL 命令として実行されないようにします。
    $stmt->bindValue(":other_user_id", $userId, PDO::PARAM_INT);
    // SQL 内の目印に値を割り当て、入力値が SQL 命令として実行されないようにします。
    $stmt->bindValue(":unread_user_id", $userId, PDO::PARAM_INT);
    // SQL 内の目印に値を割り当て、入力値が SQL 命令として実行されないようにします。
    $stmt->bindValue(":read_user_id", $userId, PDO::PARAM_INT);
    // 準備した SQL を実行し、データベースへの取得・登録・更新を行います。
    $stmt->execute();

    $contacts = [];

    while ($chat = $stmt->fetch(PDO::FETCH_ASSOC)) {
        $chatId = (int) $chat["chat_id"];
        $memberCount = (int) $chat["member_count"];
        $category = normalizeCategory($chat["chat_type"] ?? null);

        // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
        if ($category !== "hotel" && $memberCount <= 2) {
            $category = "friend";
        }

        $name = $chat["trip_title"] ?: "チャット #" . $chatId;
        $avatar = "";

        // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
        if ($category === "hotel") {
            $name = $chat["candidate_name"] ?: $name;
            $avatar = $chat["candidate_img_url"] ?: "";
        } elseif ($category === "friend") {
            $name = $chat["other_user_name"] ?: $name;
            $avatar = resolveUserIconUrl($chat["other_user_icon_url"] ?? null) ?: "";
        }

        // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
        if ($avatar === "") {
            $avatar = firstCharacter($name);
        }

        $contacts[] = [
            "id" => $chatId,
            "chat_id" => $chatId,
            "name" => $name,
            "category" => $category,
            "avatar" => $avatar,
            "lastMessage" => $chat["last_message"] ?: "",
            "time" => formatTime($chat["last_sent_at"]),
            "unread" => (int) $chat["unread_count"],
            "memberCount" => $memberCount,
            "related_entity_type" => $chat["related_entity_type"],
            "related_entity_id" => $chat["related_entity_id"] !== null ? (int) $chat["related_entity_id"] : null
        ];
    }

    // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
    respond([
        "success" => true,
        "contacts" => $contacts
    ]);
// エラーが起きた場合は、詳細をログに残し、利用者には安全なメッセージを返します。
} catch (Throwable $error) {
    // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
    respond([
        "success" => false,
        "message" => "チャット一覧の取得に失敗しました。"
    ], 500);
}
