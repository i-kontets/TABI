<?php

declare(strict_types=1);

/**
 * プッシュ通知の送信先端末(user_devices テーブル)を扱うデータアクセスクラスです。
 *
 * 主な流れ:
 * 1. ユーザーの存在確認や、通知を送れる有効な端末の一覧取得を行う
 * 2. 無効になったトークンの端末を停止(deactivate)する
 * 3. 端末情報をログや画面表示に使える安全な形式へ変換する
 *
 * 扱うデータ: user_devices テーブル(FCMトークン、端末名、プラットフォーム種別など)。
 */
final class FcmDeviceRepository
{
    /**
     * コンストラクタ。DB接続(PDO)を受け取って保持します。
     */
    public function __construct(private readonly PDO $pdo)
    {
    }

    /**
     * 指定したユーザーIDが users テーブルに存在するかを確認します。
     */
    public function userExists(int $userId): bool
    {
        // 存在確認だけなので、SELECT 1 と LIMIT 1 で最小限の問い合わせにします。
        $stmt = $this->pdo->prepare('SELECT 1 FROM users WHERE user_id = :user_id LIMIT 1');
        $stmt->execute([':user_id' => $userId]);

        // 1行でも取れれば存在する(true)と判断します。
        return (bool) $stmt->fetchColumn();
    }

    /**
     * 指定ユーザーの「通知を送信できる有効な端末」の一覧を取得します。
     * $deviceId を指定すると、その1台だけに絞り込めます(テスト送信用)。
     */
    public function findActiveDevicesForUser(int $userId, ?int $deviceId = null): array
    {
        // 有効な端末の条件:
        // - is_active = 1(有効フラグが立っている)
        // - revoked_at IS NULL(無効化されていない)
        // - push_token が空でない(トークンがなければ送信できない)
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

        // 端末IDの指定がある場合は、その端末だけに絞り込む条件を追加します。
        if ($deviceId !== null) {
            $sql .= "\n  AND device_id = :device_id";
            $params[':device_id'] = $deviceId;
        }

        // 結果の順序を安定させるため、端末IDの昇順で並べます。
        $sql .= "\nORDER BY device_id ASC";

        // SQLインジェクション対策として、値はプレースホルダ経由で渡します。
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);

        // 0件でも必ず配列を返します(false が返るケースを防ぐ)。
        return $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
    }

    /**
     * 端末を無効化します。FCMから「トークンが無効」と返された端末に対して呼ばれ、
     * 以降の送信対象から外します。
     */
    public function deactivateDevice(int $deviceId): void
    {
        // is_active = 1 の端末だけを対象にし、二重実行しても安全なようにします。
        // revoked_at は COALESCE により初回の無効化時刻を保持します。
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

    /**
     * 端末情報の行から、外部に出しても安全な項目だけを抜き出して返します。
     * push_token(秘密情報)は含めないのがポイントです。
     */
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
