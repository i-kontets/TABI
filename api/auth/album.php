<?php

/**
 * 認証やアカウント登録、パスワード再設定に関係する API です。
 *
 * 主な流れ:
 * 1. リクエストやセッションなど、処理に必要な情報を読み取る
 * 2. 入力値や権限を確認し、必要に応じてデータベースへ問い合わせる
 * 3. 処理結果を JSON などの形でフロントエンドへ返す
 *
 * 扱うデータ: アプリの設定値や、他のファイルから受け取る値を主に扱います。
 */

// セッション開始 - ユーザーのセッション管理を初期化
session_start();

// JSONレスポンスの設定
header("Content-Type: application/json; charset=UTF-8");

// データベース接続設定を読み込む
require_once __DIR__ . "/../config/db.php";

// ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
if (!isset($_SESSION["user_id"])) {
    http_response_code(401);
    // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
    echo json_encode([
        "success" => false,
        "message" => "ログインしてください"
    ]);
    exit;
}

$action = $_GET["action"] ?? "";

// ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
if($action === "list"){
    // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
    if($_SERVER["REQUEST_METHOD"] !== "GET"){
        http_response_code(405);
        // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
        echo json_encode([
        "success" => false,
        "message" => "GETにしてください"
        ]);
        exit;
    }

    // データベース処理などでエラーが起きる可能性があるため、例外を受け取れる形で実行します。
    try{
        $sql = ""
    }
}

// ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
if($action === "add"){

}

// ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
if($action === "delete")
