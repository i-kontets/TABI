<?php

require_once __DIR__ . "/../Admin/includes/config.php";

function emailChangeNow(): DateTimeImmutable
{
    return new DateTimeImmutable("now", new DateTimeZone("Asia/Tokyo"));
}

function maskEmailForDisplay(string $email): string
{
    [$local, $domain] = array_pad(explode("@", $email, 2), 2, "");
    if ($domain === "") {
        return $email;
    }
    $head = mb_substr($local, 0, min(3, max(1, mb_strlen($local))));
    return $head . "***@" . $domain;
}

function postEmailChangeJsonToGas(string $url, array $payload): array
{
    $json = json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    if ($json === false) {
        throw new RuntimeException("GAS送信用JSONの作成に失敗しました。");
    }

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

        if ($body === false || $error !== "") {
            throw new RuntimeException("GASへの送信に失敗しました。HTTP {$status}");
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
        throw new RuntimeException("GASへの送信に失敗しました。HTTP {$status}");
    }

    return ["status" => $status, "body" => $body];
}

function sendEmailChangeMail(array $payload): void
{
    $gasUrl = app_config("GAS_EMAIL_CHANGE_URL", app_config("GAS_PASSWORD_RESET_URL", app_config("GAS_INQUIRY_REPLY_URL", "")));
    $gasToken = app_config(
        "GAS_EMAIL_CHANGE_TOKEN",
        app_config("GAS_PASSWORD_RESET_TOKEN", app_config("GAS_SHARED_TOKEN", app_config("GAS_INQUIRY_REPLY_TOKEN", "")))
    );

    if ($gasUrl === "") {
        throw new RuntimeException("GASのURLが設定されていません。");
    }

    // 認証トークンと認証コードはPHPからGASへだけ渡し、ブラウザには返しません。
    $response = postEmailChangeJsonToGas($gasUrl, ["token" => $gasToken] + $payload);
    $decoded = json_decode($response["body"], true);

    if ($response["status"] < 200 || $response["status"] >= 300) {
        throw new RuntimeException("GASがメール送信を受け付けませんでした。HTTP " . $response["status"]);
    }
    if (!is_array($decoded) || ($decoded["ok"] ?? false) !== true) {
        throw new RuntimeException("GAS側でメール送信に失敗しました。");
    }
}
