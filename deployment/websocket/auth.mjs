import { createHmac, timingSafeEqual } from 'node:crypto';

// PHPの署名仕様を限定して検証します。ユーザーID・roleを別の入力から補完しません。
export function verifyToken(token, secret, now = Math.floor(Date.now() / 1000)) {
    if (typeof secret !== 'string' || Buffer.byteLength(secret) < 32 || typeof token !== 'string' || token.length > 4096) throw new Error('AUTH_INVALID');
    const parts = token.split('.');
    if (parts.length !== 2 || !parts.every(p => /^[A-Za-z0-9_-]+$/.test(p))) throw new Error('AUTH_INVALID');
    const signature = Buffer.from(parts[1], 'base64url');
    const expected = createHmac('sha256', secret).update(`tabi-ws-v1.${parts[0]}`).digest();
    if (signature.length !== expected.length || !timingSafeEqual(signature, expected)) throw new Error('AUTH_INVALID');
    const c = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'));
    if (c.v !== 1 || c.iss !== 'tabi-php' || c.aud !== 'tabi-websocket'
        || typeof c.sub !== 'string' || !/^[1-9][0-9]{0,14}$/.test(c.sub)
        || !Number.isInteger(c.iat) || !Number.isInteger(c.exp) || c.iat > now + 5
        || c.exp <= now || c.exp <= c.iat || c.exp - c.iat > 120
        || typeof c.nonce !== 'string' || !/^[a-f0-9]{32}$/.test(c.nonce)
        || !Array.isArray(c.rooms) || c.rooms.length > 10
        || !c.rooms.includes(`user:${c.sub}`)
        || c.rooms.some(r => typeof r !== 'string' || !(r === `user:${c.sub}` || r === 'admin:global' || /^(trip|cottage):[1-9][0-9]{0,14}$/.test(r)))) throw new Error('AUTH_INVALID');
    return c;
}

// roomごとの既存購読イベントを維持し、未知イベント・別用途のroomを拒否します。
const admin = `user_created user_updated user_deleted user_active_updated system_error_created system_error_resolved group_created group_updated group_deleted post_created post_updated post_deleted report_created report_updated inquiry_created inquiry_updated notice_created notice_updated notice_deleted spot_created spot_updated spot_deleted manager_created manager_updated manager_deleted`.split(' ');
const trip = `trip_updated trip_member_joined trip_member_left chat_message_created chat_message_updated chat_message_deleted talk_message_created candidate_created poll_created poll_updated poll_deleted poll_vote_updated schedule_created schedule_updated checklist_created checklist_updated checklist_deleted photo_uploaded photo_deleted album_updated packing_item_created packing_item_updated packing_item_deleted payment_updated`.split(' ');
export const EVENT_ALLOWLIST = Object.freeze({
    admin: new Set(admin), trip: new Set(trip),
    user: new Set([...trip, 'notification_created', 'user_updated']),
    cottage: new Set(['chat_message_created', 'chat_message_updated', 'chat_message_deleted']),
});
export function validEmit(body) {
    if (!body || typeof body !== 'object' || Array.isArray(body) || typeof body.room !== 'string' || typeof body.event !== 'string') return false;
    const match = /^(user|trip|cottage):[1-9][0-9]{0,14}$/.exec(body.room);
    const kind = body.room === 'admin:global' ? 'admin' : match?.[1];
    if (!kind || !EVENT_ALLOWLIST[kind].has(body.event)) return false;
    if (body.data !== undefined && (!body.data || typeof body.data !== 'object' || Array.isArray(body.data))) return false;
    if (body.event === 'notification_created' && (!Number.isSafeInteger(body.data?.notificationId) || body.data.notificationId < 1)) return false;
    return true;
}
export function validBearer(header, secret) {
    if (typeof secret !== 'string' || !secret || typeof header !== 'string') return false;
    const match = /^Bearer ([^\s]+)$/i.exec(header);
    if (!match) return false;
    const a = Buffer.from(match[1]), b = Buffer.from(secret);
    return a.length === b.length && timingSafeEqual(a, b);
}
