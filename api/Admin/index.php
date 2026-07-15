<?php

// 管理画面向け API の入口です。
// 共通基盤を読み込んでから、URL パラメータと HTTP メソッドを元に処理を振り分けます。
require_once __DIR__ . "/includes/bootstrap.php";

// resource は users や notices のような対象種別、id は単体取得や更新対象を表します。
$resource = $_GET["resource"] ?? "";
$id = $_GET["id"] ?? null;
$method = $_SERVER["REQUEST_METHOD"];
// JSON リクエスト本文を配列に変換して、POST / PATCH の入力として使います。
$input = body();

try {
    // 実際の CRUD 処理は handler 側へ委譲します。
    handle_admin_request($pdo, $method, $resource, $id, $input);
} catch (Throwable $e) {
    // 途中で例外が発生した場合は、開いているトランザクションを巻き戻してからエラーを返します。
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
