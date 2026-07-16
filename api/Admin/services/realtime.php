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

// 共通設定や別ファイルの関数を読み込み、この API から使えるようにします。
require_once __DIR__ . "/system_errors.php";

/**
 * realtime_config は、この API 内で何度も使う処理をまとめた関数です。
 * 引数として受け取った値をもとに、確認・取得・更新などの結果を返します。
 */
function realtime_config(string $key, $default = null)
{
    static $realtimeConfig = null;

    // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
    if ($realtimeConfig === null) {
        $configPath = __DIR__ . "/../../config/realtime.php";
        $realtimeConfig = file_exists($configPath) ? require $configPath : [];
        // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
        if (!is_array($realtimeConfig)) {
            $realtimeConfig = [];
        }
    }

    return $realtimeConfig[$key] ?? $default;
}

/**
 * logRealtimeSystemError は、この API 内で何度も使う処理をまとめた関数です。
 * 引数として受け取った値をもとに、確認・取得・更新などの結果を返します。
 */
function logRealtimeSystemError(string $message, array $detail): void
{
    // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
    if (function_exists("logSystemError")) {
        logSystemError("websocket", "warning", $message, $detail);
    }
}

/**
 * sendRealtimeEvent は、この API 内で何度も使う処理をまとめた関数です。
 * 引数として受け取った値をもとに、確認・取得・更新などの結果を返します。
 */
function sendRealtimeEvent(string $room, string $event, array $data = [], bool $logFailure = true): array
{
    // WebSocketサーバーのemit用HTTP APIへ通知を送ります。PHPは直接ブラウザへ送るのではなく、このサーバーに配信を依頼します。
    $url = realtime_config("realtime_url", app_config("REALTIME_EMIT_URL", "https://ws.tabital.com/emit"));
    // WebSocket通知サーバーへ送る秘密の合言葉です。実際の値はコメント・画面・通常ログへ出してはいけません。
    $secret = realtime_config("realtime_secret", app_config("REALTIME_SECRET", ""));
    $result = [
        "attempted" => false,
        "ok" => false,
        "http_code" => 0,
        "curl_error" => "",
        "response" => "",
    ];

    // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
    if (!$secret) {
        error_log("Realtime event skipped: REALTIME_SECRET is not set.");
        $result["response"] = "REALTIME_SECRET is not set.";
        // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
        if ($logFailure) {
            logRealtimeSystemError("WebSocket通知設定が不足しています", [
                // roomは通知先の部屋です。admin:globalは管理画面全体、trip:{id}は特定旅行グループ、user:{id}は特定ユーザー向けです。
                "room" => $room,
                "event" => $event,
                "reason" => "REALTIME_SECRET is not set.",
            ]);
        }
        return $result;
    }

    // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
    $json = json_encode([
        "room" => $room,
        "event" => $event,
        "data" => $data,
    ], JSON_UNESCAPED_UNICODE);

    // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
    if ($json === false) {
        error_log("Realtime event failed: payload JSON encode error.");
        $result["response"] = "payload JSON encode error.";
        // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
        if ($logFailure) {
            logRealtimeSystemError("WebSocket通知ペイロードのJSON生成に失敗しました", [
                "room" => $room,
                "event" => $event,
                "json_error" => json_last_error_msg(),
            ]);
        }
        return $result;
    }

    $result["attempted"] = true;

    // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
    if (function_exists("curl_init")) {
        $ch = curl_init($url);
        // cURLが使える環境ではcURLで送ります。Authorizationヘッダーに秘密鍵を付け、通知サーバー側で正規の送信元か確認します。
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

        // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
        if ($body === false || $status < 200 || $status >= 300) {
            error_log("Realtime event failed: HTTP {$status} {$error}");
            // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
            if ($logFailure) {
                logRealtimeSystemError("WebSocket通知に失敗しました", [
                    "room" => $room,
                    "event" => $event,
                    "http_code" => $status,
                    "curl_error" => $error ?: "",
                    "response" => $result["response"],
                ]);
            }
            return $result;
        }

        $result["ok"] = true;
        return $result;
    }

    // cURLが使えない環境でも通知できるように、file_get_contents用のHTTP設定を作る予備ルートです。
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
    // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
    if (isset($http_response_header[0]) && preg_match("/\s(\d{3})\s/", $http_response_header[0], $matches)) {
        $status = (int) $matches[1];
    }

    $result["http_code"] = $status;
    $result["response"] = is_string($body) ? substr($body, 0, 500) : "";

    // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
    if ($body === false || $status < 200 || $status >= 300) {
        error_log("Realtime event failed: HTTP {$status}");
        // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
        if ($logFailure) {
            logRealtimeSystemError("WebSocket通知に失敗しました", [
                "room" => $room,
                "event" => $event,
                "http_code" => $status,
                "response" => $result["response"],
            ]);
        }
        return $result;
    }

    $result["ok"] = true;
    return $result;
}
