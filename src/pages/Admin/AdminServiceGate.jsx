/**
 * 管理者向け画面の表示と、管理 API から取得したデータの操作を担当します。
 *
 * 主な流れ:
 * 1. 必要な部品や API 関数を読み込む
 * 2. 画面表示やデータ取得に必要な値を準備する
 * 3. ユーザー操作や API の結果に合わせて表示を更新する
 *
 * 扱うデータ: 管理 API から取得した一覧や詳細データ、画面上の検索条件や入力値を主に扱います。
 */
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

/**
 * AdminServiceGate は、このファイルの中心となる処理をまとめた関数です。
 * 画面から渡された値や API の結果を使い、次に表示する内容を決めます。
 */
export default function AdminServiceGate({ children }) {
    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const [status, setStatus] = useState(null);
    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const [checking, setChecking] = useState(true);

    const checkStatus = useCallback(async () => {
        // API 通信やデータ処理で失敗する可能性があるため、例外を受け取れる形で実行します。
        try {
            // status.php は実際のDB接続確認も行うため、ここではその結果だけを信頼します。
            const nextStatus = await fetchServiceStatus();
            setStatus(nextStatus);
        // エラーが起きた場合は、画面にメッセージを出すなど安全な処理に切り替えます。
        } catch {
            // 状態確認API自体が読めない場合も、管理画面を無理に表示せず停止画面へ倒します。
            setStatus({
                available: false,
                reason: 'STATUS_UNAVAILABLE',
                nextOpenAt: null,
                timezone: 'Asia/Tokyo',
            });
        // 成功・失敗に関係なく最後に必要な後片付けを行います。
        } finally {
            setChecking(false);
        }
    }, []);

    // 画面が表示された直後や監視している値が変わった時に、必要なデータ取得や初期設定を行います。
    useEffect(() => {
        // 初回表示時にすぐ確認し、その後も1分ごとに復旧・停止を見直します。
        const initialTimeoutId = window.setTimeout(checkStatus, 0);

        const intervalId = window.setInterval(checkStatus, 60000);
        // handleVisibilityChange は、画面操作や API 結果に合わせて必要な処理をまとめた関数です。
        const handleVisibilityChange = () => {
            // 別タブから戻ってきたタイミングでも、古い状態のままにしないよう再確認します。
            if (!document.hidden) {
                checkStatus();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        // handleDatabaseUnavailable は、画面操作や API 結果に合わせて必要な処理をまとめた関数です。
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

    // 画面が表示された直後や監視している値が変わった時に、必要なデータ取得や初期設定を行います。
    useEffect(() => {
        // ここで条件を確認し、状況に合う処理だけを実行します。
        if (!status?.available || !status.nextCloseAt) {
            return undefined;
        }

        // 稼働予定の終了時刻に近づいたら再確認します。実際にDBが動いていれば通常画面のままです。
        const closeAt = new Date(status.nextCloseAt).getTime();
        const delay = closeAt - Date.now();

        // ここで条件を確認し、状況に合う処理だけを実行します。
        if (delay <= 0) {
            const timeoutId = window.setTimeout(checkStatus, 0);
            return () => window.clearTimeout(timeoutId);
        }

        const timeoutId = window.setTimeout(checkStatus, Math.min(delay + 1000, 2147483647));
        return () => window.clearTimeout(timeoutId);
    }, [checkStatus, status]);

    // ここで条件を確認し、状況に合う処理だけを実行します。
    if (checking && !status) {
        return <AdminCheckingScreen />;
    }

    // ここで条件を確認し、状況に合う処理だけを実行します。
    if (!status?.available) {
        return <AdminDatabaseOffline status={status} onRetry={checkStatus} />;
    }

    return children;
}
