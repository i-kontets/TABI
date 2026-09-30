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

const EMAIL_CHANGE_COOLDOWN_SECONDS = 60;
const EMAIL_CHANGE_EXPIRES_MINUTES = 10;

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
 * emailChangeTableExists は、この API 内で何度も使う処理をまとめた関数です。
 * 引数として受け取った値をもとに、確認・取得・更新などの結果を返します。
 */
function emailChangeTableExists(PDO $pdo): bool
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

// ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
if (!filter_var($newEmail, FILTER_VALIDATE_EMAIL)) {
    // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
    respond(["success" => false, "message" => "メールアドレスの形式を確認してください。"], 400);
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
    if (!emailChangeTableExists($pdo)) {
        // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
        respond(["success" => false, "message" => "メールアドレス変更用テーブルがありません。管理者へ連絡してください。"], 500);
    }

    // SQL を準備し、あとから値を安全に入れられる形にします。
    $stmt = $pdo->prepare("SELECT user_id, name, email FROM users WHERE user_id = :user_id LIMIT 1");
    // SQL 内の目印に値を割り当て、入力値が SQL 命令として実行されないようにします。
    $stmt->bindValue(":user_id", $userId, PDO::PARAM_INT);
    // 準備した SQL を実行し、データベースへの取得・登録・更新を行います。
    $stmt->execute();
    $currentUser = $stmt->fetch(PDO::FETCH_ASSOC);
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
    $stmt = $pdo->prepare("SELECT user_id FROM users WHERE email = :email AND user_id <> :user_id LIMIT 1");
    // SQL 内の目印に値を割り当て、入力値が SQL 命令として実行されないようにします。
    $stmt->bindValue(":email", $newEmail);
    // SQL 内の目印に値を割り当て、入力値が SQL 命令として実行されないようにします。
    $stmt->bindValue(":user_id", $userId, PDO::PARAM_INT);
    // 準備した SQL を実行し、データベースへの取得・登録・更新を行います。
    $stmt->execute();
    // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
    if ($stmt->fetch()) {
        // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
        respond(["success" => false, "message" => "このメールアドレスは既に使用されています。"], 409);
    }

    // SQL を準備し、あとから値を安全に入れられる形にします。
    $stmt = $pdo->prepare("
        SELECT resend_available_at
        FROM email_change_verifications
        WHERE user_id = :user_id
          AND used_at IS NULL
          AND invalidated_at IS NULL
        ORDER BY id DESC
        LIMIT 1
    ");
    // SQL 内の目印に値を割り当て、入力値が SQL 命令として実行されないようにします。
    $stmt->bindValue(":user_id", $userId, PDO::PARAM_INT);
    // 準備した SQL を実行し、データベースへの取得・登録・更新を行います。
    $stmt->execute();
    $latest = $stmt->fetch(PDO::FETCH_ASSOC);
    $now = emailChangeNow();

    // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
    if ($latest) {
        $resendAt = new DateTimeImmutable($latest["resend_available_at"], new DateTimeZone("Asia/Tokyo"));

        // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
        if ($resendAt->getTimestamp() > $now->getTimestamp()) {
            // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
            respond([
                "success" => false,
                "message" => "認証コードは短時間に連続送信できません。少し待ってから再送信してください。",
                "resendAvailableAt" => $resendAt->format(DateTimeInterface::ATOM),
            ], 429);
        }
    }

    $code = (string) random_int(100000, 999999);
    $nowText = $now->format("Y-m-d H:i:s");
    $expiresAt = $now->modify("+" . EMAIL_CHANGE_EXPIRES_MINUTES . " minutes");
    $resendAvailableAt = $now->modify("+" . EMAIL_CHANGE_COOLDOWN_SECONDS . " seconds");

    $pdo->beginTransaction();

    // 新しい認証コードを発行したら、古い未使用コードは invalidated_at で無効化します。
    $stmt = $pdo->prepare("
        UPDATE email_change_verifications
        SET invalidated_at = :invalidated_at
        WHERE user_id = :user_id
          AND used_at IS NULL
          AND invalidated_at IS NULL
    ");
    // 準備した SQL を実行し、データベースへの取得・登録・更新を行います。
    $stmt->execute([
        "invalidated_at" => $nowText,
        "user_id" => $userId,
    ]);

    // SQL を準備し、あとから値を安全に入れられる形にします。
    $stmt = $pdo->prepare("
        INSERT INTO email_change_verifications
            (user_id, old_email, new_email, verification_code, expires_at, attempt_count, resend_available_at, created_at, updated_at)
        VALUES
            (:user_id, :old_email, :new_email, :verification_code, :expires_at, 0, :resend_available_at, :created_at, :updated_at)
    ");
    // SQL 内の目印に値を割り当て、入力値が SQL 命令として実行されないようにします。
    $stmt->bindValue(":user_id", $userId, PDO::PARAM_INT);
    // SQL 内の目印に値を割り当て、入力値が SQL 命令として実行されないようにします。
    $stmt->bindValue(":old_email", (string) $currentUser["email"]);
    // SQL 内の目印に値を割り当て、入力値が SQL 命令として実行されないようにします。
    $stmt->bindValue(":new_email", $newEmail);
    // SQL 内の目印に値を割り当て、入力値が SQL 命令として実行されないようにします。
    $stmt->bindValue(":verification_code", $code);
    // SQL 内の目印に値を割り当て、入力値が SQL 命令として実行されないようにします。
    $stmt->bindValue(":expires_at", $expiresAt->format("Y-m-d H:i:s"));
    // SQL 内の目印に値を割り当て、入力値が SQL 命令として実行されないようにします。
    $stmt->bindValue(":created_at", $nowText);
    // SQL 内の目印に値を割り当て、入力値が SQL 命令として実行されないようにします。
    $stmt->bindValue(":updated_at", $nowText);
    // SQL 内の目印に値を割り当て、入力値が SQL 命令として実行されないようにします。
    $stmt->bindValue(":resend_available_at", $resendAvailableAt->format("Y-m-d H:i:s"));
    // 準備した SQL を実行し、データベースへの取得・登録・更新を行います。
    $stmt->execute();

    // DBに認証情報を保存したあと、GASへメール送信を依頼します。コードはレスポンスには含めません。
    sendEmailChangeMail([
        "action" => "email_change_verification",
        "to" => $newEmail,
        "userName" => $currentUser["name"] ?? "ユーザー",
        "verificationCode" => $code,
        "expiresMinutes" => EMAIL_CHANGE_EXPIRES_MINUTES,
    ]);

    $pdo->commit();

    // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
    respond([
        "success" => true,
        "message" => "認証コードを新しいメールアドレスへ送信しました。",
        "expiresAt" => $expiresAt->format(DateTimeInterface::ATOM),
        "resendAvailableAt" => $resendAvailableAt->format(DateTimeInterface::ATOM),
        "maskedEmail" => maskEmailForDisplay($newEmail),
    ]);
// エラーが起きた場合は、詳細をログに残し、利用者には安全なメッセージを返します。
} catch (Throwable $error) {
    // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
    respond(["success" => false, "message" => "認証コードの送信に失敗しました。"], 500);
}
