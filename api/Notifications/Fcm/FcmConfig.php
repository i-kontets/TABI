<?php

declare(strict_types=1);

final class FcmConfig
{
    public const SCOPE = 'https://www.googleapis.com/auth/firebase.messaging';

    public function __construct(
        public readonly string $projectId,
        public readonly string $credentialsPath,
        public readonly bool $sendEnabled
    ) {
    }

    public static function fromEnvironment(): self
    {
        $projectId = trim((string) getenv('FIREBASE_PROJECT_ID'));
        $credentialsPath = trim((string) getenv('GOOGLE_APPLICATION_CREDENTIALS'));
        $sendEnabled = strtolower(trim((string) getenv('FCM_SEND_ENABLED'))) === 'true';

        if ($projectId === '') {
            throw new RuntimeException('FIREBASE_PROJECT_ID is not set.');
        }
        if (!preg_match('/^[a-z0-9-]+$/', $projectId)) {
            throw new RuntimeException('FIREBASE_PROJECT_ID has an invalid format.');
        }
        if ($credentialsPath === '') {
            throw new RuntimeException('GOOGLE_APPLICATION_CREDENTIALS is not set.');
        }

        return new self(
            projectId: $projectId,
            credentialsPath: $credentialsPath,
            sendEnabled: $sendEnabled
        );
    }

    public function endpoint(): string
    {
        return sprintf('https://fcm.googleapis.com/v1/projects/%s/messages:send', rawurlencode($this->projectId));
    }

    public static function validateActionPath(string $actionPath): string
    {
        $actionPath = trim($actionPath);

        if ($actionPath === '') {
            throw new InvalidArgumentException('actionPath is required.');
        }
        if (preg_match('/[\r\n\x00-\x1F\x7F]/', $actionPath)) {
            throw new InvalidArgumentException('actionPath contains invalid characters.');
        }
        if (str_contains($actionPath, '://') || str_starts_with($actionPath, '//')) {
            throw new InvalidArgumentException('actionPath must be an internal TABI path.');
        }
        if ($actionPath !== '/TABI' && !str_starts_with($actionPath, '/TABI/')) {
            throw new InvalidArgumentException('actionPath must start with /TABI.');
        }

        return $actionPath;
    }

    public static function testMessagePayload(): array
    {
        $actionPath = self::validateActionPath('/TABI/notifications');

        return [
            'notification' => [
                'title' => 'TABI通知テスト',
                'body' => 'FCM HTTP v1 APIの疎通確認です。',
            ],
            'data' => [
                'type' => 'test',
                'actionPath' => $actionPath,
                'source' => 'cli',
            ],
            'webpush' => [
                'fcm_options' => [
                    'link' => $actionPath,
                ],
            ],
        ];
    }

    public static function normalizeMessage(array $message): array
    {
        if (!isset($message['notification']['title'], $message['notification']['body'])) {
            throw new InvalidArgumentException('notification.title and notification.body are required.');
        }

        $message['notification']['title'] = trim((string) $message['notification']['title']);
        $message['notification']['body'] = trim((string) $message['notification']['body']);

        if ($message['notification']['title'] === '' || $message['notification']['body'] === '') {
            throw new InvalidArgumentException('notification.title and notification.body must not be empty.');
        }

        $data = $message['data'] ?? [];
        if (!is_array($data)) {
            throw new InvalidArgumentException('message.data must be an object.');
        }
        foreach ($data as $key => $value) {
            $data[(string) $key] = (string) $value;
            if ((string) $key !== $key) {
                unset($data[$key]);
            }
        }
        if (isset($data['actionPath'])) {
            $data['actionPath'] = self::validateActionPath($data['actionPath']);
        }
        $message['data'] = $data;

        return $message;
    }
}
