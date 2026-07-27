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
import AdminLayout from '../../../components/Admin/AdminLayout';
import { SearchBar, Pagination, EmptyState } from '../../../components/Admin/ui/Ui';
import { fetchLogs } from '../../../services/admin';
import { useAdminRealtimeRefresh } from '../Realtime/useAdminRealtimeRefresh';
import styles from './Logs.module.css';

const REALTIME_EVENTS = [
    'admin:user_created',
    'admin:user_updated',
    'admin:user_deleted',
    'admin:group_created',
    'admin:group_updated',
    'admin:group_deleted',
    'admin:post_updated',
    'admin:post_deleted',
    'admin:report_updated',
    'admin:inquiry_updated',
    'admin:notice_created',
    'admin:notice_updated',
    'admin:notice_deleted',
    'admin:spot_created',
    'admin:spot_updated',
    'admin:spot_deleted',
    'admin:manager_created',
    'admin:manager_updated',
    'admin:manager_deleted',
];

/**
 * Logs は、このファイルの中心となる処理をまとめた関数です。
 * 画面から渡された値や API の結果を使い、次に表示する内容を決めます。
 */
export default function Logs() {
    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const [query, setQuery] = useState('');
    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const [page, setPage] = useState(1);
    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const [result, setResult] = useState(null);

    const loadLogs = useCallback(() => {
        // API などの非同期処理が終わった後に、受け取った結果を次の処理へ渡します。
        fetchLogs({ query, page }).then(setResult);
    }, [query, page]);

    // 画面が表示された直後や監視している値が変わった時に、必要なデータ取得や初期設定を行います。
    useEffect(() => {
        loadLogs();
    }, [loadLogs]);

    useAdminRealtimeRefresh(REALTIME_EVENTS, loadLogs);

    return (
        <AdminLayout title="操作ログ" back>
            <SearchBar value={query} onChange={(v) => { setQuery(v); setPage(1); }} placeholder="操作内容・管理者で検索" />
            <div className={styles.list}>
                {result?.items.map((l) => (
                    <div key={l.id} className={styles.row}>
                        <div className={styles.rowTime}>{l.at}</div>
                        <div className={styles.rowAction}>{l.manager} が {l.action}</div>
                        <span className={styles.rowTarget}>{l.target}</span>
                    </div>
                ))}
                {result && result.items.length === 0 && <EmptyState message="該当するログがありません" />}
            </div>
            {result && <Pagination page={result.page} totalPages={result.totalPages} onChange={setPage} />}
        </AdminLayout>
    );
}
