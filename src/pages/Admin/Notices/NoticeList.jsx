import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AdminLayout from '../../../components/Admin/AdminLayout';
import { Tabs, Badge, Pagination, EmptyState, Button } from '../../../components/Admin/ui/Ui';
import { fetchNotices } from '../../../services/admin';
import { useAdminRealtimeRefresh } from '../Realtime/useAdminRealtimeRefresh';
import styles from './Notices.module.css';

const TABS = [
    { key: '', label: 'すべて' },
    { key: '下書き', label: '下書き' },
    { key: '公開中', label: '公開中' },
    { key: '終了', label: '公開終了' },
];
const REALTIME_EVENTS = ['admin:notice_created', 'admin:notice_updated', 'admin:notice_deleted'];

export default function NoticeList() {
    const navigate = useNavigate();
    const [tab, setTab] = useState('');
    const [page, setPage] = useState(1);
    const [result, setResult] = useState(null);

    const loadNotices = useCallback(() => {
        fetchNotices({ status: tab, page }).then(setResult);
    }, [tab, page]);

    useEffect(() => {
        loadNotices();
    }, [loadNotices]);

    useAdminRealtimeRefresh(REALTIME_EVENTS, loadNotices);

    return (
        <AdminLayout
            title="お知らせ管理"
            headerRight={<Button variant="primary" onClick={() => navigate('/admin/notices/new')}>+ 作成</Button>}
        >
            <Tabs tabs={TABS} active={tab} onChange={(t) => { setTab(t); setPage(1); }} />
            <div className={styles.list}>
                {result?.items.map((n) => (
                    <Link key={n.id} to={`/admin/notices/${n.id}/edit`} className={styles.row}>
                        <div className={styles.rowBody}>
                            <div className={styles.rowTitle}>{n.title}</div>
                            <div className={styles.rowSub}>{n.startAt.slice(0, 10)}〜{n.endAt.slice(0, 10)}</div>
                            <div className={styles.rowSub}>{n.target}・既読率 {n.readRate}%</div>
                        </div>
                        <Badge label={n.status} />
                    </Link>
                ))}
                {result && result.items.length === 0 && <EmptyState message="お知らせがありません" />}
            </div>
            {result && <Pagination page={result.page} totalPages={result.totalPages} onChange={setPage} />}
        </AdminLayout>
    );
}
