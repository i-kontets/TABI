<?php

/**
 * プロフィール、通知設定、問い合わせ、通報、メール変更など利用者本人の操作を扱う API です。
 *
 * 主な流れ:
 * 1. リクエストやセッションなど、処理に必要な情報を読み取る
 * 2. 入力値や権限を確認し、必要に応じてデータベースへ問い合わせる
 * 3. 処理結果を JSON などの形でフロントエンドへ返す
 *
 * 扱うデータ: アプリの設定値や、他のファイルから受け取る値を主に扱います。
 */

// 共通設定や別ファイルの関数を読み込み、この API から使えるようにします。
require_once __DIR__ . "/../Admin/includes/config.php";

/**
 * emailChangeNow は、この API 内で何度も使う処理をまとめた関数です。
 * 引数として受け取った値をもとに、確認・取得・更新などの結果を返します。
 */
function emailChangeNow(): DateTimeImmutable
{
    return new DateTimeImmutable("now", new DateTimeZone("Asia/Tokyo"));
}

/**
 * maskEmailForDisplay は、この API 内で何度も使う処理をまとめた関数です。
 * 引数として受け取った値をもとに、確認・取得・更新などの結果を返します。
 */
function maskEmailForDisplay(string $email): string
{
    [$local, $domain] = array_pad(explode("@", $email, 2), 2, "");
    // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
    if ($domain === "") {
        return $email;
    }
    $head = mb_substr($local, 0, min(3, max(1, mb_strlen($local))));
    return $head . "***@" . $domain;
}

/**
 * postEmailChangeJsonToGas は、この API 内で何度も使う処理をまとめた関数です。
 * 引数として受け取った値をもとに、確認・取得・更新などの結果を返します。
 */
function postEmailChangeJsonToGas(string $url, array $payload): array
{
    // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
    $json = json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
    if ($json === false) {
        throw new RuntimeException("GAS送信用JSONの作成に失敗しました。");
    }

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
    // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
    if (isset($http_response_header[0]) && preg_match("/\s(\d{3})\s/", $http_response_header[0], $matches)) {
        $status = (int) $matches[1];
    }
    // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
    if ($body === false) {
        throw new RuntimeException("GASへの送信に失敗しました。HTTP {$status}");
    }

    return ["status" => $status, "body" => $body];
}

/**
 * sendEmailChangeMail は、この API 内で何度も使う処理をまとめた関数です。
 * 引数として受け取った値をもとに、確認・取得・更新などの結果を返します。
 */
function sendEmailChangeMail(array $payload): void
{
    $gasUrl = app_config("GAS_EMAIL_CHANGE_URL", app_config("GAS_PASSWORD_RESET_URL", app_config("GAS_INQUIRY_REPLY_URL", "")));
    $gasToken = app_config(
        "GAS_EMAIL_CHANGE_TOKEN",
        app_config("GAS_PASSWORD_RESET_TOKEN", app_config("GAS_SHARED_TOKEN", app_config("GAS_INQUIRY_REPLY_TOKEN", "")))
    );

    // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
    if ($gasUrl === "") {
        throw new RuntimeException("GASのURLが設定されていません。");
    }

    // 認証トークンと認証コードはPHPからGASへだけ渡し、ブラウザには返しません。
    $response = postEmailChangeJsonToGas($gasUrl, ["token" => $gasToken] + $payload);
    // フロントエンドから送られた JSON 文字列を、PHP で扱える配列に変換します。
    $decoded = json_decode($response["body"], true);

    // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
    if ($response["status"] < 200 || $response["status"] >= 300) {
        throw new RuntimeException("GASがメール送信を受け付けませんでした。HTTP " . $response["status"]);
    }
    // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
    if (!is_array($decoded) || ($decoded["ok"] ?? false) !== true) {
        throw new RuntimeException("GAS側でメール送信に失敗しました。");
    }
}
