<?php

/**
 * 通知APIの入口(ルーター)となるファイルです。
 *
 * 主な流れ:
 * 1. URLの ?action= パラメータとHTTPメソッド(GET/PATCHなど)を読み取る
 * 2. 組み合わせに応じて List.php / UnreadCount.php などの処理ファイルへ振り分ける
 * 3. どれにも一致しない場合は 404 エラーをJSONで返す
 *
 * 扱うデータ: $_GET["action"](処理の種類)と $_SERVER["REQUEST_METHOD"](HTTPメソッド)。
 */

// URLの ?action= から実行したい処理名を取得します。指定がなければ "list"(一覧取得)とみなします。
$action = (string) ($_GET["action"] ?? "list");

// HTTPメソッド(GET / PATCH など)を取得します。取得できない場合は GET とみなします。
$method = $_SERVER["REQUEST_METHOD"] ?? "GET";

// action とメソッドの組み合わせで処理ファイルを振り分けます。
// require された先のファイルは処理の最後で exit するため、一致した時点でここより下は実行されません。
if ($action === "list" && $method === "GET") require __DIR__ . "/List.php";               // 通知一覧の取得
if ($action === "unread-count" && $method === "GET") require __DIR__ . "/UnreadCount.php"; // 未読件数の取得
if ($action === "mark-read" && $method === "PATCH") require __DIR__ . "/MarkRead.php";     // 1件を既読にする
if ($action === "read-all" && $method === "PATCH") require __DIR__ . "/MarkAllRead.php";   // 全件を既読にする

// ここまで到達した場合はどの処理にも一致しなかったということなので、404エラーを返します。
// notificationRespond を使うためにセッション開始・ヘッダー設定・共通関数の読み込みを行います。
session_start();
header("Content-Type: application/json; charset=UTF-8");
require_once __DIR__ . "/Common.php";
notificationRespond(["success" => false, "message" => "通知APIのURLまたはメソッドが正しくありません。"], 404);
