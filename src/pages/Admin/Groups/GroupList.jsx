import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AdminLayout from '../../../components/Admin/AdminLayout';
import { SearchBar, Badge, Pagination, EmptyState } from '../../../components/Admin/ui/Ui';
import { fetchGroups } from '../../../services/admin';
import styles from './Groups.module.css';

const THUMB_COLORS = ['#8fb3f5', '#7fc9a8', '#e8a87f', '#b79fe0', '#f0a8b8'];

export default function GroupList() {
    const [query, setQuery] = useState('');
    const [page, setPage] = useState(1);
    const [result, setResult] = useState(null);

    useEffect(() => {
        fetchGroups({ query, page }).then(setResult);
    }, [query, page]);

    return (
        <AdminLayout title="旅行グループ一覧">
            <SearchBar value={query} onChange={(v) => { setQuery(v); setPage(1); }} placeholder="グループ名で検索" />
            {result && <p className={styles.total}>全体 {result.total}グループ</p>}
            <div className={styles.list}>
                {result?.items.map((g, i) => (
                    <Link key={g.id} to={`/admin/groups/${g.id}`} className={styles.row}>
                        <div className={styles.thumb} style={{ background: THUMB_COLORS[i % THUMB_COLORS.length] }}>
                            {g.name.slice(0, 1)}
                        </div>
                        <div className={styles.rowBody}>
                            <div className={styles.rowName}>{g.name}</div>
                            <div className={styles.rowSub}>{g.memberCount}人・{g.creator}</div>
                            <div className={styles.rowSub}>{g.period}</div>
                        </div>
                        <Badge label={g.status} />
                    </Link>
                ))}
                {result && result.items.length === 0 && <EmptyState message="該当するグループがありません" />}
            </div>
            {result && <Pagination page={result.page} totalPages={result.totalPages} onChange={setPage} />}
        </AdminLayout>
    );
}
