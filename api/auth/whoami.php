<?php

// セッション開始：ログイン済みユーザーの識別子を取得するために必要
session_start();

// レスポンスは常にJSONで返す
header("Content-Type: application/json; charset=UTF-8");

// データベース接続設定を読み込む（$pdo を使用）
require_once __DIR__ . "/../config/db.php";
require_once __DIR__ . "/../Groups/S3Common.php";

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

// セッションにユーザーIDが無ければ未ログイン扱いで401を返す
if (!isset($_SESSION["user_id"])) {
    http_response_code(401);
    echo json_encode([
        "success" => false,
        "message" => "ログインしていません"
    ]);
    exit;
}

// セッションから現在のユーザーIDを取得
$userId = $_SESSION["user_id"];

try {
    // ユーザー情報をDBから取得するクエリ
    // 返却するカラム: user_id, name, email, icon_url, language_code, status
    $sql = " SELECT user_id, name, email, icon_url, language_code, status FROM users WHERE user_id = :user_id LIMIT 1 ";

    // プリペアドステートメントでクエリ実行（SQLインジェクション対策）
    $stmt = $pdo->prepare($sql);
    $stmt->bindValue(":user_id", $userId, PDO::PARAM_INT);
    $stmt->execute();

    // 取得結果を連想配列で受け取る
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    // ユーザーが見つからなければ404を返す
    if (!$user) {
        http_response_code(404);
        echo json_encode([
            "success" => false,
            "message" => "ユーザーが見つかりません"
        ]);
        exit;
    }

    // 正常時はユーザー情報を含むJSONを返す
    $user["icon_key"] = $user["icon_url"];
    $user["icon_url"] = resolveUserIconUrl($user["icon_url"]);

    echo json_encode([
        "success" => true,
        "user" => $user
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

    exit;

} catch (PDOException $error) {
    // DB接続やクエリ実行時のエラーは500で応答
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => "ユーザー情報の取得に失敗しました"
    ]);
    exit;
}
?>