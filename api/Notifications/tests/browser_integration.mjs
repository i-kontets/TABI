// 通知の最終確認から起動する、ローカル専用の実ブラウザテストです。
// 実PHP・Docker DBを使い、AWS通信だけをブラウザ内とHTTPスタブで置き換えます。
import process from 'node:process';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const runtime = process.env.TABI_PLAYWRIGHT_MODULE;
if (!runtime) throw new Error('TABI_PLAYWRIGHT_MODULEへローカルPlaywrightのモジュールパスを指定してください。');
const { chromium } = createRequire(import.meta.url)(runtime);
const container = 'tabi-notification-browser-' + randomUUID().slice(0, 8);
const docker = (args, input) => execFileSync('docker', args, { input, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
let running = false;
let fixture = null;
let browser = null;
let checks = 0;
const check = (ok, label) => { if (!ok) throw new Error(label); checks++; console.log('PASS: ' + label); };

// セッション・資格情報は子プロセスとのメモリ上の受け渡しに限定し、ログへ出しません。
const fixturePhp = `
if (getenv('DB_HOST') !== 'db' || getenv('DB_NAME') !== 'tabi') exit(1);
$p=new PDO('mysql:host=db;dbname=tabi;charset=utf8mb4',getenv('DB_USER'),getenv('DB_PASSWORD'),[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION]);
$run=bin2hex(random_bytes(12));$out=['run'=>$run,'users'=>[],'sessions'=>[]];
foreach(['admin','A','B'] as $role){
 $p->prepare("INSERT INTO users(name,email,password_hash,status,created_at,updated_at) VALUES (?,?,'unusable-browser-test','active',NOW(),NOW())")->execute(['通知画面検証'.$role,$run.$role.'@example.invalid']);
 $out['users'][$role]=(int)$p->lastInsertId();$sid=bin2hex(random_bytes(24));$out['sessions'][$role]=$sid;
 session_id($sid);session_start();$_SESSION=['user_id'=>$out['users'][$role]];session_write_close();
}
$p->prepare('INSERT INTO admin_users(user_id,admin_level,created_at) VALUES (?,9,NOW())')->execute([$out['users']['admin']]);
echo json_encode($out);`;
const cleanupPhp = `
if(getenv('DB_HOST')!=='db'||getenv('DB_NAME')!=='tabi')exit(1);
$f=json_decode(stream_get_contents(STDIN),true);if(!preg_match('/^[a-f0-9]{24}$/D',$f['run']??''))exit(1);
$p=new PDO('mysql:host=db;dbname=tabi;charset=utf8mb4',getenv('DB_USER'),getenv('DB_PASSWORD'),[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION]);
foreach($f['users'] as $role=>$id){$s=$p->prepare('SELECT COUNT(*) FROM users WHERE user_id=? AND email=?');$s->execute([$id,$f['run'].$role.'@example.invalid']);if((int)$s->fetchColumn()!==1)exit(1);}
$p->prepare('DELETE FROM admin_notices WHERE created_by=?')->execute([$f['users']['admin']]);
$p->prepare('DELETE FROM notifications WHERE created_by=?')->execute([$f['users']['admin']]);
$p->prepare('DELETE FROM admin_users WHERE user_id=?')->execute([$f['users']['admin']]);
foreach($f['users'] as $id)$p->prepare('DELETE FROM users WHERE user_id=?')->execute([$id]);
foreach($f['sessions'] as $sid)if(preg_match('/^[a-f0-9]{48}$/D',$sid))@unlink((session_save_path()?:sys_get_temp_dir()).'/sess_'.$sid);
echo 'cleaned';`;

try {
    const meta = JSON.parse(docker(['inspect', 'tabi-apache-1']))[0];
    const env = Object.fromEntries(meta.Config.Env.map((item) => { const i = item.indexOf('='); return [item.slice(0, i), item.slice(i + 1)]; }));
    check(env.DB_HOST === 'db' && env.DB_NAME === 'tabi', '接続先はローカルDocker DB');
    const envLines = ['DB_HOST=db', 'DB_NAME=tabi', 'DB_USER=' + env.DB_USER, 'DB_PASSWORD=' + env.DB_PASSWORD, 'REALTIME_EMIT_URL=http://127.0.0.1:18093/emit', 'REALTIME_SECRET=local-browser-placeholder', 'NOTICE_TEST_EVENTS=/tmp/tabi-browser-events'];
    docker(['run', '-d', '--rm', '--name', container, '--network', Object.keys(meta.NetworkSettings.Networks)[0], '-p', '127.0.0.1:18094:18094', '--env-file', '/dev/stdin', '-v', root + ':/var/www/html/TABI:ro', meta.Config.Image, 'php', '-S', '0.0.0.0:18094', '-t', '/var/www/html'], envLines.join('\n') + '\n');
    running = true;
    docker(['exec', '-d', container, 'php', '-S', '127.0.0.1:18093', '/var/www/html/TABI/api/Notifications/tests/emit_stub.php']);
    fixture = JSON.parse(docker(['exec', container, 'php', '-r', fixturePhp]));
    await delay(500);
    browser = await chromium.launch({ headless: true });
    const connections = new Map();
    let eventCursor = 0;
    let postPayload;
    let created;
    const deliveries = { A: 0, B: 0 };
    const pump = () => {
        let lines;
        try { lines = docker(['exec', container, 'cat', '/tmp/tabi-browser-events']).trim().split('\n').filter(Boolean); } catch { return; }
        for (const line of lines.slice(eventCursor)) {
            const event = JSON.parse(line);
            if (event.event !== 'notification_created') continue;
            for (const connection of connections.get(event.room) ?? []) {
                connection.ws.send('42' + JSON.stringify([event.event, event.data]));
                if (connection.role in deliveries) deliveries[connection.role]++;
            }
        }
        eventCursor = lines.length;
    };
    const pages = {};
    for (const role of ['admin', 'A', 'B']) {
        const context = await browser.newContext();
        await context.addCookies([{ name: 'PHPSESSID', value: fixture.sessions[role], domain: 'localhost', path: '/' }]);
        // 外部の実ユーザー用ルームへ入らず、実クライアントのjoin_userと受信イベントを検証します。
        await context.routeWebSocket('**/socket.io/**', (ws) => {
            ws.send('0' + JSON.stringify({ sid: role, upgrades: [], pingInterval: 25000, pingTimeout: 20000, maxPayload: 1000000 }));
            ws.onMessage((message) => {
                if (message === '40') ws.send('40' + JSON.stringify({ sid: role }));
                if (typeof message === 'string' && message.startsWith('42')) {
                    const [event, id] = JSON.parse(message.slice(2));
                    if (event === 'join_user') {
                        const room = 'user:' + id;
                        const entries = connections.get(room) ?? [];
                        entries.push({ ws, role }); connections.set(room, entries);
                        ws.onClose(() => connections.set(room, (connections.get(room) ?? []).filter((entry) => entry.ws !== ws)));
                    }
                }
            });
        });
        await context.route('**/*', async (route) => {
            const url = new URL(route.request().url());
            if (url.hostname !== 'localhost') return route.abort();
            if (!url.pathname.startsWith('/TABI/api/')) return route.continue();
            const isNoticePost = url.pathname === '/TABI/api/Admin/index.php' && route.request().method() === 'POST' && url.searchParams.get('resource') === 'notices';
            if (isNoticePost) postPayload = route.request().postDataJSON();
            url.port = '18094';
            const response = await route.fetch({ url: url.toString() });
            if (isNoticePost && response.status() === 200) created = await response.json();
            await route.fulfill({ response });
            pump();
        });
        pages[role] = await context.newPage();
    }
    const { admin, A, B } = pages;
    const base = 'http://localhost:5173/TABI';
    await Promise.all([A.goto(base + '/notifications'), B.goto(base + '/notifications'), admin.goto(base + '/admin/notices/new')]);
    for (let i = 0; i < 50 && (!connections.has('user:' + fixture.users.A) || !connections.has('user:' + fixture.users.B)); i++) await delay(100);
    check(connections.has('user:' + fixture.users.A) && connections.has('user:' + fixture.users.B), 'UserRealtimeListenerが各本人のuserルームへ参加');
    const title = 'ブラウザ通知検証 ' + fixture.run.slice(0, 8);
    await admin.getByLabel('タイトル').fill(title);
    await admin.getByLabel('本文', { exact: false }).fill('ローカルDBと通知画面の統合検証です。');
    await admin.getByRole('combobox').selectOption('特定ユーザー');
    await admin.getByLabel('ユーザーID', { exact: true }).fill(String(fixture.users.A));
    admin.once('dialog', (dialog) => dialog.accept());
    await admin.getByRole('button', { name: '確認する', exact: true }).click();
    await admin.waitForURL('**/admin/notices');
    check(Boolean(postPayload.requestKey) && Number(postPayload.targetId) === fixture.users.A && Boolean(created.notificationId), '管理画面からrequestKey・targetIdを送信して通知保存');
    await A.getByRole('button', { name: title + '、未読', exact: true }).waitFor();
    check(deliveries.A === 1 && deliveries.B === 0 && await B.getByRole('button', { name: title + '、未読', exact: true }).count() === 0, 'PHP送信→Listener→対象Aだけ一覧へ未読表示');
    const count = async (page) => page.evaluate(async () => (await (await fetch('/TABI/api/Notifications/UnreadCount.php')).json()).data.unreadCount);
    check(await count(A) === 1 && await count(B) === 0, '対象Aの未読件数1、対象外Bは0');
    await A.getByRole('button', { name: title + '、未読', exact: true }).click();
    await A.waitForURL('**/notifications/*');
    check(await count(A) === 0, '通知を開くと未読件数が減少');
    await A.reload();
    await A.getByText(title, { exact: true }).waitFor();
    await A.goto(base + '/notifications');
    await A.getByRole('button', { name: title + '、既読', exact: true }).waitFor();
    check(await count(A) === 0, '実ページ再読み込み後も既読状態と未読0を維持');
    const repeated = await admin.evaluate(async (body) => (await (await fetch('/TABI/api/Admin/index.php?resource=notices', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })).json()), postPayload);
    check(repeated.notificationId === created.notificationId && deliveries.A === 1, '同一requestKey再送でも同じ通知ID・追加配信なし');
    console.log(`合計 ${checks} PASS。AWS通信はスタブ、本番DBアクセスなし。`);
} catch (error) {
    // ブラウザや子プロセスの診断本文にCookie等が混ざらないよう、短い先頭行だけを表示します。
    console.error('FAIL: ' + String(error.message).split('\n')[0]);
    process.exitCode = 1;
} finally {
    if (browser) await browser.close();
    if (fixture && running) {
        try { docker(['exec', '-i', container, 'php', '-r', cleanupPhp], JSON.stringify(fixture)); }
        catch { console.error('ローカル検証行の後片付けを確認してください。'); process.exitCode = 1; }
    }
    if (running) docker(['stop', container]);
}
