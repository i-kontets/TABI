<?php

/**
 * 自分が投稿済みのレビューを削除するAPIです。
 *
 * 主な流れ:
 * 1. ログイン中ユーザーを確認し、JSONボディまたはURLパラメータから観光地IDを受け取る
 * 2. 「自分のレビュー」が存在することを確認する(他人のレビューは削除できない)
 * 3. reviews テーブルから該当行を削除し、結果をJSONで返す
 *
 * 扱うデータ: reviews テーブル(user_id と tourist_spot_id の組で自分のレビューを特定)。
 */

// セッションを開始し、ログイン情報(ユーザーID)を読み取れるようにします。
session_start();

// レスポンスがJSON形式であることをフロントエンドへ伝えます。
header("Content-Type: application/json; charset=UTF-8");

// DB接続($pdo)を読み込みます。
require_once __DIR__ . "/../config/db.php";

/**
 * 処理結果をJSONで出力し、そこで処理を終了(exit)する関数です。
 */
function respond(array $payload, int $status = 200): void
{
    http_response_code($status);
    // 日本語をそのまま出力できるようにエンコードします。
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

// 削除APIのため、DELETE以外は405エラーで拒否します。
if ($_SERVER["REQUEST_METHOD"] !== "DELETE") {
    respond([
        "success" => false,
        "message" => "DELETEで送信してください。"
    ], 405);
}

// 未ログインの場合は401エラーで終了します。
if (!isset($_SESSION["user_id"])) {
    respond([
        "success" => false,
        "message" => "ログインしてください。"
    ], 401);
}

// ログイン中ユーザーのIDをセッションから取得します(リクエストの値は信用しません)。
$userId = (int)$_SESSION["user_id"];

// JSON または クエリパラメータの両方に対応
// (DELETEリクエストはボディを持たないクライアントもあるため、2通りの渡し方を許可しています)
$input = json_decode(file_get_contents("php://input"), true);

$touristSpotId = 0;

// まずJSONボディを確認し、なければURLパラメータ(?tourist_spot_id=)を確認します。
if (is_array($input) && isset($input["tourist_spot_id"])) {
    $touristSpotId = (int)$input["tourist_spot_id"];
} elseif (isset($_GET["tourist_spot_id"])) {
    $touristSpotId = (int)$_GET["tourist_spot_id"];
}

// 観光地IDは1以上でなければなりません。
if ($touristSpotId <= 0) {
    respond([
        "success" => false,
        "message" => "観光地IDが不正です。"
    ], 400);
}

// データベース処理などでエラーが起きる可能性があるため、例外を受け取れる形で実行します。
try {

    // 自分のレビューが存在するか確認: user_id を条件に含めることで、他人のレビューは対象外になります。
    $stmt = $pdo->prepare("
        SELECT review_id
        FROM reviews
        WHERE user_id = :user_id
          AND tourist_spot_id = :tourist_spot_id
        LIMIT 1
    ");

    // SQLインジェクション対策として、値はプレースホルダ経由で渡します。
    $stmt->execute([
        ":user_id" => $userId,
        ":tourist_spot_id" => $touristSpotId,
    ]);

    // 自分のレビューが見つからなければ404を返します。
    if (!$stmt->fetch(PDO::FETCH_ASSOC)) {
        respond([
            "success" => false,
            "message" => "レビューが見つかりません。"
        ], 404);
    }

    // 削除: 自分のレビューだけを削除します。
    $stmt = $pdo->prepare("
        DELETE FROM reviews
        WHERE user_id = :user_id
          AND tourist_spot_id = :tourist_spot_id
    ");

    $stmt->execute([
        ":user_id" => $userId,
        ":tourist_spot_id" => $touristSpotId,
    ]);

    // 削除成功をフロントエンドへ伝えます。
    respond([
        "success" => true,
        "message" => "レビューを削除しました。"
    ]);

// エラーが起きた場合は、利用者には安全なメッセージを返します。
} catch (PDOException $error) {

    respond([
        "success" => false,
        "message" => "レビューの削除に失敗しました。"
    ], 500);
}
