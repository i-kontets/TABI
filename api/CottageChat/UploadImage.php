<?php
/**
 * コテージチャットで送信する画像をサーバー内の uploads フォルダへ保存するAPIです。
 *
 * このAPIはS3ではなくローカルフォルダに保存します。
 * 画像の種類・サイズを確認し、保存に成功したらブラウザから参照できるURLを返します。
 */
session_start();
header("Content-Type: application/json; charset=UTF-8");

function respond(array $payload, int $status = 200): void
{
    // 成功時も失敗時も同じJSON形式で返し、ここでAPI処理を終了します。
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

// ファイルアップロードはPOSTで送られるため、それ以外のHTTPメソッドは拒否します。
if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    respond(["success" => false, "message" => "POSTで送信してください"], 405);
}

// ログインしていないユーザーが画像を保存できないように、セッションを確認します。
if (!isset($_SESSION["user_id"])) {
    respond(["success" => false, "message" => "ログインが必要です"], 401);
}

if (empty($_FILES["image"])) {
    respond(["success" => false, "message" => "画像が選択されていません"], 400);
}

$file = $_FILES["image"];
// チャット画像として許可するMIMEタイプです。拡張子だけではなく実ファイルの種類で判定します。
$allowed = ["image/jpeg", "image/png", "image/gif", "image/webp"];
$maxSize = 5 * 1024 * 1024;

if ($file["error"] !== UPLOAD_ERR_OK) {
    respond(["success" => false, "message" => "画像アップロードに失敗しました"], 500);
}

// finfo_file で一時ファイルの中身を見て、偽装されたContent-Typeにだまされないようにします。
$finfo = finfo_open(FILEINFO_MIME_TYPE);
$mime = finfo_file($finfo, $file["tmp_name"]);
finfo_close($finfo);

if (!in_array($mime, $allowed, true)) {
    respond(["success" => false, "message" => "JPEG / PNG / GIF / WebP のみ対応しています"], 400);
}

if ($file["size"] > $maxSize) {
    respond(["success" => false, "message" => "画像サイズは5MB以下にしてください"], 400);
}

// 保存先フォルダがまだ存在しない場合は作成します。
$uploadDir = dirname(dirname(__DIR__)) . "/uploads/cottage_chat/";
if (!is_dir($uploadDir)) {
    mkdir($uploadDir, 0755, true);
}

$extMap = [
    "image/jpeg" => "jpg",
    "image/png" => "png",
    "image/gif" => "gif",
    "image/webp" => "webp",
];
$ext = $extMap[$mime] ?? "jpg";
// 日時とランダム文字列を組み合わせ、同名ファイルで上書きされる事故を防ぎます。
$filename = date("Ymd_His") . "_" . bin2hex(random_bytes(6)) . "." . $ext;
$savePath = $uploadDir . $filename;

// PHPが受け取った一時ファイルを、実際に公開用フォルダへ移動します。
if (!move_uploaded_file($file["tmp_name"], $savePath)) {
    respond(["success" => false, "message" => "画像の保存に失敗しました"], 500);
}

respond([
    "success" => true,
    // フロントエンドはこのURLをチャット本文の画像表示に使います。
    "image_url" => "/TABI/uploads/cottage_chat/" . $filename,
]);
