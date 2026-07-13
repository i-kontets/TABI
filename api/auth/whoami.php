<?php

// セッション開始：ログイン済みユーザーの識別子を取得するために必要
session_start();

// レスポンスは常にJSONで返す
header("Content-Type: application/json; charset=UTF-8");

// データベース接続設定を読み込む（$pdo を使用）
require_once __DIR__ . "/../config/db.php";
require_once __DIR__ . "/../Admin/includes/config.php";
require_once __DIR__ . "/../Admin/services/realtime.php";
require_once __DIR__ . "/../Groups/S3Common.php";

function extractS3KeyFromIconValue(?string $iconValue): ?string
{
    if (!$iconValue) {
        return null;
    }

    $iconValue = trim($iconValue);

    if ($iconValue === "") {
        return null;
    }

    // DBに誤ってS3の完全URLや署名付きURLが保存されている場合、
    // URLのpath部分だけを取り出してS3キーに戻す
    if (strpos($iconValue, "http://") === 0 || strpos($iconValue, "https://") === 0) {
        $parts = parse_url($iconValue);

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

function resolveUserIconUrl(?string $iconKey): ?string
{
    if (!$iconKey) {
        return null;
    }

    $iconKey = ltrim(trim($iconKey), "/");

    if ($iconKey === "") {
        return null;
    }

    try {
        $aws = loadAwsConfig();
        $s3 = $aws ? createS3Client($aws) : null;

        return ($aws && $s3) ? presignS3Url($s3, $aws["bucket"], $iconKey) : null;
    } catch (Throwable $error) {
        return null;
    }
}

function userColumnExists(PDO $pdo, string $column): bool
{
    $stmt = $pdo->prepare("
        SELECT COUNT(*)
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'users'
          AND COLUMN_NAME = :column_name
    ");
    $stmt->execute(["column_name" => $column]);

    return (int) $stmt->fetchColumn() > 0;
}

function notifyUserActiveUpdated(int $userId): void
{
    $result = sendRealtimeEvent("admin:global", "user_active_updated", [
        "user_id" => $userId,
    ]);

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

function touchUserLastActive(PDO $pdo, int $userId): bool
{
    if (!userColumnExists($pdo, "last_active_at")) {
        return false;
    }

    $now = (new DateTimeImmutable("now", new DateTimeZone("Asia/Tokyo")))->format("Y-m-d H:i:s");
    $stmt = $pdo->prepare("
        UPDATE users
        SET last_active_at = :now
        WHERE user_id = :user_id
          AND (
              last_active_at IS NULL
              OR last_active_at < DATE_SUB(:now_for_compare, INTERVAL 5 MINUTE)
          )
    ");
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
    echo json_encode([
        "success" => false,
        "message" => "ログインしていません"
    ]);
    exit;
}

// セッションから現在のユーザーIDを取得
$userId = (int) $_SESSION["user_id"];

try {
    if (touchUserLastActive($pdo, $userId)) {
        notifyUserActiveUpdated($userId);
    }

    // ユーザー情報をDBから取得するクエリ
    // 返却するカラム: user_id, name, email, icon_url, language_code, status
    $sql = " SELECT user_id, name, email, icon_url, language_code, status FROM users WHERE user_id = :user_id LIMIT 1 ";

    // プリペアドステートメントでクエリ実行（SQLインジェクション対策）
    $stmt = $pdo->prepare($sql);
    $stmt->bindValue(":user_id", $userId, PDO::PARAM_INT);
    $stmt->execute();

    // 取得結果を連想配列で受け取る
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    // ユーザーが見つからなければ404を返す
    if (!$user) {
        http_response_code(404);
        echo json_encode([
            "success" => false,
            "message" => "ユーザーが見つかりません"
        ]);
        exit;
    }

    // 正常時はユーザー情報を含むJSONを返す
    $iconKey = extractS3KeyFromIconValue($user["icon_url"] ?? null);

    $user["icon_key"] = $iconKey;
    $user["icon_url"] = resolveUserIconUrl($iconKey);

    echo json_encode([
        "success" => true,
        "user" => $user
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

    exit;

} catch (PDOException $error) {
    // DB接続やクエリ実行時のエラーは500で応答
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => "ユーザー情報の取得に失敗しました"
    ]);
    exit;
}
?>
