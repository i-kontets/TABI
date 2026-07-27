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
import { Link, useNavigate } from 'react-router-dom';
import AdminLayout from '../../../components/Admin/AdminLayout';
import { SearchBar, Badge, Pagination, EmptyState, Button } from '../../../components/Admin/ui/Ui';
import { fetchSpots } from '../../../services/admin';
import { useAdminRealtimeRefresh } from '../Realtime/useAdminRealtimeRefresh';
import styles from './Spots.module.css';

const THUMB_COLORS = ['#8fb3f5', '#7fc9a8', '#e8c97f', '#b79fe0'];
const REALTIME_EVENTS = ['admin:spot_created', 'admin:spot_updated', 'admin:spot_deleted'];

/**
 * SpotList は、このファイルの中心となる処理をまとめた関数です。
 * 画面から渡された値や API の結果を使い、次に表示する内容を決めます。
 */
export default function SpotList() {
    const navigate = useNavigate();
    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const [query, setQuery] = useState('');
    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const [page, setPage] = useState(1);
    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const [result, setResult] = useState(null);

    const loadSpots = useCallback(() => {
        // API などの非同期処理が終わった後に、受け取った結果を次の処理へ渡します。
        fetchSpots({ query, page }).then(setResult);
    }, [query, page]);

    // 画面が表示された直後や監視している値が変わった時に、必要なデータ取得や初期設定を行います。
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
