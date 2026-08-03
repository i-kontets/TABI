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

/**
 * NoticeList は、このファイルの中心となる処理をまとめた関数です。
 * 画面から渡された値や API の結果を使い、次に表示する内容を決めます。
 */
export default function NoticeList() {
    const navigate = useNavigate();
    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const [tab, setTab] = useState('');
    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const [page, setPage] = useState(1);
    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const [result, setResult] = useState(null);

    const loadNotices = useCallback(() => {
        // API などの非同期処理が終わった後に、受け取った結果を次の処理へ渡します。
        fetchNotices({ status: tab, page }).then(setResult);
    }, [tab, page]);

    // 画面が表示された直後や監視している値が変わった時に、必要なデータ取得や初期設定を行います。
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
