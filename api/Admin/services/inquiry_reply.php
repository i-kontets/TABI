<?php

/**
 * 管理 API から使う補助サービス処理をまとめます。
 *
 * 主な流れ:
 * 1. リクエストやセッションなど、処理に必要な情報を読み取る
 * 2. 入力値や権限を確認し、必要に応じてデータベースへ問い合わせる
 * 3. 処理結果を JSON などの形でフロントエンドへ返す
 *
 * 扱うデータ: アプリの設定値や、他のファイルから受け取る値を主に扱います。
 */

/**
 * post_json は、この API 内で何度も使う処理をまとめた関数です。
 * 引数として受け取った値をもとに、確認・取得・更新などの結果を返します。
 */
function post_json(string $url, array $payload): array
{
    // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
    $json = json_encode($payload, JSON_UNESCAPED_UNICODE);

    // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
    if (function_exists("curl_init")) {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST => true,
            CURLOPT_HTTPHEADER => ["Content-Type: application/json"],
            CURLOPT_POSTFIELDS => $json,
            CURLOPT_TIMEOUT => 15,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_MAXREDIRS => 5,
        ]);
        $body = curl_exec($ch);
        $error = curl_error($ch);
        $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
        if ($body === false) {
            throw new RuntimeException("GAS送信に失敗しました: " . $error);
        }

        return ["status" => $status, "body" => $body];
    }

    $context = stream_context_create([
        "http" => [
            "method" => "POST",
            "header" => "Content-Type: application/json\r\n",
            "content" => $json,
            "timeout" => 15,
            "ignore_errors" => true,
        ],
    ]);
    $body = file_get_contents($url, false, $context);
    $status = 0;
    // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
    if (isset($http_response_header[0]) && preg_match("/\s(\d{3})\s/", $http_response_header[0], $matches)) {
        $status = (int) $matches[1];
    }

    // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
    if ($body === false) {
        throw new RuntimeException("GAS送信に失敗しました。");
    }

    return ["status" => $status, "body" => $body];
}

// お問い合わせ返信を GAS 経由で送るための専用処理です。
// PHP 側では送信に必要な情報をまとめ、メール送信の実処理は GAS に任せます。
/**
 * 外部サービスまたは別APIへデータを送信し、その結果を呼び出し元へ返します。
 *
 * @param array $inquiry 呼び出し元から渡される処理対象の値です。
 * @param string $message 呼び出し元から渡される処理対象の値です。
 * @return array 宣言された型に合わせて処理結果を返します。
 * エラー時はHTTPステータス、ログ、または共通レスポンスで呼び出し元へ伝えます。
 */
function send_inquiry_reply_via_gas(array $inquiry, string $message): array
{
    $gasUrl = app_config("GAS_INQUIRY_REPLY_URL", "");
    $gasToken = app_config("GAS_INQUIRY_REPLY_TOKEN", "");

    // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
    if (!$gasUrl) {
        throw new RuntimeException("GAS_INQUIRY_REPLY_URLが設定されていません。GASをWebアプリとしてデプロイし、/exec のURLを設定してください。");
    }

    $response = post_json($gasUrl, [
        "token" => $gasToken,
        "inquiryId" => $inquiry["public_id"],
        "to" => $inquiry["email"],
        "userName" => $inquiry["user_name"],
        "title" => $inquiry["title"],
        "category" => $inquiry["category"],
        "originalBody" => $inquiry["body"],
        "replyBody" => $message,
    ]);
    // フロントエンドから送られた JSON 文字列を、PHP で扱える配列に変換します。
    $decoded = json_decode($response["body"], true);

    // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
    if ($response["status"] < 200 || $response["status"] >= 300) {
        throw new RuntimeException("GASがHTTP " . $response["status"] . "を返しました。");
    }
    // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
    if (is_array($decoded) && isset($decoded["ok"]) && !$decoded["ok"]) {
        throw new RuntimeException($decoded["message"] ?? "GAS側で送信に失敗しました。");
    }

    return $response;
}

// ユーザー一覧を取得します。
