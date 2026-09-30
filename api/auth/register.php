<?php

/**
 * 新規登録要求を受け取り、入力確認とユーザー作成を行う API です。
 *
 * 主な流れ:
 * 1. リクエストやセッションなど、処理に必要な情報を読み取る
 * 2. 入力値や権限を確認し、必要に応じてデータベースへ問い合わせる
 * 3. 処理結果を JSON などの形でフロントエンドへ返す
 *
 * 扱うデータ: アプリの設定値や、他のファイルから受け取る値を主に扱います。
 */

// 新規登録
// セッション開始
session_start();

// フロントエンドへ返すデータ形式や通信ルールを、HTTP ヘッダーとして伝えます。
header("Content-Type: application/json; charset=UTF-8");

// 共通設定や別ファイルの関数を読み込み、この API から使えるようにします。
require_once __DIR__ . "/../config/db.php";

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

// フロントエンドから送られた JSON 文字列を、PHP で扱える配列に変換します。
$input = json_decode(file_get_contents("php://input"), true);

// 入力値の抽出とデフォルト値の設定
$name = $input["name"] ?? "";
$email = $input["email"] ?? "";
$password = $input["password"] ?? "";
$languageCode = $input["language_code"] ?? "ja";
$termsAgreed = ($input["terms_agreed"] ?? false) === true;

// 入力値の必須チェック：名前、メールアドレス、パスワードが空の場合はエラー
if ($name === "" || $email === "" || $password === "") {
    http_response_code(400);

    // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
    echo json_encode([
        "success" => false,
        "message" => "名前、メールアドレス、パスワードを入力してください"
    ]);

    exit;
}

// ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
if (!$termsAgreed) {
    http_response_code(400);

    // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
    echo json_encode([
        "success" => false,
        "message" => "利用規約とプライバシーポリシーへの同意が必要です"
    ]);

    exit;
}

// 公開操作から管理者用メールを取得させません。権限付与は承認済みの別運用だけで行います。
require_once __DIR__ . '/AdminAccess.php';
if (isTabiAdminEmail($email)) {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'このメールアドレスは指定できません。'], JSON_UNESCAPED_UNICODE);
    exit;
}

// データベース処理などでエラーが起きる可能性があるため、例外を受け取れる形で実行します。
try {
    $checkSql = " SELECT user_id FROM users WHERE email = :email LIMIT 1";

    // SQL を準備し、あとから値を安全に入れられる形にします。
    $checkStmt = $pdo->prepare($checkSql);
    // SQL 内の目印に値を割り当て、入力値が SQL 命令として実行されないようにします。
    $checkStmt->bindValue(":email", $email, PDO::PARAM_STR);
    // 準備した SQL を実行し、データベースへの取得・登録・更新を行います。
    $checkStmt->execute();

    $existingUser = $checkStmt->fetch(PDO::FETCH_ASSOC);

    // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
    if ($existingUser) {
        http_response_code(409);

        // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
        echo json_encode([
            "success" => false,
            "message" => "このメールアドレスはすでに登録されています"
        ]);

        exit;
    }

    // 今は開発中なので平文保存。
    // 本番前には password_hash($password, PASSWORD_DEFAULT) に戻す。
    $passwordHash = $password;

    $insertSql = "
        INSERT INTO users (
            name, email, password_hash, language_code,
            status, created_at, updated_at
        ) VALUES (
            :name, :email, :password_hash,
            :language_code, 'active', NOW(), NOW()
        )
    ";

    // SQL を準備し、あとから値を安全に入れられる形にします。
    $insertStmt = $pdo->prepare($insertSql);
    // SQL 内の目印に値を割り当て、入力値が SQL 命令として実行されないようにします。
    $insertStmt->bindValue(":name", $name, PDO::PARAM_STR);
    // SQL 内の目印に値を割り当て、入力値が SQL 命令として実行されないようにします。
    $insertStmt->bindValue(":email", $email, PDO::PARAM_STR);
    // SQL 内の目印に値を割り当て、入力値が SQL 命令として実行されないようにします。
    $insertStmt->bindValue(":password_hash", $passwordHash, PDO::PARAM_STR);
    // SQL 内の目印に値を割り当て、入力値が SQL 命令として実行されないようにします。
    $insertStmt->bindValue(":language_code", $languageCode, PDO::PARAM_STR);
    // 準備した SQL を実行し、データベースへの取得・登録・更新を行います。
    $insertStmt->execute();

    $userId = $pdo->lastInsertId();

    $_SESSION["user_id"] = $userId;
    $_SESSION["user_name"] = $name;
    $_SESSION["user_email"] = $email;

    // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
    echo json_encode([
        "success" => true,
        "message" => "新規登録が完了しました",
        "user" => [
            "user_id" => $userId,
            "name" => $name,
            "email" => $email
        ]
    ]);

    exit;

// エラーが起きた場合は、詳細をログに残し、利用者には安全なメッセージを返します。
} catch (PDOException $error) {
    http_response_code(500);

    // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
    echo json_encode([
        "success" => false,
        "message" => "新規登録処理に失敗しました"
    ]);

    exit;
}
?>
