import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AdminLayout from '../../../components/Admin/AdminLayout';
import { SearchBar, Tabs, Avatar, Badge, Pagination, EmptyState } from '../../../components/Admin/ui/Ui';
import { fetchPosts } from '../../../services/admin';
import { useAdminRealtimeRefresh } from '../Realtime/useAdminRealtimeRefresh';
import styles from './Posts.module.css';

const TABS = ['すべて', '旅行先候補', '宿泊先候補', 'その他'];

export default function PostList() {
    const [query, setQuery] = useState('');
    const [tab, setTab] = useState('すべて');
    const [page, setPage] = useState(1);
    const [result, setResult] = useState(null);

    const loadPosts = useCallback(() => {
        fetchPosts({ query, category: tab, page }).then(setResult);
    }, [query, tab, page]);

    useEffect(() => {
        loadPosts();
    }, [loadPosts]);

    useAdminRealtimeRefresh(['admin:post_created', 'admin:post_updated', 'admin:post_deleted'], loadPosts);

    return (
        <AdminLayout title="話し合い・投稿一覧">
            <SearchBar value={query} onChange={(v) => { setQuery(v); setPage(1); }} placeholder="投稿・投稿者で検索" />
            <Tabs tabs={TABS} active={tab} onChange={(t) => { setTab(t); setPage(1); }} />
            <div className={styles.list}>
                {result?.items.map((p) => (
                    <Link key={p.id} to={`/admin/posts/${p.id}`} className={styles.row}>
                        <Avatar name={p.author} size={38} />
                        <div className={styles.rowBody}>
                            <div className={styles.rowText}>{p.body}</div>
                            <div className={styles.rowSub}>{p.group}・{p.author}</div>
                        </div>
                        <div className={styles.rowRight}>
                            <span className={styles.time}>{p.createdAt.slice(11)}</span>
                            {p.reportCount > 0 && <Badge label={`通報 ${p.reportCount}`} tone="red" />}
                            {p.status === '非表示' && <Badge label="非表示" tone="gray" />}
                        </div>
                    </Link>
                ))}
                {result && result.items.length === 0 && <EmptyState message="該当する投稿がありません" />}
            </div>
            {result && <Pagination page={result.page} totalPages={result.totalPages} onChange={setPage} />}
        </AdminLayout>
    );
}
