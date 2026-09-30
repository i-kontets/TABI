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
    if ($value === '') {
        return '?';
    }
    return function_exists('mb_substr') ? mb_substr($value, 0, 1) : substr($value, 0, 1);
}

/**
 * formatTime は、この API 内で何度も使う処理をまとめた関数です。
 * 引数として受け取った値をもとに、確認・取得・更新などの結果を返します。
 */
function formatTime(?string $value): string
{
    // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
    if (!$value) return '';
    return (new DateTimeImmutable($value))->format('H:i');
}

/**
 * DBに保存されたユーザーアイコンのS3キーを、ブラウザで表示できる一時URLに変換します。
 * DBには期限切れになるURLではなくS3キーを残すため、画面へ返す直前に変換する必要があります。
 */
function resolveUserIconUrl(?string $iconValue): ?string
{
    static $initialized = false, $s3 = null, $aws = null, $cache = [];

    $iconValue = trim((string) $iconValue);

    if ($iconValue === '') {
        return null;
    }

    if (strpos($iconValue, 'http://') === 0 || strpos($iconValue, 'https://') === 0) {
        $path = parse_url($iconValue, PHP_URL_PATH);

        if (!$path) {
            return null;
        }

        $iconValue = rawurldecode($path);
    }

    $key = ltrim($iconValue, '/');

    if ($key === '') {
        return null;
    }

    if (array_key_exists($key, $cache)) {
        return $cache[$key];
    }

    if (!$initialized) {
        $initialized = true;

        try {
            $aws = loadAwsConfig();
            $s3 = $aws ? createS3Client($aws) : null;
        } catch (Throwable $error) {
            $s3 = null;
        }
    }

    return $cache[$key] = ($s3 && $aws) ? presignS3Url($s3, $aws['bucket'], $key) : null;
}

// ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
if ($_SERVER["REQUEST_METHOD"] !== "GET") {
    // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
    respond(["success" => false, "message" => "GETで取得してください"], 405);
}

// ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
if (!isset($_SESSION["user_id"])) {
    // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
    respond(["success" => false, "message" => "ログインが必要です"], 401);
}

$userId = (int) $_SESSION["user_id"];

// データベース処理などでエラーが起きる可能性があるため、例外を受け取れる形で実行します。
try {
    // SQL を準備し、あとから値を安全に入れられる形にします。
    $stmt = $pdo->prepare("
        SELECT
            c.chat_id,
            c.trip_id,
            c.chat_type,
            t.title AS trip_title,
            t.start_date,
            t.end_date,
            tc.candidate_name,
            tc.img_url AS candidate_img_url,
            manager_user.user_id AS manager_user_id,
            manager_user.name AS manager_name,
            manager_user.icon_url AS manager_icon_url,
            (
                SELECT u.name
                FROM trip_members tm
                INNER JOIN user_roles ur
                    ON ur.user_id = tm.user_id
                INNER JOIN roles r
                    ON r.role_id = ur.role_id
                INNER JOIN users u
                    ON u.user_id = tm.user_id
                WHERE tm.trip_id = c.trip_id
                    AND r.role_name = 'admin'
                LIMIT 1
            ) AS representative_name,
            latest.body AS last_message,
            latest.sent_at AS last_sent_at,
            COUNT(DISTINCT cm_all.user_id) AS member_count,
            (
                SELECT COUNT(*)
                FROM trip_members tm
                WHERE tm.trip_id = c.trip_id
            ) AS people_count,
            COUNT(DISTINCT unread.message_id) AS unread_count
        FROM chats c
        INNER JOIN chat_members cm_self
            ON cm_self.chat_id = c.chat_id
           AND cm_self.user_id = :user_id
        LEFT JOIN trips t ON t.trip_id = c.trip_id
        LEFT JOIN trip_candidates tc
            ON c.related_entity_type = 'hotel'
           AND tc.candidate_id = c.related_entity_id
        LEFT JOIN chat_members cm_manager
            ON cm_manager.chat_id = c.chat_id
           AND cm_manager.user_id <> :manager_current_user_id
        LEFT JOIN users manager_user
            ON manager_user.user_id = cm_manager.user_id
        LEFT JOIN chat_members cm_all ON cm_all.chat_id = c.chat_id
        LEFT JOIN messages latest ON latest.message_id = (
            SELECT m2.message_id
            FROM messages m2
            WHERE m2.chat_id = c.chat_id
            ORDER BY m2.sent_at DESC, m2.message_id DESC
            LIMIT 1
        )
        LEFT JOIN messages unread ON unread.chat_id = c.chat_id
            AND unread.sender_user_id <> :user_id_unread
            AND NOT EXISTS (
                SELECT 1
                FROM message_reads mr
                WHERE mr.message_id = unread.message_id
                  AND mr.user_id = :user_id_read
            )
        WHERE c.chat_type = 'hotel'
        GROUP BY
            c.chat_id,
            c.trip_id,
            c.chat_type,
            t.title,
            manager_user.user_id,
            manager_user.name,
            manager_user.icon_url,
            tc.candidate_name,
            tc.img_url,
            latest.body,
            latest.sent_at
        ORDER BY COALESCE(latest.sent_at, c.created_at) DESC, c.chat_id DESC
    ");
    // SQL 内の目印に値を割り当て、入力値が SQL 命令として実行されないようにします。
    $stmt->bindValue(":user_id", $userId, PDO::PARAM_INT);
    $stmt->bindValue(":manager_current_user_id", $userId, PDO::PARAM_INT);
    // SQL 内の目印に値を割り当て、入力値が SQL 命令として実行されないようにします。
    $stmt->bindValue(":user_id_unread", $userId, PDO::PARAM_INT);
    // SQL 内の目印に値を割り当て、入力値が SQL 命令として実行されないようにします。
    $stmt->bindValue(":user_id_read", $userId, PDO::PARAM_INT);
    // 準備した SQL を実行し、データベースへの取得・登録・更新を行います。
    $stmt->execute();

    $contacts = [];

    while ($chat = $stmt->fetch(PDO::FETCH_ASSOC)) {
        $chatId = (int) $chat["chat_id"];

        $representativeName = $chat["representative_name"] ?: "代表者";
        $managerName = $chat["manager_name"] ?: $representativeName;
        $managerIconUrl = resolveUserIconUrl($chat["manager_icon_url"] ?? null);

        $avatar = $chat["candidate_img_url"] ?: firstCharacter($representativeName);
        $headerAvatar = $managerIconUrl ?: ($chat["candidate_img_url"] ?: firstCharacter($managerName));
        $cottageName = $chat["candidate_name"] ?: ($chat["trip_title"] ?: "コテージチャット");

        $stayPeriod = "";

        // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
        if (!empty($chat["start_date"]) && !empty($chat["end_date"])) {
            $stayPeriod =
                (new DateTimeImmutable($chat["start_date"]))->format("n/j")
                . "～"
                . (new DateTimeImmutable($chat["end_date"]))->format("n/j");
        }

        $contacts[] = [
            "id" => $chatId,
            "chat_id" => $chatId,

            "name" => $cottageName,
            "representative_name" => $representativeName,
            "manager_user_id" => isset($chat["manager_user_id"]) ? (int)$chat["manager_user_id"] : null,
            "manager_name" => $managerName,
            "manager_icon_url" => $managerIconUrl,
            "header_avatar" => $headerAvatar,
            "people_count" => (int)$chat["people_count"],
            "stay_period" => $stayPeriod,

            "category" => "hotel",
            "avatar" => $avatar,

            "lastMessage" => $chat["last_message"] ?: "",
            "time" => formatTime($chat["last_sent_at"]),
            "lastSentAt" => $chat["last_sent_at"],
            "unread" => (int)$chat["unread_count"],

            "trip_title" => $chat["trip_title"] ?: "",
        ];
    }

    // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
    respond([
        "success" => true,
        "contacts" => $contacts,
    ]);
// エラーが起きた場合は、詳細をログに残し、利用者には安全なメッセージを返します。
} catch (Throwable $error) {
    // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
    respond([
        "success" => false,
        "message" => "コテージチャット一覧の取得に失敗しました",
    ], 500);
}
