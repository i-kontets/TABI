<?php

/**
 * 観光地へのレビュー(星評価とコメント)を新規投稿するAPIです。
 *
 * 主な流れ:
 * 1. ログイン中ユーザーを確認し、JSONで送られた観光地ID・評価・コメントを検証する
 * 2. 観光地の存在と「まだレビューしていないこと」を確認する
 * 3. reviews テーブルへ1件登録し、結果をJSONで返す
 *
 * 扱うデータ: reviews テーブル(1ユーザー×1観光地につき1レビュー)。
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

// 投稿(書き込み)APIのため、POST以外は405エラーで拒否します。
if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    respond([
        "success" => false,
        "message" => "POSTで送信してください。"
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
$userId = (int) $_SESSION["user_id"];

// リクエストボディのJSONを読み取り、連想配列に変換します。
$input = json_decode(file_get_contents("php://input"), true);

// 各入力値を取り出します。コメントは前後の空白を取り除きます。
$touristSpotId = $input["tourist_spot_id"] ?? null;
$rating = $input["rating"] ?? null;
$comment = trim($input["comment"] ?? "");

// 入力値の検証: 観光地IDと評価は数値で、評価は1〜5の範囲でなければなりません。
if (
    !is_numeric($touristSpotId) ||
    !is_numeric($rating) ||
    $rating < 1 ||
    $rating > 5
) {
    respond([
        "success" => false,
        "message" => "入力内容が正しくありません。"
    ], 400);
}

// データベース処理などでエラーが起きる可能性があるため、例外を受け取れる形で実行します。
try {

    // 観光地存在確認: 存在しない観光地へのレビューを防ぎます。
    $stmt = $pdo->prepare("
        SELECT tourist_spot_id
        FROM tourist_spots
        WHERE tourist_spot_id = :tourist_spot_id
        LIMIT 1
    ");

    // SQLインジェクション対策として、値はプレースホルダ経由で渡します。
    $stmt->execute([
        ":tourist_spot_id" => $touristSpotId
    ]);

    // 1件も取れなければ、その観光地は存在しません。
    if (!$stmt->fetch()) {
        respond([
            "success" => false,
            "message" => "観光地が存在しません。"
        ], 404);
    }

    // 既にレビュー済みか確認: 同じ観光地への二重投稿を防ぎます(1人1レビュー)。
    $stmt = $pdo->prepare("
        SELECT review_id
        FROM reviews
        WHERE user_id = :user_id
          AND tourist_spot_id = :tourist_spot_id
        LIMIT 1
    ");

    $stmt->execute([
        ":user_id" => $userId,
        ":tourist_spot_id" => $touristSpotId
    ]);

    // 既存レビューが見つかった場合は409(競合)エラーを返します。
    if ($stmt->fetch()) {
        respond([
            "success" => false,
            "message" => "既にレビュー済みです。"
        ], 409);
    }

    // 登録: 検証済みの値で reviews テーブルへ1件INSERTします。
    $stmt = $pdo->prepare("
        INSERT INTO reviews
        (
            user_id,
            tourist_spot_id,
            rating,
            comment
        )
        VALUES
        (
            :user_id,
            :tourist_spot_id,
            :rating,
            :comment
        )
    ");

    // コメントが空の場合は空文字ではなく NULL として保存します。
    $stmt->execute([
        ":user_id" => $userId,
        ":tourist_spot_id" => $touristSpotId,
        ":rating" => (int)$rating,
        ":comment" => $comment === "" ? null : $comment
    ]);

    // 登録成功をフロントエンドへ伝えます。
    respond([
        "success" => true,
        "message" => "レビューを投稿しました。"
    ]);

// エラーが起きた場合は、詳細をログに残し、利用者には安全なメッセージを返します。
} catch (PDOException $e) {

    // エラーの詳細はサーバーのログにだけ記録します(利用者には見せません)。
    error_log($e->getMessage());

    respond([
        "success" => false,
        "message" => "レビュー投稿に失敗しました。"
    ], 500);
}
