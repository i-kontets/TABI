import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
    fetchServiceStatus,
    isAdminPath,
    isMaintenancePath,
    saveMaintenanceReason,
    saveReturnPath,
} from '../services/serviceStatus';

function LoadingScreen() {
    return (
        <div style={{
            minHeight: '100svh',
            display: 'grid',
            placeItems: 'center',
            color: '#1d2e57',
            background: '#f8fbff',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
            fontWeight: 700,
        }}>
            TABIを確認しています...
        </div>
    );
}

export default function ServiceAvailabilityGate({ children }) {
    const location = useLocation();
    const navigate = useNavigate();
    const [checked, setChecked] = useState(false);
    const [status, setStatus] = useState(null);
    const pathname = location.pathname;
    const bypass = useMemo(() => isAdminPath(pathname) || isMaintenancePath(pathname), [pathname]);

    const checkStatus = useCallback(async ({ initial = false } = {}) => {
        if (isAdminPath(window.location.pathname)) {
            setChecked(true);
            return;
        }

        try {
            const nextStatus = await fetchServiceStatus();
            setStatus(nextStatus);
            setChecked(true);

            if (!nextStatus.available && !isMaintenancePath(window.location.pathname)) {
                saveReturnPath(window.location.pathname, window.location.search);
                saveMaintenanceReason(nextStatus.reason);
                navigate('/maintenance', { replace: initial });
            }
        } catch {
            setChecked(true);
        }
    }, [navigate]);

    useEffect(() => {
        if (bypass) {
            setChecked(true);
            return undefined;
        }

        setChecked(false);
        checkStatus({ initial: true });

        const intervalId = window.setInterval(() => {
            checkStatus();
        }, 60000);

        const handleVisibility = () => {
            if (!document.hidden) {
                checkStatus();
            }
        };

        document.addEventListener('visibilitychange', handleVisibility);

        return () => {
            window.clearInterval(intervalId);
            document.removeEventListener('visibilitychange', handleVisibility);
        };
    }, [bypass, checkStatus, pathname]);

    useEffect(() => {
        if (!status?.available || !status.nextCloseAt || bypass) {
            return undefined;
        }

        const closeAt = new Date(status.nextCloseAt).getTime();
        const delay = closeAt - Date.now();

        if (delay <= 0) {
            checkStatus();
            return undefined;
        }

        const timeoutId = window.setTimeout(() => {
            checkStatus();
        }, Math.min(delay + 1000, 2147483647));

        return () => window.clearTimeout(timeoutId);
    }, [bypass, checkStatus, status]);

    if (!checked && !bypass) {
        return <LoadingScreen />;
    }

    return children;
}
