<?php
session_start();
header("Content-Type: application/json; charset=UTF-8");

require_once __DIR__ . "/../config/db.php";
require_once __DIR__ . "/../Groups/S3Common.php";

function respond(array $payload, int $status = 200): void
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

if (!isset($_SESSION["user_id"])) {
    respond(["success" => false, "message" => "ログインが必要です。"], 401);
}

$userId = (int) $_SESSION["user_id"];

function userColumnExists(PDO $pdo, string $column): bool
{
    $stmt = $pdo->prepare("SHOW COLUMNS FROM users LIKE :column_name");
    $stmt->bindValue(":column_name", $column);
    $stmt->execute();
    return (bool) $stmt->fetch(PDO::FETCH_ASSOC);
}

function resolveUserIconUrl(?string $iconUrl): ?string
{
    if (!$iconUrl) {
        return null;
    }
    if (strpos($iconUrl, "http://") === 0 || strpos($iconUrl, "https://") === 0) {
        return $iconUrl;
    }
    $aws = loadAwsConfig();
    $s3 = $aws ? createS3Client($aws) : null;
    return ($s3 && $aws) ? presignS3Url($s3, $aws["bucket"], $iconUrl) : null;
}

function fetchUserProfile(PDO $pdo, int $userId): array
{
    $phoneSelect = userColumnExists($pdo, "phone_number") ? "u.phone_number" : "NULL AS phone_number";

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
    $stmt->bindValue(":user_id", $userId, PDO::PARAM_INT);
    $stmt->execute();
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$user) {
        respond(["success" => false, "message" => "ユーザーが見つかりません。"], 404);
    }
    $user["icon_key"] = $user["icon_url"];
    $user["icon_url"] = resolveUserIconUrl($user["icon_url"]);
    return $user;
}

function formatPhoneNumber(?string $value): string
{
    $digits = substr(preg_replace("/\D/", "", (string) $value) ?? "", 0, 11);

    if ($digits === null || $digits === "") {
        return "";
    }

    if (strlen($digits) <= 3) {
        return $digits;
    }

    if (strlen($digits) <= 7) {
        return substr($digits, 0, 3) . "-" . substr($digits, 3);
    }

    if (strlen($digits) <= 11) {
        return substr($digits, 0, 3) . "-" . substr($digits, 3, 4) . "-" . substr($digits, 7, 4);
    }

    return substr($digits, 0, 3) . "-" . substr($digits, 3, 4) . "-" . substr($digits, 7, 4);
}

try {
    if ($_SERVER["REQUEST_METHOD"] === "GET") {
        respond(["success" => true, "user" => fetchUserProfile($pdo, $userId)]);
    }

    if ($_SERVER["REQUEST_METHOD"] !== "POST" && $_SERVER["REQUEST_METHOD"] !== "PUT") {
        respond(["success" => false, "message" => "GETまたはPOSTで送信してください。"], 405);
    }

    $input = json_decode(file_get_contents("php://input"), true);
    if (!is_array($input)) {
        respond(["success" => false, "message" => "JSON形式で送信してください。"], 400);
    }

    $name = trim((string) ($input["name"] ?? ""));
    if ($name === "") {
        respond(["success" => false, "message" => "名前を入力してください。"], 400);
    }

    $iconUrl = isset($input["icon_url"]) ? trim((string) $input["icon_url"]) : null;
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
    $stmt = $pdo->prepare("
        UPDATE users
        SET name = :name,
            icon_url = :icon_url,
            language_code = :language_code,
            updated_at = :updated_at
            {$phoneUpdateSql}
        WHERE user_id = :user_id
    ");
    $stmt->bindValue(":name", $name);
    $stmt->bindValue(":icon_url", $iconUrl !== "" ? $iconUrl : null);
    $stmt->bindValue(":language_code", $language !== "" ? $language : "ja");
    $stmt->bindValue(":updated_at", $now);
    if ($hasPhoneNumber) {
        $stmt->bindValue(":phone_number", $phoneNumber !== "" ? $phoneNumber : null);
    }
    $stmt->bindValue(":user_id", $userId, PDO::PARAM_INT);
    $stmt->execute();

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
    $stmt->bindValue(":user_id", $userId, PDO::PARAM_INT);
    $stmt->bindValue(":self_introduction", $intro !== "" ? $intro : null);
    $stmt->bindValue(":birthday", $birthday !== "" ? $birthday : null);
    $stmt->bindValue(":gender", $gender !== "" ? $gender : null);
    $stmt->bindValue(":country_code", $country !== "" ? $country : null);
    $stmt->bindValue(":timezone", $timezone !== "" ? $timezone : "Asia/Tokyo");
    $stmt->execute();

    $pdo->commit();

    respond(["success" => true, "message" => "プロフィールを更新しました。", "user" => fetchUserProfile($pdo, $userId)]);
} catch (Throwable $error) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    respond(["success" => false, "message" => "プロフィールの更新に失敗しました。"], 500);
}
