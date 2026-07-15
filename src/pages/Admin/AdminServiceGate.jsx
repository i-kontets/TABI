import { useCallback, useEffect, useState } from 'react';
import { fetchServiceStatus } from '../../services/serviceStatus';
import AdminDatabaseOffline from './DatabaseOffline/AdminDatabaseOffline';

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
            const nextStatus = await fetchServiceStatus();
            setStatus(nextStatus);
        } catch {
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
        const initialTimeoutId = window.setTimeout(checkStatus, 0);

        const intervalId = window.setInterval(checkStatus, 60000);
        const handleVisibilityChange = () => {
            if (!document.hidden) {
                checkStatus();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        const handleDatabaseUnavailable = (event) => {
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
