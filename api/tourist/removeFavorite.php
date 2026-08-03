<?php

/**
 * 観光スポットの取得とお気に入り登録・解除を扱う API です。
 *
 * 主な流れ:
 * 1. リクエストやセッションなど、処理に必要な情報を読み取る
 * 2. 入力値や権限を確認し、必要に応じてデータベースへ問い合わせる
 * 3. 処理結果を JSON などの形でフロントエンドへ返す
 *
 * 扱うデータ: アプリの設定値や、他のファイルから受け取る値を主に扱います。
 */

// セッションを開始し、ログイン中のユーザー情報をサーバー側で使えるようにします。
session_start();

// フロントエンドへ返すデータ形式や通信ルールを、HTTP ヘッダーとして伝えます。
header("Content-Type: application/json; charset=UTF-8");

// 共通設定や別ファイルの関数を読み込み、この API から使えるようにします。
require_once __DIR__ . "/../config/db.php";

/**
 * respond は、この API 内で何度も使う処理をまとめた関数です。
 * 引数として受け取った値をもとに、確認・取得・更新などの結果を返します。
 */
function respond(array $payload, int $status = 200): void
{
    http_response_code($status);
    // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

// ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
if ($_SERVER["REQUEST_METHOD"] !== "DELETE") {
    // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
    respond([
        "success" => false,
        "message" => "DELETEで送信してください。",
    ], 405);
}

// ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
if (!isset($_SESSION["user_id"])) {
    // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
    respond([
        "success" => false,
        "message" => "ログインしてください。",
    ], 401);
}

// フロントエンドから送られた JSON 文字列を、PHP で扱える配列に変換します。
$input = json_decode(file_get_contents("php://input"), true);
$touristSpotId = null;

// ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
if (is_array($input) && array_key_exists("tourist_spot_id", $input)) {
    $touristSpotId = $input["tourist_spot_id"];
} elseif (isset($_GET["tourist_spot_id"])) {
    $touristSpotId = $_GET["tourist_spot_id"];
}

// ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
if (is_string($touristSpotId)) {
    $touristSpotId = trim($touristSpotId);
}

// ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
if (
    $touristSpotId === null
    || (is_string($touristSpotId) && ($touristSpotId === "" || !ctype_digit($touristSpotId)))
    || (!is_int($touristSpotId) && !is_string($touristSpotId))
    || (int) $touristSpotId <= 0
) {
    // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
    respond([
        "success" => false,
        "message" => "観光地IDを正しく指定してください。",
    ], 400);
}

$userId = (int) $_SESSION["user_id"];
$touristSpotId = (int) $touristSpotId;

// データベース処理などでエラーが起きる可能性があるため、例外を受け取れる形で実行します。
try {
    // SQL を準備し、あとから値を安全に入れられる形にします。
    $favoriteStmt = $pdo->prepare("
        SELECT favorite_id
        FROM favorites
        WHERE user_id = :user_id
            AND tourist_spot_id = :tourist_spot_id
        LIMIT 1
    ");

    // 準備した SQL を実行し、データベースへの取得・登録・更新を行います。
    $favoriteStmt->execute([
        ":user_id" => $userId,
        ":tourist_spot_id" => $touristSpotId,
    ]);

    // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
    if (!$favoriteStmt->fetch(PDO::FETCH_ASSOC)) {
        // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
        respond([
            "success" => false,
            "message" => "お気に入りに登録されていません。",
        ], 404);
    }

    // SQL を準備し、あとから値を安全に入れられる形にします。
    $deleteStmt = $pdo->prepare("
        DELETE FROM favorites
        WHERE user_id = :user_id
            AND tourist_spot_id = :tourist_spot_id
    ");

    // 準備した SQL を実行し、データベースへの取得・登録・更新を行います。
    $deleteStmt->execute([
        ":user_id" => $userId,
        ":tourist_spot_id" => $touristSpotId,
    ]);

    // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
    respond([
        "success" => true,
        "message" => "お気に入りから削除しました。",
    ]);
// エラーが起きた場合は、詳細をログに残し、利用者には安全なメッセージを返します。
} catch (PDOException $error) {
    error_log($error->getMessage());

    // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
    respond([
        "success" => false,
        "message" => "お気に入り削除に失敗しました。",
    ], 500);
}
