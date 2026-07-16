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

// セッションを開始して、ログイン中ユーザーの情報を参照できるようにする
session_start();

// このAPIはJSONを返すので、レスポンス形式を明示する
header("Content-Type: application/json; charset=UTF-8");
// DB接続設定を読み込む
require_once __DIR__ . "/../config/db.php";
// 共通処理（レスポンス返却、ログイン確認、旅行取得）を読み込む
require_once __DIR__ . "/CandidateCommon.php";

// このエンドポイントはPOSTのみ受け付ける
if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
    respond(405, ["success" => false, "message" => "許可されていないメソッドです"]);
}

// データベース処理などでエラーが起きる可能性があるため、例外を受け取れる形で実行します。
try {
    // JSON本文を連想配列に変換する。壊れていた場合は空配列にする
    $input = json_decode(file_get_contents("php://input"), true) ?: [];
    // group_id はどのグループの旅行に対する回答かを示す
    $groupId = filter_var($input["group_id"] ?? 1, FILTER_VALIDATE_INT) ?: 1;
    // survey_id は回答対象のアンケートID
    $surveyId = filter_var($input["survey_id"] ?? null, FILTER_VALIDATE_INT);
    // option_id は選ばれた選択肢ID
    $optionId = filter_var($input["option_id"] ?? null, FILTER_VALIDATE_INT);
    // セッションからログインユーザーIDを取得。未ログインなら401を返す
    $userId = requireUserId();
    // group_id から対象の旅行を特定する
    $trip = findTrip($pdo, $groupId);

    // 送信された option_id が、その旅行・アンケートに属する有効な選択肢か確認する
    $optionStmt = $pdo->prepare(
        "SELECT survey_option.option_id
         FROM trip_survey_options survey_option
         INNER JOIN trip_surveys survey ON survey.survey_id = survey_option.survey_id
         WHERE survey.survey_id = :survey_id
           AND survey.trip_id = :trip_id
           AND survey_option.option_id = :option_id
           AND (survey.deadline_at IS NULL OR survey.deadline_at >= NOW())
         LIMIT 1"
    );
    // 準備した SQL を実行し、データベースへの取得・登録・更新を行います。
    $optionStmt->execute([
        ":survey_id" => $surveyId,
        ":trip_id" => $trip["trip_id"],
        ":option_id" => $optionId,
    ]);

    // 選択肢が見つからない場合は、期限切れか不正なIDとして扱う
    if (!$optionStmt->fetch()) {
        // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
        respond(400, ["success" => false, "message" => "回答期限切れ、または選択肢が正しくありません"]);
    }

    // 1つのアンケートに対して、同一ユーザーの既存回答を置き換えるためにトランザクションを開始する
    $pdo->beginTransaction();
    // 既存回答を削除してから、新しい回答を登録する
    $deleteStmt = $pdo->prepare(
        "DELETE FROM trip_survey_votes
         WHERE survey_id = :survey_id AND user_id = :user_id"
    );
    // 準備した SQL を実行し、データベースへの取得・登録・更新を行います。
    $deleteStmt->execute([":survey_id" => $surveyId, ":user_id" => $userId]);

    // 新しい回答を記録する
    $insertStmt = $pdo->prepare(
        "INSERT INTO trip_survey_votes
            (survey_id, option_id, user_id, voted_at)
         VALUES
            (:survey_id, :option_id, :user_id, NOW())"
    );
    // 準備した SQL を実行し、データベースへの取得・登録・更新を行います。
    $insertStmt->execute([
        ":survey_id" => $surveyId,
        ":option_id" => $optionId,
        ":user_id" => $userId,
    ]);

    // ここまでの削除・追加を確定する
    $pdo->commit();

    // 正常終了をJSONで返す
    respond(200, ["success" => true]);
// エラーが起きた場合は、詳細をログに残し、利用者には安全なメッセージを返します。
} catch (PDOException $error) {
    // 途中で失敗した場合は、登録済みの変更を元に戻す
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    // DBエラーとして500を返す
    respond(500, ["success" => false, "message" => "回答を登録できませんでした"]);
}
