import express from 'express';
import http from 'node:http';
import { Server } from 'socket.io';
import { pathToFileURL } from 'node:url';
import { verifyToken, validBearer, validEmit } from './auth.mjs';

// 本番もテストも同じ構築関数を利用します。テストはloopbackの空きポートだけで動かします。
export function createRealtimeServer({ authSecret, emitSecret, logger = () => {} }) {
    if (typeof authSecret !== 'string' || Buffer.byteLength(authSecret) < 32 || !emitSecret || authSecret === emitSecret) throw new Error('SERVER_AUTH_CONFIG_REQUIRED');
    const app = express();
    app.disable('x-powered-by');
    app.use(express.json({ limit: '16kb', strict: true }));
    const server = http.createServer(app);
    const io = new Server(server, { maxHttpBufferSize: 8192, cors: {
        origin: ['https://genshin.mond.jp', 'http://genshin.mond.jp', 'http://localhost:5173'], credentials: true,
    } });
    // handshake時点で認証し、接続後のjoinが未認証で実行される余地をなくします。
    io.use((socket, next) => {
        try {
            socket.data.auth = verifyToken(socket.handshake.auth?.token, authSecret);
            socket.data.userId = socket.data.auth.sub;
            next();
        } catch {
            logger('auth_rejected');
            const error = new Error('AUTH_INVALID');
            error.data = { code: 'AUTH_INVALID' };
            next(error);
        }
    });
    io.on('connection', socket => {
        const claims = socket.data.auth;
        socket.join(`user:${claims.sub}`);
        // 期限切れ後の居残りを防ぎ、所属・管理者権限の失効を最大120秒以内に反映します。
        const expiry = setTimeout(() => { socket.emit('auth_expired'); socket.disconnect(true); }, Math.max(0, claims.exp * 1000 - Date.now()));
        expiry.unref();
        const join = (kind, id, ack) => {
            const safeId = (typeof id === 'string' || Number.isSafeInteger(id)) ? String(id) : '';
            const room = kind === 'admin' ? 'admin:global' : `${kind}:${safeId}`;
            const ok = claims.exp * 1000 > Date.now() && claims.rooms.includes(room)
                && (kind === 'admin' || /^[1-9][0-9]{0,14}$/.test(safeId));
            if (ok) socket.join(room);
            if (typeof ack === 'function') ack({ ok, code: ok ? 'JOINED' : 'ROOM_FORBIDDEN' });
        };
        // 旧イベント名は残しますが、PHPが署名した許可room以外には参加させません。
        socket.on('join_user', (id, ack) => join('user', id, ack));
        socket.on('join_admin', ack => join('admin', null, ack));
        socket.on('join_trip', (id, ack) => join('trip', id, ack));
        socket.on('join_cottage', (id, ack) => join('cottage', id, ack));
        socket.on('leave_trip', id => { if (/^[1-9][0-9]{0,14}$/.test(String(id))) socket.leave(`trip:${id}`); });
        socket.on('leave_cottage', id => { if (/^[1-9][0-9]{0,14}$/.test(String(id))) socket.leave(`cottage:${id}`); });
        socket.on('disconnect', () => { clearTimeout(expiry); logger('disconnected'); });
        logger('connected');
    });
    app.get('/', (_req, res) => res.json({ ok: true, service: 'TABI WebSocket Server' }));
    app.get('/health', (_req, res) => res.json({ ok: true, status: 'running' }));
    app.post('/emit', (req, res) => {
        if (!validBearer(req.headers.authorization, emitSecret)) return res.status(401).json({ ok: false });
        if (!validEmit(req.body)) return res.status(400).json({ ok: false, code: 'INVALID_EVENT' });
        const { room, event, data = {} } = req.body;
        io.to(room).emit(event, data);
        logger('emit_accepted');
        return res.json({ ok: true, room, event });
    });
    // パーサー例外にも秘密値や入力本文を含めず、安全なエラーだけを返します。
    app.use((error, _req, res, _next) => res.status(error.status === 413 ? 413 : 400).json({ ok: false }));
    return { app, server, io };
}

// 直接起動とPM2のfork起動の両方で入口を判定します。PM2はargv[1]がラッパーになるため、
// PM2が渡す実行対象パスを優先します。テストからの単なるimportでは待受を始めません。
const entryPath = process.env.pm_exec_path || process.argv[1];
if (entryPath && import.meta.url === pathToFileURL(entryPath).href) {
    const { default: dotenv } = await import('dotenv');
    dotenv.config({ quiet: true });
    try {
        const { server } = createRealtimeServer({ authSecret: process.env.WS_AUTH_SECRET, emitSecret: process.env.REALTIME_SECRET, logger: message => console.log(message) });
        server.listen(Number(process.env.PORT || 3001), '0.0.0.0');
    } catch { console.error('WebSocketサーバー認証設定を確認してください。'); process.exitCode = 1; }
}
