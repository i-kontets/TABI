<?php

/**
 * 旅行先候補やアンケートの作成、取得、投票を扱う API です。
 *
 * 主な流れ:
 * 1. リクエストやセッションなど、処理に必要な情報を読み取る
 * 2. 入力値や権限を確認し、必要に応じてデータベースへ問い合わせる
 * 3. 処理結果を JSON などの形でフロントエンドへ返す
 *
 * 扱うデータ: アプリの設定値や、他のファイルから受け取る値を主に扱います。
 */

/**
 * HTTP レスポンスを JSON 形式で返す共通関数
 *
 * @param int $status HTTP ステータスコード（200, 400, 404, 500など）
 * @param array $body レスポンスボディ（連想配列）
 *
 * 処理：
 * 1. HTTP ステータスコードを設定
 * 2. 配列を JSON 形式に変換して出力（日本語も適切に処理）
 * 3. スクリプトを終了
 */
function respond(int $status, array $body): void
{
    // HTTP ステータスコード（200 OK、400 Bad Request、401 Unauthorized、404 Not Found、500 Internal Server Error など）を設定
    http_response_code($status);

    // $body配列を JSON に変換して出力
    // JSON_UNESCAPED_UNICODE フラグにより、日本語が \uXXXX のエスケープではなく、そのまま出力される
    echo json_encode($body, JSON_UNESCAPED_UNICODE);

    // スクリプト実行を終了
    exit;
}

/**
 * グループID に紐づいた旅行情報を取得する関数
 *
 * @param PDO $pdo データベース接続オブジェクト
 * @param int $groupId グループID
 * @return array 旅行情報の連想配列（trip_id, group_id, title, status）
 *
 * 処理：
 * 1. グループに属する最新の旅行を1件取得
 * 2. 旅行が見つからない場合は404エラーを返す
 * 3. 旅行情報を返す
 */
function findTrip(PDO $pdo, int $groupId): array
{
    // グループに属する旅行を取得するSQL クエリを準備
    // updated_at が新しい順、trip_id が新しい順でソートして、最新の旅行1件を取得
    $stmt = $pdo->prepare(
        "SELECT trip_id, group_id, title, status
         FROM trips
         WHERE group_id = :group_id
         ORDER BY updated_at DESC, trip_id DESC
         LIMIT 1"
    );

    // プレースホルダー :group_id に groupId をバインドして、クエリを実行
    $stmt->execute([":group_id" => $groupId]);

    // クエリ結果を連想配列として取得（見つからない場合は false を返す）
    $trip = $stmt->fetch(PDO::FETCH_ASSOC);

    // 旅行が見つからない場合
    if (!$trip) {
        // 404 Not Found エラーレスポンスを返す
        respond(404, [
            "success" => false,
            "message" => "対象グループの旅行が見つかりません",
        ]);
    }

    // 旅行情報を返す
    return $trip;
}

/**
 * セッションから user_id を取得する関数
 * ログインしていない場合は 401 Unauthorized エラーを返す
 *
 * @return int 現在のユーザーID
 *
 * 処理：
 * 1. セッションに user_id が存在するか確認
 * 2. 存在しない場合は401エラーを返す
 * 3. user_id をinteger型に変換して返す
 */
function requireUserId(): int
{
    // セッションに user_id が設定されているか確認
    if (!isset($_SESSION["user_id"])) {
        // ログインしていない場合、401 Unauthorized エラーレスポンスを返す
        respond(401, [
            "success" => false,
            "message" => "ログインが必要です",
        ]);
    }

    // セッションから user_id を integer 型に変換して返す
    return (int) $_SESSION["user_id"];
}
