<?php

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

try {
    // 実際のCRUD処理は handler 側へ委譲し、この入口ファイルは振り分けに集中します。
    handle_admin_request($pdo, $method, $resource, $id, $input);
} catch (Throwable $e) {
    // 途中で例外が発生した場合は、開いているトランザクションを巻き戻してからエラーを返します。
    // これにより、一部のテーブルだけ更新された中途半端な状態を避けます。
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    if (function_exists("logSystemError")) {
        logSystemError("php", "error", "Admin API error.", [
            "resource" => $resource,
            "method" => $method,
            "error" => $e->getMessage(),
        ]);
    }
    respond(["success" => false, "message" => "Admin API error.", "error" => $e->getMessage()], 500);
}
