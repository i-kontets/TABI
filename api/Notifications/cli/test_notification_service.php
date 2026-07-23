<?php

declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

$projectRoot = dirname(__DIR__, 3);

require_once $projectRoot . '/vendor/autoload.php';
require_once __DIR__ . '/../Fcm/FcmConfig.php';
require_once __DIR__ . '/../Fcm/FcmAccessTokenProvider.php';
require_once __DIR__ . '/../Fcm/FcmHttpClient.php';
require_once __DIR__ . '/../Fcm/FcmDeviceRepository.php';
require_once __DIR__ . '/../Fcm/FcmSendService.php';
require_once __DIR__ . '/../Service/NotificationRepository.php';
require_once __DIR__ . '/../Service/NotificationSettingsResolver.php';
require_once __DIR__ . '/../Service/NotificationService.php';

function notificationServiceCliUsage(): string
{
    return <<<TEXT
Usage:
  php api/Notifications/cli/test_notification_service.php --user-id=123 --dry-run
  php api/Notifications/cli/test_notification_service.php --user-id=123 --create-only
  php api/Notifications/cli/test_notification_service.php --user-id=123 --send

Options:
  --help          Show this help.
  --user-id=N     Target users.user_id for the test notification.
  --dry-run       Validate input, DB lookup, settings, and active device count. No INSERT and no FCM.
  --create-only   Create notifications and notification_recipients. No FCM.
  --send          Create history, send FCM, and update delivered_at when at least one device succeeds.

Environment for --send:
  GOOGLE_APPLICATION_CREDENTIALS  Path to the Firebase service account JSON.
  FIREBASE_PROJECT_ID             Firebase project id.
  FCM_SEND_ENABLED                Must be true for --send.

TEXT;
}

function notificationServiceCliParseArgs(array $argv): array
{
    $parsed = [
        'help' => false,
        'userId' => null,
        'dryRun' => false,
        'createOnly' => false,
        'send' => false,
    ];

    foreach (array_slice($argv, 1) as $arg) {
        if ($arg === '--help' || $arg === '-h') {
            $parsed['help'] = true;
            continue;
        }
        if ($arg === '--dry-run') {
            $parsed['dryRun'] = true;
            continue;
        }
        if ($arg === '--create-only') {
            $parsed['createOnly'] = true;
            continue;
        }
        if ($arg === '--send') {
            $parsed['send'] = true;
            continue;
        }
        if (preg_match('/^--user-id=(\d+)$/', $arg, $matches)) {
            $parsed['userId'] = (int) $matches[1];
            continue;
        }

        throw new InvalidArgumentException('Unknown or invalid option: ' . $arg);
    }

    return $parsed;
}

function notificationServiceCliMode(array $args): string
{
    $enabledModes = array_filter([$args['dryRun'], $args['createOnly'], $args['send']]);
    if (count($enabledModes) !== 1) {
        throw new InvalidArgumentException('Specify exactly one of --dry-run, --create-only, or --send.');
    }
    if ($args['dryRun']) {
        return 'dry-run';
    }
    if ($args['createOnly']) {
        return 'create-only';
    }

    return 'send';
}

function notificationServiceCliTestInput(int $userId): array
{
    return [
        'notificationType' => 'system',
        'notificationSubtype' => 'notification_service_test',
        'title' => 'TABI notification service test',
        'body' => 'This notification verifies TABI history creation and FCM dispatch integration.',
        'recipientUserIds' => [$userId],
        'targetType' => 'system_notice',
        'targetId' => null,
        'actionPath' => '/TABI/notifications',
        'detailData' => [
            'source' => 'notification_service_cli_test',
            'temporary' => true,
        ],
        'createdBy' => null,
        'expiresAt' => date('Y-m-d H:i:s', time() + 7 * 24 * 60 * 60),
    ];
}

function notificationServiceCliPrintJson(array $payload, int $exitCode): void
{
    echo json_encode($payload, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . PHP_EOL;
    exit($exitCode);
}

try {
    $args = notificationServiceCliParseArgs($argv);

    if ($args['help']) {
        echo notificationServiceCliUsage();
        exit(0);
    }

    if ($args['userId'] === null || $args['userId'] <= 0) {
        throw new InvalidArgumentException('--user-id=N is required.');
    }

    $mode = notificationServiceCliMode($args);

    if ($mode === 'send' && strtolower(trim((string) getenv('FCM_SEND_ENABLED'))) !== 'true') {
        throw new RuntimeException('--send requires FCM_SEND_ENABLED=true.');
    }

    require_once $projectRoot . '/api/config/db.php';
    if (!isset($pdo) || !$pdo instanceof PDO) {
        throw new RuntimeException('Database connection is not available.');
    }

    $systemErrorsPath = $projectRoot . '/api/Admin/services/system_errors.php';
    if (is_file($systemErrorsPath)) {
        require_once $systemErrorsPath;
    }

    $fcmSender = null;
    if ($mode === 'send') {
        $fcmConfig = FcmConfig::fromEnvironment();
        $fcmSender = new FcmSendService(
            $fcmConfig,
            new FcmAccessTokenProvider($fcmConfig),
            new FcmHttpClient(),
            new FcmDeviceRepository($pdo)
        );
    }

    $service = new NotificationService(
        new NotificationRepository($pdo),
        new NotificationSettingsResolver($pdo),
        new FcmDeviceRepository($pdo),
        $fcmSender
    );

    $result = $service->createAndSendNotification(
        notificationServiceCliTestInput($args['userId']),
        $mode
    );

    notificationServiceCliPrintJson($result, $result['success'] ? 0 : 2);
} catch (Throwable $error) {
    fwrite(STDERR, FcmHttpClient::sanitizeSummary($error->getMessage()) . PHP_EOL);
    fwrite(STDERR, PHP_EOL . notificationServiceCliUsage());
    exit(1);
}
