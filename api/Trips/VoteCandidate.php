<?php
// セッション開始：ユーザーのログイン状態などを管理するため
session_start();

// レスポンスのコンテンツタイプをJSON形式、文字エンコーディングをUTF-8に指定
header("Content-Type: application/json; charset=UTF-8");

// データベース接続設定をインポート
require_once __DIR__ . "/../config/db.php";

// 候補の共通処理関数をインポート（respond関数やrequireUserId関数など）
require_once __DIR__ . "/CandidateCommon.php";

// リクエストメソッドの検証：このエンドポイントはPOSTリクエストのみを受け付ける
if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    // POSTメソッド以外の場合は405（Method Not Allowed）エラーを返す
    respond(405, [
        "success" => false,
        "message" => "許可されていないメソッドです",
    ]);
}

try {
    // リクエストボディ（JSON形式）を配列に変換
    $input = json_decode(file_get_contents("php://input"), true) ?: [];
    
    // リクエストから group_id を取得（デフォルト値は1）
    // FILTER_VALIDATE_INT でintegerのバリデーションを実施
    $groupId = filter_var($input["group_id"] ?? 1, FILTER_VALIDATE_INT) ?: 1;
    
    // リクエストから candidate_id を取得
    // FILTER_VALIDATE_INT でintegerのバリデーションを実施
    $candidateId = filter_var($input["candidate_id"] ?? null, FILTER_VALIDATE_INT);
    
    // セッションから user_id を取得（ログイン中のユーザーID）
    // ログインしていない場合は requireUserId() で401エラーを返す
    $userId = requireUserId();
    
    // グループIDから対応する旅行情報を取得
    // 最新の旅行1件を取得（update順、作成順でソート）
    $trip = findTrip($pdo, $groupId);

    // candidate_id が正しく取得されたかの検証
    if (!$candidateId) {
        // 不正な candidate_id の場合は400エラーを返す
        respond(400, [
            "success" => false,
            "message" => "候補が正しくありません",
        ]);
    }

    // 候補が存在し、かつその旅行に紐づいているかの確認
    $candidateStmt = $pdo->prepare(
        "SELECT candidate_id, candidate_type
         FROM trip_candidates
         WHERE candidate_id = :candidate_id
            AND trip_id = :trip_id
            AND (status IS NULL OR status <> 'rejected')
         LIMIT 1"
    );
    $candidateStmt->execute([
        ":candidate_id" => $candidateId,
        ":trip_id" => (string) $trip["trip_id"],
    ]);
    $candidate = $candidateStmt->fetch(PDO::FETCH_ASSOC);

    // 候補が見つからない場合は404エラーを返す
    if (!$candidate) {
        respond(404, [
            "success" => false,
            "message" => "候補が見つかりません",
        ]);
    }

    // トランザクション開始：複数の操作を一括処理するため、一貫性を保証する
    $pdo->beginTransaction();

    // 既存の投票を削除：同じ候補タイプ（例：場所、日付など）に対する同じユーザーの過去の投票を削除
    // これにより、ユーザーは同一カテゴリーで1つの候補にのみ投票できるようになる
    $deleteStmt = $pdo->prepare(
        "DELETE vote
         FROM trip_candidate_votes vote
         INNER JOIN trip_candidates candidate
            ON candidate.candidate_id = vote.candidate_id
         WHERE vote.user_id = :user_id
            AND candidate.trip_id = :trip_id
            AND candidate.candidate_type = :candidate_type"
    );
    $deleteStmt->execute([
        ":user_id" => $userId,
        ":trip_id" => (string) $trip["trip_id"],
        ":candidate_type" => $candidate["candidate_type"],
    ]);

    // 新しい投票を挿入：現在のユーザーが選択した候補に投票を記録
    $insertStmt = $pdo->prepare(
        "INSERT INTO trip_candidate_votes
            (candidate_id, user_id, vote_type, created_at)
         VALUES
            (:candidate_id, :user_id, 'like', NOW())"
    );
    $insertStmt->execute([
        ":candidate_id" => $candidateId,
        ":user_id" => $userId,
    ]);

    // トランザクション確定：削除と挿入の操作がデータベースに確定される
    $pdo->commit();
    
    // 成功レスポンスを返す
    respond(200, ["success" => true]);
} catch (PDOException $error) {
    // エラー発生時の処理：トランザクション中のエラーをロールバック
    // トランザクションが開始されていて、コミットされていない場合
    if (isset($pdo) && $pdo->inTransaction()) {
        // 開始したトランザクションをロールバック：すべての変更を破棄する
        // これにより、データベースの一貫性を保つ（部分的な更新を防ぐ）
        $pdo->rollBack();
    }

    // エラーレスポンスを返す：500（Internal Server Error）
    respond(500, [
        "success" => false,
        "message" => "投票処理に失敗しました",
    ]);
}
