<?php

/**
 * 管理 API の GET/POST/PATCH/DELETE ごとの処理を担当します。
 *
 * 主な流れ:
 * 1. リクエストやセッションなど、処理に必要な情報を読み取る
 * 2. 入力値や権限を確認し、必要に応じてデータベースへ問い合わせる
 * 3. 処理結果を JSON などの形でフロントエンドへ返す
 *
 * 扱うデータ: アプリの設定値や、他のファイルから受け取る値を主に扱います。
 */

/**
 * handle_admin_request は、この API 内で何度も使う処理をまとめた関数です。
 * 引数として受け取った値をもとに、確認・取得・更新などの結果を返します。
 */
function handle_admin_request(PDO $pdo, string $method, string $resource, $id, array $input): void
{
    // HTTP メソッドごとに、呼び出す処理を 1 つだけ選びます。
    if ($method === "GET") {
        handle_admin_get($pdo, $resource, $id);
    }

    // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
    if ($method === "POST") {
        handle_admin_post($pdo, $resource, $id, $input);
    }

    // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
    if ($method === "PATCH") {
        handle_admin_patch($pdo, $resource, $id, $input);
    }

    // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
    if ($method === "DELETE") {
        handle_admin_delete($pdo, $resource, $id);
    }

    // どの分岐にも入らなかった場合は、想定外のメソッドとして 405 を返します。
    respond(["success" => false, "message" => "Unsupported method."], 405);
}
