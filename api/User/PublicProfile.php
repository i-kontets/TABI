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
 * userProfileColumnExists は、この API 内で何度も使う処理をまとめた関数です。
 * 引数として受け取った値をもとに、確認・取得・更新などの結果を返します。
 */
function userProfileColumnExists(PDO $pdo, string $table, string $column): bool
{
    // SQL を準備し、あとから値を安全に入れられる形にします。
    $stmt = $pdo->prepare("
        SELECT COUNT(*)
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = :table_name
          AND COLUMN_NAME = :column_name
    ");
    // 準備した SQL を実行し、データベースへの取得・登録・更新を行います。
    $stmt->execute([
        "table_name" => $table,
        "column_name" => $column,
    ]);

    return (int) $stmt->fetchColumn() > 0;
}

/**
 * normalizePublicIconKey は、この API 内で何度も使う処理をまとめた関数です。
 * 引数として受け取った値をもとに、確認・取得・更新などの結果を返します。
 */
function normalizePublicIconKey(?string $iconValue): ?string
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

    // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
    if (strpos($iconValue, "http://") === 0 || strpos($iconValue, "https://") === 0) {
        $parts = parse_url($iconValue);
        $path = $parts["path"] ?? "";
        $key = ltrim(rawurldecode($path), "/");
        return $key !== "" ? $key : null;
    }

    return ltrim($iconValue, "/");
}

/**
 * resolvePublicIconUrl は、この API 内で何度も使う処理をまとめた関数です。
 * 引数として受け取った値をもとに、確認・取得・更新などの結果を返します。
 */
function resolvePublicIconUrl(?string $iconValue): ?string
{
    // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
    if (!$iconValue) {
        return null;
    }

    // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
    if (strpos($iconValue, "http://") === 0 || strpos($iconValue, "https://") === 0) {
        return $iconValue;
    }

    $aws = loadAwsConfig();
    $s3 = $aws ? createS3Client($aws) : null;

    // 署名付きURLを作ると、非公開のS3画像をブラウザで一時的に表示できます。期限が切れたら再生成が必要です。
    return ($s3 && $aws) ? presignS3Url($s3, $aws["bucket"], $iconValue) : null;
}

/**
 * formatRegisteredDate は、この API 内で何度も使う処理をまとめた関数です。
 * 引数として受け取った値をもとに、確認・取得・更新などの結果を返します。
 */
function formatRegisteredDate(?string $value): ?string
{
    // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
    if (!$value) {
        return null;
    }

    // データベース処理などでエラーが起きる可能性があるため、例外を受け取れる形で実行します。
    try {
        return (new DateTimeImmutable($value))->format("Y/m/d");
    // エラーが起きた場合は、詳細をログに残し、利用者には安全なメッセージを返します。
    } catch (Throwable $error) {
        return null;
    }
}

// ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
if ($_SERVER["REQUEST_METHOD"] !== "GET") {
    // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
    respond(["success" => false, "message" => "GETで送信してください。"], 405);
}

// ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
if (!isset($_SESSION["user_id"])) {
    // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
    respond(["success" => false, "message" => "ログインが必要です。"], 401);
}

$currentUserId = (int) $_SESSION["user_id"];
$targetUserId = (int) ($_GET["user_id"] ?? 0);

// ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
if ($targetUserId <= 0) {
    // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
    respond(["success" => false, "message" => "ユーザーIDが正しくありません。"], 400);
}

// データベース処理などでエラーが起きる可能性があるため、例外を受け取れる形で実行します。
try {
    $iconSelect = userProfileColumnExists($pdo, "users", "icon_key")
        ? "COALESCE(u.icon_key, u.icon_url) AS icon_value"
        : "u.icon_url AS icon_value";

    $deletedCondition = userProfileColumnExists($pdo, "users", "deleted_at")
        ? "AND u.deleted_at IS NULL"
        : "";

    // SQL を準備し、あとから値を安全に入れられる形にします。
    $stmt = $pdo->prepare("
        SELECT
            u.user_id,
            u.name,
            {$iconSelect},
            u.created_at,
            p.self_introduction
        FROM users u
        LEFT JOIN user_profiles p ON p.user_id = u.user_id
        WHERE u.user_id = :user_id
          AND COALESCE(u.status, 'active') <> 'deleted'
          {$deletedCondition}
        LIMIT 1
    ");
    // SQL 内の目印に値を割り当て、入力値が SQL 命令として実行されないようにします。
    $stmt->bindValue(":user_id", $targetUserId, PDO::PARAM_INT);
    // 準備した SQL を実行し、データベースへの取得・登録・更新を行います。
    $stmt->execute();
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
    if (!$user) {
        // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
        respond(["success" => false, "message" => "ユーザーが見つかりません。"], 404);
    }

    $iconKey = normalizePublicIconKey($user["icon_value"] ?? null);
    $iconUrl = resolvePublicIconUrl($iconKey);

    // SQL を準備し、あとから値を安全に入れられる形にします。
    $groupsStmt = $pdo->prepare("
        SELECT
            g.group_id,
            g.group_name
        FROM group_members target_member
        INNER JOIN group_members current_member
          ON current_member.group_id = target_member.group_id
         AND current_member.user_id = :current_user_id
         AND current_member.invitation_status = 'accepted'
        INNER JOIN user_groups g ON g.group_id = target_member.group_id
        WHERE target_member.user_id = :target_user_id
          AND target_member.invitation_status = 'accepted'
          AND COALESCE(g.status, 'active') = 'active'
        ORDER BY g.created_at DESC, g.group_id DESC
    ");
    // SQL 内の目印に値を割り当て、入力値が SQL 命令として実行されないようにします。
    $groupsStmt->bindValue(":current_user_id", $currentUserId, PDO::PARAM_INT);
    // SQL 内の目印に値を割り当て、入力値が SQL 命令として実行されないようにします。
    $groupsStmt->bindValue(":target_user_id", $targetUserId, PDO::PARAM_INT);
    // 準備した SQL を実行し、データベースへの取得・登録・更新を行います。
    $groupsStmt->execute();

    $commonGroups = array_map(static function (array $group): array {
        return [
            "group_id" => (int) $group["group_id"],
            "group_name" => $group["group_name"],
        ];
    }, $groupsStmt->fetchAll());

    // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
    respond([
        "success" => true,
        "user" => [
            "user_id" => (int) $user["user_id"],
            "name" => $user["name"],
            "icon_key" => $iconKey,
            "icon_url" => $iconUrl,
            "self_introduction" => $user["self_introduction"] ?? null,
            "registered_at" => formatRegisteredDate($user["created_at"] ?? null),
            "common_groups" => $commonGroups,
        ],
    ]);
// エラーが起きた場合は、詳細をログに残し、利用者には安全なメッセージを返します。
} catch (Throwable $error) {
    // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
    respond(["success" => false, "message" => "プロフィールの取得に失敗しました。"], 500);
}
