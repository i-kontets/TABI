import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AdminLayout from '../../../components/Admin/AdminLayout';
import { SearchBar, Badge, Pagination, EmptyState, Button } from '../../../components/Admin/ui/Ui';
import { fetchSpots } from '../../../services/admin';
import { useAdminRealtimeRefresh } from '../Realtime/useAdminRealtimeRefresh';
import styles from './Spots.module.css';

const THUMB_COLORS = ['#8fb3f5', '#7fc9a8', '#e8c97f', '#b79fe0'];
const REALTIME_EVENTS = ['admin:spot_created', 'admin:spot_updated', 'admin:spot_deleted'];

export default function SpotList() {
    const navigate = useNavigate();
    const [query, setQuery] = useState('');
    const [page, setPage] = useState(1);
    const [result, setResult] = useState(null);

    const loadSpots = useCallback(() => {
        fetchSpots({ query, page }).then(setResult);
    }, [query, page]);

    useEffect(() => {
        loadSpots();
    }, [loadSpots]);

    useAdminRealtimeRefresh(REALTIME_EVENTS, loadSpots);

    return (
        <AdminLayout
            title="スポット一覧"
            headerRight={<Button variant="primary" onClick={() => navigate('/admin/spots/new')}>+ 追加</Button>}
        >
            <SearchBar value={query} onChange={(v) => { setQuery(v); setPage(1); }} placeholder="スポット名で検索" />
            <div className={styles.list}>
                {result?.items.map((s, i) => (
                    <Link key={s.id} to={`/admin/spots/${s.id}/edit`} className={styles.row}>
                        <div className={styles.thumb} style={{ background: THUMB_COLORS[i % THUMB_COLORS.length] }}>
                            {s.name.slice(0, 1)}
                        </div>
                        <div className={styles.rowBody}>
                            <div className={styles.rowTitle}>{s.name}({s.prefecture})</div>
                            <div className={styles.rowSub}>{s.category}</div>
                        </div>
                        <Badge label={s.status} />
                    </Link>
                ))}
                {result && result.items.length === 0 && <EmptyState message="該当するスポットがありません" />}
            </div>
            {result && <Pagination page={result.page} totalPages={result.totalPages} onChange={setPage} />}
        </AdminLayout>
    );
}
