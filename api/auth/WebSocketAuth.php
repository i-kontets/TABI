<?php
declare(strict_types=1);
/** 既存の接続用認可を担当します。本人とroomを照合し、管理roomにも共通の管理者条件を適用します。 */
require_once __DIR__ . '/AdminAccess.php';

// Token APIから呼びます。共有ホスティングで環境変数を設定できない場合も、
// Web公開領域の外に置いた本人だけが読めるファイルを使い、.htaccessへ秘密値を書きません。
function wsReadAuthSecret(?string $privatePath = null): string
{
    $environment = getenv('WS_AUTH_SECRET');
    if ($environment !== false && $environment !== '') return $environment;
    $privatePath ??= dirname(__DIR__, 4) . '/private/TABI/ws-auth-secret';
    if (!is_file($privatePath) || is_link($privatePath) || !is_readable($privatePath)) return '';
    $permissions = fileperms($privatePath);
    if ($permissions === false || ($permissions & 0077) !== 0) return '';
    $value = file_get_contents($privatePath, false, null, 0, 4097);
    return is_string($value) && strlen($value) <= 4096 ? rtrim($value, "\r\n") : '';
}

// WebSocketToken.phpから呼ぶ、DBに基づく本人・room権限判定です。
// フロントのuser_idやroleは使わず、ログイン済みSessionのIDだけを受け取ります。
function wsAllowedRooms(PDO $pdo, int $userId, array $requested): array
{
    if (count($requested) > 8) throw new InvalidArgumentException('要求roomが多すぎます。');
    $stmt = $pdo->prepare("SELECT user_id FROM users WHERE user_id=? AND status='active' AND deleted_at IS NULL");
    $stmt->execute([$userId]);
    if (!$stmt->fetchColumn()) throw new DomainException('有効なログインが必要です。');
    $rooms = ['user:' . $userId];
    // 管理APIの閲覧条件（level>=1）を再利用します。書き込み条件のlevel>=5とは区別します。
    // 接続基盤は変えず、管理データの購読も管理APIと同じ許可条件にそろえます。
    if (tabiAdminLevel($pdo, $userId) >= 1) $rooms[] = 'admin:global';
    foreach ($requested as $room) {
        if (!is_string($room) || !preg_match('/^(trip|cottage):([1-9][0-9]{0,14})$/D', $room, $match)) {
            throw new InvalidArgumentException('要求roomの形式が不正です。');
        }
        if ($match[1] === 'trip') {
            // 既存のtrip roomはtrip_idではなくgroup_idです。招待待ち・停止グループを除外します。
            $stmt = $pdo->prepare("SELECT 1 FROM group_members gm INNER JOIN user_groups g ON g.group_id=gm.group_id WHERE gm.user_id=? AND gm.group_id=? AND gm.invitation_status='accepted' AND g.status='active' LIMIT 1");
        } else {
            // 現行CottageChat APIのchat_membersを再利用し、ホテルチャットのchat_idで限定します。
            $stmt = $pdo->prepare("SELECT 1 FROM chat_members cm INNER JOIN chats c ON c.chat_id=cm.chat_id WHERE cm.user_id=? AND cm.chat_id=? AND c.chat_type='hotel' LIMIT 1");
        }
        $stmt->execute([$userId, (int) $match[2]]);
        // 不許可roomは署名しません。本人用通知の接続は維持し、join時にAWS側で拒否します。
        if ($stmt->fetchColumn()) $rooms[] = $room;
    }
    return array_values(array_unique($rooms));
}

// PHP/Node標準のHMAC-SHA256で、用途を固定した短寿命tokenを生成します。
// ログ・URL・localStorageへtokenを残さず、ブラウザには署名済みtokenだけを返します。
function wsIssueToken(int $userId, array $rooms, string $secret, ?int $now = null): array
{
    if (strlen($secret) < 32) throw new RuntimeException('WebSocket認証設定がありません。');
    $now ??= time();
    $claims = ['v'=>1, 'iss'=>'tabi-php', 'aud'=>'tabi-websocket', 'sub'=>(string)$userId,
        'iat'=>$now, 'exp'=>$now + 120, 'nonce'=>bin2hex(random_bytes(16)), 'rooms'=>$rooms];
    $encode = static fn(string $data): string => rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    $body = $encode(json_encode($claims, JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR));
    $token = $body . '.' . $encode(hash_hmac('sha256', 'tabi-ws-v1.' . $body, $secret, true));
    // userIdは旧サーバーとの短い切り替え期間のjoin互換用です。新サーバーの認証根拠にはしません。
    return ['token'=>$token, 'expiresAt'=>$claims['exp'], 'userId'=>$userId];
}
