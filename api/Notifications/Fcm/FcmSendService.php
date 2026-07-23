<?php

declare(strict_types=1);

final class FcmSendService
{
    public function __construct(
        private readonly FcmConfig $config,
        private readonly FcmAccessTokenProvider $tokenProvider,
        private readonly FcmHttpClient $httpClient,
        private readonly FcmDeviceRepository $devices
    ) {
    }

    public function sendToUser(int $userId, array $message, ?int $deviceId = null, bool $dryRun = true): array
    {
        if ($userId <= 0) {
            throw new InvalidArgumentException('userId must be a positive integer.');
        }
        if ($deviceId !== null && $deviceId <= 0) {
            throw new InvalidArgumentException('deviceId must be a positive integer.');
        }
        if (!$this->devices->userExists($userId)) {
            throw new InvalidArgumentException('Target user was not found.');
        }

        $message = FcmConfig::normalizeMessage($message);
        $targetDevices = $this->devices->findActiveDevicesForUser($userId, $deviceId);

        if ($dryRun) {
            $this->tokenProvider->validateCredentialsFile();

            return [
                'ok' => true,
                'dryRun' => true,
                'sendEnabled' => $this->config->sendEnabled,
                'projectId' => $this->config->projectId,
                'targetUserId' => $userId,
                'targetDeviceId' => $deviceId,
                'deviceCount' => count($targetDevices),
                'devices' => array_map([FcmDeviceRepository::class, 'publicDeviceSummary'], $targetDevices),
                'message' => [
                    'notification' => $message['notification'],
                    'data' => $message['data'] ?? [],
                ],
            ];
        }

        if (!$this->config->sendEnabled) {
            throw new RuntimeException('Real FCM sending is disabled. Set FCM_SEND_ENABLED=true and pass --send.');
        }

        $accessToken = $this->tokenProvider->getAccessToken();
        $results = [];
        $sent = 0;
        $failed = 0;
        $invalidated = 0;

        foreach ($targetDevices as $device) {
            $deviceMessage = $message;
            $deviceMessage['token'] = (string) $device['push_token'];

            $result = $this->httpClient->send($this->config->endpoint(), $accessToken, $deviceMessage);
            $summary = FcmDeviceRepository::publicDeviceSummary($device);
            $summary['success'] = (bool) $result['success'];
            $summary['httpStatus'] = $result['httpStatus'];
            $summary['status'] = $result['status'];
            $summary['retryable'] = (bool) $result['retryable'];

            if (!empty($result['name'])) {
                $summary['name'] = $result['name'];
            }
            if (!$summary['success']) {
                $summary['summary'] = $result['summary'] ?? 'FCM request failed.';
                $failed++;
                $this->logFailure($userId, (int) $device['device_id'], $summary);
            } else {
                $sent++;
            }

            if (!empty($result['invalidToken'])) {
                $this->devices->deactivateDevice((int) $device['device_id']);
                $summary['invalidated'] = true;
                $invalidated++;
            }

            $results[] = $summary;
        }

        return [
            'ok' => $failed === 0,
            'dryRun' => false,
            'projectId' => $this->config->projectId,
            'targetUserId' => $userId,
            'targetDeviceId' => $deviceId,
            'deviceCount' => count($targetDevices),
            'sent' => $sent,
            'failed' => $failed,
            'invalidated' => $invalidated,
            'results' => $results,
        ];
    }

    private function logFailure(int $userId, int $deviceId, array $summary): void
    {
        if (!function_exists('logSystemError')) {
            return;
        }

        try {
            logSystemError(
                'fcm_http_v1',
                'warning',
                'FCM send failed.',
                [
                    'device_id' => $deviceId,
                    'http_status' => $summary['httpStatus'] ?? null,
                    'status' => $summary['status'] ?? null,
                    'retryable' => $summary['retryable'] ?? null,
                    'summary' => isset($summary['summary'])
                        ? FcmHttpClient::sanitizeSummary((string) $summary['summary'])
                        : null,
                ],
                $userId,
                'cli/fcm'
            );
        } catch (Throwable) {
            // FCM送信の結果を、補助ログの失敗で上書きしない。
        }
    }
}
