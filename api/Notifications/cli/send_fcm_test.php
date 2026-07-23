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

function fcmCliUsage(): string
{
    return <<<TEXT
Usage:
  php api/Notifications/cli/send_fcm_test.php --user-id=123 --dry-run
  php api/Notifications/cli/send_fcm_test.php --user-id=123 --device-id=456 --dry-run
  php api/Notifications/cli/send_fcm_test.php --user-id=123 --send

Options:
  --help          Show this help.
  --user-id=N     Target users.user_id. Required except with --help.
  --device-id=N   Optional target user_devices.device_id for the same user.
  --dry-run       Validate config, DB lookup, and payload without sending FCM.
  --send          Actually send FCM. Requires FCM_SEND_ENABLED=true.

Environment:
  GOOGLE_APPLICATION_CREDENTIALS  Path to the Firebase service account JSON.
  FIREBASE_PROJECT_ID             Firebase project id.
  FCM_SEND_ENABLED                Must be true for --send.

TEXT;
}

function fcmCliPrintJson(array $payload, int $exitCode): void
{
    echo json_encode($payload, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . PHP_EOL;
    exit($exitCode);
}

function fcmCliParseArgs(array $argv): array
{
    $parsed = [
        'help' => false,
        'userId' => null,
        'deviceId' => null,
        'dryRun' => false,
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
        if ($arg === '--send') {
            $parsed['send'] = true;
            continue;
        }
        if (preg_match('/^--user-id=(\d+)$/', $arg, $matches)) {
            $parsed['userId'] = (int) $matches[1];
            continue;
        }
        if (preg_match('/^--device-id=(\d+)$/', $arg, $matches)) {
            $parsed['deviceId'] = (int) $matches[1];
            continue;
        }

        throw new InvalidArgumentException('Unknown or invalid option: ' . $arg);
    }

    return $parsed;
}

try {
    $args = fcmCliParseArgs($argv);

    if ($args['help']) {
        echo fcmCliUsage();
        exit(0);
    }

    if ($args['userId'] === null || $args['userId'] <= 0) {
        throw new InvalidArgumentException('--user-id=N is required.');
    }
    if ($args['dryRun'] === $args['send']) {
        throw new InvalidArgumentException('Specify exactly one of --dry-run or --send.');
    }
    if ($args['send'] && strtolower(trim((string) getenv('FCM_SEND_ENABLED'))) !== 'true') {
        throw new RuntimeException('--send requires FCM_SEND_ENABLED=true.');
    }

    $fcmConfig = FcmConfig::fromEnvironment();
    if (!$fcmConfig instanceof FcmConfig) {
        throw new RuntimeException('FcmConfig::fromEnvironment() did not return an FcmConfig instance.');
    }
    if ($args['send'] && !$fcmConfig->sendEnabled) {
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

    $service = new FcmSendService(
        $fcmConfig,
        new FcmAccessTokenProvider($fcmConfig),
        new FcmHttpClient(),
        new FcmDeviceRepository($pdo)
    );

    $result = $service->sendToUser(
        $args['userId'],
        FcmConfig::testMessagePayload(),
        $args['deviceId'],
        $args['dryRun']
    );

    fcmCliPrintJson($result, $result['ok'] ? 0 : 2);
} catch (Throwable $e) {
    fwrite(STDERR, FcmHttpClient::sanitizeSummary($e->getMessage()) . PHP_EOL);
    fwrite(STDERR, PHP_EOL . fcmCliUsage());
    exit(1);
}
