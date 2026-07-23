<?php

declare(strict_types=1);

/**
 * FCMプッシュ通知の疎通確認を行うコマンドライン(CLI)専用ツールです。
 * サーバーのターミナルから php コマンドで実行し、Webブラウザからは実行できません。
 *
 * 主な流れ:
 * 1. コマンドライン引数(--user-id, --dry-run / --send など)を解析する
 * 2. FCMの設定・DB接続・送信サービスを組み立てる
 * 3. dry-run なら送信予定の内容を表示、--send なら実際にテスト通知を送信する
 *
 * 扱うデータ: コマンドライン引数、環境変数(FIREBASE_PROJECT_ID等)、送信結果JSON。
 */

// Webブラウザ経由で呼ばれた場合は404を返して終了します(CLI専用のため)。
if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

// このファイルから見て3階層上(プロジェクトルート)のパスを求めます。
$projectRoot = dirname(__DIR__, 3);

// Composerのオートローダー(google/authライブラリ用)と、FCM関連クラスを読み込みます。
require_once $projectRoot . '/vendor/autoload.php';
require_once __DIR__ . '/../Fcm/FcmConfig.php';
require_once __DIR__ . '/../Fcm/FcmAccessTokenProvider.php';
require_once __DIR__ . '/../Fcm/FcmHttpClient.php';
require_once __DIR__ . '/../Fcm/FcmDeviceRepository.php';
require_once __DIR__ . '/../Fcm/FcmSendService.php';

/**
 * このツールの使い方(ヘルプ文)を返します。
 */
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

/**
 * 結果を見やすいJSON形式で出力し、指定の終了コードでプログラムを終えます。
 * 終了コードは 0=成功、それ以外=失敗 で、シェルスクリプト等から判定できます。
 */
function fcmCliPrintJson(array $payload, int $exitCode): void
{
    echo json_encode($payload, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . PHP_EOL;
    exit($exitCode);
}

/**
 * コマンドライン引数($argv)を解析し、オプションの連想配列にして返します。
 * 知らないオプションが混ざっていた場合は例外を投げます。
 */
function fcmCliParseArgs(array $argv): array
{
    // 各オプションの初期値です。
    $parsed = [
        'help' => false,
        'userId' => null,
        'deviceId' => null,
        'dryRun' => false,
        'send' => false,
    ];

    // $argv[0] はスクリプト名なので飛ばし、2つ目以降を順に解析します。
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
        // --user-id=数字 の形式を正規表現で解析します。
        if (preg_match('/^--user-id=(\d+)$/', $arg, $matches)) {
            $parsed['userId'] = (int) $matches[1];
            continue;
        }
        // --device-id=数字 の形式を正規表現で解析します。
        if (preg_match('/^--device-id=(\d+)$/', $arg, $matches)) {
            $parsed['deviceId'] = (int) $matches[1];
            continue;
        }

        // どのパターンにも一致しなければ不正なオプションです。
        throw new InvalidArgumentException('Unknown or invalid option: ' . $arg);
    }

    return $parsed;
}

// ここからがメイン処理です。エラーはまとめてcatchし、ヘルプと一緒に表示します。
try {
    // 引数を解析します。
    $args = fcmCliParseArgs($argv);

    // --help の場合は使い方を表示して正常終了します。
    if ($args['help']) {
        echo fcmCliUsage();
        exit(0);
    }

    // 送信先ユーザーIDは必須です。
    if ($args['userId'] === null || $args['userId'] <= 0) {
        throw new InvalidArgumentException('--user-id=N is required.');
    }
    // --dry-run と --send はどちらか片方だけを指定する必要があります(両方・どちらも無しはエラー)。
    if ($args['dryRun'] === $args['send']) {
        throw new InvalidArgumentException('Specify exactly one of --dry-run or --send.');
    }
    // 本番送信は環境変数でも明示的に許可されている必要があります(二重の安全装置)。
    if ($args['send'] && strtolower(trim((string) getenv('FCM_SEND_ENABLED'))) !== 'true') {
        throw new RuntimeException('--send requires FCM_SEND_ENABLED=true.');
    }

    // 環境変数からFCM設定を読み込みます(不備があればここで例外になります)。
    $fcmConfig = FcmConfig::fromEnvironment();
    if (!$fcmConfig instanceof FcmConfig) {
        throw new RuntimeException('FcmConfig::fromEnvironment() did not return an FcmConfig instance.');
    }
    // 設定オブジェクト側の送信フラグも確認します。
    if ($args['send'] && !$fcmConfig->sendEnabled) {
        throw new RuntimeException('--send requires FCM_SEND_ENABLED=true.');
    }

    // DB接続($pdo)を読み込み、正しく接続できたかを確認します。
    require_once $projectRoot . '/api/config/db.php';
    if (!isset($pdo) || !$pdo instanceof PDO) {
        throw new RuntimeException('Database connection is not available.');
    }

    // システムエラーログ機能があれば読み込みます(送信失敗の記録に使用。無くても動作します)。
    $systemErrorsPath = $projectRoot . '/api/Admin/services/system_errors.php';
    if (is_file($systemErrorsPath)) {
        require_once $systemErrorsPath;
    }

    // 送信サービスを部品(設定・認証・通信・端末リポジトリ)から組み立てます。
    $service = new FcmSendService(
        $fcmConfig,
        new FcmAccessTokenProvider($fcmConfig),
        new FcmHttpClient(),
        new FcmDeviceRepository($pdo)
    );

    // テスト用メッセージを対象ユーザーへ送信(またはdry-run)します。
    $result = $service->sendToUser(
        $args['userId'],
        FcmConfig::testMessagePayload(),
        $args['deviceId'],
        $args['dryRun']
    );

    // 結果をJSONで表示します。失敗が含まれる場合は終了コード2で終えます。
    fcmCliPrintJson($result, $result['ok'] ? 0 : 2);
} catch (Throwable $e) {
    // エラー内容(秘密情報はマスク)と使い方を標準エラー出力へ表示し、終了コード1で終えます。
    fwrite(STDERR, FcmHttpClient::sanitizeSummary($e->getMessage()) . PHP_EOL);
    fwrite(STDERR, PHP_EOL . fcmCliUsage());
    exit(1);
}
