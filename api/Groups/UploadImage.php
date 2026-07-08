<?php
session_start();
header("Content-Type: application/json; charset=UTF-8");

// データベース接続設定を読み込む（$pdo を使用）
require_once __DIR__ . "/../config/db.php";
// S3共通処理（AWS-S3.md の Photos 実装と同じ方針）
require_once __DIR__ . "/S3Common.php";

// レスポンスをJSONで返して終了する共通関数
function respond(array $payload, int $status = 200): void
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

// POST 以外は受け付けない
if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    respond([
        "success" => false,
        "message" => "POSTで送信してください。"
    ], 405);
}

// 未ログインなら401
if (!isset($_SESSION["user_id"])) {
    respond([
        "success" => false,
        "message" => "ログインが必要です。"
    ], 401);
}

$userId = (int) $_SESSION["user_id"];

// 対象グループID（multipart/form-data の group_id）
$groupId = (int) ($_POST["group_id"] ?? 0);

if ($groupId <= 0) {
    respond([
        "success" => false,
        "message" => "group_id を指定してください。"
    ], 400);
}

if (empty($_FILES["image"])) {
    respond([
        "success" => false,
        "message" => "画像ファイルが添付されていません。"
    ], 400);
}

$file = $_FILES["image"];
// Photos/Upload.php と同じ制限（JPEG / PNG / WebP、最大10MB）
$allowed = [
    "image/jpeg" => "jpg",
    "image/png" => "png",
    "image/webp" => "webp",
];
$maxSize = 10 * 1024 * 1024;

if ($file["error"] !== UPLOAD_ERR_OK) {
    respond([
        "success" => false,
        "message" => "アップロードに失敗しました。（エラーコード: " . $file["error"] . "）"
    ], 500);
}

// MIME は実ファイルから検証する（Content-Type ヘッダは偽装可能なため）
$finfo = finfo_open(FILEINFO_MIME_TYPE);
$mime = finfo_file($finfo, $file["tmp_name"]);
finfo_close($finfo);

if (!isset($allowed[$mime])) {
    respond([
        "success" => false,
        "message" => "JPEG / PNG / WebP のみ対応しています。"
    ], 400);
}

if ($file["size"] > $maxSize) {
    respond([
        "success" => false,
        "message" => "ファイルサイズは10MB以内にしてください。"
    ], 400);
}

try {
    // ログイン中ユーザーがこのグループの承認済みメンバーであることを確認する
    $stmt = $pdo->prepare("
        SELECT 1
        FROM group_members
        WHERE group_id = :group_id
          AND user_id = :user_id
          AND invitation_status = 'accepted'
        LIMIT 1
    ");
    $stmt->bindValue(":group_id", $groupId, PDO::PARAM_INT);
    $stmt->bindValue(":user_id", $userId, PDO::PARAM_INT);
    $stmt->execute();

    if (!$stmt->fetch()) {
        respond([
            "success" => false,
            "message" => "このグループのメンバーではありません。"
        ], 403);
    }

    // 差し替え時に古い画像を消すため、現在のS3キーを取得しておく
    $stmt = $pdo->prepare("
        SELECT trip_id, group_icon
        FROM trips
        WHERE group_id = :group_id
        ORDER BY (start_date IS NULL) ASC, start_date DESC, trip_id DESC
        LIMIT 1
    ");
    $stmt->bindValue(":group_id", $groupId, PDO::PARAM_INT);
    $stmt->execute();
    $current = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$current) {
        respond([
            "success" => false,
            "message" => "画像を保存する旅行レコードが見つかりません。"
        ], 404);
    }

    $tripId = (int) $current["trip_id"];
    $oldKey = $current["group_icon"] ?? null;

    // S3クライアントを準備する
    $aws = loadAwsConfig();
    $s3 = $aws ? createS3Client($aws) : null;

    if (!$s3) {
        respond([
            "success" => false,
            "message" => "S3の設定が見つかりません。env.php と AWS SDK（vendor）を確認してください。"
        ], 500);
    }

    // S3キー設計は AWS-S3.md に合わせる:
    //   groups/{group_id}/cover/YYYY/MM/DD/{ランダム文字列}.{拡張子}
    $ext = $allowed[$mime];
    $s3Key = sprintf(
        "Icon/%s.%s",
        bin2hex(random_bytes(16)),
        $ext
    );

    // S3へアップロード
    $s3->putObject([
        "Bucket" => $aws["bucket"],
        "Key" => $s3Key,
        "SourceFile" => $file["tmp_name"],
        "ContentType" => $mime,
    ]);

    // DBにはS3キーだけを保存する（署名付きURLは保存しない）
    $stmt = $pdo->prepare("
        UPDATE trips
        SET group_icon = :group_icon,
            updated_at = :updated_at
        WHERE trip_id = :trip_id
    ");
    $stmt->bindValue(":group_icon", $s3Key);
    $stmt->bindValue(":updated_at", (new DateTimeImmutable("now"))->format("Y-m-d H:i:s"));
    $stmt->bindValue(":trip_id", $tripId, PDO::PARAM_INT);
    $stmt->execute();

    // 古い画像がS3キーなら削除する（外部URLは対象外）
    if ($oldKey && strpos($oldKey, "http://") !== 0 && strpos($oldKey, "https://") !== 0) {
        try {
            $s3->deleteObject([
                "Bucket" => $aws["bucket"],
                "Key" => $oldKey,
            ]);
        } catch (Throwable $error) {
            // 削除失敗は致命的ではないため処理を続行する
        }
    }

    // 表示用の署名付きURLを発行して返す
    respond([
        "success" => true,
        "message" => "グループ画像をアップロードしました。",
        "file_url" => $s3Key,
        "image_url" => presignS3Url($s3, $aws["bucket"], $s3Key)
    ]);
} catch (Throwable $error) {
    respond([
        "success" => false,
        "message" => "グループ画像のアップロードに失敗しました。"
    ], 500);
}
