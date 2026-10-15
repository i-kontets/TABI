/**
 * 管理画面を開く前に、既存の本人確認APIでセッションと管理権限を確認する部品です。
 * 確認→未認証なら共通ログイン→権限なしなら案内→許可された子画面、の順に表示します。
 * localStorageのユーザー情報やURLは権限の根拠にしません。
 */
import { useEffect, useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { buildAuthPath } from '../../utils/authReturnPath';

// APIの結果が届くまで管理データを読む子画面を描画しません。
export default function AdminAuthGate({ children }) {
    const location = useLocation();
    const [status, setStatus] = useState('checking');
    useEffect(() => {
        const controller = new AbortController();
        // 再読み込み・履歴復帰・別タブからの復帰でもサーバーに権限を確認します。
        const check = async () => {
            setStatus('checking');
            try {
                const response = await fetch(`${import.meta.env.BASE_URL}api/auth/whoami.php`, {
                    credentials: 'include', cache: 'no-store', signal: controller.signal,
                });
                const data = await response.json();
                if (controller.signal.aborted) return;
                setStatus(response.status === 401 ? 'login'
                    : response.ok && data.success ? (data.user?.is_tabi_admin === true ? 'allowed' : 'forbidden') : 'error');
            } catch {
                if (!controller.signal.aborted) setStatus('error');
            }
        };
        const onVisible = () => { if (!document.hidden) check(); };
        check();
        window.addEventListener('pageshow', check);
        document.addEventListener('visibilitychange', onVisible);
        return () => {
            controller.abort();
            window.removeEventListener('pageshow', check);
            document.removeEventListener('visibilitychange', onVisible);
        };
    }, [location.key]);

    if (status === 'login') return <Navigate to={buildAuthPath('/', location.pathname + location.search)} replace />;
    if (status === 'allowed') return children;
    return <main><p role="status">{status === 'checking' ? 'ログイン状態を確認しています…'
        : status === 'forbidden' ? 'TABI全体の管理者権限がありません。' : 'ログイン状態を確認できませんでした。時間をおいて再読み込みしてください。'}</p>
        <Link to="/Home">ホームへ</Link></main>;
}
