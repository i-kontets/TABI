<?php

function handle_admin_request(PDO $pdo, string $method, string $resource, $id, array $input): void
{
    // HTTP メソッドごとに、呼び出す処理を 1 つだけ選びます。
    if ($method === "GET") {
        handle_admin_get($pdo, $resource, $id);
    }

    if ($method === "POST") {
        handle_admin_post($pdo, $resource, $id, $input);
    }

    if ($method === "PATCH") {
        handle_admin_patch($pdo, $resource, $id, $input);
    }

    if ($method === "DELETE") {
        handle_admin_delete($pdo, $resource, $id);
    }

    // どの分岐にも入らなかった場合は、想定外のメソッドとして 405 を返します。
    respond(["success" => false, "message" => "Unsupported method."], 405);
}
