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

// 差分メッセージ取得（ポーリング用）
// GET /api/Chat/Since.php?chat_id=2&after_id=10
session_start();
// フロントエンドへ返すデータ形式や通信ルールを、HTTP ヘッダーとして伝えます。
header("Content-Type: application/json; charset=UTF-8");

// 共通設定や別ファイルの関数を読み込み、この API から使えるようにします。
require_once __DIR__ . "/../config/db.php";
// 共通設定や別ファイルの関数を読み込み、この API から使えるようにします。
require_once __DIR__ . "/../Groups/S3Common.php";

// ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
if (!isset($_SESSION["user_id"])) {
    http_response_code(401);

    // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
    echo json_encode([
        "success" => false,
        "message" => "ログインが必要です"
    ]);

    exit;
}

// 必要なセッション値をローカル変数へコピー
$userId = (int) $_SESSION["user_id"];

// この先でセッションを書き換えないため、すぐにロックを解除
session_write_close();

// ここから新着待機やDB処理を行う

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

// users.icon_url のS3キーを署名付きURLへ変換（Messages.phpと同じ処理）
/**
 * 同じ処理を複数箇所へ書かないために、このAPI内の共通処理としてまとめています。
 *
 * @param ?string $iconValue 呼び出し元から渡される処理対象の値です。
 * @return ?string 宣言された型に合わせて処理結果を返します。
 * エラー処理は主に呼び出し元、またはこの関数を使うAPI本体側で行います。
 */
function resolveIconUrl(?string $iconValue): ?string
{
    static $initialized = false, $s3 = null, $aws = null, $cache = [];

    $iconValue = trim((string) $iconValue);
    // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
    if ($iconValue === "") return null;

    // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
    if (strpos($iconValue, "http://") === 0 || strpos($iconValue, "https://") === 0) {
        $path = parse_url($iconValue, PHP_URL_PATH);
        // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
        if (!$path) return null;
        $iconValue = rawurldecode($path);
    }

    $key = ltrim($iconValue, "/");
    // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
    if ($key === "") return null;
    // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
    if (array_key_exists($key, $cache)) return $cache[$key];

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
    if ($value === "") return "?";
    return function_exists("mb_substr") ? mb_substr($value, 0, 1) : substr($value, 0, 1);
}

/**
 * formatDateLabel は、この API 内で何度も使う処理をまとめた関数です。
 * 引数として受け取った値をもとに、確認・取得・更新などの結果を返します。
 */
function formatDateLabel(?string $value): string
{
    // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
    if (!$value) return "";
    $date = new DateTimeImmutable($value);
    $oneYearAgo = (new DateTimeImmutable("now"))->modify("-1 year");
    return $date < $oneYearAgo ? $date->format("Y年n月j日") : $date->format("n月j日");
}

/**
 * formatTime は、この API 内で何度も使う処理をまとめた関数です。
 * 引数として受け取った値をもとに、確認・取得・更新などの結果を返します。
 */
function formatTime(?string $value): string
{
    // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
    if (!$value) return "";
    return (new DateTimeImmutable($value))->format("H:i");
}

// ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
if ($_SERVER["REQUEST_METHOD"] !== "GET") {
    // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
    respond(["success" => false, "message" => "Use GET."], 405);
}

$chatId  = filter_var($_GET["chat_id"]  ?? null, FILTER_VALIDATE_INT);
$afterId = filter_var($_GET["after_id"] ?? 0,    FILTER_VALIDATE_INT);

// ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
if (!$chatId || $chatId < 1) {
    // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
    respond(["success" => false, "message" => "chat_id is required."], 400);
}
// ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
if ($afterId === false || $afterId < 0) {
    $afterId = 0;
}

// データベース処理などでエラーが起きる可能性があるため、例外を受け取れる形で実行します。
try {
    // 参加チェック
    $memStmt = $pdo->prepare("
        SELECT 1 FROM chat_members
        WHERE chat_id = :chat_id AND user_id = :user_id
        LIMIT 1
    ");
    // SQL 内の目印に値を割り当て、入力値が SQL 命令として実行されないようにします。
    $memStmt->bindValue(":chat_id", $chatId, PDO::PARAM_INT);
    // SQL 内の目印に値を割り当て、入力値が SQL 命令として実行されないようにします。
    $memStmt->bindValue(":user_id", $userId, PDO::PARAM_INT);
    // 準備した SQL を実行し、データベースへの取得・登録・更新を行います。
    $memStmt->execute();

    // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
    if (!$memStmt->fetchColumn()) {
        // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
        respond(["success" => false, "message" => "Permission denied."], 403);
    }

    // after_id 以降のメッセージだけ取得
    $msgStmt = $pdo->prepare("
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
          AND m.message_id > :after_id
        GROUP BY
            m.message_id, m.chat_id, m.sender_user_id,
            m.body, m.image_url, m.sent_at, u.name, u.icon_url
        ORDER BY m.sent_at ASC, m.message_id ASC
    ");
    // SQL 内の目印に値を割り当て、入力値が SQL 命令として実行されないようにします。
    $msgStmt->bindValue(":current_user_id", $userId, PDO::PARAM_INT);
    // SQL 内の目印に値を割り当て、入力値が SQL 命令として実行されないようにします。
    $msgStmt->bindValue(":chat_id",         $chatId,  PDO::PARAM_INT);
    // SQL 内の目印に値を割り当て、入力値が SQL 命令として実行されないようにします。
    $msgStmt->bindValue(":after_id",        $afterId, PDO::PARAM_INT);
    // 準備した SQL を実行し、データベースへの取得・登録・更新を行います。
    $msgStmt->execute();

    $messages = [];
    $lastId   = $afterId;

    while ($row = $msgStmt->fetch(PDO::FETCH_ASSOC)) {
        $mid        = (int) $row["message_id"];
        $senderName = $row["sender_name"] ?? "Unknown user";
        $senderIconUrl = resolveIconUrl($row["sender_icon_url"]);
        // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
        if ($mid > $lastId) $lastId = $mid;

        $messages[] = [
            "id"              => $mid,
            "message_id"      => $mid,
            "chat_id"         => (int) $row["chat_id"],
            "sender_user_id"  => (int) $row["sender_user_id"],
            "sender"          => $senderName,
            "sender_name"     => $senderName,
            "senderName"      => $senderName,
            "avatar"          => $senderIconUrl ?: firstCharacter($senderName),
            "sender_icon_url" => $senderIconUrl,
            "text"            => $row["body"],
            "body"            => $row["body"],
            "image_url"       => $row["image_url"],
            "sent_at"         => $row["sent_at"],
            "date"            => formatDateLabel($row["sent_at"]),
            "time"            => formatTime($row["sent_at"]),
            "readCount"       => (int) $row["read_count"],
            "read_count"      => (int) $row["read_count"],
            "isRead"          => (bool) $row["is_read"],
            "isMine"          => (int) $row["sender_user_id"] === $userId,
        ];
    }

    // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
    respond([
        "success"         => true,
        "messages"        => $messages,
        "last_message_id" => $lastId,
    ]);

// エラーが起きた場合は、詳細をログに残し、利用者には安全なメッセージを返します。
} catch (Throwable $error) {
    // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
    respond(["success" => false, "message" => "Failed to fetch new messages."], 500);
}
