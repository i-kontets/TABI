// 通知作業の実配信確認から手動起動します。--liveがない通常実行では外部へ接続しません。
// RDSに存在しない検証用IDの部屋を使い、実ユーザーへの通知やDB書き込みを避けます。
import process from 'node:process';
import { randomInt } from 'node:crypto';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { io } from 'socket.io-client';

if (!process.argv.includes('--live')) {
    console.log('外部配信テストは --live を指定した場合だけ実行します。');
    process.exit(0);
}

const userA = randomInt(1000000000, 1500000000);
const userB = userA + 1;
const notificationId = randomInt(1500000001, 2000000000);
const sockets = [];
const received = [0, 0];
try {
    for (const [index, userId] of [userA, userB].entries()) {
        const socket = io('https://ws.tabital.com', { transports: ['websocket'], reconnection: false, autoConnect: false, timeout: 8000 });
        sockets.push(socket);
        socket.on('notification_created', (data) => {
            if (data?.notificationId === notificationId) received[index]++;
        });
        await new Promise((resolve, reject) => {
            socket.once('connect_error', () => reject(new Error('Socket.IO接続失敗')));
            socket.once('connect', () => { socket.emit('join_user', userId); resolve(); });
            socket.connect();
        });
    }
    // 既存サーバーのjoin_userはACK契約が未確認のため、送信前に短い待機を設けます。
    await delay(500);
    // 秘密鍵はPHP側の既存設定で解決します。Node・引数・出力へ秘密値を渡しません。
    const php = `require '/var/www/html/TABI/api/Admin/services/realtime.php';
        try { $r=sendRealtimeEvent('user:'.$argv[1], 'notification_created', ['notificationId'=>(int)$argv[2]], false);
        echo json_encode(['ok'=>(bool)$r['ok'],'httpCode'=>$r['http_code']]); }
        catch (Throwable) { echo json_encode(['ok'=>false,'httpCode'=>0]); exit(1); }`;
    const result = await new Promise((resolve, reject) => {
        const child = spawn('docker', ['exec', 'tabi-apache-1', 'php', '-d', 'display_errors=0', '-d', 'log_errors=0', '-r', php, String(userA), String(notificationId)], { stdio: ['ignore', 'pipe', 'ignore'] });
        let output = '';
        child.stdout.on('data', (chunk) => { output += chunk; });
        child.once('error', () => reject(new Error('PHP送信処理を起動できません')));
        child.once('close', (code) => {
            try { if (code !== 0) throw new Error(); resolve(JSON.parse(output)); }
            catch { reject(new Error('PHP送信結果を確認できません')); }
        });
    });
    console.log(`PHP emit HTTP status: ${result.httpCode}`);
    if (!result.ok) throw new Error('既存emitへの配信依頼失敗');
    await delay(1500);
    if (received[0] !== 1 || received[1] !== 0) throw new Error('対象部屋への1回受信・別部屋への非配信を確認できません');
    console.log('PASS: 既存PHP → AWS Socket.IO → 検証用Aだけ1回受信、検証用Bは0回');
    console.log('DB保存・実ユーザー認証・React画面操作は別のテスト対象です。');
} catch (error) {
    console.error('FAIL: ' + error.message);
    process.exitCode = 1;
} finally {
    for (const socket of sockets) socket.disconnect();
}
