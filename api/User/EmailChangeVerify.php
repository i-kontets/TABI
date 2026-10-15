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
require_once __DIR__ . "/emailChangeMailer.php";

const EMAIL_CHANGE_MAX_FAILED_ATTEMPTS = 5;

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
 * emailChangeVerifyTableExists は、この API 内で何度も使う処理をまとめた関数です。
 * 引数として受け取った値をもとに、確認・取得・更新などの結果を返します。
 */
function emailChangeVerifyTableExists(PDO $pdo): bool
{
    // SQL を準備し、あとから値を安全に入れられる形にします。
    $stmt = $pdo->prepare("SHOW TABLES LIKE 'email_change_verifications'");
    // 準備した SQL を実行し、データベースへの取得・登録・更新を行います。
    $stmt->execute();
    return (bool) $stmt->fetch();
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
$input = json_decode(file_get_contents("php://input"), true) ?: [];
$newEmail = trim((string) ($input["new_email"] ?? ""));
$code = preg_replace("/\D/", "", (string) ($input["code"] ?? ""));
// ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
if (!filter_var($newEmail, FILTER_VALIDATE_EMAIL) || !preg_match("/^\d{6}$/", $code)) {
    // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
    respond(["success" => false, "message" => "メールアドレスと認証コードを確認してください。"], 400);
}

$userId = (int) $_SESSION["user_id"];

// 公開操作から管理者用メールを取得させません。権限付与は承認済みの別運用だけで行います。
require_once __DIR__ . '/../auth/AdminAccess.php';
if (isTabiAdminEmail($newEmail)) {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'このメールアドレスは指定できません。'], JSON_UNESCAPED_UNICODE);
    exit;
}

// データベース処理などでエラーが起きる可能性があるため、例外を受け取れる形で実行します。
try {
    // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
    if (!emailChangeVerifyTableExists($pdo)) {
        // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
        respond(["success" => false, "message" => "メールアドレス変更用テーブルがありません。管理者へ連絡してください。"], 500);
    }

    // SQL を準備し、あとから値を安全に入れられる形にします。
    $userStmt = $pdo->prepare("SELECT user_id, name, email FROM users WHERE user_id = :user_id LIMIT 1");
    // SQL 内の目印に値を割り当て、入力値が SQL 命令として実行されないようにします。
    $userStmt->bindValue(":user_id", $userId, PDO::PARAM_INT);
    // 準備した SQL を実行し、データベースへの取得・登録・更新を行います。
    $userStmt->execute();
    $currentUser = $userStmt->fetch(PDO::FETCH_ASSOC);
    // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
    if (!$currentUser) {
        // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
        respond(["success" => false, "message" => "ユーザーが見つかりません。"], 404);
    }

    // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
    if (strcasecmp($newEmail, (string) $currentUser["email"]) === 0) {
        // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
        respond(["success" => false, "message" => "現在のメールアドレスとは別のメールアドレスを入力してください。"], 400);
    }

    // SQL を準備し、あとから値を安全に入れられる形にします。
    $duplicateStmt = $pdo->prepare("SELECT user_id FROM users WHERE email = :email AND user_id <> :user_id LIMIT 1");
    // SQL 内の目印に値を割り当て、入力値が SQL 命令として実行されないようにします。
    $duplicateStmt->bindValue(":email", $newEmail);
    // SQL 内の目印に値を割り当て、入力値が SQL 命令として実行されないようにします。
    $duplicateStmt->bindValue(":user_id", $userId, PDO::PARAM_INT);
    // 準備した SQL を実行し、データベースへの取得・登録・更新を行います。
    $duplicateStmt->execute();
    // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
    if ($duplicateStmt->fetch()) {
        // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
        respond(["success" => false, "message" => "このメールアドレスは既に使用されています。"], 409);
    }

    // SQL を準備し、あとから値を安全に入れられる形にします。
    $stmt = $pdo->prepare("
        SELECT id, old_email, new_email, verification_code, expires_at, attempt_count
        FROM email_change_verifications
        WHERE user_id = :user_id
          AND new_email = :new_email
          AND used_at IS NULL
          AND invalidated_at IS NULL
          AND expires_at >= NOW()
        ORDER BY id DESC
        LIMIT 1
    ");
    // SQL 内の目印に値を割り当て、入力値が SQL 命令として実行されないようにします。
    $stmt->bindValue(":user_id", $userId, PDO::PARAM_INT);
    // SQL 内の目印に値を割り当て、入力値が SQL 命令として実行されないようにします。
    $stmt->bindValue(":new_email", $newEmail);
    // 準備した SQL を実行し、データベースへの取得・登録・更新を行います。
    $stmt->execute();
    $verification = $stmt->fetch(PDO::FETCH_ASSOC);

    // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
    if (!$verification) {
        // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
        respond(["success" => false, "message" => "有効な認証コードが見つかりません。"], 400);
    }
    // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
    if ((int) ($verification["attempt_count"] ?? 0) >= EMAIL_CHANGE_MAX_FAILED_ATTEMPTS) {
        // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
        respond(["success" => false, "message" => "入力回数の上限を超えました。認証コードを再送信してください。"], 429);
    }
    // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
    if (!hash_equals((string) $verification["verification_code"], $code)) {
        // 認証コードを間違えた回数を attempt_count に残し、5回目で invalidated_at を入れて無効化します。
        $nextAttempts = (int) ($verification["attempt_count"] ?? 0) + 1;
        $updateSql = "
            UPDATE email_change_verifications
            SET attempt_count = :attempt_count,
                updated_at = :updated_at
        ";
        // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
        if ($nextAttempts >= EMAIL_CHANGE_MAX_FAILED_ATTEMPTS) {
            $updateSql .= ", invalidated_at = :invalidated_at";
        }
        $updateSql .= " WHERE id = :id";
        // SQL を準備し、あとから値を安全に入れられる形にします。
        $updateStmt = $pdo->prepare($updateSql);
        $nowText = emailChangeNow()->format("Y-m-d H:i:s");
        // SQL 内の目印に値を割り当て、入力値が SQL 命令として実行されないようにします。
        $updateStmt->bindValue(":attempt_count", $nextAttempts, PDO::PARAM_INT);
        // SQL 内の目印に値を割り当て、入力値が SQL 命令として実行されないようにします。
        $updateStmt->bindValue(":updated_at", $nowText);
        // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
        if ($nextAttempts >= EMAIL_CHANGE_MAX_FAILED_ATTEMPTS) {
            // SQL 内の目印に値を割り当て、入力値が SQL 命令として実行されないようにします。
            $updateStmt->bindValue(":invalidated_at", $nowText);
        }
        // SQL 内の目印に値を割り当て、入力値が SQL 命令として実行されないようにします。
        $updateStmt->bindValue(":id", (int) $verification["id"], PDO::PARAM_INT);
        // 準備した SQL を実行し、データベースへの取得・登録・更新を行います。
        $updateStmt->execute();

        // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
        if ($nextAttempts >= EMAIL_CHANGE_MAX_FAILED_ATTEMPTS) {
            // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
            respond(["success" => false, "message" => "入力回数の上限を超えました。認証コードを再送信してください。"], 429);
        }
        // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
        respond(["success" => false, "message" => "認証コードが正しくありません。"], 400);
    }

    $pdo->beginTransaction();
    $now = emailChangeNow();
    $nowText = $now->format("Y-m-d H:i:s");
    $oldEmail = (string) $verification["old_email"];
    $verifiedNewEmail = (string) $verification["new_email"];

    // SQL を準備し、あとから値を安全に入れられる形にします。
    $stmt = $pdo->prepare("UPDATE users SET email = :email, updated_at = :updated_at WHERE user_id = :user_id");
    // SQL 内の目印に値を割り当て、入力値が SQL 命令として実行されないようにします。
    $stmt->bindValue(":email", $verifiedNewEmail);
    // SQL 内の目印に値を割り当て、入力値が SQL 命令として実行されないようにします。
    $stmt->bindValue(":updated_at", $nowText);
    // SQL 内の目印に値を割り当て、入力値が SQL 命令として実行されないようにします。
    $stmt->bindValue(":user_id", $userId, PDO::PARAM_INT);
    // 準備した SQL を実行し、データベースへの取得・登録・更新を行います。
    $stmt->execute();

    // SQL を準備し、あとから値を安全に入れられる形にします。
    $stmt = $pdo->prepare("UPDATE email_change_verifications SET used_at = :used_at WHERE id = :id");
    // SQL 内の目印に値を割り当て、入力値が SQL 命令として実行されないようにします。
    $stmt->bindValue(":used_at", $nowText);
    // SQL 内の目印に値を割り当て、入力値が SQL 命令として実行されないようにします。
    $stmt->bindValue(":id", (int) $verification["id"], PDO::PARAM_INT);
    // 準備した SQL を実行し、データベースへの取得・登録・更新を行います。
    $stmt->execute();

    // 変更前メールアドレスへ通知を送ります。認証コードは送らず、変更事実だけを知らせます。
    sendEmailChangeMail([
        "action" => "email_change_completed",
        "to" => $oldEmail,
        "userName" => $currentUser["name"] ?? "ユーザー",
        "newMaskedEmail" => maskEmailForDisplay($verifiedNewEmail),
        "changedAt" => $now->format("Y/m/d H:i"),
    ]);

    $pdo->commit();

    // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
    respond([
        "success" => true,
        "message" => "メールアドレスを変更しました。",
        "user" => ["email" => $verifiedNewEmail],
        "changedAt" => $now->format("Y/m/d H:i"),
    ]);
// エラーが起きた場合は、詳細をログに残し、利用者には安全なメッセージを返します。
} catch (Throwable $error) {
    // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
    respond(["success" => false, "message" => "メールアドレスの変更に失敗しました。"], 500);
}
