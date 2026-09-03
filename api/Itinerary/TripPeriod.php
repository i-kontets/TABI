<?php

/**
 * 指定された旅行グループの旅行期間を返すAPIです。
 *
 * 主な流れ:
 * 1. リクエストJSONから group_id を受け取る
 * 2. trips テーブルを group_id で検索する
 * 3. start_date と end_date を JSON で返す
 *
 * 返却するデータ:
 * {
 *   success: true,
 *   start_date: trips.start_date,
 *   end_date: trips.end_date
 * }
 */

// セッションを開始します。現状このAPI内では user_id を直接使っていませんが、
// 他の認証系APIと同じ前提で呼び出せるようにしています。
session_start();

// フロントエンドへJSONを返すAPIであることを明示します。
header("Content-Type: application/json");

// データベース接続設定を読み込みます。ここで $pdo を使用できるようになります。
require_once __DIR__ . "/../config/db.php";

// フロントエンドから送られたJSONを連想配列として読み取ります。
$data = json_decode(file_get_contents("php://input"), true);
$group_id = $data["group_id"] ?? null;

// group_id が無い場合は、どの旅行グループか判定できないためエラーを返します。
if (!$group_id) {
  echo json_encode([
    "success" => false,
    "message" => "group_id is required"
  ]);
  exit;
}

try {
  // trips テーブルから、指定された group_id に紐づく表示対象の旅行期間を取得します。
  // Home や TripInfo と同じ優先順で取得し、複数tripがある場合でも表示のズレを防ぎます。
  $stmt = $pdo->prepare("
    SELECT start_date, end_date
    FROM trips
    WHERE group_id = ?
    ORDER BY (start_date IS NULL) ASC, start_date DESC, trip_id DESC
    LIMIT 1
  ");

  // プレースホルダーを使って group_id を安全に渡します。
  $stmt->execute([$group_id]);

  $trip = $stmt->fetch(PDO::FETCH_ASSOC);

  if ($trip) {
    // 旅行期間が見つかった場合は、開始日と終了日を返します。
    echo json_encode([
      "success" => true,
      "start_date" => $trip["start_date"],
      "end_date" => $trip["end_date"]
    ]);
  } else {
    // 対象 group_id の旅行レコードが無い場合です。
    echo json_encode([
      "success" => false,
      "message" => "trip not found"
    ]);
  }
} catch (PDOException $e) {
  // DBエラーなどが起きた場合は、フロントエンドが判定できる形で返します。
  echo json_encode([
    "success" => false,
    "message" => "database error",
    "error" => $e->getMessage()
  ]);
}
