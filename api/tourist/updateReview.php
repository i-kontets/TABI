<?php

/**
 * 自分が投稿済みのレビュー(星評価とコメント)を更新するAPIです。
 *
 * 主な流れ:
 * 1. ログイン中ユーザーを確認し、JSONで送られた観光地ID・評価・コメントを検証する
 * 2. 「自分のレビュー」が存在することを確認する(他人のレビューは更新できない)
 * 3. reviews テーブルの該当行を更新し、結果をJSONで返す
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

// 更新APIのため、PUT以外は405エラーで拒否します。
if ($_SERVER["REQUEST_METHOD"] !== "PUT") {
    respond([
        "success" => false,
        "message" => "PUTで送信してください。"
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

// リクエストボディのJSONを読み取り、連想配列に変換します。
$input = json_decode(file_get_contents("php://input"), true);

// 各入力値を取り出します。数値は int に変換し、コメントは前後の空白を取り除きます。
$touristSpotId = (int)($input["tourist_spot_id"] ?? 0);
$rating = (int)($input["rating"] ?? 0);
$comment = trim($input["comment"] ?? "");

// 観光地IDは1以上でなければなりません。
if ($touristSpotId <= 0) {
    respond([
        "success" => false,
        "message" => "観光地IDが不正です。"
    ], 400);
}

// 評価は1〜5の範囲でなければなりません。
if ($rating < 1 || $rating > 5) {
    respond([
        "success" => false,
        "message" => "評価は1〜5で入力してください。"
    ], 400);
}

// コメントの長さ上限を確認します(マルチバイト文字を考慮した文字数で判定)。
if (mb_strlen($comment) > 1000) {
    respond([
        "success" => false,
        "message" => "コメントは1000文字以内で入力してください。"
    ], 400);
}

// データベース処理などでエラーが起きる可能性があるため、例外を受け取れる形で実行します。
try {

    // 自分のレビュー存在確認: user_id を条件に含めることで、他人のレビューは対象外になります。
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

    // 更新: 評価とコメントを上書きし、更新日時を現在時刻にします。
    $stmt = $pdo->prepare("
        UPDATE reviews
        SET
            rating = :rating,
            comment = :comment,
            updated_at = CURRENT_TIMESTAMP
        WHERE
            user_id = :user_id
        AND tourist_spot_id = :tourist_spot_id
    ");

    $stmt->execute([
        ":rating" => $rating,
        ":comment" => $comment,
        ":user_id" => $userId,
        ":tourist_spot_id" => $touristSpotId,
    ]);

    // 更新成功をフロントエンドへ伝えます。
    respond([
        "success" => true,
        "message" => "レビューを更新しました。"
    ]);

// エラーが起きた場合は、利用者には安全なメッセージを返します。
} catch (PDOException $error) {

    respond([
        "success" => false,
        "message" => "レビューの更新に失敗しました。"
    ], 500);
}
