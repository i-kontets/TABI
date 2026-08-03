<?php

/**
 * ログイン中ユーザーの未読通知の件数を返すAPIです。
 *
 * 主な流れ:
 * 1. セッションからログインユーザーを特定する
 * 2. データベースで未読(is_read = 0)の通知件数を数える
 * 3. 件数とバッジ表示用の文字列("99+" など)をJSONで返す
 *
 * 扱うデータ: セッションのユーザーID、notification_recipients テーブルの未読件数。
 */

// セッションを開始し、ログイン情報(ユーザーID)を読み取れるようにします。
session_start();

// レスポンスがJSON形式であることをフロントエンドへ伝えます。
header("Content-Type: application/json; charset=UTF-8");

// DB接続($pdo)と通知API共通の関数群を読み込みます。
require_once __DIR__ . "/../config/db.php";
require_once __DIR__ . "/Common.php";

// GET以外のメソッドで呼ばれた場合はここでエラー終了します。
notificationRequireMethod("GET");

// ログインしていない場合は401エラーで終了し、ログイン済みならユーザーIDを取得します。
$userId = notificationRequireLoginUserId();

// セッションのロックを早めに解放し、同じユーザーの他のリクエストを待たせないようにします。
session_write_close();

// データベース処理などでエラーが起きる可能性があるため、例外を受け取れる形で実行します。
try {
    // 未読通知の件数をDBから取得します(期限切れ通知は除外されます)。
    $unreadCount = notificationUnreadCount($pdo, $userId);

    // 件数と、バッジ用の表示文字列(100件以上は "99+" になる)をJSONで返します。
    notificationRespond(["success" => true, "data" => ["unreadCount" => $unreadCount, "badgeText" => notificationBadgeText($unreadCount)]]);
} catch (Throwable $error) {
    // 失敗時は詳細を出さず、安全なメッセージだけを500エラーで返します。
    notificationRespond(["success" => false, "message" => "未読件数の取得に失敗しました。"], 500);
}
