import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AdminLayout from '../../../components/Admin/AdminLayout';
import { SearchBar, Badge, Avatar, Pagination, EmptyState } from '../../../components/Admin/ui/Ui';
import { fetchUsers } from '../../../services/admin';
import { useAdminRealtimeRefresh } from '../Realtime/useAdminRealtimeRefresh';
import styles from './Users.module.css';

const REALTIME_EVENTS = ['admin:user_created', 'admin:user_updated', 'admin:user_deleted'];

export default function UserList() {
    const [query, setQuery] = useState('');
    const [page, setPage] = useState(1);
    const [result, setResult] = useState(null);

    const loadUsers = useCallback(() => {
        fetchUsers({ query, page }).then(setResult);
    }, [query, page]);

    useEffect(() => {
        loadUsers();
    }, [loadUsers]);

    useAdminRealtimeRefresh(REALTIME_EVENTS, loadUsers);

    return (
        <AdminLayout title="ユーザー一覧">
            <SearchBar value={query} onChange={(v) => { setQuery(v); setPage(1); }} placeholder="ユーザー名・メールで検索" />
            {result && <p className={styles.total}>全体 {result.total.toLocaleString()}人</p>}
            <div className={styles.list}>
                {result?.items.map((u) => (
                    <Link key={u.id} to={`/admin/users/${u.id}`} className={styles.row}>
                        <Avatar name={u.name} />
                        <div className={styles.rowBody}>
                            <div className={styles.rowName}>{u.name}</div>
                            <div className={styles.rowSub}>{u.email}</div>
                        </div>
                        <Badge label={u.status} />
                    </Link>
                ))}
                {result && result.items.length === 0 && <EmptyState message="該当するユーザーがいません" />}
            </div>
            {result && <Pagination page={result.page} totalPages={result.totalPages} onChange={setPage} />}
        </AdminLayout>
    );
}
