<?php


/**
 * ユーザーごとの通知設定を確認し、送信してよい通知か判定するファイルです。
 *
 * 使用画面・機能: 通知登録、通知設定判定、プッシュ通知連携
 * 呼び出し元: 現在のコード内では直接のfetch呼び出しを確認できません。
 * URL: /api/Notifications/Service/NotificationSettingsResolver.php
 * HTTPメソッド: コード内でHTTPメソッドの明示判定なし
 * 入力: コード内で明示された外部入力なし
 * 使用DB: notification_settings
 * 認証情報や秘密鍵などの実値はコメントに残さず、処理の目的だけを説明します。
 */

declare(strict_types=1);

/**
 * notification_settings から、受信者ごとのプッシュ送信可否を判定します。
 *
 * 通知設定がOFFでも通知履歴は作ります。OFFで止めるのはFCM送信だけです。
 * system通知は個別ON/OFF列がないため、現時点では送信許可として扱います。
 */
final class NotificationSettingsResolver
{
    private const TYPE_TO_COLUMN = [
        'chat' => 'chat_notification_enabled',
        'schedule' => 'schedule_reminder_notification_enabled',
        'survey' => 'survey_deadline_notification_enabled',
        'member' => 'member_join_notification_enabled',
        'split_bill' => 'split_bill_notification_enabled',
    ];

    public function __construct(private readonly PDO $pdo)
    {
    }

    public function isPushEnabled(int $userId, string $notificationType): bool
    {
        if ($notificationType === 'system') {
            return true;
        }

        $column = self::TYPE_TO_COLUMN[$notificationType] ?? null;
        if ($column === null) {
            return false;
        }

        $stmt = $this->pdo->prepare(
            "SELECT {$column} FROM notification_settings WHERE user_id = :user_id LIMIT 1"
        );
        $stmt->execute([':user_id' => $userId]);
        $value = $stmt->fetchColumn();

        // 設定レコードがないユーザーは、既存Settings.phpと同じく初期値ONとして扱います。
        if ($value === false) {
            return true;
        }

        return (bool) $value;
    }

    public function resolveForUsers(array $userIds, string $notificationType): array
    {
        $results = [];
        foreach ($userIds as $userId) {
            $results[(int) $userId] = $this->isPushEnabled((int) $userId, $notificationType);
        }

        return $results;
    }
}
