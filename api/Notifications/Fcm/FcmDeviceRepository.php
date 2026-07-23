<?php

declare(strict_types=1);

final class FcmDeviceRepository
{
    public function __construct(private readonly PDO $pdo)
    {
    }

    public function userExists(int $userId): bool
    {
        $stmt = $this->pdo->prepare('SELECT 1 FROM users WHERE user_id = :user_id LIMIT 1');
        $stmt->execute([':user_id' => $userId]);

        return (bool) $stmt->fetchColumn();
    }

    public function findActiveDevicesForUser(int $userId, ?int $deviceId = null): array
    {
        $sql = <<<SQL
SELECT
    device_id,
    user_id,
    push_token,
    platform,
    app_type,
    device_name,
    browser
FROM user_devices
WHERE user_id = :user_id
  AND is_active = 1
  AND revoked_at IS NULL
  AND push_token IS NOT NULL
  AND TRIM(push_token) <> ''
SQL;
        $params = [':user_id' => $userId];

        if ($deviceId !== null) {
            $sql .= "\n  AND device_id = :device_id";
            $params[':device_id'] = $deviceId;
        }

        $sql .= "\nORDER BY device_id ASC";

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);

        return $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
    }

    public function deactivateDevice(int $deviceId): void
    {
        $stmt = $this->pdo->prepare(
            'UPDATE user_devices
             SET is_active = 0,
                 revoked_at = COALESCE(revoked_at, NOW()),
                 updated_at = NOW()
             WHERE device_id = :device_id
               AND is_active = 1'
        );
        $stmt->execute([':device_id' => $deviceId]);
    }

    public static function publicDeviceSummary(array $device): array
    {
        return [
            'deviceId' => (int) $device['device_id'],
            'userId' => (int) $device['user_id'],
            'platform' => $device['platform'] ?? null,
            'appType' => $device['app_type'] ?? null,
            'deviceName' => $device['device_name'] ?? null,
            'browser' => $device['browser'] ?? null,
        ];
    }
}
