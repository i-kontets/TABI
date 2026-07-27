<?php

/**
 * チャットの一覧、メッセージ取得、送信、既読、画像アップロードを扱う API です。
 *
 * 主な流れ:
 * 1. リクエストやセッションなど、処理に必要な情報を読み取る
 * 2. 入力値や権限を確認し、必要に応じてデータベースへ問い合わせる
 * 3. 処理結果を JSON などの形でフロントエンドへ返す
 *
 * 扱うデータ: アプリの設定値や、他のファイルから受け取る値を主に扱います。
 */

/**
 * コテージチャットで送信する画像をサーバー内の uploads フォルダへ保存するAPIです。
 *
 * このAPIはS3ではなくローカルフォルダに保存します。
 * 画像の種類・サイズを確認し、保存に成功したらブラウザから参照できるURLを返します。
 */
session_start();
// フロントエンドへ返すデータ形式や通信ルールを、HTTP ヘッダーとして伝えます。
header("Content-Type: application/json; charset=UTF-8");

/**
 * respond は、この API 内で何度も使う処理をまとめた関数です。
 * 引数として受け取った値をもとに、確認・取得・更新などの結果を返します。
 */
function respond(array $payload, int $status = 200): void
{
    // 成功時も失敗時も同じJSON形式で返し、ここでAPI処理を終了します。
    http_response_code($status);
    // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

// ファイルアップロードはPOSTで送られるため、それ以外のHTTPメソッドは拒否します。
if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
    respond(["success" => false, "message" => "POSTで送信してください"], 405);
}

// ログインしていないユーザーが画像を保存できないように、セッションを確認します。
if (!isset($_SESSION["user_id"])) {
    // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
    respond(["success" => false, "message" => "ログインが必要です"], 401);
}

// ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
if (empty($_FILES["image"])) {
    // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
    respond(["success" => false, "message" => "画像が選択されていません"], 400);
}

$file = $_FILES["image"];
// チャット画像として許可するMIMEタイプです。拡張子だけではなく実ファイルの種類で判定します。
$allowed = ["image/jpeg", "image/png", "image/gif", "image/webp"];
$maxSize = 5 * 1024 * 1024;

// ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
if ($file["error"] !== UPLOAD_ERR_OK) {
    // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
    respond(["success" => false, "message" => "画像アップロードに失敗しました"], 500);
}

// finfo_file で一時ファイルの中身を見て、偽装されたContent-Typeにだまされないようにします。
$finfo = finfo_open(FILEINFO_MIME_TYPE);
$mime = finfo_file($finfo, $file["tmp_name"]);
finfo_close($finfo);

// ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
if (!in_array($mime, $allowed, true)) {
    // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
    respond(["success" => false, "message" => "JPEG / PNG / GIF / WebP のみ対応しています"], 400);
}

// ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
if ($file["size"] > $maxSize) {
    // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
    respond(["success" => false, "message" => "画像サイズは5MB以下にしてください"], 400);
}

// 保存先フォルダがまだ存在しない場合は作成します。
$uploadDir = dirname(dirname(__DIR__)) . "/uploads/cottage_chat/";
// ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
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
    // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
    respond(["success" => false, "message" => "画像の保存に失敗しました"], 500);
}

// 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
respond([
    "success" => true,
    // フロントエンドはこのURLをチャット本文の画像表示に使います。
    "image_url" => "/TABI/uploads/cottage_chat/" . $filename,
]);
