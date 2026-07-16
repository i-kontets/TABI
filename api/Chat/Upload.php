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

// 画像アップロードAPI（旅行者→サーバー）
// POST multipart/form-data  field: image
// 保存先: /TABI/uploads/chat/
// レスポンス: { success: true, image_url: "/TABI/uploads/chat/filename.jpg" }
session_start();
// フロントエンドへ返すデータ形式や通信ルールを、HTTP ヘッダーとして伝えます。
header('Content-Type: application/json; charset=UTF-8');

/**
 * respond は、この API 内で何度も使う処理をまとめた関数です。
 * 引数として受け取った値をもとに、確認・取得・更新などの結果を返します。
 */
function respond(array $p, int $s = 200): void {
    http_response_code($s);
    // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
    echo json_encode($p, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

// ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
    respond(['success' => false, 'message' => 'POSTで送信してください'], 405);
}
// ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
if (!isset($_SESSION['user_id'])) {
    // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
    respond(['success' => false, 'message' => 'ログインが必要です'], 401);
}
// ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
if (empty($_FILES['image'])) {
    // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
    respond(['success' => false, 'message' => 'ファイルが添付されていません'], 400);
}

$file    = $_FILES['image'];
$allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
$maxSize = 5 * 1024 * 1024; // 5MB

// ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
if ($file['error'] !== UPLOAD_ERR_OK) {
    // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
    respond(['success' => false, 'message' => 'アップロードに失敗しました（エラーコード: ' . $file['error'] . '）'], 500);
}

// MIME を実ファイルから検証（Content-Type ヘッダは偽装可能なため）
$finfo = finfo_open(FILEINFO_MIME_TYPE);
$mime  = finfo_file($finfo, $file['tmp_name']);
finfo_close($finfo);

// ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
if (!in_array($mime, $allowed, true)) {
    // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
    respond(['success' => false, 'message' => 'JPEG / PNG / GIF / WebP のみ対応しています'], 400);
}
// ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
if ($file['size'] > $maxSize) {
    // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
    respond(['success' => false, 'message' => 'ファイルサイズは5MB以内にしてください'], 400);
}

// 保存先ディレクトリ（TABI/uploads/chat/）
// __DIR__ = .../TABI/api/Chat → 2つ上 = .../TABI
$uploadDir = dirname(dirname(__DIR__)) . '/uploads/chat/';
// ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
if (!is_dir($uploadDir)) {
    mkdir($uploadDir, 0755, true);
}

// 推測拡張子
$extMap = [
    'image/jpeg' => 'jpg',
    'image/png'  => 'png',
    'image/gif'  => 'gif',
    'image/webp' => 'webp',
];
$ext      = $extMap[$mime] ?? 'jpg';
$filename = date('Ymd_His') . '_' . bin2hex(random_bytes(6)) . '.' . $ext;
$savePath = $uploadDir . $filename;

// ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
if (!move_uploaded_file($file['tmp_name'], $savePath)) {
    // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
    respond(['success' => false, 'message' => 'ファイルの保存に失敗しました'], 500);
}

// 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
respond([
    'success'   => true,
    'image_url' => '/TABI/uploads/chat/' . $filename,
]);
