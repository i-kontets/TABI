<?php

declare(strict_types=1);

/**
 * FCMプッシュ通知送信の中心となるサービスクラスです。
 * 設定(FcmConfig)・認証(FcmAccessTokenProvider)・通信(FcmHttpClient)・
 * 端末管理(FcmDeviceRepository)を組み合わせて、実際の送信処理を組み立てます。
 *
 * 主な流れ:
 * 1. 送信対象ユーザーとメッセージ内容を検証する
 * 2. dryRun(お試し実行)なら送信せず、送信予定の内容だけを返す
 * 3. 本番送信ならユーザーの各端末へ順番に送信し、失敗や無効トークンを記録する
 *
 * 扱うデータ: ユーザーID、端末一覧、通知メッセージ、送信結果のサマリー。
 */
final class FcmSendService
{
    /**
     * コンストラクタ。必要な部品(設定・認証・通信・端末リポジトリ)をすべて受け取ります。
     * このように外から渡す作り(依存性注入)にすると、テストや差し替えがしやすくなります。
     */
    public function __construct(
        private readonly FcmConfig $config,
        private readonly FcmAccessTokenProvider $tokenProvider,
        private readonly FcmHttpClient $httpClient,
        private readonly FcmDeviceRepository $devices
    ) {
    }

    /**
     * 指定ユーザーの端末へプッシュ通知を送信します。
     *
     * @param int      $userId   送信先ユーザーID
     * @param array    $message  送信するメッセージ(notification/data等)
     * @param int|null $deviceId 特定の端末だけに送りたい場合の端末ID(null=全端末)
     * @param bool     $dryRun   trueなら実際には送信せず、送信予定の内容だけ返す
     */
    public function sendToUser(int $userId, array $message, ?int $deviceId = null, bool $dryRun = true): array
    {
        // 引数の基本チェック: IDは正の整数でなければなりません。
        if ($userId <= 0) {
            throw new InvalidArgumentException('userId must be a positive integer.');
        }
        if ($deviceId !== null && $deviceId <= 0) {
            throw new InvalidArgumentException('deviceId must be a positive integer.');
        }
        // 存在しないユーザーへの送信は設定ミスの可能性が高いため、早めにエラーにします。
        if (!$this->devices->userExists($userId)) {
            throw new InvalidArgumentException('Target user was not found.');
        }

        // メッセージ内容を検証・整形し、送信可能な有効端末の一覧を取得します。
        $message = FcmConfig::normalizeMessage($message);
        $targetDevices = $this->devices->findActiveDevicesForUser($userId, $deviceId);

        // dryRun(お試し実行)の場合: 実際には送信せず、確認用の情報だけを返します。
        if ($dryRun) {
            // 認証ファイルの検証だけは行い、本番送信前に設定ミスへ気づけるようにします。
            $this->tokenProvider->validateCredentialsFile();

            return [
                'ok' => true,
                'dryRun' => true,
                'sendEnabled' => $this->config->sendEnabled,
                'projectId' => $this->config->projectId,
                'targetUserId' => $userId,
                'targetDeviceId' => $deviceId,
                'deviceCount' => count($targetDevices),
                // トークンなどの秘密情報を含まない安全な端末情報だけを返します。
                'devices' => array_map([FcmDeviceRepository::class, 'publicDeviceSummary'], $targetDevices),
                'message' => [
                    'notification' => $message['notification'],
                    'data' => $message['data'] ?? [],
                ],
            ];
        }

        // 本番送信は環境変数 FCM_SEND_ENABLED=true のときだけ許可します(誤送信防止)。
        if (!$this->config->sendEnabled) {
            throw new RuntimeException('Real FCM sending is disabled. Set FCM_SEND_ENABLED=true and pass --send.');
        }

        // Google認証でアクセストークンを取得します(キャッシュがあればそれを使用)。
        $accessToken = $this->tokenProvider->getAccessToken();

        // 送信結果の集計用変数を初期化します。
        $results = [];
        $sent = 0;        // 成功件数
        $failed = 0;      // 失敗件数
        $invalidated = 0; // 無効化した端末数

        // ユーザーの各端末へ1台ずつ送信します。
        foreach ($targetDevices as $device) {
            // メッセージをコピーし、この端末のトークンを設定します(FCMは1リクエスト1トークン)。
            $deviceMessage = $message;
            $deviceMessage['token'] = (string) $device['push_token'];

            // FCMへ送信し、結果を受け取ります。
            $result = $this->httpClient->send($this->config->endpoint(), $accessToken, $deviceMessage);

            // 結果レポート用に、端末情報+送信結果をまとめます。
            $summary = FcmDeviceRepository::publicDeviceSummary($device);
            $summary['success'] = (bool) $result['success'];
            $summary['httpStatus'] = $result['httpStatus'];
            $summary['status'] = $result['status'];
            $summary['retryable'] = (bool) $result['retryable'];

            // 成功時はFCMのメッセージIDも記録します。
            if (!empty($result['name'])) {
                $summary['name'] = $result['name'];
            }
            // 失敗時はエラー概要を記録し、システムエラーログにも残します。
            if (!$summary['success']) {
                $summary['summary'] = $result['summary'] ?? 'FCM request failed.';
                $failed++;
                $this->logFailure($userId, (int) $device['device_id'], $summary);
            } else {
                $sent++;
            }

            // トークンが無効(アプリ削除など)と判明した端末は、以降の送信対象から外します。
            if (!empty($result['invalidToken'])) {
                $this->devices->deactivateDevice((int) $device['device_id']);
                $summary['invalidated'] = true;
                $invalidated++;
            }

            $results[] = $summary;
        }

        // 全端末分の集計結果を返します。1台でも失敗があれば ok は false です。
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

    /**
     * 送信失敗をシステムエラーログ(管理画面で確認できるログ)へ記録します。
     * ログ機能が読み込まれていない環境では何もしません。
     */
    private function logFailure(int $userId, int $deviceId, array $summary): void
    {
        // logSystemError 関数が存在しない(system_errors.phpが未読み込みの)場合はスキップします。
        if (!function_exists('logSystemError')) {
            return;
        }

        try {
            // 失敗の詳細を記録します。summary は秘密情報をマスクしてから保存します。
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
