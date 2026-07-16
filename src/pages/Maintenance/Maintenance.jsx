/**
 * サービス停止中やメンテナンス中であることを利用者へ知らせる画面です。
 *
 * 主な流れ:
 * 1. 必要な部品や API 関数を読み込む
 * 2. 画面表示やデータ取得に必要な値を準備する
 * 3. ユーザー操作や API の結果に合わせて表示を更新する
 *
 * 扱うデータ: React の state、props、フォーム入力、API から返ったデータを主に扱います。
 */
import React, { useEffect, useMemo, useState } from 'react';
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

/**
 * formatNextOpen は、このファイルの中心となる処理をまとめた関数です。
 * 画面から渡された値や API の結果を使い、次に表示する内容を決めます。
 */
function formatNextOpen(value) {
    // ここで条件を確認し、状況に合う処理だけを実行します。
    if (!value) {
        return '再開予定を確認中です';
    }

    const date = new Date(value);
    // ここで条件を確認し、状況に合う処理だけを実行します。
    if (Number.isNaN(date.getTime())) {
        return '再開予定を確認中です';
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const targetDay = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
    const diffDays = Math.round((targetDay - today) / 86400000);
    const time = date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });

    // ここで条件を確認し、状況に合う処理だけを実行します。
    if (diffDays === 0) {
        return `本日 ${time}〜`;
    }

    // ここで条件を確認し、状況に合う処理だけを実行します。
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

/**
 * MaintenanceIllustration は、このファイルの中心となる処理をまとめた関数です。
 * 画面から渡された値や API の結果を使い、次に表示する内容を決めます。
 */
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

/**
 * Maintenance は、このファイルの中心となる処理をまとめた関数です。
 * 画面から渡された値や API の結果を使い、次に表示する内容を決めます。
 */
export default function Maintenance() {
    const navigate = useNavigate();
    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const [status, setStatus] = useState(() => ({
        available: false,
        reason: getMaintenanceReason() || 'OUTSIDE_SERVICE_HOURS',
        nextOpenAt: null,
    }));
    const isDatabaseUnavailable = status.reason === 'DATABASE_UNAVAILABLE';
    const nextOpenLabel = useMemo(() => formatNextOpen(status.nextOpenAt), [status.nextOpenAt]);

    // 画面が表示された直後や監視している値が変わった時に、必要なデータ取得や初期設定を行います。
    useEffect(() => {
        let mounted = true;

        // check は、画面操作や API 結果に合わせて必要な処理をまとめた関数です。
        const check = async () => {
            const nextStatus = await fetchServiceStatus();
            // ここで条件を確認し、状況に合う処理だけを実行します。
            if (!mounted) return;
            let savedReason = getMaintenanceReason();
            // ここで条件を確認し、状況に合う処理だけを実行します。
            if (!nextStatus.available && nextStatus.reason === 'OUTSIDE_SERVICE_HOURS') {
                clearMaintenanceReason();
                savedReason = null;
            }
            const mergedStatus = savedReason === 'DATABASE_UNAVAILABLE'
                ? { ...nextStatus, available: false, reason: 'DATABASE_UNAVAILABLE' }
                : nextStatus;
            setStatus(mergedStatus);

            // ここで条件を確認し、状況に合う処理だけを実行します。
            if (savedReason === 'DATABASE_UNAVAILABLE') {
                const databaseAvailable = await probeDatabaseAvailability();
                // ここで条件を確認し、状況に合う処理だけを実行します。
                if (!mounted || !databaseAvailable) {
                    return;
                }
            }

            // ここで条件を確認し、状況に合う処理だけを実行します。
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

        // handleVisibility は、画面操作や API 結果に合わせて必要な処理をまとめた関数です。
        const handleVisibility = () => {
            // ここで条件を確認し、状況に合う処理だけを実行します。
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
                    <h1>現在メンテナンス中です</h1>
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
