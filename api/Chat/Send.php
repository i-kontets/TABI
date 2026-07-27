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
// 共通設定や別ファイルの関数を読み込み、この API から使えるようにします。
require_once __DIR__ . "/../Admin/includes/config.php";
// 共通設定や別ファイルの関数を読み込み、この API から使えるようにします。
require_once __DIR__ . "/../Admin/services/realtime.php";
// 共通設定や別ファイルの関数を読み込み、この API から使えるようにします。
require_once __DIR__ . "/../Groups/S3Common.php";

// 文字列の先頭1文字を取り出す。
// ユーザー名のアイコン代わりに使うため、マルチバイト文字にも対応する。
function firstCharacter(string $value): string
{
    return function_exists("mb_substr")
        ? mb_substr($value, 0, 1)
        : substr($value, 0, 1);
}

// 文字数を数える。
// 日本語などのマルチバイト文字を含んでも、入力上限の判定を正しく行うために使う。
function textLength(string $value): int
{
    return function_exists("mb_strlen")
        ? mb_strlen($value)
        : strlen($value);
}

/**
 * formatDateLabel は、この API 内で何度も使う処理をまとめた関数です。
 * 引数として受け取った値をもとに、確認・取得・更新などの結果を返します。
 */
function formatDateLabel(DateTimeImmutable $date): string
{
    $oneYearAgo = (new DateTimeImmutable("now"))->modify("-1 year");

    // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
    if ($date < $oneYearAgo) {
        return $date->format("Y年n月j日");
    }

    return $date->format("n月j日");
}

// 送信は POST のみ受け付ける。
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

// ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    http_response_code(405);
    // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
    echo json_encode([
        "success" => false,
        "message" => "POSTメソッドで送信してください"
    ]);
    exit;
}

// ログイン済みユーザーだけがメッセージを送れる。
if (!isset($_SESSION["user_id"])) {
    http_response_code(401);
    // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
    echo json_encode([
        "success" => false,
        "message" => "ログインが必要です"
    ]);
    exit;
}

// JSON ボディがあればそれを優先し、なければ通常の POST フォームを読む。
$input = json_decode(file_get_contents("php://input"), true);

// ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
if (!is_array($input)) {
    $input = $_POST;
}

// 送信者のユーザーID、送信先チャットID / グループID、本文を取り出す。
$userId   = (int) $_SESSION["user_id"];
$chatId   = filter_var($input["chat_id"]  ?? null, FILTER_VALIDATE_INT);
$groupId  = filter_var($input["group_id"] ?? null, FILTER_VALIDATE_INT);
$body     = trim((string) ($input["body"] ?? $input["message"] ?? $input["text"] ?? ""));
$imageUrl = isset($input["image_url"]) ? trim((string) $input["image_url"]) : null;
// ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
if ($imageUrl === '') $imageUrl = null;

// 0 以下の値は無効として扱う。
if ($chatId !== null && $chatId !== false && $chatId < 1) {
    $chatId = false;
}

// ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
if ($groupId !== null && $groupId !== false && $groupId < 1) {
    $groupId = false;
}

// chat_id か group_id のどちらかは必須。
if (!$chatId && !$groupId) {
    http_response_code(400);
    // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
    echo json_encode([
        "success" => false,
        "message" => "chat_id または group_id を指定してください"
    ]);
    exit;
}

// 本文と画像の両方が空なら送信しない。
if ($body === "" && $imageUrl === null) {
    http_response_code(400);
    // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
    echo json_encode([
        "success" => false,
        "message" => "メッセージまたは画像を入力してください"
    ]);
    exit;
}

// 長すぎる本文は受け付けない。
if (textLength($body) > 5000) {
    http_response_code(400);
    // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
    echo json_encode([
        "success" => false,
        "message" => "メッセージは5000文字以内で入力してください"
    ]);
    exit;
}

// message_id を手動採番しているため、同時送信時の重複を避けるためにロック状態を管理する。
$idLockAcquired = false;

// データベース処理などでエラーが起きる可能性があるため、例外を受け取れる形で実行します。
try {
    // chat_id が未指定なら、group_id から対象グループのチャットを引く。
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

    // このユーザーが対象チャットの参加メンバーかを確認する。
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
            "message" => "このチャットへ送信する権限がありません"
        ]);
        exit;
    }

    // message_id は AUTO_INCREMENT ではないため、
    // 同時送信で同じIDが採番されないよう、DB全体で使う採番ロックを取得する。
    $lockStmt = $pdo->query("SELECT GET_LOCK('tabi_messages_id_lock', 5)");
    $idLockAcquired = (int) $lockStmt->fetchColumn() === 1;

    // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
    if (!$idLockAcquired) {
        throw new RuntimeException("メッセージIDの採番ロックを取得できませんでした");
    }

    // ロック取得後にトランザクションを開始し、採番から挿入までをひとまとまりで処理する。
    $pdo->beginTransaction();

    // 現在の最大 message_id に 1 を足して、次に使うIDを決める。
    $idStmt = $pdo->query("
        SELECT COALESCE(MAX(message_id), 0) + 1
        FROM messages
    ");
    $messageId = (int) $idStmt->fetchColumn();

    // メッセージ本体を保存する。
    $insertStmt = $pdo->prepare("
        INSERT INTO messages (
            message_id,
            chat_id,
            sender_user_id,
            body,
            image_url,
            sent_at
        ) VALUES (
            :message_id,
            :chat_id,
            :sender_user_id,
            :body,
            :image_url,
            NOW()
        )
    ");
    // SQL 内の目印に値を割り当て、入力値が SQL 命令として実行されないようにします。
    $insertStmt->bindValue(":message_id", $messageId, PDO::PARAM_INT);
    // SQL 内の目印に値を割り当て、入力値が SQL 命令として実行されないようにします。
    $insertStmt->bindValue(":chat_id", $chatId, PDO::PARAM_INT);
    // SQL 内の目印に値を割り当て、入力値が SQL 命令として実行されないようにします。
    $insertStmt->bindValue(":sender_user_id", $userId, PDO::PARAM_INT);
    // SQL 内の目印に値を割り当て、入力値が SQL 命令として実行されないようにします。
    $insertStmt->bindValue(":body", $body !== '' ? $body : null, PDO::PARAM_STR);
    // SQL 内の目印に値を割り当て、入力値が SQL 命令として実行されないようにします。
    $insertStmt->bindValue(":image_url", $imageUrl, PDO::PARAM_STR);
    // 準備した SQL を実行し、データベースへの取得・登録・更新を行います。
    $insertStmt->execute();

    // 保存直後のレコードを読み直して、送信者名やアイコン情報も含めたレスポンスを組み立てる。
    $messageStmt = $pdo->prepare("
        SELECT
            m.message_id,
            m.chat_id,
            m.sender_user_id,
            m.body,
            m.image_url,
            m.sent_at,
            u.name AS sender_name,
            u.icon_url AS sender_icon_url
        FROM messages m
        LEFT JOIN users u ON u.user_id = m.sender_user_id
        WHERE m.message_id = :message_id
        LIMIT 1
    ");
    // SQL 内の目印に値を割り当て、入力値が SQL 命令として実行されないようにします。
    $messageStmt->bindValue(":message_id", $messageId, PDO::PARAM_INT);
    // 準備した SQL を実行し、データベースへの取得・登録・更新を行います。
    $messageStmt->execute();
    $message = $messageStmt->fetch(PDO::FETCH_ASSOC);

    // ここまで成功したら確定する。
    $pdo->commit();
    $pdo->query("SELECT RELEASE_LOCK('tabi_messages_id_lock')");
    $idLockAcquired = false;

    // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
    if (!$groupId) {
        // SQL を準備し、あとから値を安全に入れられる形にします。
        $groupStmt = $pdo->prepare("
            SELECT t.group_id
            FROM chats c
            INNER JOIN trips t ON t.trip_id = c.trip_id
            WHERE c.chat_id = :chat_id
            LIMIT 1
        ");
        // SQL 内の目印に値を割り当て、入力値が SQL 命令として実行されないようにします。
        $groupStmt->bindValue(":chat_id", $chatId, PDO::PARAM_INT);
        // 準備した SQL を実行し、データベースへの取得・登録・更新を行います。
        $groupStmt->execute();
        $groupId = (int) $groupStmt->fetchColumn();
    }

    // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
    if ($groupId) {
        // WebSocket通知を送ります。DB更新後に呼ぶことで、他の画面へ「変更があった」ことを伝えます。
        sendRealtimeEvent("trip:" . $groupId, "chat_message_created", [
            "group_id" => (int) $groupId,
            "chat_id" => (int) $chatId,
            "message_id" => $messageId,
        ]);
        sendRealtimeEvent("admin:global", "post_created", [
            "post_id" => $messageId,
            "group_id" => (int) $groupId,
        ]);
    }

    // 画面表示で使いやすいように、日付ラベルと時刻を生成する。
    $sentAt = new DateTimeImmutable($message["sent_at"]);
    $senderName = $message["sender_name"] ?? ($_SESSION["user_name"] ?? "自分");
    $dateLabel = formatDateLabel($sentAt);
    $senderIconUrl = resolveUserIconUrl($message["sender_icon_url"] ?? null);
// フロント側でそのまま利用できる形に整えて返す。
    http_response_code(201);
    // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
    echo json_encode([
        "success" => true,
        "message" => [
            "id" => (int) $message["message_id"],
            "message_id" => (int) $message["message_id"],
            "chat_id" => (int) $message["chat_id"],
            "sender_user_id" => (int) $message["sender_user_id"],
            "sender" => $senderName,
            "sender_name" => $senderName,
            "avatar" => $senderIconUrl ?: firstCharacter($senderName),
            "sender_icon_url" => $senderIconUrl,
            "text" => $message["body"],
            "body" => $message["body"],
            "image_url" => $message["image_url"],
            "sent_at" => $message["sent_at"],
            "date" => $dateLabel,
            "time" => $sentAt->format("H:i"),
            "readCount" => 0,
            "read_count" => 0,
            "isRead" => false,
            "isMine" => true
        ]
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
// エラーが起きた場合は、詳細をログに残し、利用者には安全なメッセージを返します。
} catch (Throwable $error) {
    // 途中で失敗したら、未確定の変更を破棄する。
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }

    // 取得済みならロックを必ず返す。
    if ($idLockAcquired) {
        $pdo->query("SELECT RELEASE_LOCK('tabi_messages_id_lock')");
    }

    // 詳細は外へ出しすぎず、送信失敗だけを通知する。
    http_response_code(500);
    // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
    echo json_encode([
        "success" => false,
        "message" => "メッセージの送信に失敗しました"
    ]);
}
