<?php
session_start();
header("Content-Type: application/json; charset=UTF-8");

function respond(array $payload, int $status = 200): void
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    respond(["success" => false, "message" => "POSTで送信してください"], 405);
}

if (!isset($_SESSION["user_id"])) {
    respond(["success" => false, "message" => "ログインが必要です"], 401);
}

if (empty($_FILES["image"])) {
    respond(["success" => false, "message" => "画像が選択されていません"], 400);
}

$file = $_FILES["image"];
$allowed = ["image/jpeg", "image/png", "image/gif", "image/webp"];
$maxSize = 5 * 1024 * 1024;

if ($file["error"] !== UPLOAD_ERR_OK) {
    respond(["success" => false, "message" => "画像アップロードに失敗しました"], 500);
}

$finfo = finfo_open(FILEINFO_MIME_TYPE);
$mime = finfo_file($finfo, $file["tmp_name"]);
finfo_close($finfo);

if (!in_array($mime, $allowed, true)) {
    respond(["success" => false, "message" => "JPEG / PNG / GIF / WebP のみ対応しています"], 400);
}

if ($file["size"] > $maxSize) {
    respond(["success" => false, "message" => "画像サイズは5MB以下にしてください"], 400);
}

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
$filename = date("Ymd_His") . "_" . bin2hex(random_bytes(6)) . "." . $ext;
$savePath = $uploadDir . $filename;

if (!move_uploaded_file($file["tmp_name"], $savePath)) {
    respond(["success" => false, "message" => "画像の保存に失敗しました"], 500);
}

respond([
    "success" => true,
    "image_url" => "/TABI/uploads/cottage_chat/" . $filename,
]);
