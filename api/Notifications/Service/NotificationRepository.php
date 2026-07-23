<?php

declare(strict_types=1);

/**
 * 通知履歴DBを扱うRepositoryです。
 *
 * ここでは notifications と notification_recipients だけを操作します。
 * プッシュ通知の送信は外部通信なので、このRepositoryには入れません。
 * FCM送信前にDB登録をcommitすることで、プッシュ通知が失敗しても
 * アプリ内通知一覧には履歴が残るようにします。
 */
final class NotificationRepository
{
    public function __construct(private readonly PDO $pdo)
    {
    }

    public function assertUsersExist(array $userIds): void
    {
        if ($userIds === []) {
            throw new InvalidArgumentException('recipientUserIds must not be empty.');
        }

        $placeholders = [];
        $params = [];
        foreach (array_values($userIds) as $index => $userId) {
            $key = ':user_id_' . $index;
            $placeholders[] = $key;
            $params[$key] = $userId;
        }

        $stmt = $this->pdo->prepare(
            'SELECT user_id FROM users WHERE user_id IN (' . implode(',', $placeholders) . ')'
        );
        $stmt->execute($params);
        $found = array_map('intval', $stmt->fetchAll(PDO::FETCH_COLUMN) ?: []);
        sort($found);

        $expected = array_values(array_unique(array_map('intval', $userIds)));
        sort($expected);

        if ($found !== $expected) {
            throw new InvalidArgumentException('One or more recipient users were not found.');
        }
    }

    public function createNotificationWithRecipients(array $input, array $recipientUserIds): array
    {
        $this->pdo->beginTransaction();

        try {
            $notificationId = $this->insertNotification($input);
            $recipientRows = $this->insertRecipients($notificationId, $recipientUserIds);
            $this->pdo->commit();

            return [
                'notificationId' => $notificationId,
                'recipients' => $recipientRows,
            ];
        } catch (Throwable $error) {
            if ($this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }
            throw $error;
        }
    }

    public function updateDeliveredAt(int $recipientId, int $userId): bool
    {
        $stmt = $this->pdo->prepare(
            'UPDATE notification_recipients
             SET delivered_at = COALESCE(delivered_at, NOW())
             WHERE recipient_id = :recipient_id
               AND user_id = :user_id
               AND delivered_at IS NULL'
        );
        $stmt->execute([
            ':recipient_id' => $recipientId,
            ':user_id' => $userId,
        ]);

        return $stmt->rowCount() > 0;
    }

    private function insertNotification(array $input): int
    {
        $stmt = $this->pdo->prepare(
            'INSERT INTO notifications
                (notification_type, notification_subtype, title, body, target_type, target_id, action_path, detail_data, created_by, expires_at)
             VALUES
                (:notification_type, :notification_subtype, :title, :body, :target_type, :target_id, :action_path, :detail_data, :created_by, :expires_at)'
        );
        $stmt->execute([
            ':notification_type' => $input['notificationType'],
            ':notification_subtype' => $input['notificationSubtype'],
            ':title' => $input['title'],
            ':body' => $input['body'],
            ':target_type' => $input['targetType'],
            ':target_id' => $input['targetId'],
            ':action_path' => $input['actionPath'],
            ':detail_data' => $input['detailDataJson'],
            ':created_by' => $input['createdBy'],
            ':expires_at' => $input['expiresAt'],
        ]);

        return (int) $this->pdo->lastInsertId();
    }

    private function insertRecipients(int $notificationId, array $recipientUserIds): array
    {
        $stmt = $this->pdo->prepare(
            'INSERT INTO notification_recipients
                (notification_id, user_id, is_read, read_at, delivered_at, created_at)
             VALUES
                (:notification_id, :user_id, 0, NULL, NULL, NOW())'
        );

        $rows = [];
        foreach ($recipientUserIds as $userId) {
            $stmt->execute([
                ':notification_id' => $notificationId,
                ':user_id' => $userId,
            ]);
            $rows[] = [
                'recipientId' => (int) $this->pdo->lastInsertId(),
                'userId' => (int) $userId,
            ];
        }

        return $rows;
    }
}
