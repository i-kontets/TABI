import { io } from 'socket.io-client';

// user/adminの接続で同じSession→短寿命tokenフローを利用します。secretは受け取りません。
export function createAuthenticatedSocket({ ioFactory = io, request = fetch, baseUrl = import.meta.env?.BASE_URL || '/TABI/' } = {}) {
    let rooms = [], wanted = false, generation = 0, pending = null, retry = null, failures = 0;
    const url = import.meta.env?.VITE_SOCKET_URL || 'https://ws.tabital.com';
    const socket = ioFactory(url, {
        transports: ['websocket'], autoConnect: false, reconnection: true, reconnectionAttempts: 5,
        reconnectionDelay: 1000, reconnectionDelayMax: 30000, randomizationFactor: 0.5,
        // Socket.IOが再接続するたびにPHP Sessionを再確認し、古いtokenを再利用しません。
        auth: async callback => {
            const current = generation;
            pending?.abort();
            const controller = new AbortController();
            pending = controller;
            const timeout = setTimeout(() => controller.abort(), 8000);
            try {
                const response = await request(`${baseUrl}api/auth/WebSocketToken.php`, {
                    method: 'POST', credentials: 'include', cache: 'no-store',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ rooms }), signal: controller.signal,
                });
                if (!wanted || current !== generation) return;
                if (response.status === 401 || response.status === 403) { socket.disconnect(); return; }
                if (!response.ok) throw new Error('TOKEN_UNAVAILABLE');
                const result = await response.json();
                if (!wanted || current !== generation) return;
                if (typeof result.token !== 'string' || !result.token) throw new Error('TOKEN_UNAVAILABLE');
                socket.authenticatedUserId = Number.isSafeInteger(result.userId) ? result.userId : null;
                callback({ token: result.token });
            } catch {
                if (!wanted || current !== generation) return;
                // 空tokenで接続を継続せず、今回の接続を閉じて有限回だけ再試行します。
                rawDisconnect();
                scheduleRetry();
            } finally {
                clearTimeout(timeout);
            }
        },
    });
    const rawConnect = socket.connect.bind(socket), rawDisconnect = socket.disconnect.bind(socket);
    function scheduleRetry() {
        if (!wanted || retry || failures >= 5) return;
        const delay = Math.min(30000, 1000 * 2 ** failures++);
        retry = setTimeout(() => { retry = null; if (wanted) rawConnect(); }, delay);
    }
    socket.connect = () => { wanted = true; failures = 0; return rawConnect(); };
    socket.disconnect = () => {
        wanted = false; generation++; pending?.abort(); clearTimeout(retry); retry = null;
        socket.authenticatedUserId = null;
        return rawDisconnect();
    };
    // 画面遷移で必要なroomが変わったときだけ、DB認可を取り直して接続します。
    socket.setRequestedRooms = requested => {
        const next = [...new Set(requested)].sort();
        if (JSON.stringify(next) === JSON.stringify(rooms)) return;
        const reconnect = wanted;
        socket.disconnect(); rooms = next; failures = 0;
        if (reconnect) socket.connect();
    };
    socket.on('connect', () => { failures = 0; });
    socket.on('connect_error', error => { if (error?.data?.code === 'AUTH_INVALID') scheduleRetry(); });
    // サーバーは期限切れに接続を閉じます。ログアウト等で意図的に閉じた場合は再接続しません。
    socket.on('disconnect', reason => { if (reason === 'io server disconnect') scheduleRetry(); });
    return socket;
}
