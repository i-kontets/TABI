<?php

function post_json(string $url, array $payload): array
{
    $json = json_encode($payload, JSON_UNESCAPED_UNICODE);

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
    if (isset($http_response_header[0]) && preg_match("/\s(\d{3})\s/", $http_response_header[0], $matches)) {
        $status = (int) $matches[1];
    }

    if ($body === false) {
        throw new RuntimeException("GAS送信に失敗しました。");
    }

    return ["status" => $status, "body" => $body];
}

// お問い合わせ返信を GAS 経由で送るための専用処理です。
// PHP 側では送信に必要な情報をまとめ、メール送信の実処理は GAS に任せます。
function send_inquiry_reply_via_gas(array $inquiry, string $message): array
{
    $gasUrl = app_config("GAS_INQUIRY_REPLY_URL", "");
    $gasToken = app_config("GAS_INQUIRY_REPLY_TOKEN", "");

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
    $decoded = json_decode($response["body"], true);

    if ($response["status"] < 200 || $response["status"] >= 300) {
        throw new RuntimeException("GASがHTTP " . $response["status"] . "を返しました。");
    }
    if (is_array($decoded) && isset($decoded["ok"]) && !$decoded["ok"]) {
        throw new RuntimeException($decoded["message"] ?? "GAS側で送信に失敗しました。");
    }

    return $response;
}

// ユーザー一覧を取得します。
