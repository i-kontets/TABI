import { test, after, before } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes, createHmac } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { createRealtimeServer } from './server.mjs';
import { verifyToken, validEmit } from './auth.mjs';

// 毎回メモリ内に独立した検証鍵を作り、本番secret・DB・3001番ポートには触れません。
const secret = randomBytes(48).toString('hex'), emitSecret = randomBytes(48).toString('hex');
const app = createRealtimeServer({ authSecret: secret, emitSecret });
let base;
const clients = [];
function token(user = '2', rooms = [], overrides = {}) {
    const now = Math.floor(Date.now() / 1000);
    const c = { v: 1, iss: 'tabi-php', aud: 'tabi-websocket', sub: user, iat: now, exp: now + 120, nonce: randomBytes(16).toString('hex'), rooms: [`user:${user}`, ...rooms], ...overrides };
    const body = Buffer.from(JSON.stringify(c)).toString('base64url');
    return `${body}.${createHmac('sha256', secret).update(`tabi-ws-v1.${body}`).digest('base64url')}`;
}

// Node標準WebSocketで実Socket.IOプロトコルを通します。新しい常駐テストサービスは作りません。
async function connect(authToken) {
    const ws = new WebSocket(base.replace('http', 'ws') + '/socket.io/?EIO=4&transport=websocket');
    const events = [], waiters = []; let sid, rejectAuth;
    const client = { ws, events, get sid() { return sid; },
        wait: predicate => new Promise((resolve, reject) => {
            const prior = events.find(predicate); if (prior) return resolve(prior);
            const timer = setTimeout(() => { const i=waiters.indexOf(entry); if(i>=0)waiters.splice(i,1); reject(new Error('event timeout')); }, 2500);
            const entry = { predicate, resolve: item => { clearTimeout(timer); resolve(item); } }; waiters.push(entry);
        }),
        send: (name, value) => ws.send('42' + JSON.stringify(value === undefined ? [name] : [name, value])),
        close: () => ws.close(),
    };
    clients.push(client);
    const ready = new Promise((resolve, reject) => {
        rejectAuth = reject;
        ws.addEventListener('error', () => reject(new Error('transport failed')));
        const timer = setTimeout(() => reject(new Error('connect timeout')), 2500);
        ws.addEventListener('message', ({ data }) => {
            const s = String(data);
            if (s.startsWith('0')) ws.send('40' + JSON.stringify(authToken ? { token: authToken } : {}));
            else if (s === '2') ws.send('3');
            else if (s.startsWith('40')) { sid = JSON.parse(s.slice(2)).sid; clearTimeout(timer); resolve(client); }
            else if (s.startsWith('44')) { clearTimeout(timer); ws.close(); reject(new Error('AUTH_INVALID')); }
            else if (s.startsWith('42')) {
                const e = JSON.parse(s.slice(2)); events.push(e);
                for (let i=waiters.length-1;i>=0;i--) if(waiters[i].predicate(e)) waiters.splice(i,1)[0].resolve(e);
            }
        });
    });
    void rejectAuth;
    return ready;
}
const pause = () => new Promise(resolve => setTimeout(resolve, 40));
const member = (c, room) => app.io.of('/').adapter.rooms.get(room)?.has(c.sid) || false;
async function emit(body, auth = `Bearer ${emitSecret}`) {
    return fetch(base + '/emit', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(auth ? { Authorization: auth } : {}) }, body: JSON.stringify(body) });
}
before(async () => { await new Promise(resolve => app.server.listen(0, '127.0.0.1', resolve)); base = `http://127.0.0.1:${app.server.address().port}`; });
after(async () => { for (const c of clients) c.close(); await new Promise(resolve => app.io.close(resolve)); });

test('tokenなし・不正署名・期限切れを拒否', async () => {
    await assert.rejects(connect(), /AUTH_INVALID/);
    await assert.rejects(connect(token() + 'x'), /AUTH_INVALID/);
    await assert.rejects(connect(token('2', [], { iat: 1, exp: 2 })), /AUTH_INVALID/);
});
test('user2本人roomへ自動参加し別IDへのjoinを拒否', async () => {
    const c = await connect(token()); assert.equal(member(c, 'user:2'), true);
    c.send('join_user', 999); await pause(); assert.equal(member(c, 'user:999'), false);
    c.send('join_user', { user_id: 999 }); await pause(); assert.equal(member(c, 'user:[object Object]'), false);
    const other = await connect(token('3')); other.send('join_user', 2); await pause(); assert.equal(member(other, 'user:2'), false);
});
test('管理者の署名claimがない接続はadmin roomへ参加不可', async () => {
    const user = await connect(token()); user.send('join_admin'); await pause(); assert.equal(member(user, 'admin:global'), false);
    const admin = await connect(token('1', ['admin:global'])); admin.send('join_admin'); await pause(); assert.equal(member(admin, 'admin:global'), true);
});
test('所属trip・許可cottageだけ参加し退出できる', async () => {
    const c = await connect(token('2', ['trip:10', 'cottage:20']));
    for (const [event, id, room, ok] of [['join_trip',10,'trip:10',true],['join_trip',11,'trip:11',false],['join_cottage',20,'cottage:20',true],['join_cottage',21,'cottage:21',false]]) {
        c.send(event,id); await pause(); assert.equal(member(c,room),ok);
    }
    c.send('leave_trip',10); c.send('leave_cottage',20); await pause();
    assert.equal(member(c,'trip:10'),false); assert.equal(member(c,'cottage:20'),false);
});
test('emit認証・event・room・payloadを検証', async () => {
    const body = { room: 'user:2', event: 'notification_created', data: { notificationId: 42 } };
    assert.equal((await emit(body, '')).status,401);
    assert.equal((await emit(body, 'Bearer invalid')).status,401);
    assert.equal((await emit(body, emitSecret)).status,401);
    for (const update of [{event:'unknown'}, {room:'other:2'}, {room:'user:02'}, {room:['user:2']}, {data:[]}, {data:{notificationId:'42'}}, {room:'trip:10'}]) {
        assert.equal((await emit({...body,...update})).status,400);
    }
});
test('user2の複数タブだけが受信しuser3には届かない', async () => {
    const a = await connect(token()), b = await connect(token()), other = await connect(token('3'));
    const received = c => c.wait(e => e[0] === 'notification_created' && e[1].notificationId === 123);
    const waiting = Promise.all([received(a), received(b)]);
    assert.equal((await emit({room:'user:2',event:'notification_created',data:{notificationId:123}})).status,200);
    await waiting; await pause(); assert.equal(other.events.some(e=>e[0]==='notification_created'),false);
});
test('disconnect後にsocketとroom参加が残らない', async () => {
    const c=await connect(token('88')); const sid=c.sid; c.close(); await pause();
    assert.equal(app.io.of('/').sockets.has(sid),false); assert.equal(app.io.of('/').adapter.rooms.has('user:88'),false);
});
test('期限が来た接続を切断しroomも破棄する', async () => {
    const now=Math.floor(Date.now()/1000); const c=await connect(token('89',[],{iat:now,exp:now+1}));
    await c.wait(e=>e[0]==='auth_expired'); await pause(); assert.equal(member(c,'user:89'),false);
});
test('claimの用途・未来時刻・長期TTL・偽user room・巨大tokenを拒否', () => {
    const now=Math.floor(Date.now()/1000);
    for(const change of [{iss:'other'},{aud:'other'},{v:2},{iat:now+10,exp:now+120},{exp:now+121},{sub:'02'},{rooms:['user:2','user:3']},{nonce:'x'}]) assert.throws(()=>verifyToken(token('2',[],change),secret));
    assert.throws(()=>verifyToken('x'.repeat(5000),secret));
    assert.throws(()=>createRealtimeServer({authSecret:secret,emitSecret:secret}));
});
test('既存のPHP送信eventと管理者・ユーザー購読eventの互換性', () => {
    assert.equal(validEmit({room:'admin:global',event:'system_error_created',data:{}}),true);
    assert.equal(validEmit({room:'trip:10',event:'chat_message_created',data:{}}),true);
    assert.equal(validEmit({room:'admin:global',event:'notice_created',data:{}}),true);
});
test('PHP標準HMAC発行tokenをNodeが検証できる', { skip: process.env.WS_TEST_PHP !== '1' }, () => {
    // secretとtokenは子プロセスの標準入出力だけで渡し、テスト出力には載せません。
    const code = `require '/var/www/html/TABI/api/auth/WebSocketAuth.php'; $x=json_decode(stream_get_contents(STDIN),true); echo wsIssueToken(2,['user:2','trip:10'],$x['secret'])['token'];`;
    const signed=execFileSync('docker',['compose','exec','-T','apache','php','-r',code],{input:JSON.stringify({secret}),encoding:'utf8'});
    assert.equal(verifyToken(signed,secret).sub,'2');
});
