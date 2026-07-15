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

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    respond(["success" => false, "message" => "POSTで送信してください。"], 405);
}

if (!isset($_SESSION["user_id"])) {
    respond(["success" => false, "message" => "ログインが必要です。"], 401);
}

if (empty($_FILES["image"])) {
    respond(["success" => false, "message" => "画像ファイルを添付してください。"], 400);
}

$userId = (int) $_SESSION["user_id"];
$file = $_FILES["image"];
$allowed = [
    "image/jpeg" => "jpg",
    "image/png" => "png",
    "image/webp" => "webp",
];
$maxSize = 10 * 1024 * 1024;

if ($file["error"] !== UPLOAD_ERR_OK) {
    respond(["success" => false, "message" => "アップロードに失敗しました。"], 500);
}

$finfo = finfo_open(FILEINFO_MIME_TYPE);
$mime = finfo_file($finfo, $file["tmp_name"]);
finfo_close($finfo);

if (!isset($allowed[$mime])) {
    respond(["success" => false, "message" => "JPEG / PNG / WebP のみ対応しています。"], 400);
}

if ($file["size"] > $maxSize) {
    respond(["success" => false, "message" => "ファイルサイズは10MB以内にしてください。"], 400);
}

try {
    $stmt = $pdo->prepare("SELECT icon_url FROM users WHERE user_id = :user_id LIMIT 1");
    $stmt->bindValue(":user_id", $userId, PDO::PARAM_INT);
    $stmt->execute();
    $current = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$current) {
        respond(["success" => false, "message" => "ユーザーが見つかりません。"], 404);
    }

    $aws = loadAwsConfig();
    $s3 = $aws ? createS3Client($aws) : null;
    if (!$s3) {
        if (function_exists("logSystemError")) {
            logSystemError("s3", "error", "ユーザーアイコン用S3クライアントの初期化に失敗しました", [
                "user_id" => $userId,
            ], $userId);
        }
        respond(["success" => false, "message" => "S3設定が見つかりません。env.php と AWS SDK（vendor）を確認してください。"], 500);
    }

    $ext = $allowed[$mime];
    $s3Key = sprintf("User/%d/profile/%s.%s", $userId, bin2hex(random_bytes(16)), $ext);

    $s3->putObject([
        "Bucket" => $aws["bucket"],
        "Key" => $s3Key,
        "SourceFile" => $file["tmp_name"],
        "ContentType" => $mime,
    ]);

    $stmt = $pdo->prepare("UPDATE users SET icon_url = :icon_url, updated_at = :updated_at WHERE user_id = :user_id");
    $stmt->bindValue(":icon_url", $s3Key);
    $stmt->bindValue(":updated_at", (new DateTimeImmutable("now"))->format("Y-m-d H:i:s"));
    $stmt->bindValue(":user_id", $userId, PDO::PARAM_INT);
    $stmt->execute();

    $oldKey = $current["icon_url"] ?? null;
    if ($oldKey && strpos($oldKey, "User/") === 0 && $oldKey !== $s3Key) {
        try {
            $s3->deleteObject(["Bucket" => $aws["bucket"], "Key" => $oldKey]);
        } catch (Throwable $ignored) {
        }
    }

    respond([
        "success" => true,
        "message" => "ユーザーアイコンをアップロードしました。",
        "file_url" => $s3Key,
        "image_url" => presignS3Url($s3, $aws["bucket"], $s3Key),
    ]);
} catch (Throwable $error) {
    if (function_exists("logSystemError")) {
        logSystemError("s3", "error", "ユーザーアイコンアップロードに失敗しました", [
            "user_id" => $userId ?? null,
            "error" => $error->getMessage(),
        ], $userId ?? null);
    }
    respond(["success" => false, "message" => "ユーザーアイコンのアップロードに失敗しました。"], 500);
}
