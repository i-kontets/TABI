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

// ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
if (!isset($_SESSION["user_id"])) {
    // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
    respond(["success" => false, "message" => "ログインが必要です。"], 401);
}

$userId = (int) $_SESSION["user_id"];

/**
 * userColumnExists は、この API 内で何度も使う処理をまとめた関数です。
 * 引数として受け取った値をもとに、確認・取得・更新などの結果を返します。
 */
function userColumnExists(PDO $pdo, string $column): bool
{
    // SQL を準備し、あとから値を安全に入れられる形にします。
    $stmt = $pdo->prepare("SHOW COLUMNS FROM users LIKE :column_name");
    // SQL 内の目印に値を割り当て、入力値が SQL 命令として実行されないようにします。
    $stmt->bindValue(":column_name", $column);
    // 準備した SQL を実行し、データベースへの取得・登録・更新を行います。
    $stmt->execute();
    return (bool) $stmt->fetch(PDO::FETCH_ASSOC);
}

/**
 * resolveUserIconUrl は、この API 内で何度も使う処理をまとめた関数です。
 * 引数として受け取った値をもとに、確認・取得・更新などの結果を返します。
 */
function resolveUserIconUrl(?string $iconUrl): ?string
{
    // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
    if (!$iconUrl) {
        return null;
    }
    $iconUrl = extractS3KeyFromIconValue($iconUrl);
    // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
    if (!$iconUrl) {
        return null;
    }
    $aws = loadAwsConfig();
    $s3 = $aws ? createS3Client($aws) : null;
    // 署名付きURLを作ると、非公開のS3画像をブラウザで一時的に表示できます。期限が切れたら再生成が必要です。
    return ($s3 && $aws) ? presignS3Url($s3, $aws["bucket"], $iconUrl) : null;
}

/**
 * extractS3KeyFromIconValue は、この API 内で何度も使う処理をまとめた関数です。
 * 引数として受け取った値をもとに、確認・取得・更新などの結果を返します。
 */
function extractS3KeyFromIconValue(?string $iconValue): ?string
{
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

        return ltrim(rawurldecode($path), "/");
    }

    return ltrim($iconValue, "/");
}

/**
 * fetchUserProfile は、この API 内で何度も使う処理をまとめた関数です。
 * 引数として受け取った値をもとに、確認・取得・更新などの結果を返します。
 */
function fetchUserProfile(PDO $pdo, int $userId): array
{
    $phoneSelect = userColumnExists($pdo, "phone_number") ? "u.phone_number" : "NULL AS phone_number";

    // SQL を準備し、あとから値を安全に入れられる形にします。
    $stmt = $pdo->prepare("
        SELECT
            u.user_id,
            u.name,
            u.email,
            u.icon_url,
            u.language_code,
            u.status,
            {$phoneSelect},
            p.self_introduction,
            p.birthday,
            p.gender,
            p.country_code,
            p.timezone
        FROM users u
        LEFT JOIN user_profiles p ON p.user_id = u.user_id
        WHERE u.user_id = :user_id
        LIMIT 1
    ");
    // SQL 内の目印に値を割り当て、入力値が SQL 命令として実行されないようにします。
    $stmt->bindValue(":user_id", $userId, PDO::PARAM_INT);
    // 準備した SQL を実行し、データベースへの取得・登録・更新を行います。
    $stmt->execute();
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
    if (!$user) {
        // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
        respond(["success" => false, "message" => "ユーザーが見つかりません。"], 404);
    }
    $iconKey = extractS3KeyFromIconValue($user["icon_url"] ?? null);
    $user["icon_key"] = $iconKey;
    $user["icon_url"] = resolveUserIconUrl($iconKey);
    return $user;
}

/**
 * formatPhoneNumber は、この API 内で何度も使う処理をまとめた関数です。
 * 引数として受け取った値をもとに、確認・取得・更新などの結果を返します。
 */
function formatPhoneNumber(?string $value): string
{
    $digits = substr(preg_replace("/\D/", "", (string) $value) ?? "", 0, 11);

    // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
    if ($digits === null || $digits === "") {
        return "";
    }

    // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
    if (strlen($digits) <= 3) {
        return $digits;
    }

    // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
    if (strlen($digits) <= 7) {
        return substr($digits, 0, 3) . "-" . substr($digits, 3);
    }

    // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
    if (strlen($digits) <= 11) {
        return substr($digits, 0, 3) . "-" . substr($digits, 3, 4) . "-" . substr($digits, 7, 4);
    }

    return substr($digits, 0, 3) . "-" . substr($digits, 3, 4) . "-" . substr($digits, 7, 4);
}

// データベース処理などでエラーが起きる可能性があるため、例外を受け取れる形で実行します。
try {
    // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
    if ($_SERVER["REQUEST_METHOD"] === "GET") {
        // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
        respond(["success" => true, "user" => fetchUserProfile($pdo, $userId)]);
    }

    // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
    if ($_SERVER["REQUEST_METHOD"] !== "POST" && $_SERVER["REQUEST_METHOD"] !== "PUT") {
        // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
        respond(["success" => false, "message" => "GETまたはPOSTで送信してください。"], 405);
    }

    // フロントエンドから送られた JSON 文字列を、PHP で扱える配列に変換します。
    $input = json_decode(file_get_contents("php://input"), true);
    // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
    if (!is_array($input)) {
        // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
        respond(["success" => false, "message" => "JSON形式で送信してください。"], 400);
    }

    $name = trim((string) ($input["name"] ?? ""));
    // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
    if ($name === "") {
        // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
        respond(["success" => false, "message" => "名前を入力してください。"], 400);
    }

    $iconUrl = isset($input["icon_url"]) ? extractS3KeyFromIconValue((string) $input["icon_url"]) : null;
    $language = trim((string) ($input["language_code"] ?? "ja"));
    $intro = trim((string) ($input["self_introduction"] ?? ""));
    $birthday = trim((string) ($input["birthday"] ?? ""));
    $gender = trim((string) ($input["gender"] ?? ""));
    $country = trim((string) ($input["country_code"] ?? ""));
    $timezone = trim((string) ($input["timezone"] ?? "Asia/Tokyo"));
    $phoneNumber = formatPhoneNumber($input["phone_number"] ?? "");
    $hasPhoneNumber = userColumnExists($pdo, "phone_number");
    $now = (new DateTimeImmutable("now"))->format("Y-m-d H:i:s");

    $pdo->beginTransaction();

    $phoneUpdateSql = $hasPhoneNumber ? ", phone_number = :phone_number" : "";
    // SQL を準備し、あとから値を安全に入れられる形にします。
    $stmt = $pdo->prepare("
        UPDATE users
        SET name = :name,
            icon_url = :icon_url,
            language_code = :language_code,
            updated_at = :updated_at
            {$phoneUpdateSql}
        WHERE user_id = :user_id
    ");
    // SQL 内の目印に値を割り当て、入力値が SQL 命令として実行されないようにします。
    $stmt->bindValue(":name", $name);
    // SQL 内の目印に値を割り当て、入力値が SQL 命令として実行されないようにします。
    $stmt->bindValue(":icon_url", $iconUrl !== "" ? $iconUrl : null);
    // SQL 内の目印に値を割り当て、入力値が SQL 命令として実行されないようにします。
    $stmt->bindValue(":language_code", $language !== "" ? $language : "ja");
    // SQL 内の目印に値を割り当て、入力値が SQL 命令として実行されないようにします。
    $stmt->bindValue(":updated_at", $now);
    // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
    if ($hasPhoneNumber) {
        // SQL 内の目印に値を割り当て、入力値が SQL 命令として実行されないようにします。
        $stmt->bindValue(":phone_number", $phoneNumber !== "" ? $phoneNumber : null);
    }
    // SQL 内の目印に値を割り当て、入力値が SQL 命令として実行されないようにします。
    $stmt->bindValue(":user_id", $userId, PDO::PARAM_INT);
    // 準備した SQL を実行し、データベースへの取得・登録・更新を行います。
    $stmt->execute();

    // SQL を準備し、あとから値を安全に入れられる形にします。
    $stmt = $pdo->prepare("
        INSERT INTO user_profiles (user_id, self_introduction, birthday, gender, country_code, timezone)
        VALUES (:user_id, :self_introduction, :birthday, :gender, :country_code, :timezone)
        ON DUPLICATE KEY UPDATE
            self_introduction = VALUES(self_introduction),
            birthday = VALUES(birthday),
            gender = VALUES(gender),
            country_code = VALUES(country_code),
            timezone = VALUES(timezone)
    ");
    // SQL 内の目印に値を割り当て、入力値が SQL 命令として実行されないようにします。
    $stmt->bindValue(":user_id", $userId, PDO::PARAM_INT);
    // SQL 内の目印に値を割り当て、入力値が SQL 命令として実行されないようにします。
    $stmt->bindValue(":self_introduction", $intro !== "" ? $intro : null);
    // SQL 内の目印に値を割り当て、入力値が SQL 命令として実行されないようにします。
    $stmt->bindValue(":birthday", $birthday !== "" ? $birthday : null);
    // SQL 内の目印に値を割り当て、入力値が SQL 命令として実行されないようにします。
    $stmt->bindValue(":gender", $gender !== "" ? $gender : null);
    // SQL 内の目印に値を割り当て、入力値が SQL 命令として実行されないようにします。
    $stmt->bindValue(":country_code", $country !== "" ? $country : null);
    // SQL 内の目印に値を割り当て、入力値が SQL 命令として実行されないようにします。
    $stmt->bindValue(":timezone", $timezone !== "" ? $timezone : "Asia/Tokyo");
    // 準備した SQL を実行し、データベースへの取得・登録・更新を行います。
    $stmt->execute();

    $pdo->commit();

    // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
    respond(["success" => true, "message" => "プロフィールを更新しました。", "user" => fetchUserProfile($pdo, $userId)]);
// エラーが起きた場合は、詳細をログに残し、利用者には安全なメッセージを返します。
} catch (Throwable $error) {
    // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
    respond(["success" => false, "message" => "プロフィールの更新に失敗しました。"], 500);
}
