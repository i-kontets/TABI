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

// ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
if (!isset($_SESSION["user_id"])) {
    // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
    respond(["success" => false, "message" => "ログインが必要です。"], 401);
}

$userId = (int) $_SESSION["user_id"];
$settingKey = "notification_settings:" . $userId;

// データベース処理などでエラーが起きる可能性があるため、例外を受け取れる形で実行します。
try {
    // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
    if ($_SERVER["REQUEST_METHOD"] === "GET") {
        // SQL を準備し、あとから値を安全に入れられる形にします。
        $stmt = $pdo->prepare("SELECT setting_value FROM system_settings WHERE setting_key = :setting_key LIMIT 1");
        // SQL 内の目印に値を割り当て、入力値が SQL 命令として実行されないようにします。
        $stmt->bindValue(":setting_key", $settingKey);
        // 準備した SQL を実行し、データベースへの取得・登録・更新を行います。
        $stmt->execute();
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        // フロントエンドから送られた JSON 文字列を、PHP で扱える配列に変換します。
        $settings = $row ? json_decode((string) $row["setting_value"], true) : [];
        // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
        respond(["success" => true, "settings" => is_array($settings) ? $settings : []]);
    }

    // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
    if ($_SERVER["REQUEST_METHOD"] !== "POST") {
        // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
        respond(["success" => false, "message" => "GETまたはPOSTで送信してください。"], 405);
    }

    // フロントエンドから送られた JSON 文字列を、PHP で扱える配列に変換します。
    $input = json_decode(file_get_contents("php://input"), true);
    // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
    if (!is_array($input) || !isset($input["settings"]) || !is_array($input["settings"])) {
        // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
        respond(["success" => false, "message" => "通知設定を送信してください。"], 400);
    }

    $now = (new DateTimeImmutable("now"))->format("Y-m-d H:i:s");
    // SQL を準備し、あとから値を安全に入れられる形にします。
    $stmt = $pdo->prepare("
        INSERT INTO system_settings (setting_key, setting_value, updated_at)
        VALUES (:setting_key, :setting_value, :updated_at)
        ON DUPLICATE KEY UPDATE
            setting_value = VALUES(setting_value),
            updated_at = VALUES(updated_at)
    ");
    // SQL 内の目印に値を割り当て、入力値が SQL 命令として実行されないようにします。
    $stmt->bindValue(":setting_key", $settingKey);
    // SQL 内の目印に値を割り当て、入力値が SQL 命令として実行されないようにします。
    $stmt->bindValue(":setting_value", json_encode($input["settings"], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
    // SQL 内の目印に値を割り当て、入力値が SQL 命令として実行されないようにします。
    $stmt->bindValue(":updated_at", $now);
    // 準備した SQL を実行し、データベースへの取得・登録・更新を行います。
    $stmt->execute();

    // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
    respond(["success" => true, "settings" => $input["settings"]]);
// エラーが起きた場合は、詳細をログに残し、利用者には安全なメッセージを返します。
} catch (Throwable $error) {
    // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
    respond(["success" => false, "message" => "通知設定の取得または保存に失敗しました。"], 500);
}
