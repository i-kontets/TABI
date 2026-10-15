<?php

/**
 * 現在ログイン中のユーザー情報をセッションから返す API です。
 *
 * 主な流れ:
 * 1. リクエストやセッションなど、処理に必要な情報を読み取る
 * 2. 入力値や権限を確認し、必要に応じてデータベースへ問い合わせる
 * 3. 処理結果を JSON などの形でフロントエンドへ返す
 *
 * 扱うデータ: アプリの設定値や、他のファイルから受け取る値を主に扱います。
 */

// セッション開始：ログイン済みユーザーの識別子を取得するために必要
session_start();

// レスポンスは常にJSONで返す
header("Content-Type: application/json; charset=UTF-8");

// データベース接続設定を読み込む（$pdo を使用）
require_once __DIR__ . "/../config/db.php";
// 共通設定や別ファイルの関数を読み込み、この API から使えるようにします。
require_once __DIR__ . "/../Admin/includes/config.php";
// 共通設定や別ファイルの関数を読み込み、この API から使えるようにします。
require_once __DIR__ . "/../Admin/services/realtime.php";
// 共通設定や別ファイルの関数を読み込み、この API から使えるようにします。
require_once __DIR__ . "/../Groups/S3Common.php";

/**
 * extractS3KeyFromIconValue は、この API 内で何度も使う処理をまとめた関数です。
 * 引数として受け取った値をもとに、確認・取得・更新などの結果を返します。
 */
function extractS3KeyFromIconValue(?string $iconValue): ?string
{
    // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
    if (!$iconValue) {
        return null;
    }

    $iconValue = trim($iconValue);

    // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
    if ($iconValue === "") {
        return null;
    }

    // DBに誤ってS3の完全URLや署名付きURLが保存されている場合、
    // URLのpath部分だけを取り出してS3キーに戻す
    if (strpos($iconValue, "http://") === 0 || strpos($iconValue, "https://") === 0) {
        $parts = parse_url($iconValue);

        // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
        if (empty($parts["path"])) {
            return null;
        }

        // 例:
        // /User/2/profile/xxx.jpg
        // ↓
        // User/2/profile/xxx.jpg
        return ltrim(rawurldecode($parts["path"]), "/");
    }

    // すでにS3キーだけが保存されている場合
    return ltrim($iconValue, "/");
}

/**
 * resolveUserIconUrl は、この API 内で何度も使う処理をまとめた関数です。
 * 引数として受け取った値をもとに、確認・取得・更新などの結果を返します。
 */
function resolveUserIconUrl(?string $iconKey): ?string
{
    // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
    if (!$iconKey) {
        return null;
    }

    $iconKey = ltrim(trim($iconKey), "/");

    // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
    if ($iconKey === "") {
        return null;
    }

    // データベース処理などでエラーが起きる可能性があるため、例外を受け取れる形で実行します。
    try {
        $aws = loadAwsConfig();
        $s3 = $aws ? createS3Client($aws) : null;

        // 署名付きURLを作ると、非公開のS3画像をブラウザで一時的に表示できます。期限が切れたら再生成が必要です。
        return ($aws && $s3) ? presignS3Url($s3, $aws["bucket"], $iconKey) : null;
    // エラーが起きた場合は、詳細をログに残し、利用者には安全なメッセージを返します。
    } catch (Throwable $error) {
        return null;
    }
}

/**
 * userColumnExists は、この API 内で何度も使う処理をまとめた関数です。
 * 引数として受け取った値をもとに、確認・取得・更新などの結果を返します。
 */
function userColumnExists(PDO $pdo, string $column): bool
{
    // SQL を準備し、あとから値を安全に入れられる形にします。
    $stmt = $pdo->prepare("
        SELECT COUNT(*)
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'users'
          AND COLUMN_NAME = :column_name
    ");
    // 準備した SQL を実行し、データベースへの取得・登録・更新を行います。
    $stmt->execute(["column_name" => $column]);

    return (int) $stmt->fetchColumn() > 0;
}

/**
 * notifyUserActiveUpdated は、この API 内で何度も使う処理をまとめた関数です。
 * 引数として受け取った値をもとに、確認・取得・更新などの結果を返します。
 */
function notifyUserActiveUpdated(int $userId): void
{
    // WebSocket通知を送ります。DB更新後に呼ぶことで、他の画面へ「変更があった」ことを伝えます。
    $result = sendRealtimeEvent("admin:global", "user_active_updated", [
        "user_id" => $userId,
    ]);

    // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
    if (!$result["ok"]) {
        error_log(
            "Realtime user_active_updated failed for user_id "
            . $userId
            . ": HTTP "
            . $result["http_code"]
            . " "
            . $result["curl_error"]
        );
    }
}

/**
 * touchUserLastActive は、この API 内で何度も使う処理をまとめた関数です。
 * 引数として受け取った値をもとに、確認・取得・更新などの結果を返します。
 */
function touchUserLastActive(PDO $pdo, int $userId): bool
{
    // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
    if (!userColumnExists($pdo, "last_active_at")) {
        return false;
    }

    $now = (new DateTimeImmutable("now", new DateTimeZone("Asia/Tokyo")))->format("Y-m-d H:i:s");
    // SQL を準備し、あとから値を安全に入れられる形にします。
    $stmt = $pdo->prepare("
        UPDATE users
        SET last_active_at = :now
        WHERE user_id = :user_id
          AND (
              last_active_at IS NULL
              OR last_active_at < DATE_SUB(:now_for_compare, INTERVAL 5 MINUTE)
          )
    ");
    // 準備した SQL を実行し、データベースへの取得・登録・更新を行います。
    $stmt->execute([
        "now" => $now,
        "now_for_compare" => $now,
        "user_id" => $userId,
    ]);

    return $stmt->rowCount() > 0;
}

// セッションにユーザーIDが無ければ未ログイン扱いで401を返す
if (!isset($_SESSION["user_id"])) {
    http_response_code(401);
    // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
    echo json_encode([
        "success" => false,
        "message" => "ログインしていません"
    ]);
    exit;
}

// セッションから現在のユーザーIDを取得
$userId = (int) $_SESSION["user_id"];

// データベース処理などでエラーが起きる可能性があるため、例外を受け取れる形で実行します。
try {
    // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
    if (touchUserLastActive($pdo, $userId)) {
        notifyUserActiveUpdated($userId);
    }

    // ユーザー情報をDBから取得するクエリ
    // 返却するカラム: user_id, name, email, icon_url, language_code, status
    $sql = " SELECT user_id, name, email, icon_url, language_code, status FROM users WHERE user_id = :user_id AND deleted_at IS NULL LIMIT 1 ";

    // プリペアドステートメントでクエリ実行（SQLインジェクション対策）
    $stmt = $pdo->prepare($sql);
    // SQL 内の目印に値を割り当て、入力値が SQL 命令として実行されないようにします。
    $stmt->bindValue(":user_id", $userId, PDO::PARAM_INT);
    // 準備した SQL を実行し、データベースへの取得・登録・更新を行います。
    $stmt->execute();

    // 取得結果を連想配列で受け取る
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    // 削除済み・存在しないユーザーのセッションは認証済みとして扱わず、ログインへ案内します。
    if (!$user) {
        http_response_code(401);
        // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
        echo json_encode([
            "success" => false,
            "message" => "ユーザーが見つかりません"
        ]);
        exit;
    }

    // 停止・削除後の古いセッションでは管理画面へ入れません。
    if ($user['status'] !== 'active') {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'ログインし直してください']);
        exit;
    }
    require_once __DIR__ . '/AdminAccess.php';
    $user['is_tabi_admin'] = tabiAdminLevel($pdo, $userId) >= 1;

    // 正常時はユーザー情報を含むJSONを返す
    $iconKey = extractS3KeyFromIconValue($user["icon_url"] ?? null);

    $user["icon_key"] = $iconKey;
    $user["icon_url"] = resolveUserIconUrl($iconKey);

    // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
    echo json_encode([
        "success" => true,
        "user" => $user
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

    exit;

// エラーが起きた場合は、詳細をログに残し、利用者には安全なメッセージを返します。
} catch (PDOException $error) {
    // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
    if (function_exists("logSystemError")) {
        logSystemError("auth", "error", "ログインユーザー情報の取得に失敗しました", [
            "error" => $error->getMessage(),
        ], $userId ?? null, $_SERVER["REQUEST_URI"] ?? null);
    }

    // DB接続やクエリ実行時のエラーは500で応答
    http_response_code(500);
    // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
    echo json_encode([
        "success" => false,
        "message" => "ユーザー情報の取得に失敗しました"
    ]);
    exit;
}
?>
