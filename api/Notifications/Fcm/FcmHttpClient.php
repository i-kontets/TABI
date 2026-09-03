<?php


/**
 * FCM HTTP APIへリクエストを送信し、レスポンスを扱う通信処理ファイルです。
 *
 * 使用画面・機能: FCMプッシュ通知送信、端末トークン管理
 * 呼び出し元: 現在のコード内では直接のfetch呼び出しを確認できません。
 * URL: /api/Notifications/Fcm/FcmHttpClient.php
 * HTTPメソッド: コード内でHTTPメソッドの明示判定なし
 * 入力: HTTPヘッダー
 * 使用DB: このファイル内ではSQLを直接実行していません。
 * 認証情報や秘密鍵などの実値はコメントに残さず、処理の目的だけを説明します。
 */

declare(strict_types=1);

/**
 * FCMのAPIサーバーへ実際にHTTPリクエストを送るクラスです。
 *
 * 主な流れ:
 * 1. メッセージ配列をJSONに変換し、cURLでFCMエンドポイントへPOSTする
 * 2. HTTPステータスコードとレスポンス内容から成功/失敗を判定する
 * 3. 「再送すべきか」「トークンが無効か」を判定した結果配列を返す
 *
 * 扱うデータ: FCM APIへのリクエスト/レスポンス、アクセストークン(ログには出さない)。
 */
final class FcmHttpClient
{
    /**
     * 1件のメッセージをFCMへ送信し、結果を配列で返します。
     *
     * @param string $endpoint    FCM APIの送信先URL
     * @param string $accessToken Google認証で得たアクセストークン
     * @param array  $message     送信するメッセージ(tokenやnotificationを含む)
     */
    public function send(string $endpoint, string $accessToken, array $message): array
    {
        // FCM v1 APIの仕様に合わせて {"message": {...}} の形でJSON化します。
        $payload = json_encode(['message' => $message], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        if ($payload === false) {
            throw new InvalidArgumentException('FCM message payload could not be encoded as JSON.');
        }

        // cURL(PHPのHTTP通信ライブラリ)を初期化します。
        $curl = curl_init($endpoint);
        if ($curl === false) {
            throw new RuntimeException('Could not initialize cURL.');
        }

        // 送信オプションをまとめて設定します。
        curl_setopt_array($curl, [
            CURLOPT_POST => true,                  // POSTメソッドで送信
            CURLOPT_POSTFIELDS => $payload,        // 送信するJSON本文
            CURLOPT_RETURNTRANSFER => true,        // レスポンスを文字列として受け取る
            CURLOPT_CONNECTTIMEOUT => 5,           // 接続待ちは最大5秒
            CURLOPT_TIMEOUT => 15,                 // 全体の待ち時間は最大15秒
            CURLOPT_SSL_VERIFYPEER => true,        // SSL証明書を検証する(なりすまし防止)
            CURLOPT_SSL_VERIFYHOST => 2,           // ホスト名も検証する
            CURLOPT_HTTPHEADER => [
                'Authorization: Bearer ' . $accessToken,          // 認証トークン
                'Content-Type: application/json; charset=utf-8',  // JSON送信の宣言
            ],
        ]);

        // リクエストを実行し、レスポンス本文・エラー・HTTPステータスを取得します。
        $body = curl_exec($curl);
        $curlError = curl_error($curl);
        $httpStatus = (int) curl_getinfo($curl, CURLINFO_RESPONSE_CODE);
        curl_close($curl);

        // 通信自体が失敗した場合(タイムアウト、DNS解決失敗など)は再送可能なエラーとして返します。
        if ($body === false) {
            return [
                'success' => false,
                'httpStatus' => 0,
                'status' => 'CURL_ERROR',
                'retryable' => true,      // ネットワーク起因なので再送すれば成功する可能性あり
                'invalidToken' => false,
                'summary' => self::sanitizeSummary($curlError ?: 'cURL request failed.'),
            ];
        }

        // レスポンス本文をJSONとして解析します。
        $decoded = json_decode((string) $body, true);

        // 2xx系のステータスなら送信成功です。
        if ($httpStatus >= 200 && $httpStatus < 300) {
            return [
                'success' => true,
                'httpStatus' => $httpStatus,
                'status' => 'SENT',
                'retryable' => false,
                'invalidToken' => false,
                // name にはFCMが発行したメッセージIDが入ります(ログ用)。
                'name' => isset($decoded['name']) ? self::sanitizeSummary((string) $decoded['name']) : null,
            ];
        }

        // 失敗時: レスポンスからエラー情報を取り出します。
        $error = is_array($decoded) && isset($decoded['error']) && is_array($decoded['error'])
            ? $decoded['error']
            : [];
        $status = isset($error['status']) ? (string) $error['status'] : 'FCM_ERROR';
        $detailCode = self::extractFcmErrorCode($error);
        // UNREGISTERED は「トークンがもう使えない(アプリ削除など)」を意味し、端末の無効化につながります。
        $invalidToken = $status === 'UNREGISTERED' || $detailCode === 'UNREGISTERED';
        // 429(リクエスト過多)や500/503(サーバー側の一時障害)は時間をおけば成功する可能性があります。
        $retryable = in_array($httpStatus, [429, 500, 503], true);
        $summary = isset($error['message']) ? (string) $error['message'] : 'FCM request failed.';

        return [
            'success' => false,
            'httpStatus' => $httpStatus,
            'status' => $detailCode ?: $status,
            'retryable' => $retryable,
            'invalidToken' => $invalidToken,
            'summary' => self::sanitizeSummary($summary),
        ];
    }

    /**
     * FCMのエラーレスポンスの details 配列から、詳細エラーコード(UNREGISTERED等)を取り出します。
     * 見つからなければ null を返します。
     */
    private static function extractFcmErrorCode(array $error): ?string
    {
        $details = $error['details'] ?? [];
        if (!is_array($details)) {
            return null;
        }

        // details は複数入ることがあるため、errorCode を持つ最初の要素を探します。
        foreach ($details as $detail) {
            if (is_array($detail) && isset($detail['errorCode'])) {
                return (string) $detail['errorCode'];
            }
        }

        return null;
    }

    /**
     * ログやレスポンスに載せるメッセージから秘密情報を隠します(マスク処理)。
     * アクセストークンや長い英数字列(トークンの可能性がある)を [masked] に置き換えます。
     */
    public static function sanitizeSummary(string $message): string
    {
        // "Bearer xxxxx" 形式のトークンをマスクします。
        $message = preg_replace('/Bearer\s+[A-Za-z0-9._-]+/i', 'Bearer [masked]', $message) ?? $message;
        // 40文字以上続く英数字列はトークンの可能性が高いためマスクします。
        $message = preg_replace('/[A-Za-z0-9+\/_=.-]{40,}/', '[masked]', $message) ?? $message;
        $message = trim($message);

        // 長すぎるメッセージは180文字で切り詰めます(ログ肥大化の防止)。
        return mb_strlen($message) > 180 ? mb_substr($message, 0, 180) . '...' : $message;
    }
}
