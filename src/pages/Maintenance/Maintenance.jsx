import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    clearReturnPath,
    clearMaintenanceReason,
    fetchServiceStatus,
    getMaintenanceReason,
    getReturnPath,
    probeDatabaseAvailability,
} from '../../services/serviceStatus';
import styles from './Maintenance.module.css';

function formatNextOpen(value) {
    if (!value) {
        return '再開予定を確認中です';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return '再開予定を確認中です';
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const targetDay = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
    const diffDays = Math.round((targetDay - today) / 86400000);
    const time = date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });

    if (diffDays === 0) {
        return `本日 ${time}〜`;
    }

    if (diffDays === 1) {
        return `明日 ${time}〜`;
    }

    const day = date.toLocaleDateString('ja-JP', {
        month: 'numeric',
        day: 'numeric',
        weekday: 'short',
    });
    return `${day} ${time}〜`;
}

function MaintenanceIllustration() {
    return (
        <div className={styles.illustration} aria-hidden="true">
            <span className={`${styles.gear} ${styles.gearOne}`}>⚙</span>
            <span className={`${styles.gear} ${styles.gearTwo}`}>⚙</span>
            <span className={`${styles.sparkle} ${styles.sparkleOne}`}>✦</span>
            <span className={`${styles.sparkle} ${styles.sparkleTwo}`}>✦</span>
            <div className={styles.barrier}>
                <div className={styles.sign}>
                    <div className={styles.alertTriangle}>!</div>
                </div>
                <div className={styles.board} />
                <div className={styles.legLeft} />
                <div className={styles.legRight} />
            </div>
            <div className={styles.coneLeft} />
            <div className={styles.coneRight} />
        </div>
    );
}

export default function Maintenance() {
    const navigate = useNavigate();
    const [status, setStatus] = useState(() => ({
        available: false,
        reason: getMaintenanceReason() || 'OUTSIDE_SERVICE_HOURS',
        nextOpenAt: null,
    }));
    const [checking, setChecking] = useState(false);
    const isDatabaseUnavailable = status.reason === 'DATABASE_UNAVAILABLE';
    const nextOpenLabel = useMemo(() => formatNextOpen(status.nextOpenAt), [status.nextOpenAt]);

    const returnToApp = useCallback(async () => {
        setChecking(true);
        try {
            const nextStatus = await fetchServiceStatus();
            let savedReason = getMaintenanceReason();
            if (!nextStatus.available && nextStatus.reason === 'OUTSIDE_SERVICE_HOURS') {
                clearMaintenanceReason();
                savedReason = null;
            }
            const mergedStatus = savedReason === 'DATABASE_UNAVAILABLE'
                ? { ...nextStatus, available: false, reason: 'DATABASE_UNAVAILABLE' }
                : nextStatus;
            setStatus(mergedStatus);

            if (savedReason === 'DATABASE_UNAVAILABLE') {
                const databaseAvailable = await probeDatabaseAvailability();
                if (!databaseAvailable) {
                    return;
                }
            }

            if (nextStatus.available) {
                const returnPath = getReturnPath();
                clearReturnPath();
                clearMaintenanceReason();
                navigate(returnPath, { replace: true });
            }
        } finally {
            setChecking(false);
        }
    }, [navigate]);

    useEffect(() => {
        let mounted = true;

        const check = async () => {
            const nextStatus = await fetchServiceStatus();
            if (!mounted) return;
            let savedReason = getMaintenanceReason();
            if (!nextStatus.available && nextStatus.reason === 'OUTSIDE_SERVICE_HOURS') {
                clearMaintenanceReason();
                savedReason = null;
            }
            const mergedStatus = savedReason === 'DATABASE_UNAVAILABLE'
                ? { ...nextStatus, available: false, reason: 'DATABASE_UNAVAILABLE' }
                : nextStatus;
            setStatus(mergedStatus);

            if (savedReason === 'DATABASE_UNAVAILABLE') {
                const databaseAvailable = await probeDatabaseAvailability();
                if (!mounted || !databaseAvailable) {
                    return;
                }
            }

            if (nextStatus.available) {
                const returnPath = getReturnPath();
                clearReturnPath();
                clearMaintenanceReason();
                navigate(returnPath, { replace: true });
            }
        };

        check().catch(() => {});
        const intervalId = window.setInterval(() => {
            check().catch(() => {});
        }, 60000);

        const handleVisibility = () => {
            if (!document.hidden) {
                check().catch(() => {});
            }
        };

        document.addEventListener('visibilitychange', handleVisibility);

        return () => {
            mounted = false;
            window.clearInterval(intervalId);
            document.removeEventListener('visibilitychange', handleVisibility);
        };
    }, [navigate]);

    return (
        <main className={styles.page}>
            <header className={styles.header}>
                <span className={styles.logo}>TABI</span>
                <div className={styles.headerIcons} aria-hidden="true">
                    <span />
                    <span>?</span>
                </div>
            </header>

            <section className={styles.content}>
                <MaintenanceIllustration />

                <div className={styles.panel}>
                    <p className={styles.eyebrow}>Service Status</p>
                    <h1>{isDatabaseUnavailable ? '現在サービスを一時停止しています' : '現在メンテナンス中です'}</h1>
                    <p className={styles.description}>
                        {isDatabaseUnavailable
                            ? 'ただいまサービスの準備を行っています。しばらく時間をおいてから、もう一度お試しください。'
                            : 'サービス利用時間外のため、現在ご利用いただけません。ご迷惑をおかけして申し訳ありません。'}
                    </p>

                    {!isDatabaseUnavailable && (
                        <div className={styles.scheduleBox}>
                            <span className={styles.clockIcon}>○</span>
                            <div>
                                <span>サービス再開予定</span>
                                <strong>{nextOpenLabel}</strong>
                            </div>
                        </div>
                    )}

                    <p className={styles.note}>
                        ※メンテナンス時間は変更となる場合があります。最新情報はお知らせをご確認ください。
                    </p>

                </div>
            </section>
        </main>
    );
}
