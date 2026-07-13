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

export default function Logs() {
    const [query, setQuery] = useState('');
    const [page, setPage] = useState(1);
    const [result, setResult] = useState(null);

    const loadLogs = useCallback(() => {
        fetchLogs({ query, page }).then(setResult);
    }, [query, page]);

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
