<?php

/**
 * プロフィール、通知設定、問い合わせ、通報、メール変更など利用者本人の操作を扱う API です。
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
require_once __DIR__ . "/../Admin/includes/config.php";
// 共通設定や別ファイルの関数を読み込み、この API から使えるようにします。
require_once __DIR__ . "/../Admin/services/realtime.php";

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
 * cleanReportText は、この API 内で何度も使う処理をまとめた関数です。
 * 引数として受け取った値をもとに、確認・取得・更新などの結果を返します。
 */
function cleanReportText($value, int $maxLength): string
{
    $text = trim((string) $value);
    // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
    if ($text === "") {
        return "";
    }

    // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
    if (function_exists("mb_substr")) {
        return mb_substr($text, 0, $maxLength);
    }

    return substr($text, 0, $maxLength);
}

/**
 * fetchReportTargetUser は、この API 内で何度も使う処理をまとめた関数です。
 * 引数として受け取った値をもとに、確認・取得・更新などの結果を返します。
 */
function fetchReportTargetUser(PDO $pdo, string $targetType, int $targetId, int $reporterUserId): ?array
{
    // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
    if ($targetType === "user") {
        // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
        if ($targetId === $reporterUserId) {
            return null;
        }

        // SQL を準備し、あとから値を安全に入れられる形にします。
        $stmt = $pdo->prepare("
            SELECT user_id, name
            FROM users
            WHERE user_id = :user_id
              AND COALESCE(status, 'active') <> 'deleted'
              AND deleted_at IS NULL
            LIMIT 1
        ");
        // SQL 内の目印に値を割り当て、入力値が SQL 命令として実行されないようにします。
        $stmt->bindValue(":user_id", $targetId, PDO::PARAM_INT);
        // 準備した SQL を実行し、データベースへの取得・登録・更新を行います。
        $stmt->execute();
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        return $user ?: null;
    }

    // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
    if ($targetType === "message") {
        // SQL を準備し、あとから値を安全に入れられる形にします。
        $stmt = $pdo->prepare("
            SELECT
                m.message_id,
                m.sender_user_id,
                m.body,
                c.chat_id
            FROM messages m
            INNER JOIN chats c ON c.chat_id = m.chat_id
            INNER JOIN chat_members reporter_member
              ON reporter_member.chat_id = c.chat_id
             AND reporter_member.user_id = :reporter_user_id
            WHERE m.message_id = :message_id
              AND m.sender_user_id <> :sender_not_reporter_id
              AND m.admin_deleted_at IS NULL
            LIMIT 1
        ");
        // SQL 内の目印に値を割り当て、入力値が SQL 命令として実行されないようにします。
        $stmt->bindValue(":message_id", $targetId, PDO::PARAM_INT);
        // SQL 内の目印に値を割り当て、入力値が SQL 命令として実行されないようにします。
        $stmt->bindValue(":reporter_user_id", $reporterUserId, PDO::PARAM_INT);
        // SQL 内の目印に値を割り当て、入力値が SQL 命令として実行されないようにします。
        $stmt->bindValue(":sender_not_reporter_id", $reporterUserId, PDO::PARAM_INT);
        // 準備した SQL を実行し、データベースへの取得・登録・更新を行います。
        $stmt->execute();
        $message = $stmt->fetch(PDO::FETCH_ASSOC);

        // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
        if (!$message) {
            return null;
        }

        return [
            "user_id" => (int) $message["sender_user_id"],
            "message_id" => (int) $message["message_id"],
            "body" => $message["body"],
            "chat_id" => (int) $message["chat_id"],
        ];
    }

    return null;
}

// ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
    respond(["success" => false, "message" => "POSTで送信してください。"], 405);
}

// ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
if (!isset($_SESSION["user_id"])) {
    // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
    respond(["success" => false, "message" => "ログインが必要です。"], 401);
}

// フロントエンドから送られた JSON 文字列を、PHP で扱える配列に変換します。
$input = json_decode(file_get_contents("php://input"), true);
// ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
if (!is_array($input)) {
    // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
    respond(["success" => false, "message" => "JSON形式で送信してください。"], 400);
}

$reporterUserId = (int) $_SESSION["user_id"];
$targetType = cleanReportText($input["target_type"] ?? "", 20);
$targetId = (int) ($input["target_id"] ?? 0);
$reason = cleanReportText($input["reason"] ?? "", 255);
$detail = cleanReportText($input["detail"] ?? "", 2000);

// ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
if (!in_array($targetType, ["user", "message"], true) || $targetId <= 0) {
    // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
    respond(["success" => false, "message" => "通報対象が正しくありません。"], 400);
}

// ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
if ($reason === "") {
    // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
    respond(["success" => false, "message" => "通報理由を選択してください。"], 400);
}

// データベース処理などでエラーが起きる可能性があるため、例外を受け取れる形で実行します。
try {
    $target = fetchReportTargetUser($pdo, $targetType, $targetId, $reporterUserId);
    // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
    if (!$target) {
        // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
        respond(["success" => false, "message" => "通報対象が見つかりません。"], 404);
    }

    $targetUserId = (int) $target["user_id"];
    $targetMessageId = $targetType === "message" ? (int) $target["message_id"] : null;
    $reportType = $targetType === "message" ? "不適切な投稿" : "迷惑行為";
    $now = (new DateTimeImmutable("now", new DateTimeZone("Asia/Tokyo")))->format("Y-m-d H:i:s");

    // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
    if ($targetType === "message") {
        $messageBody = cleanReportText($target["body"] ?? "", 500);
        $detailParts = [];
        // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
        if ($detail !== "") {
            $detailParts[] = $detail;
        }
        // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
        if ($messageBody !== "") {
            $detailParts[] = "対象メッセージ: " . $messageBody;
        }
        $detail = implode("\n\n", $detailParts);
    }

    // SQL を準備し、あとから値を安全に入れられる形にします。
    $stmt = $pdo->prepare("
        INSERT INTO admin_reports (
            report_type,
            status,
            target_user_id,
            target_message_id,
            reporter_user_id,
            reason,
            detail,
            admin_note,
            reported_at,
            resolved_at,
            updated_at
        ) VALUES (
            :report_type,
            'open',
            :target_user_id,
            :target_message_id,
            :reporter_user_id,
            :reason,
            :detail,
            '',
            :reported_at,
            NULL,
            :updated_at
        )
    ");
    // SQL 内の目印に値を割り当て、入力値が SQL 命令として実行されないようにします。
    $stmt->bindValue(":report_type", $reportType);
    // SQL 内の目印に値を割り当て、入力値が SQL 命令として実行されないようにします。
    $stmt->bindValue(":target_user_id", $targetUserId, PDO::PARAM_INT);
    // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
    if ($targetMessageId === null) {
        // SQL 内の目印に値を割り当て、入力値が SQL 命令として実行されないようにします。
        $stmt->bindValue(":target_message_id", null, PDO::PARAM_NULL);
    } else {
        // SQL 内の目印に値を割り当て、入力値が SQL 命令として実行されないようにします。
        $stmt->bindValue(":target_message_id", $targetMessageId, PDO::PARAM_INT);
    }
    // SQL 内の目印に値を割り当て、入力値が SQL 命令として実行されないようにします。
    $stmt->bindValue(":reporter_user_id", $reporterUserId, PDO::PARAM_INT);
    // SQL 内の目印に値を割り当て、入力値が SQL 命令として実行されないようにします。
    $stmt->bindValue(":reason", $reason);
    // SQL 内の目印に値を割り当て、入力値が SQL 命令として実行されないようにします。
    $stmt->bindValue(":detail", $detail !== "" ? $detail : null);
    // SQL 内の目印に値を割り当て、入力値が SQL 命令として実行されないようにします。
    $stmt->bindValue(":reported_at", $now);
    // SQL 内の目印に値を割り当て、入力値が SQL 命令として実行されないようにします。
    $stmt->bindValue(":updated_at", $now);
    // 準備した SQL を実行し、データベースへの取得・登録・更新を行います。
    $stmt->execute();

    $reportId = (int) $pdo->lastInsertId();

    sendRealtimeEvent("admin:global", "report_created", [
        "report_id" => $reportId,
    ]);

    // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
    respond([
        "success" => true,
        "message" => "通報を送信しました。",
        "report_id" => $reportId,
    ]);
// エラーが起きた場合は、詳細をログに残し、利用者には安全なメッセージを返します。
} catch (Throwable $error) {
    // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
    respond(["success" => false, "message" => "通報の送信に失敗しました。"], 500);
}
