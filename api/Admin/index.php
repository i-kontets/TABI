<?php

/**
 * 管理画面からの API リクエストを受け取り、種類に応じて処理へ振り分けます。
 *
 * 主な流れ:
 * 1. リクエストやセッションなど、処理に必要な情報を読み取る
 * 2. 入力値や権限を確認し、必要に応じてデータベースへ問い合わせる
 * 3. 処理結果を JSON などの形でフロントエンドへ返す
 *
 * 扱うデータ: アプリの設定値や、他のファイルから受け取る値を主に扱います。
 */

/**
 * 管理画面向けAPIの入口ファイルです。
 *
 * フロントエンドは /api/Admin/index.php?resource=users のように resource を指定して呼び出します。
 * このファイルは共通設定を読み込み、HTTPメソッドとresourceを見て、
 * 実際の取得・作成・更新・削除処理へ振り分けます。
 */
require_once __DIR__ . "/includes/bootstrap.php";

// resource は users や notices のような対象種別、id は単体取得や更新対象を表します。
$resource = $_GET["resource"] ?? "";
$id = $_GET["id"] ?? null;
$method = $_SERVER["REQUEST_METHOD"];
// JSONリクエスト本文を配列に変換して、POST / PATCH の入力として使います。
$input = body();

// データベース処理などでエラーが起きる可能性があるため、例外を受け取れる形で実行します。
try {
    // 実際のCRUD処理は handler 側へ委譲し、この入口ファイルは振り分けに集中します。
    handle_admin_request($pdo, $method, $resource, $id, $input);
// エラーが起きた場合は、詳細をログに残し、利用者には安全なメッセージを返します。
} catch (Throwable $e) {
    // 途中で例外が発生した場合は、開いているトランザクションを巻き戻してからエラーを返します。
    // これにより、一部のテーブルだけ更新された中途半端な状態を避けます。
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
    if (function_exists("logSystemError")) {
        logSystemError("php", "error", "Admin API error.", [
            "resource" => $resource,
            "method" => $method,
            "error" => $e->getMessage(),
        ]);
    }
    // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
    respond(["success" => false, "message" => "Admin API error.", "error" => $e->getMessage()], 500);
}
