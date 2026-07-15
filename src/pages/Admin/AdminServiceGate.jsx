import { useCallback, useEffect, useState } from 'react';
import { fetchServiceStatus } from '../../services/serviceStatus';
import AdminDatabaseOffline from './DatabaseOffline/AdminDatabaseOffline';

/**
 * 管理者画面の表示前に、DBへ接続できる状態か確認するゲートコンポーネントです。
 *
 * DBが使える場合は通常の管理者画面を表示します。
 * DBが使えない場合は、子画面を表示せず AdminDatabaseOffline を表示します。
 */
function AdminCheckingScreen() {
    return (
        <div style={{
            minHeight: '100svh',
            display: 'grid',
            placeItems: 'center',
            color: '#102044',
            background: '#f4f7fc',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
            fontWeight: 700,
        }}>
            管理画面の状態を確認しています...
        </div>
    );
}

export default function AdminServiceGate({ children }) {
    const [status, setStatus] = useState(null);
    const [checking, setChecking] = useState(true);

    const checkStatus = useCallback(async () => {
        try {
            // status.php は実際のDB接続確認も行うため、ここではその結果だけを信頼します。
            const nextStatus = await fetchServiceStatus();
            setStatus(nextStatus);
        } catch {
            // 状態確認API自体が読めない場合も、管理画面を無理に表示せず停止画面へ倒します。
            setStatus({
                available: false,
                reason: 'STATUS_UNAVAILABLE',
                nextOpenAt: null,
                timezone: 'Asia/Tokyo',
            });
        } finally {
            setChecking(false);
        }
    }, []);

    useEffect(() => {
        // 初回表示時にすぐ確認し、その後も1分ごとに復旧・停止を見直します。
        const initialTimeoutId = window.setTimeout(checkStatus, 0);

        const intervalId = window.setInterval(checkStatus, 60000);
        const handleVisibilityChange = () => {
            // 別タブから戻ってきたタイミングでも、古い状態のままにしないよう再確認します。
            if (!document.hidden) {
                checkStatus();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        const handleDatabaseUnavailable = (event) => {
            // 管理APIの通常通信中にDB停止を検知した場合も、このイベントで即座に停止画面へ切り替えます。
            setStatus({
                available: false,
                reason: event.detail?.reason || 'DATABASE_UNAVAILABLE',
                now: event.detail?.now || null,
                nextOpenAt: event.detail?.nextOpenAt || null,
                nextCloseAt: event.detail?.nextCloseAt || null,
                timezone: event.detail?.timezone || 'Asia/Tokyo',
            });
            setChecking(false);
        };

        window.addEventListener('admin:database_unavailable', handleDatabaseUnavailable);

        return () => {
            window.clearTimeout(initialTimeoutId);
            window.clearInterval(intervalId);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('admin:database_unavailable', handleDatabaseUnavailable);
        };
    }, [checkStatus]);

    useEffect(() => {
        if (!status?.available || !status.nextCloseAt) {
            return undefined;
        }

        // 稼働予定の終了時刻に近づいたら再確認します。実際にDBが動いていれば通常画面のままです。
        const closeAt = new Date(status.nextCloseAt).getTime();
        const delay = closeAt - Date.now();

        if (delay <= 0) {
            const timeoutId = window.setTimeout(checkStatus, 0);
            return () => window.clearTimeout(timeoutId);
        }

        const timeoutId = window.setTimeout(checkStatus, Math.min(delay + 1000, 2147483647));
        return () => window.clearTimeout(timeoutId);
    }, [checkStatus, status]);

    if (checking && !status) {
        return <AdminCheckingScreen />;
    }

    if (!status?.available) {
        return <AdminDatabaseOffline status={status} onRetry={checkStatus} />;
    }

    return children;
}
