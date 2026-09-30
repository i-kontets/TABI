<?php
declare(strict_types=1);

require_once __DIR__ . '/../../config/serviceSchedule.php';
require_once __DIR__ . '/../../Admin/services/notices.php';

/** 既存の通知保存・宛先判定を使う停止予告です。テーブルや配信基盤は増やしません。 */
final class RdsShutdownWarning
{
    public function __construct(
        private readonly PDO $pdo,
        private readonly Closure $clock,
        private readonly Closure $emit
    ) {}

    public function run(): array
    {
        $plan = tabiShutdownWarningPlan(($this->clock)());
        if (!$plan['due']) return ['status' => 'not_due'];
        // RDSにはrequest_key列が未反映なので、既存JSONの日付キーを同じDBのロック内で照合します。
        // 全実行元がこのロックを使うことで、同時起動でも通知本体を1件だけ作ります。
        $lock = 'tabi_rds_shutdown_warning';
        $stmt = $this->pdo->prepare('SELECT GET_LOCK(?, 0)');
        $stmt->execute([$lock]);
        if ((int) $stmt->fetchColumn() !== 1) return ['status' => 'busy'];
        try {
            if (!$this->canContinue($plan)) return ['status' => 'deadline'];
            $stmt = $this->pdo->prepare("SELECT notification_id FROM notifications WHERE notification_type = 'system' AND notification_subtype = 'rds_shutdown_warning' AND JSON_UNQUOTE(JSON_EXTRACT(detail_data, '$.dedupKey')) = ? LIMIT 1");
            $stmt->execute([$plan['dedupKey']]);
            $existing = $stmt->fetchColumn();
            if ($existing !== false) return ['status' => 'already_created', 'notificationId' => (int) $existing];

            $this->pdo->exec("SET time_zone = '+00:00'");
            $this->pdo->beginTransaction();
            try {
                $users = noticeRecipients($this->pdo, ['target' => '全ユーザー', 'targetId' => null]);
                if (!$this->canContinue($plan)) throw new RuntimeException('公開処理の終了時刻です。');
                $close = new DateTimeImmutable($plan['shutdownAt']);
                $detail = [
                    'dedupKey' => $plan['dedupKey'], 'serviceDate' => $plan['serviceDate'],
                    'notificationAt' => $plan['notificationAt'], 'shutdownAt' => $plan['shutdownAt'],
                    // 作成した実行だけに送信権を与えます。再起動時は再送せずDBからの取得を優先します。
                    'realtimeState' => 'claimed',
                ];
                $created = (new NotificationRepository($this->pdo))->createNotificationWithRecipients([
                    'notificationType' => 'system', 'notificationSubtype' => 'rds_shutdown_warning',
                    'title' => 'まもなくサービス停止時間です',
                    'body' => '本日は' . $close->format('H:i') . 'にサービス停止を予定しています。まもなく一部機能が利用できなくなります。必要な操作は早めに完了してください。',
                    'targetType' => 'system_notice', 'targetId' => null, 'actionPath' => null,
                    'detailDataJson' => json_encode($detail, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR),
                    'createdBy' => null,
                    'expiresAt' => $close->setTimezone(new DateTimeZone('UTC'))->format('Y-m-d H:i:s'),
                ], $users, fn() => $this->canContinue($plan));
                if (!$this->canContinue($plan)) throw new RuntimeException('公開処理の終了時刻です。');
                $this->pdo->commit();
            } catch (Throwable $error) {
                if ($this->pdo->inTransaction()) $this->pdo->rollBack();
                throw $error;
            }

            // DB確定後に既存WebSocketへ合図を送ります。外部送信失敗でも通知履歴は消しません。
            $ok = true;
            foreach ($created['recipients'] as $recipient) {
                if (!$this->canContinue($plan)) { $ok = false; break; }
                try {
                    $result = ($this->emit)('user:' . $recipient['userId'], 'notification_created', ['notificationId' => $created['notificationId']], false);
                    if (empty($result['ok'])) $ok = false;
                } catch (Throwable) { $ok = false; }
            }
            // 完了印は全宛先への依頼成功を表します。端末での受信や既読を保証する印ではありません。
            if ($this->canContinue($plan)) {
                $detail['realtimeState'] = $ok ? 'sent' : 'failed';
                if ($ok) $detail['realtimePublishedAt'] = ($this->clock)()->format(DateTimeInterface::ATOM);
                $this->pdo->prepare('UPDATE notifications SET detail_data = ? WHERE notification_id = ?')->execute([
                    json_encode($detail, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR), $created['notificationId'],
                ]);
            }
            return ['status' => $ok ? 'created' : 'created_realtime_incomplete', 'notificationId' => $created['notificationId']];
        } finally {
            // 待たずにロックを解放します。接続断の場合もMySQL側で自動解放されます。
            try { $this->pdo->prepare('SELECT RELEASE_LOCK(?)')->execute([$lock]); } catch (Throwable) {}
        }
    }

    private function canContinue(array $plan): bool
    {
        $current = tabiShutdownWarningPlan(($this->clock)());
        return $current['due'] && $current['dedupKey'] === $plan['dedupKey'] && $current['shutdownAt'] === $plan['shutdownAt'];
    }
}
