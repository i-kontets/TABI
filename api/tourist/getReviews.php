<?php

/**
 * 指定した観光地のレビュー一覧・件数・平均評価を返すAPIです。
 *
 * 主な流れ:
 * 1. URLの ?tourist_spot_id= から対象の観光地IDを受け取り検証する
 * 2. 観光地の存在確認後、レビューの件数・平均評価・一覧をDBから取得する
 * 3. 投稿者名を含むレビュー一覧をJSONで返す
 *
 * 扱うデータ: reviews テーブルと users テーブル(投稿者名の取得のため結合)。
 * このAPIは閲覧専用のため、ログインしていなくても呼び出せます。
 */

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

// 取得専用APIのため、GET以外は405エラーで拒否します。
// エラー時もフロントエンドが画面を組み立てやすいよう、空の一覧を含めて返します。
if ($_SERVER["REQUEST_METHOD"] !== "GET") {
    respond([
        "success" => false,
        "message" => "GETで送信してください。",
        "review_count" => 0,
        "average_rating" => null,
        "reviews" => [],
    ], 405);
}

// URLパラメータから観光地IDを取得します(前後の空白は取り除きます)。
$touristSpotId = isset($_GET["tourist_spot_id"])
    ? trim($_GET["tourist_spot_id"])
    : "";

// ID検証: 空でなく、数字だけで構成され、1以上であることを確認します。
if ($touristSpotId === "" || !ctype_digit($touristSpotId) || (int)$touristSpotId <= 0) {
    respond([
        "success" => false,
        "message" => "観光地IDを正しく指定してください。",
        "review_count" => 0,
        "average_rating" => null,
        "reviews" => [],
    ], 400);
}

// データベース処理などでエラーが起きる可能性があるため、例外を受け取れる形で実行します。
try {

    // 観光地存在確認: 存在しないIDには404を返します。
    $stmt = $pdo->prepare("
        SELECT tourist_spot_id
        FROM tourist_spots
        WHERE tourist_spot_id = :tourist_spot_id
        LIMIT 1
    ");

    // SQLインジェクション対策として、値はプレースホルダ経由で渡します。
    $stmt->execute([
        ":tourist_spot_id" => (int)$touristSpotId,
    ]);

    if (!$stmt->fetch(PDO::FETCH_ASSOC)) {
        respond([
            "success" => false,
            "message" => "指定された観光地が見つかりません。",
            "review_count" => 0,
            "average_rating" => null,
            "reviews" => [],
        ], 404);
    }

    // 件数・平均評価取得: COUNT と AVG をSQL側でまとめて計算します。
    $stmt = $pdo->prepare("
        SELECT
            COUNT(*) AS review_count,
            AVG(rating) AS average_rating
        FROM reviews
        WHERE tourist_spot_id = :tourist_spot_id
    ");

    $stmt->execute([
        ":tourist_spot_id" => (int)$touristSpotId,
    ]);

    $summary = $stmt->fetch(PDO::FETCH_ASSOC);

    // レビュー一覧取得: 投稿者名を表示するため users テーブルと結合し、新しい順に並べます。
    $stmt = $pdo->prepare("
        SELECT
            r.review_id,
            r.user_id,
            u.name AS user_name,
            r.rating,
            r.comment,
            r.created_at,
            r.updated_at
        FROM reviews r
        INNER JOIN users u
            ON r.user_id = u.user_id
        WHERE r.tourist_spot_id = :tourist_spot_id
        ORDER BY r.created_at DESC, r.review_id DESC
    ");

    $stmt->execute([
        ":tourist_spot_id" => (int)$touristSpotId,
    ]);

    // 各行の型を整えます(IDや評価は数値へ変換)。
    $reviews = array_map(static function (array $review): array {
        return [
            "review_id" => (int)$review["review_id"],
            "user_id" => (int)$review["user_id"],
            "user_name" => $review["user_name"],
            "rating" => (int)$review["rating"],
            "comment" => $review["comment"],
            "created_at" => $review["created_at"],
            "updated_at" => $review["updated_at"],
        ];
    }, $stmt->fetchAll(PDO::FETCH_ASSOC));

    // 件数・平均評価(小数第1位に丸め)・一覧をまとめて返します。
    // レビューが0件の場合、平均評価は null になります。
    respond([
        "success" => true,
        "message" => "",
        "review_count" => (int)$summary["review_count"],
        "average_rating" => $summary["average_rating"] !== null
            ? round((float)$summary["average_rating"], 1)
            : null,
        "reviews" => $reviews,
    ]);

// エラーが起きた場合は、利用者には安全なメッセージを返します。
} catch (PDOException $error) {

    respond([
        "success" => false,
        "message" => "レビューの取得に失敗しました。",
        "review_count" => 0,
        "average_rating" => null,
        "reviews" => [],
    ], 500);
}
