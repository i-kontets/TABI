<?php
/**
 * ログイン中ユーザーのプロフィール画像をS3へアップロードするAPIです。
 *
 * 流れ:
 * 1. ログイン状態と画像ファイルを確認する
 * 2. 画像の種類とサイズを検証する
 * 3. S3へ新しい画像を保存する
 * 4. DBの users.icon_url にS3キーを保存する
 * 5. 古いS3画像があれば削除し、表示用の署名付きURLを返す
 */
session_start();
header("Content-Type: application/json; charset=UTF-8");

require_once __DIR__ . "/../config/db.php";
require_once __DIR__ . "/../Groups/S3Common.php";

function respond(array $payload, int $status = 200): void
{
    // どの分岐からでも同じ形式でJSONを返し、二重にレスポンスしないよう exit します。
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

// 画像アップロードはファイルを送る処理なので、POST 以外は受け付けません。
if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    respond(["success" => false, "message" => "POSTで送信してください。"], 405);
}

// セッションに user_id がない場合、どのユーザーの画像か判断できないため拒否します。
if (!isset($_SESSION["user_id"])) {
    respond(["success" => false, "message" => "ログインが必要です。"], 401);
}

if (empty($_FILES["image"])) {
    respond(["success" => false, "message" => "画像ファイルを添付してください。"], 400);
}

$userId = (int) $_SESSION["user_id"];
$file = $_FILES["image"];
// MIMEタイプごとに保存時の拡張子を決めます。許可していない形式は後で400エラーにします。
$allowed = [
    "image/jpeg" => "jpg",
    "image/png" => "png",
    "image/webp" => "webp",
];
$maxSize = 10 * 1024 * 1024;

if ($file["error"] !== UPLOAD_ERR_OK) {
    respond(["success" => false, "message" => "アップロードに失敗しました。"], 500);
}

// ブラウザから送られたContent-Typeは偽装できるため、サーバー側で実ファイルのMIMEタイプを確認します。
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
    // 先に現在のアイコンS3キーを取得しておき、アップロード成功後に古い画像を削除できるようにします。
    $stmt = $pdo->prepare("SELECT icon_url FROM users WHERE user_id = :user_id LIMIT 1");
    $stmt->bindValue(":user_id", $userId, PDO::PARAM_INT);
    $stmt->execute();
    $current = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$current) {
        respond(["success" => false, "message" => "ユーザーが見つかりません。"], 404);
    }

    // S3へ保存するため、AWS設定を読み込み、S3クライアントを作成します。
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
    // ランダム文字列を含めたS3キーにすることで、同名ファイルの上書きや推測しやすいURLを避けます。
    $s3Key = sprintf("User/%d/profile/%s.%s", $userId, bin2hex(random_bytes(16)), $ext);

    // S3へ画像本体を保存します。ContentType を設定すると、ブラウザが画像として表示しやすくなります。
    $s3->putObject([
        "Bucket" => $aws["bucket"],
        "Key" => $s3Key,
        "SourceFile" => $file["tmp_name"],
        "ContentType" => $mime,
    ]);

    // DBには有効期限がある署名付きURLではなく、永続的に参照できるS3キーを保存します。
    $stmt = $pdo->prepare("UPDATE users SET icon_url = :icon_url, updated_at = :updated_at WHERE user_id = :user_id");
    $stmt->bindValue(":icon_url", $s3Key);
    $stmt->bindValue(":updated_at", (new DateTimeImmutable("now"))->format("Y-m-d H:i:s"));
    $stmt->bindValue(":user_id", $userId, PDO::PARAM_INT);
    $stmt->execute();

    $oldKey = $current["icon_url"] ?? null;
    if ($oldKey && strpos($oldKey, "User/") === 0 && $oldKey !== $s3Key) {
        try {
            // DB更新が成功した後で古い画像を削除します。削除失敗は表示更新の成功を妨げないよう握りつぶします。
            $s3->deleteObject(["Bucket" => $aws["bucket"], "Key" => $oldKey]);
        } catch (Throwable $ignored) {
        }
    }

    respond([
        "success" => true,
        "message" => "ユーザーアイコンをアップロードしました。",
        // file_url はDBに保存したS3キー、image_url は画面表示用の一時URLです。
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
