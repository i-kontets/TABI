<?php

// cURL が使える環境では cURL を優先し、使えない場合は file_get_contents に切り替えます。
function sendRealtimeEvent(string $room, string $event, array $data = []): bool
{
    $url = app_config("REALTIME_EMIT_URL", "https://ws.tabital.com/emit");
    $secret = app_config("REALTIME_SECRET", "");

    if (!$secret) {
        error_log("Realtime event skipped: REALTIME_SECRET is not set.");
        return false;
    }

    $json = json_encode([
        "room" => $room,
        "event" => $event,
        "data" => $data,
    ], JSON_UNESCAPED_UNICODE);

    if ($json === false) {
        error_log("Realtime event failed: payload JSON encode error.");
        return false;
    }

    if (function_exists("curl_init")) {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST => true,
            CURLOPT_HTTPHEADER => [
                "Content-Type: application/json",
                "Authorization: Bearer " . $secret,
            ],
            CURLOPT_POSTFIELDS => $json,
            CURLOPT_TIMEOUT => 3,
            CURLOPT_CONNECTTIMEOUT => 2,
        ]);

        $body = curl_exec($ch);
        $error = curl_error($ch);
        $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($body === false || $status < 200 || $status >= 300) {
            error_log("Realtime event failed: HTTP {$status} {$error}");
            return false;
        }

        return true;
    }

    $context = stream_context_create([
        "http" => [
            "method" => "POST",
            "header" => "Content-Type: application/json\r\nAuthorization: Bearer {$secret}\r\n",
            "content" => $json,
            "timeout" => 3,
            "ignore_errors" => true,
        ],
    ]);

    $body = file_get_contents($url, false, $context);
    $status = 0;
    if (isset($http_response_header[0]) && preg_match("/\s(\d{3})\s/", $http_response_header[0], $matches)) {
        $status = (int) $matches[1];
    }

    if ($body === false || $status < 200 || $status >= 300) {
        error_log("Realtime event failed: HTTP {$status}");
        return false;
    }

    return true;
}
