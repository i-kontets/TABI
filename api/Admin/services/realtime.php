<?php

// cURL が使える環境では cURL を優先し、使えない場合は file_get_contents に切り替えます。
function realtime_config(string $key, $default = null)
{
    static $realtimeConfig = null;

    if ($realtimeConfig === null) {
        $configPath = __DIR__ . "/../../config/realtime.php";
        $realtimeConfig = file_exists($configPath) ? require $configPath : [];
        if (!is_array($realtimeConfig)) {
            $realtimeConfig = [];
        }
    }

    return $realtimeConfig[$key] ?? $default;
}

function sendRealtimeEvent(string $room, string $event, array $data = []): array
{
    $url = realtime_config("realtime_url", app_config("REALTIME_EMIT_URL", "https://ws.tabital.com/emit"));
    $secret = realtime_config("realtime_secret", app_config("REALTIME_SECRET", ""));
    $result = [
        "attempted" => false,
        "ok" => false,
        "http_code" => 0,
        "curl_error" => "",
        "response" => "",
    ];

    if (!$secret) {
        error_log("Realtime event skipped: REALTIME_SECRET is not set.");
        $result["response"] = "REALTIME_SECRET is not set.";
        return $result;
    }

    $json = json_encode([
        "room" => $room,
        "event" => $event,
        "data" => $data,
    ], JSON_UNESCAPED_UNICODE);

    if ($json === false) {
        error_log("Realtime event failed: payload JSON encode error.");
        $result["response"] = "payload JSON encode error.";
        return $result;
    }

    $result["attempted"] = true;

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

        $result["http_code"] = $status;
        $result["curl_error"] = $error ?: "";
        $result["response"] = is_string($body) ? substr($body, 0, 500) : "";

        if ($body === false || $status < 200 || $status >= 300) {
            error_log("Realtime event failed: HTTP {$status} {$error}");
            return $result;
        }

        $result["ok"] = true;
        return $result;
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

    $result["http_code"] = $status;
    $result["response"] = is_string($body) ? substr($body, 0, 500) : "";

    if ($body === false || $status < 200 || $status >= 300) {
        error_log("Realtime event failed: HTTP {$status}");
        return $result;
    }

    $result["ok"] = true;
    return $result;
}
