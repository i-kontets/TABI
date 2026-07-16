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

// セッション開始。作成者をログインユーザーとして記録するために必要
session_start();

// APIの出力はJSONで統一する
header("Content-Type: application/json; charset=UTF-8");
// DB接続設定を読み込む
require_once __DIR__ . "/../config/db.php";
// 共通処理を読み込む
require_once __DIR__ . "/CandidateCommon.php";

// このエンドポイントはPOSTのみ受け付ける
if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
    respond(405, ["success" => false, "message" => "許可されていないメソッドです"]);
}

// データベース処理などでエラーが起きる可能性があるため、例外を受け取れる形で実行します。
try {
    // JSON本文を読み込んで、作成リクエストの内容を取得する
    $input = json_decode(file_get_contents("php://input"), true) ?: [];
    // どのグループに対するアンケートかを取得する
    $groupId = filter_var($input["group_id"] ?? 1, FILTER_VALIDATE_INT) ?: 1;
    // アンケートの表示タイトル
    $title = trim($input["title"] ?? "");
    // 対象カテゴリ（destination / spot / hotel / restaurant）
    $candidateType = $input["candidate_type"] ?? "";
    // 選択対象の候補ID群。重複や不正値を除去して配列化する
    $candidateIds = array_values(array_unique(array_filter(
        array_map("intval", $input["candidate_ids"] ?? [])
    )));
    // 回答期限
    $deadlineAt = trim($input["deadline_at"] ?? "");
    // 作成者としてログインユーザーIDを取得する
    $userId = requireUserId();
    // グループに紐づく最新の旅行を特定する
    $trip = findTrip($pdo, $groupId);

    // タイトル未入力またはカテゴリが不正なら400を返す
    if ($title === "" || !in_array($candidateType, ["destination", "spot", "hotel", "restaurant"], true)) {
        // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
        respond(400, ["success" => false, "message" => "タイトルとカテゴリを入力してください"]);
    }

    // 候補は最低2件必要
    if (count($candidateIds) < 2) {
        // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
        respond(400, ["success" => false, "message" => "候補を2件以上選択してください"]);
    }

    // datetime-local の値を DateTime に変換する
    $deadline = DateTime::createFromFormat("Y-m-d\TH:i", $deadlineAt);
    // 現在時刻より未来でない場合はエラーにする
    if (!$deadline || $deadline <= new DateTime()) {
        // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
        respond(400, ["success" => false, "message" => "現在より後の回答期限を指定してください"]);
    }

    // IN句で使うプレースホルダーを候補数ぶん作る
    $placeholders = implode(",", array_fill(0, count($candidateIds), "?"));
    // 指定候補が本当に対象旅行・対象カテゴリに属しているか確認する
    $candidateStmt = $pdo->prepare(
        "SELECT candidate_id, candidate_name
         FROM trip_candidates
         WHERE trip_id = ?
           AND candidate_type = ?
           AND candidate_id IN ($placeholders)
           AND (status IS NULL OR status <> 'rejected')
         ORDER BY candidate_id"
    );
    // 準備した SQL を実行し、データベースへの取得・登録・更新を行います。
    $candidateStmt->execute(array_merge(
        [(string) $trip["trip_id"], $candidateType],
        $candidateIds
    ));
    // DB上で一致した候補一覧を受け取る
    $selectedCandidates = $candidateStmt->fetchAll(PDO::FETCH_ASSOC);

    // 件数が一致しなければ、無効な候補が含まれていたと判断する
    if (count($selectedCandidates) !== count($candidateIds)) {
        // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
        respond(400, ["success" => false, "message" => "選択した候補が正しくありません"]);
    }

    // アンケート本体と選択肢の登録をまとめて行うため、トランザクションを開始する
    $pdo->beginTransaction();

    // trip_surveys にアンケート本体を登録する
    $surveyStmt = $pdo->prepare(
        "INSERT INTO trip_surveys
            (trip_id, title, candidate_type, created_by, deadline_at, created_at)
         VALUES
            (:trip_id, :title, :candidate_type, :created_by, :deadline_at, NOW())"
    );
    // 準備した SQL を実行し、データベースへの取得・登録・更新を行います。
    $surveyStmt->execute([
        ":trip_id" => $trip["trip_id"],
        ":title" => $title,
        ":candidate_type" => $candidateType,
        ":created_by" => $userId,
        ":deadline_at" => $deadline->format("Y-m-d H:i:s"),
    ]);
    // 追加したアンケートのIDを取得する
    $surveyId = (int) $pdo->lastInsertId();

    // trip_survey_options に選択肢を1件ずつ登録する
    $optionStmt = $pdo->prepare(
        "INSERT INTO trip_survey_options
            (survey_id, option_text, candidate_id, sort_order)
         VALUES
            (:survey_id, :option_text, :candidate_id, :sort_order)"
    );
    // 複数のデータを1件ずつ取り出し、同じ確認や変換を繰り返します。
    foreach ($selectedCandidates as $index => $candidate) {
        // 準備した SQL を実行し、データベースへの取得・登録・更新を行います。
        $optionStmt->execute([
            ":survey_id" => $surveyId,
            ":option_text" => $candidate["candidate_name"],
            ":candidate_id" => $candidate["candidate_id"],
            ":sort_order" => $index + 1,
        ]);
    }

    // 全件登録できたので確定する
    $pdo->commit();
    // 作成完了を返す。新規IDも返して、呼び出し側で追跡できるようにする
    respond(201, ["success" => true, "survey_id" => $surveyId]);
// エラーが起きた場合は、詳細をログに残し、利用者には安全なメッセージを返します。
} catch (PDOException $error) {
    // 登録途中で失敗したらロールバックして中途半端なデータを残さない
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    // 作成失敗を返す
    respond(500, ["success" => false, "message" => "アンケートを作成できませんでした"]);
}
