/**
 * 複数の画面から使われる共通の表示部品です。
 *
 * 主な流れ:
 * 1. 必要な部品や API 関数を読み込む
 * 2. 画面表示やデータ取得に必要な値を準備する
 * 3. ユーザー操作や API の結果に合わせて表示を更新する
 *
 * 扱うデータ: React の state、props、フォーム入力、API から返ったデータを主に扱います。
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
    fetchServiceStatus,
    isAdminPath,
    isMaintenancePath,
    saveMaintenanceReason,
    saveReturnPath,
} from '../services/serviceStatus';

/**
 * LoadingScreen は、このファイルの中心となる処理をまとめた関数です。
 * 画面から渡された値や API の結果を使い、次に表示する内容を決めます。
 */
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

/**
 * ServiceAvailabilityGate は、このファイルの中心となる処理をまとめた関数です。
 * 画面から渡された値や API の結果を使い、次に表示する内容を決めます。
 */
export default function ServiceAvailabilityGate({ children }) {
    const location = useLocation();
    const navigate = useNavigate();
    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const [checked, setChecked] = useState(false);
    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const [status, setStatus] = useState(null);
    const pathname = location.pathname;
    const bypass = useMemo(() => isAdminPath(pathname) || isMaintenancePath(pathname), [pathname]);

    const checkStatus = useCallback(async ({ initial = false } = {}) => {
        // ここで条件を確認し、状況に合う処理だけを実行します。
        if (isAdminPath(window.location.pathname)) {
            setChecked(true);
            return;
        }

        // API 通信やデータ処理で失敗する可能性があるため、例外を受け取れる形で実行します。
        try {
            const nextStatus = await fetchServiceStatus();
            setStatus(nextStatus);
            setChecked(true);

            // ここで条件を確認し、状況に合う処理だけを実行します。
            if (!nextStatus.available && !isMaintenancePath(window.location.pathname)) {
                saveReturnPath(window.location.pathname, window.location.search);
                saveMaintenanceReason(nextStatus.reason);
                navigate('/maintenance', { replace: initial });
            }
        // エラーが起きた場合は、画面にメッセージを出すなど安全な処理に切り替えます。
        } catch {
            setChecked(true);
        }
    }, [navigate]);

    // 画面が表示された直後や監視している値が変わった時に、必要なデータ取得や初期設定を行います。
    useEffect(() => {
        // ここで条件を確認し、状況に合う処理だけを実行します。
        if (bypass) {
            setChecked(true);
            return undefined;
        }

        setChecked(false);
        checkStatus({ initial: true });

        const intervalId = window.setInterval(() => {
            checkStatus();
        }, 60000);

        // handleVisibility は、画面操作や API 結果に合わせて必要な処理をまとめた関数です。
        const handleVisibility = () => {
            // ここで条件を確認し、状況に合う処理だけを実行します。
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

    // 画面が表示された直後や監視している値が変わった時に、必要なデータ取得や初期設定を行います。
    useEffect(() => {
        // ここで条件を確認し、状況に合う処理だけを実行します。
        if (!status?.available || !status.nextCloseAt || bypass) {
            return undefined;
        }

        const closeAt = new Date(status.nextCloseAt).getTime();
        const delay = closeAt - Date.now();

        // ここで条件を確認し、状況に合う処理だけを実行します。
        if (delay <= 0) {
            checkStatus();
            return undefined;
        }

        const timeoutId = window.setTimeout(() => {
            checkStatus();
        }, Math.min(delay + 1000, 2147483647));

        return () => window.clearTimeout(timeoutId);
    }, [bypass, checkStatus, status]);

    // ここで条件を確認し、状況に合う処理だけを実行します。
    if (!checked && !bypass) {
        return <LoadingScreen />;
    }

    return children;
}
