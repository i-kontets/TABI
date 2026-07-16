<?php

/**
 * ログイン要求を受け取り、ユーザー確認とセッション保存を行う API です。
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
 * updateLoginActivity は、この API 内で何度も使う処理をまとめた関数です。
 * 引数として受け取った値をもとに、確認・取得・更新などの結果を返します。
 */
function updateLoginActivity(PDO $pdo, int $userId): bool
{
    $sets = [];
    // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
    if (userColumnExists($pdo, "last_login_at")) {
        $sets[] = "last_login_at = :now";
    }
    // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
    if (userColumnExists($pdo, "last_active_at")) {
        $sets[] = "last_active_at = :now";
    }

    // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
    if (!$sets) {
        return false;
    }

    $now = (new DateTimeImmutable("now", new DateTimeZone("Asia/Tokyo")))->format("Y-m-d H:i:s");
    // SQL を準備し、あとから値を安全に入れられる形にします。
    $stmt = $pdo->prepare("UPDATE users SET " . implode(", ", $sets) . " WHERE user_id = :user_id");
    // 準備した SQL を実行し、データベースへの取得・登録・更新を行います。
    $stmt->execute([
        "now" => $now,
        "user_id" => $userId,
    ]);

    return $stmt->rowCount() > 0;
}

// POSTメソッドのみを許可。POST以外のリクエストはエラー
if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    http_response_code(405);

    // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
    echo json_encode([
        "success" => false,
        "message" => "POSTメソッドで送信してください"
    ]);
    exit;
}

// JSON形式のリクエストボディを取得してデコード
$input = json_decode(file_get_contents("php://input"), true);

// メールアドレスとパスワードを抽出（デフォルト値は空文字列）
$email = $input["email"] ?? "";
$password = $input["password"] ?? "";

// 入力値の必須チェック：メールアドレスまたはパスワードが空の場合はエラー
if ($email === "" || $password === "") {
    http_response_code(400);
    // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
    echo json_encode([
        "success" => false,
        "message" => "メールアドレスとパスワードを入力してください"
    ]);
    exit;
}

// データベース処理などでエラーが起きる可能性があるため、例外を受け取れる形で実行します。
try {
    // データベースからメールアドレスに一致するユーザーを検索
    $sql = " SELECT user_id, name, email, password_hash, status FROM users WHERE email = :email LIMIT 1";

    // プリペアドステートメントでSQLインジェクション対策
    $stmt = $pdo->prepare($sql);
    // SQL 内の目印に値を割り当て、入力値が SQL 命令として実行されないようにします。
    $stmt->bindValue(":email", $email, PDO::PARAM_STR);
    // 準備した SQL を実行し、データベースへの取得・登録・更新を行います。
    $stmt->execute();

    // 検索結果をユーザー情報として取得
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    // ユーザーが存在しない場合 → 認証失敗エラー
    if (!$user) {
        http_response_code(401);
        // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
        echo json_encode([
            "success" => false,
            "message" => "メールアドレスまたはパスワードが違います"
        ]);
        exit;
    }

    // ユーザーステータスが "active" でない場合 → アカウント無効エラー
    if ($user["status"] !== "active") {
        http_response_code(403);
        // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
        echo json_encode([
            "success" => false,
            "message" => "このアカウントは利用できません"
        ]);
        exit;
    }

    // 入力されたパスワードがデータベースに保存されたパスワードと一致するかチェック
    if ($password !== $user["password_hash"]) {
        http_response_code(401);
        // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
        echo json_encode([
            "success" => false,
            "message" => "メールアドレスまたはパスワードが違います"
        ]);
        exit;
    }

    // ログイン成功：セッション情報を設定
    $_SESSION["user_id"] = $user["user_id"];
    $_SESSION["user_name"] = $user["name"];
    $_SESSION["user_email"] = $user["email"];

    // ログイン成功レスポンスを返す
    if (updateLoginActivity($pdo, (int) $user["user_id"])) {
        notifyUserActiveUpdated((int) $user["user_id"]);
    }

    // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
    echo json_encode([
        "success" => true,
        "message" => "ログイン成功",
        "user" => [
            "user_id" => $user["user_id"],
            "name" => $user["name"],
            "email" => $user["email"]
        ]
    ]);

// エラーが起きた場合は、詳細をログに残し、利用者には安全なメッセージを返します。
} catch (PDOException $error) {
    // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
    if (function_exists("logSystemError")) {
        logSystemError("auth", "error", "ログイン処理に失敗しました", [
            "error" => $error->getMessage(),
            "email" => $email !== "" ? "provided" : "empty",
        ], null, $_SERVER["REQUEST_URI"] ?? null);
    }

    // データベース接続やクエリ実行時のエラーをキャッチ
    http_response_code(500);
    // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
    echo json_encode([
        "success" => false,
        "message" => "ログイン処理に失敗しました"
    ]);
    exit;
}
