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
import { Link } from 'react-router-dom';
import AdminLayout from '../../../components/Admin/AdminLayout';
import { SearchBar, Tabs, Avatar, Badge, Pagination, EmptyState } from '../../../components/Admin/ui/Ui';
import { fetchPosts } from '../../../services/admin';
import { useAdminRealtimeRefresh } from '../Realtime/useAdminRealtimeRefresh';
import styles from './Posts.module.css';

const TABS = ['すべて', '旅行先候補', '宿泊先候補', 'その他'];

/**
 * PostList は、このファイルの中心となる処理をまとめた関数です。
 * 画面から渡された値や API の結果を使い、次に表示する内容を決めます。
 */
export default function PostList() {
    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const [query, setQuery] = useState('');
    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const [tab, setTab] = useState('すべて');
    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const [page, setPage] = useState(1);
    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const [result, setResult] = useState(null);

    const loadPosts = useCallback(() => {
        // API などの非同期処理が終わった後に、受け取った結果を次の処理へ渡します。
        fetchPosts({ query, category: tab, page }).then(setResult);
    }, [query, tab, page]);

    // 画面が表示された直後や監視している値が変わった時に、必要なデータ取得や初期設定を行います。
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
