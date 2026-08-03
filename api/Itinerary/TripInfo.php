<?php

/**
 * 指定された旅行グループの基本情報を返すAPIです。
 *
 * 主な流れ:
 * 1. セッションからログイン状態を確認する
 * 2. リクエストJSONから group_id を受け取る
 * 3. trips テーブルを group_id で検索する
 * 4. 旅行タイトル・旅行期間をフロントエンドで使いやすい形にして返す
 *
 * 返却する trip の形:
 * {
 *   id: group_id,
 *   trip_id: trips.trip_id,
 *   name: trips.title,
 *   title: trips.title,
 *   start_date: trips.start_date,
 *   end_date: trips.end_date
 * }
 */

// ログイン中のユーザー情報を参照するため、セッションを開始します。
session_start();

// フロントエンドへJSONを返すAPIであることを明示します。
header("Content-Type: application/json; charset=UTF-8");

// データベース接続設定を読み込みます。ここで $pdo を使用できるようになります。
require_once __DIR__ . "/../config/db.php";

// 未ログインの場合は、旅行情報を返さず 401 を返します。
if (!isset($_SESSION["user_id"])) {
    http_response_code(401);
    echo json_encode([
        "success" => false,
        "message" => "Login required"
    ]);
    exit;
}

// フロントエンドから送られたJSONを連想配列として読み取ります。
$input = json_decode(file_get_contents("php://input"), true);
$groupId = $input["group_id"] ?? null;

// group_id が無い場合は、どの旅行グループか判定できないため 400 を返します。
if (!$groupId) {
    http_response_code(400);
    echo json_encode([
        "success" => false,
        "message" => "group_id is required"
    ]);
    exit;
}

try {
    // group_id に紐づく最新の旅行レコードを取得します。
    // 同じグループに複数の trips がある場合は、trip_id が一番大きいものを使います。
    $stmt = $pdo->prepare("
        SELECT
            trip_id,
            group_id,
            title,
            start_date,
            end_date
        FROM trips
        WHERE group_id = :group_id
        ORDER BY trip_id DESC
        LIMIT 1
    ");

    // プレースホルダーを使ってSQLインジェクションを防ぎます。
    $stmt->execute([
        ":group_id" => $groupId
    ]);

    $trip = $stmt->fetch(PDO::FETCH_ASSOC);

    // 対象 group_id の旅行レコードが無い場合です。
    if (!$trip) {
        echo json_encode([
            "success" => false,
            "message" => "trip not found"
        ]);
        exit;
    }

    // フロントエンドでは旅行タイトルを trip.name として扱うため、title と name の両方を返します。
    echo json_encode([
        "success" => true,
        "trip" => [
            "id" => (string) $trip["group_id"],
            "trip_id" => (int) $trip["trip_id"],
            "name" => $trip["title"],
            "title" => $trip["title"],
            "start_date" => $trip["start_date"],
            "end_date" => $trip["end_date"]
        ]
    ]);
} catch (Throwable $error) {
    // DBエラーなどが起きた場合は 500 を返します。
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => "database error",
        "error" => $error->getMessage()
    ]);
}
