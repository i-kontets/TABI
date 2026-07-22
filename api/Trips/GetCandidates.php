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

// セッション開始：ユーザーのログイン状態などを管理するため
session_start();

// レスポンスのコンテンツタイプをJSON形式、文字エンコーディングをUTF-8に指定
header("Content-Type: application/json; charset=UTF-8");

// データベース接続設定をインポート
require_once __DIR__ . "/../config/db.php";

// 候補の共通処理関数をインポート（respond関数やfindTrip関数など）
require_once __DIR__ . "/CandidateCommon.php";

// リクエストメソッドの検証：このエンドポイントはGETリクエストのみを受け付ける
if ($_SERVER["REQUEST_METHOD"] !== "GET") {
    // GETメソッド以外の場合は405（Method Not Allowed）エラーを返す
    respond(405, [
        "success" => false,
        "message" => "許可されていないメソッドです",
    ]);
}

// データベース処理などでエラーが起きる可能性があるため、例外を受け取れる形で実行します。
try {
    // リクエストパラメータから group_id を取得（デフォルト値は1）
    // FILTER_VALIDATE_INT でintegerのバリデーションを実施
    $groupId = filter_input(INPUT_GET, "group_id", FILTER_VALIDATE_INT) ?: 1;

    // グループIDから対応する旅行情報を取得
    // 最新の旅行1件を取得（update順、作成順でソート）
    $trip = findTrip($pdo, $groupId);

    // セッションから user_id を取得（ログイン中のユーザーID）
    // ログインしていない場合は 0 をデフォルト値とする（ログインなしでも候補一覧は取得可能）
    $userId = isset($_SESSION["user_id"]) ? (int) $_SESSION["user_id"] : 0;

    // データベースから候補一覧を取得するクエリを実行
    $stmt = $pdo->prepare(
        "SELECT
            candidate.candidate_id,
            candidate.candidate_type,
            candidate.candidate_name,
            candidate.description,
            candidate.img_url,
            candidate.status,
            COUNT(DISTINCT vote.user_id) AS vote_count,
            MAX(CASE WHEN vote.user_id = :user_id THEN 1 ELSE 0 END) AS has_voted
         FROM trip_candidates candidate
         LEFT JOIN trip_candidate_votes vote
            ON vote.candidate_id = candidate.candidate_id
            AND vote.vote_type = 'like'
         WHERE candidate.trip_id = :trip_id
            AND (candidate.status IS NULL OR candidate.status <> 'rejected')
         GROUP BY
            candidate.candidate_id,
            candidate.candidate_type,
            candidate.candidate_name,
            candidate.description,
            candidate.img_url,
            candidate.status,
            candidate.created_at
         ORDER BY candidate.candidate_type, candidate.created_at DESC, candidate.candidate_id DESC"
    );
    // 準備した SQL を実行し、データベースへの取得・登録・更新を行います。
    $stmt->execute([
        ":user_id" => $userId,
        ":trip_id" => (string) $trip["trip_id"],
    ]);

    // 取得した候補データを配列に変換し、データ型を適切に変換（文字列 → int, bool）
    $candidates = array_map(static function (array $candidate): array {
        // candidate_id を数値型に変換
        $candidate["candidate_id"] = (int) $candidate["candidate_id"];
        // vote_count（投票数）を数値型に変換
        $candidate["vote_count"] = (int) $candidate["vote_count"];
        // has_voted（現在のユーザーが投票したか）をブール型に変換
        $candidate["has_voted"] = (bool) $candidate["has_voted"];
        return $candidate;
    }, $stmt->fetchAll(PDO::FETCH_ASSOC));

    // 成功レスポンスを返す：旅行情報と候補一覧を含む
    respond(200, [
        "success" => true,
        "trip" => $trip,
        "candidates" => $candidates,
    ]);
// エラーが起きた場合は、詳細をログに残し、利用者には安全なメッセージを返します。
} catch (PDOException $error) {
    // データベースエラー発生時の処理：500エラーを返す
    respond(500, [
        "success" => false,
        "message" => "候補データの取得に失敗しました",
    ]);
}
