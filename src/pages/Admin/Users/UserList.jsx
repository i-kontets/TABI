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
import { SearchBar, Badge, Avatar, Pagination, EmptyState } from '../../../components/Admin/ui/Ui';
import { fetchUsers } from '../../../services/admin';
import { useAdminRealtimeRefresh } from '../Realtime/useAdminRealtimeRefresh';
import styles from './Users.module.css';

const REALTIME_EVENTS = ['admin:user_created', 'admin:user_updated', 'admin:user_deleted'];

/**
 * UserList は、このファイルの中心となる処理をまとめた関数です。
 * 画面から渡された値や API の結果を使い、次に表示する内容を決めます。
 */
export default function UserList() {
    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const [query, setQuery] = useState('');
    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const [page, setPage] = useState(1);
    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const [result, setResult] = useState(null);

    const loadUsers = useCallback(() => {
        // API などの非同期処理が終わった後に、受け取った結果を次の処理へ渡します。
        fetchUsers({ query, page }).then(setResult);
    }, [query, page]);

    // 画面が表示された直後や監視している値が変わった時に、必要なデータ取得や初期設定を行います。
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
