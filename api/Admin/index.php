<?php

require_once __DIR__ . "/includes/bootstrap.php";

$resource = $_GET["resource"] ?? "";
$id = $_GET["id"] ?? null;
$method = $_SERVER["REQUEST_METHOD"];
$input = body();

try {
    handle_admin_request($pdo, $method, $resource, $id, $input);
} catch (Throwable $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    respond(["success" => false, "message" => "Admin API error.", "error" => $e->getMessage()], 500);
}
