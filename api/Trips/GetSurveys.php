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

// セッションを開始して、ログイン状態や回答済み判定に使う
session_start();

// JSONレスポンスを返すAPIとして宣言する
header("Content-Type: application/json; charset=UTF-8");
// DB接続設定を読み込む
require_once __DIR__ . "/../config/db.php";
// 共通処理を読み込む
require_once __DIR__ . "/CandidateCommon.php";

// このエンドポイントはGETのみ受け付ける
if ($_SERVER["REQUEST_METHOD"] !== "GET") {
    // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
    respond(405, ["success" => false, "message" => "許可されていないメソッドです"]);
}

// データベース処理などでエラーが起きる可能性があるため、例外を受け取れる形で実行します。
try {
    // group_id を取得し、未指定なら1を使う
    $groupId = filter_input(INPUT_GET, "group_id", FILTER_VALIDATE_INT) ?: 1;
    // 対象グループの最新旅行を取得する
    $trip = findTrip($pdo, $groupId);
    // 現在のユーザーID。未ログインでも一覧取得はできるため0を入れる
    $userId = isset($_SESSION["user_id"]) ? (int) $_SESSION["user_id"] : 0;

    // アンケート本体を取得する
    $surveyStmt = $pdo->prepare(
        "SELECT survey_id, title, candidate_type, deadline_at, created_at,
                CASE WHEN deadline_at IS NOT NULL AND deadline_at < NOW() THEN 1 ELSE 0 END AS is_expired
         FROM trip_surveys
         WHERE trip_id = :trip_id
         ORDER BY created_at DESC, survey_id DESC"
    );
    // 準備した SQL を実行し、データベースへの取得・登録・更新を行います。
    $surveyStmt->execute([":trip_id" => $trip["trip_id"]]);
    // 取得したアンケート一覧を配列で受け取る
    $surveys = $surveyStmt->fetchAll(PDO::FETCH_ASSOC);

    // 各アンケートに属する選択肢と投票数を取得するSQLを用意する
    $optionStmt = $pdo->prepare(
        "SELECT
            survey_option.option_id,
            survey_option.survey_id,
            survey_option.candidate_id,
            survey_option.option_text,
            survey_option.sort_order,
            COUNT(DISTINCT vote.user_id) AS vote_count,
            MAX(CASE WHEN vote.user_id = :user_id THEN 1 ELSE 0 END) AS has_voted
         FROM trip_survey_options survey_option
         LEFT JOIN trip_survey_votes vote ON vote.option_id = survey_option.option_id
         WHERE survey_option.survey_id = :survey_id
         GROUP BY survey_option.option_id, survey_option.survey_id, survey_option.candidate_id,
                  survey_option.option_text, survey_option.sort_order
         ORDER BY survey_option.sort_order, survey_option.option_id"
    );

    // アンケートごとに選択肢をぶら下げる
    foreach ($surveys as &$survey) {
        // 型を整える
        $survey["survey_id"] = (int) $survey["survey_id"];
        $survey["is_expired"] = (bool) $survey["is_expired"];
        // 現在のアンケートに紐づく選択肢を取得する
        $optionStmt->execute([
            ":user_id" => $userId,
            ":survey_id" => $survey["survey_id"],
        ]);
        // 取得した選択肢も型を整えて格納する
        $survey["options"] = array_map(static function (array $option): array {
            $option["option_id"] = (int) $option["option_id"];
            $option["candidate_id"] = $option["candidate_id"] !== null
                ? (int) $option["candidate_id"]
                : null;
            $option["vote_count"] = (int) $option["vote_count"];
            $option["has_voted"] = (bool) $option["has_voted"];
            return $option;
        }, $optionStmt->fetchAll(PDO::FETCH_ASSOC));
    }
    unset($survey);

    // アンケート一覧をまとめて返す
    respond(200, ["success" => true, "surveys" => $surveys]);
// エラーが起きた場合は、詳細をログに残し、利用者には安全なメッセージを返します。
} catch (PDOException $error) {
    // DB処理に失敗したら500を返す
    respond(500, ["success" => false, "message" => "アンケートを取得できませんでした"]);
}
