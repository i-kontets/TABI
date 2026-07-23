<?php

declare(strict_types=1);

final class FcmHttpClient
{
    public function send(string $endpoint, string $accessToken, array $message): array
    {
        $payload = json_encode(['message' => $message], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        if ($payload === false) {
            throw new InvalidArgumentException('FCM message payload could not be encoded as JSON.');
        }

        $curl = curl_init($endpoint);
        if ($curl === false) {
            throw new RuntimeException('Could not initialize cURL.');
        }

        curl_setopt_array($curl, [
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => $payload,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_CONNECTTIMEOUT => 5,
            CURLOPT_TIMEOUT => 15,
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_SSL_VERIFYHOST => 2,
            CURLOPT_HTTPHEADER => [
                'Authorization: Bearer ' . $accessToken,
                'Content-Type: application/json; charset=utf-8',
            ],
        ]);

        $body = curl_exec($curl);
        $curlError = curl_error($curl);
        $httpStatus = (int) curl_getinfo($curl, CURLINFO_RESPONSE_CODE);
        curl_close($curl);

        if ($body === false) {
            return [
                'success' => false,
                'httpStatus' => 0,
                'status' => 'CURL_ERROR',
                'retryable' => true,
                'invalidToken' => false,
                'summary' => self::sanitizeSummary($curlError ?: 'cURL request failed.'),
            ];
        }

        $decoded = json_decode((string) $body, true);

        if ($httpStatus >= 200 && $httpStatus < 300) {
            return [
                'success' => true,
                'httpStatus' => $httpStatus,
                'status' => 'SENT',
                'retryable' => false,
                'invalidToken' => false,
                'name' => isset($decoded['name']) ? self::sanitizeSummary((string) $decoded['name']) : null,
            ];
        }

        $error = is_array($decoded) && isset($decoded['error']) && is_array($decoded['error'])
            ? $decoded['error']
            : [];
        $status = isset($error['status']) ? (string) $error['status'] : 'FCM_ERROR';
        $detailCode = self::extractFcmErrorCode($error);
        $invalidToken = $status === 'UNREGISTERED' || $detailCode === 'UNREGISTERED';
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

    private static function extractFcmErrorCode(array $error): ?string
    {
        $details = $error['details'] ?? [];
        if (!is_array($details)) {
            return null;
        }

        foreach ($details as $detail) {
            if (is_array($detail) && isset($detail['errorCode'])) {
                return (string) $detail['errorCode'];
            }
        }

        return null;
    }

    public static function sanitizeSummary(string $message): string
    {
        $message = preg_replace('/Bearer\s+[A-Za-z0-9._-]+/i', 'Bearer [masked]', $message) ?? $message;
        $message = preg_replace('/[A-Za-z0-9+\/_=.-]{40,}/', '[masked]', $message) ?? $message;
        $message = trim($message);

        return mb_strlen($message) > 180 ? mb_substr($message, 0, 180) . '...' : $message;
    }
}
