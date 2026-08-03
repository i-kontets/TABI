<?php

/**
 * 認証やアカウント登録、パスワード再設定に関係する API です。
 *
 * 主な流れ:
 * 1. リクエストやセッションなど、処理に必要な情報を読み取る
 * 2. 入力値や権限を確認し、必要に応じてデータベースへ問い合わせる
 * 3. 処理結果を JSON などの形でフロントエンドへ返す
 *
 * 扱うデータ: アプリの設定値や、他のファイルから受け取る値を主に扱います。
 */

// フロントエンドへ返すデータ形式や通信ルールを、HTTP ヘッダーとして伝えます。
header('Access-Control-Allow-Origin: http://localhost:5173');
// フロントエンドへ返すデータ形式や通信ルールを、HTTP ヘッダーとして伝えます。
header('Access-Control-Allow-Methods: GET, OPTIONS');
// フロントエンドへ返すデータ形式や通信ルールを、HTTP ヘッダーとして伝えます。
header('Access-Control-Allow-Headers: Content-Type');

// ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// フロントエンドへ返すデータ形式や通信ルールを、HTTP ヘッダーとして伝えます。
header('Content-Type: application/json; charset=UTF-8');

// 共通設定や別ファイルの関数を読み込み、この API から使えるようにします。
require_once __DIR__ . '/../config/db.php';

/**
 * json_response は、この API 内で何度も使う処理をまとめた関数です。
 * 引数として受け取った値をもとに、確認・取得・更新などの結果を返します。
 */
function json_response($success, $message, $data = [], $status = 200) {
    http_response_code($status);
    // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
    echo json_encode(array_merge([
        'success' => $success,
        'message' => $message,
    ], $data), JSON_UNESCAPED_UNICODE);
    exit;
}

// ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    json_response(false, 'GETメソッドで送信してください', [], 405);
}

$groupId = $_GET['group_id'] ?? $_GET['groupId'] ?? null;

// ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
if (!$groupId || !is_numeric($groupId)) {
    json_response(false, 'group_id が不正です', [], 400);
}

// データベース処理などでエラーが起きる可能性があるため、例外を受け取れる形で実行します。
try {
    // SQL を準備し、あとから値を安全に入れられる形にします。
    $stmt = $pdo->prepare(
        'SELECT album_id, trip_id, title
         FROM albums
         WHERE trip_id = :trip_id
         LIMIT 1'
    );

    // 準備した SQL を実行し、データベースへの取得・登録・更新を行います。
    $stmt->execute([
        ':trip_id' => (int)$groupId,
    ]);

    $album = $stmt->fetch(PDO::FETCH_ASSOC);

    // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
    if (!$album) {
        json_response(false, 'アルバムが見つかりません', [], 404);
    }

    json_response(true, 'アルバム取得成功', [
        'album' => [
            'album_id' => (int)$album['album_id'],
            'trip_id' => (int)$album['trip_id'],
            'title' => $album['title'],
        ],
    ]);
// エラーが起きた場合は、詳細をログに残し、利用者には安全なメッセージを返します。
} catch (PDOException $e) {
    json_response(false, 'アルバム取得に失敗しました', [
        'error' => $e->getMessage(),
    ], 500);
}