<?php


/**
 * 通知の作成、DB保存、必要に応じたプッシュ送信をまとめて扱うサービスファイルです。
 *
 * 使用画面・機能: 通知登録、通知設定判定、プッシュ通知連携
 * 呼び出し元: 現在のコード内では直接のfetch呼び出しを確認できません。
 * URL: /api/Notifications/Service/NotificationService.php
 * HTTPメソッド: コード内でHTTPメソッドの明示判定なし
 * 入力: コード内で明示された外部入力なし
 * 使用DB: このファイル内ではSQLを直接実行していません。
 * 認証情報や秘密鍵などの実値はコメントに残さず、処理の目的だけを説明します。
 */

declare(strict_types=1);

/**
 * 通知履歴の作成、受信者登録、通知設定判定、FCM送信、delivered_at更新をまとめる共通サービスです。
 *
 * 通知履歴とプッシュ通知は別物です。通知設定がOFF、端末なし、FCM失敗のどれであっても、
 * DB登録に成功した通知履歴は残します。ユーザーがTABIを開けば通知一覧から確認できるためです。
 */
final class NotificationService
{
    private const ALLOWED_TYPES = ['chat', 'schedule', 'survey', 'member', 'split_bill', 'system'];
    private const STATUS_PUSH_SENT = 'push_sent';
    private const STATUS_PUSH_PARTIALLY_SENT = 'push_partially_sent';
    private const STATUS_PUSH_FAILED = 'push_failed';
    private const STATUS_PUSH_DISABLED = 'push_disabled';
    private const STATUS_NO_ACTIVE_DEVICE = 'no_active_device';
    private const STATUS_HISTORY_ONLY = 'history_only';

    public function __construct(
        private readonly NotificationRepository $notifications,
        private readonly NotificationSettingsResolver $settings,
        private readonly FcmDeviceRepository $devices,
        private readonly ?FcmSendService $fcmSender = null
    ) {
    }

    public function createAndSendNotification(array $input, string $mode = 'dry-run'): array
    {
        if (!in_array($mode, ['dry-run', 'create-only', 'send'], true)) {
            throw new InvalidArgumentException('mode must be dry-run, create-only, or send.');
        }

        $normalized = $this->normalizeInput($input);
        $recipientUserIds = $normalized['recipientUserIds'];
        $this->notifications->assertUsersExist($recipientUserIds);
        if ($normalized['createdBy'] !== null) {
            $this->notifications->assertUsersExist([$normalized['createdBy']]);
        }

        $settingsByUser = $this->settings->resolveForUsers($recipientUserIds, $normalized['notificationType']);

        if ($mode === 'dry-run') {
            return $this->buildDryRunResult($normalized, $recipientUserIds, $settingsByUser);
        }

        $created = $this->notifications->createNotificationWithRecipients($normalized, $recipientUserIds);
        $recipientRows = $created['recipients'];

        if ($mode === 'create-only') {
            return $this->buildCreateOnlyResult($created['notificationId'], $recipientRows);
        }

        if ($this->fcmSender === null) {
            throw new RuntimeException('FCM sender is not available.');
        }

        return $this->sendPushes($created['notificationId'], $normalized, $recipientRows, $settingsByUser);
    }

    private function normalizeInput(array $input): array
    {
        $notificationType = $this->readString($input, 'notificationType', true, 50);
        if (!in_array($notificationType, self::ALLOWED_TYPES, true)) {
            throw new InvalidArgumentException('notificationType is invalid.');
        }

        $notificationSubtype = $this->readString($input, 'notificationSubtype', false, 50);
        if ($notificationSubtype !== null && !preg_match('/^[A-Za-z0-9_-]+$/', $notificationSubtype)) {
            throw new InvalidArgumentException('notificationSubtype has an invalid format.');
        }

        $title = $this->readString($input, 'title', true, 150);
        $body = $this->readString($input, 'body', true, 1000);
        $targetType = $this->readString($input, 'targetType', false, 50);
        $targetId = $this->readNullablePositiveInt($input['targetId'] ?? null, 'targetId');
        $actionPath = $this->readString($input, 'actionPath', false, 500);
        if ($actionPath !== null) {
            $actionPath = FcmConfig::validateActionPath($actionPath);
        }
        $createdBy = $this->readNullablePositiveInt($input['createdBy'] ?? null, 'createdBy');
        $expiresAt = $this->normalizeExpiresAt($input['expiresAt'] ?? null);
        $recipientUserIds = $this->normalizeRecipientUserIds($input['recipientUserIds'] ?? null);
        $detailDataJson = $this->normalizeDetailData($input['detailData'] ?? null);

        return [
            'notificationType' => $notificationType,
            'notificationSubtype' => $notificationSubtype,
            'title' => $title,
            'body' => $body,
            'recipientUserIds' => $recipientUserIds,
            'targetType' => $targetType,
            'targetId' => $targetId,
            'actionPath' => $actionPath,
            'detailDataJson' => $detailDataJson,
            'createdBy' => $createdBy,
            'expiresAt' => $expiresAt,
        ];
    }

    private function buildDryRunResult(array $input, array $recipientUserIds, array $settingsByUser): array
    {
        $recipients = [];
        foreach ($recipientUserIds as $userId) {
            $deviceCount = count($this->devices->findActiveDevicesForUser($userId));
            $pushEnabled = $settingsByUser[$userId] ?? false;
            $recipients[] = [
                'userId' => $userId,
                'recipientId' => null,
                'historyCreated' => false,
                'pushEnabled' => $pushEnabled,
                'deviceCount' => $deviceCount,
                'successDeviceCount' => 0,
                'failureDeviceCount' => 0,
                'delivered' => false,
                'status' => $pushEnabled ? ($deviceCount > 0 ? self::STATUS_HISTORY_ONLY : self::STATUS_NO_ACTIVE_DEVICE) : self::STATUS_PUSH_DISABLED,
            ];
        }

        return [
            'success' => true,
            'mode' => 'dry-run',
            'notificationId' => null,
            'recipientCount' => count($recipientUserIds),
            'historyCreatedCount' => 0,
            'pushAttemptedUserCount' => 0,
            'pushDisabledUserCount' => count(array_filter($recipients, fn ($row) => $row['status'] === self::STATUS_PUSH_DISABLED)),
            'deliveredUserCount' => 0,
            'failedUserCount' => 0,
            'noActiveDeviceUserCount' => count(array_filter($recipients, fn ($row) => $row['status'] === self::STATUS_NO_ACTIVE_DEVICE)),
            'recipients' => $recipients,
            'message' => $this->publicMessageSummary($input),
        ];
    }

    private function buildCreateOnlyResult(int $notificationId, array $recipientRows): array
    {
        $recipients = [];
        foreach ($recipientRows as $row) {
            $recipients[] = [
                'userId' => (int) $row['userId'],
                'recipientId' => (int) $row['recipientId'],
                'historyCreated' => true,
                'pushEnabled' => false,
                'deviceCount' => 0,
                'successDeviceCount' => 0,
                'failureDeviceCount' => 0,
                'delivered' => false,
                'status' => self::STATUS_HISTORY_ONLY,
            ];
        }

        return [
            'success' => true,
            'mode' => 'create-only',
            'notificationId' => $notificationId,
            'recipientCount' => count($recipientRows),
            'historyCreatedCount' => count($recipientRows),
            'pushAttemptedUserCount' => 0,
            'pushDisabledUserCount' => 0,
            'deliveredUserCount' => 0,
            'failedUserCount' => 0,
            'noActiveDeviceUserCount' => 0,
            'recipients' => $recipients,
        ];
    }

    private function sendPushes(int $notificationId, array $input, array $recipientRows, array $settingsByUser): array
    {
        $recipients = [];
        $pushAttempted = 0;
        $pushDisabled = 0;
        $delivered = 0;
        $failed = 0;
        $noActiveDevice = 0;

        foreach ($recipientRows as $row) {
            $userId = (int) $row['userId'];
            $recipientId = (int) $row['recipientId'];
            $pushEnabled = $settingsByUser[$userId] ?? false;

            if (!$pushEnabled) {
                $pushDisabled++;
                $recipients[] = $this->recipientResult($userId, $recipientId, false, 0, 0, self::STATUS_PUSH_DISABLED);
                continue;
            }

            $activeDevices = $this->devices->findActiveDevicesForUser($userId);
            if ($activeDevices === []) {
                $noActiveDevice++;
                $recipients[] = $this->recipientResult($userId, $recipientId, true, 0, 0, self::STATUS_NO_ACTIVE_DEVICE);
                continue;
            }

            $message = $this->buildFcmMessage($notificationId, $recipientId, $input);
            try {
                $sendResult = $this->fcmSender->sendToUser($userId, $message, null, false);
            } catch (Throwable $error) {
                $pushAttempted++;
                $failed++;
                $this->logSafeFailure($notificationId, $recipientId, $userId, $input, $error);
                $recipients[] = $this->recipientResult(
                    $userId,
                    $recipientId,
                    true,
                    count($activeDevices),
                    0,
                    self::STATUS_PUSH_FAILED,
                    count($activeDevices),
                    false
                );
                continue;
            }
            $deviceCount = (int) ($sendResult['deviceCount'] ?? 0);
            $successDeviceCount = (int) ($sendResult['sent'] ?? 0);
            $failureDeviceCount = (int) ($sendResult['failed'] ?? 0);

            $pushAttempted++;
            if ($successDeviceCount > 0) {
                $this->notifications->updateDeliveredAt($recipientId, $userId);
                $delivered++;
                $status = $failureDeviceCount > 0 ? self::STATUS_PUSH_PARTIALLY_SENT : self::STATUS_PUSH_SENT;
                $recipients[] = $this->recipientResult($userId, $recipientId, true, $deviceCount, $successDeviceCount, $status, $failureDeviceCount, true);
                continue;
            }

            $failed++;
            $recipients[] = $this->recipientResult($userId, $recipientId, true, $deviceCount, 0, self::STATUS_PUSH_FAILED, $failureDeviceCount, false);
        }

        return [
            'success' => true,
            'mode' => 'send',
            'notificationId' => $notificationId,
            'recipientCount' => count($recipientRows),
            'historyCreatedCount' => count($recipientRows),
            'pushAttemptedUserCount' => $pushAttempted,
            'pushDisabledUserCount' => $pushDisabled,
            'deliveredUserCount' => $delivered,
            'failedUserCount' => $failed,
            'noActiveDeviceUserCount' => $noActiveDevice,
            'recipients' => $recipients,
        ];
    }

    private function buildFcmMessage(int $notificationId, int $recipientId, array $input): array
    {
        $data = [
            'notificationId' => (string) $notificationId,
            'recipientId' => (string) $recipientId,
            'category' => $input['notificationType'],
            'source' => 'notification_service',
        ];

        foreach ([
            'subtype' => $input['notificationSubtype'],
            'actionPath' => $input['actionPath'],
            'targetType' => $input['targetType'],
            'targetId' => $input['targetId'] !== null ? (string) $input['targetId'] : null,
        ] as $key => $value) {
            if ($value !== null && $value !== '') {
                $data[$key] = (string) $value;
            }
        }

        $message = [
            'notification' => [
                'title' => $input['title'],
                'body' => $input['body'],
            ],
            'data' => $data,
        ];

        if ($input['actionPath'] !== null) {
            $message['webpush'] = [
                'fcm_options' => [
                    'link' => $input['actionPath'],
                ],
            ];
        }

        return $message;
    }

    private function logSafeFailure(int $notificationId, int $recipientId, int $userId, array $input, Throwable $error): void
    {
        if (!function_exists('logSystemError')) {
            return;
        }

        try {
            logSystemError(
                'notification',
                'warning',
                'Notification push dispatch failed.',
                [
                    'notification_type' => $input['notificationType'],
                    'notification_subtype' => $input['notificationSubtype'],
                    'notification_id' => $notificationId,
                    'recipient_id' => $recipientId,
                    'user_id' => $userId,
                    'summary' => FcmHttpClient::sanitizeSummary($error->getMessage()),
                ],
                $userId,
                'cli/notification-service'
            );
        } catch (Throwable) {
            // 補助ログの失敗で通知処理の結果を上書きしません。
        }
    }

    private function recipientResult(
        int $userId,
        int $recipientId,
        bool $pushEnabled,
        int $deviceCount,
        int $successDeviceCount,
        string $status,
        int $failureDeviceCount = 0,
        bool $delivered = false
    ): array {
        return [
            'userId' => $userId,
            'recipientId' => $recipientId,
            'historyCreated' => true,
            'pushEnabled' => $pushEnabled,
            'deviceCount' => $deviceCount,
            'successDeviceCount' => $successDeviceCount,
            'failureDeviceCount' => $failureDeviceCount,
            'delivered' => $delivered,
            'status' => $status,
        ];
    }

    private function publicMessageSummary(array $input): array
    {
        return [
            'notificationType' => $input['notificationType'],
            'notificationSubtype' => $input['notificationSubtype'],
            'targetType' => $input['targetType'],
            'targetId' => $input['targetId'],
            'actionPath' => $input['actionPath'],
            'createdBy' => $input['createdBy'],
            'expiresAt' => $input['expiresAt'],
        ];
    }

    private function normalizeRecipientUserIds($value): array
    {
        if (!is_array($value) || $value === []) {
            throw new InvalidArgumentException('recipientUserIds must be a non-empty array.');
        }

        $ids = [];
        foreach ($value as $rawId) {
            $id = filter_var($rawId, FILTER_VALIDATE_INT);
            if ($id === false || $id < 1) {
                throw new InvalidArgumentException('recipientUserIds must contain positive integers only.');
            }
            $ids[] = (int) $id;
        }

        return array_values(array_unique($ids));
    }

    private function readString(array $input, string $key, bool $required, int $maxLength): ?string
    {
        if (!array_key_exists($key, $input) || $input[$key] === null) {
            if ($required) {
                throw new InvalidArgumentException($key . ' is required.');
            }
            return null;
        }

        if (!is_string($input[$key])) {
            throw new InvalidArgumentException($key . ' must be a string.');
        }

        $value = trim($input[$key]);
        if ($value === '') {
            if ($required) {
                throw new InvalidArgumentException($key . ' must not be empty.');
            }
            return null;
        }

        if (mb_strlen($value) > $maxLength) {
            throw new InvalidArgumentException($key . ' is too long.');
        }

        if (preg_match('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/', $value)) {
            throw new InvalidArgumentException($key . ' contains invalid characters.');
        }

        return $value;
    }

    private function readNullablePositiveInt($value, string $key): ?int
    {
        if ($value === null || $value === '') {
            return null;
        }

        $intValue = filter_var($value, FILTER_VALIDATE_INT);
        if ($intValue === false || $intValue < 1) {
            throw new InvalidArgumentException($key . ' must be a positive integer or null.');
        }

        return (int) $intValue;
    }

    private function normalizeDetailData($value): ?string
    {
        if ($value === null) {
            return null;
        }
        if (!is_array($value)) {
            throw new InvalidArgumentException('detailData must be an object or null.');
        }

        $json = json_encode($value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        if ($json === false) {
            throw new InvalidArgumentException('detailData could not be encoded as JSON.');
        }
        if (strlen($json) > 4096) {
            throw new InvalidArgumentException('detailData is too large.');
        }

        return $json;
    }

    private function normalizeExpiresAt($value): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }
        if (!is_string($value)) {
            throw new InvalidArgumentException('expiresAt must be a datetime string or null.');
        }

        $timestamp = strtotime($value);
        if ($timestamp === false || $timestamp <= time()) {
            throw new InvalidArgumentException('expiresAt must be a future datetime.');
        }

        return date('Y-m-d H:i:s', $timestamp);
    }
}
