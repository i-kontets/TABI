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
import { Tabs, Badge, Pagination, EmptyState } from '../../../components/Admin/ui/Ui';
import { fetchReports, fetchReportCounts } from '../../../services/admin';
import { useAdminRealtimeRefresh } from '../Realtime/useAdminRealtimeRefresh';
import styles from './Reports.module.css';

const REALTIME_EVENTS = ['admin:report_created', 'admin:report_updated'];

/**
 * ReportList は、このファイルの中心となる処理をまとめた関数です。
 * 画面から渡された値や API の結果を使い、次に表示する内容を決めます。
 */
export default function ReportList() {
    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const [tab, setTab] = useState('未対応');
    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const [page, setPage] = useState(1);
    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const [result, setResult] = useState(null);
    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const [counts, setCounts] = useState({});

    const loadReports = useCallback(() => {
        // API などの非同期処理が終わった後に、受け取った結果を次の処理へ渡します。
        fetchReports({ status: tab, page }).then(setResult);
        // API などの非同期処理が終わった後に、受け取った結果を次の処理へ渡します。
        fetchReportCounts().then(setCounts);
    }, [tab, page]);

    // 画面が表示された直後や監視している値が変わった時に、必要なデータ取得や初期設定を行います。
    useEffect(() => {
        loadReports();
    }, [loadReports]);

    useAdminRealtimeRefresh(REALTIME_EVENTS, loadReports);

    // 配列のデータを1件ずつ画面表示用の形に変換します。
    const tabs = ['未対応', '確認中', '対応済み'].map((k) => ({
        key: k,
        label: counts[k] != null ? `${k} ${counts[k]}` : k,
    }));

    return (
        <AdminLayout title="通報一覧">
            <Tabs tabs={tabs} active={tab} onChange={(t) => { setTab(t); setPage(1); }} />
            <div className={styles.list}>
                {result?.items.map((r) => (
                    <Link key={r.id} to={`/admin/reports/${r.id}`} className={styles.row}>
                        <Badge label={r.status} />
                        <div className={styles.rowBody}>
                            <div className={styles.rowTitle}>{r.type}</div>
                            <div className={styles.rowSub}>{r.reason}・通報者: {r.reporter}</div>
                        </div>
                        <span className={styles.time}>{r.reportedAt.slice(11) || r.reportedAt}</span>
                    </Link>
                ))}
                {result && result.items.length === 0 && <EmptyState message="該当する通報がありません" />}
            </div>
            {result && <Pagination page={result.page} totalPages={result.totalPages} onChange={setPage} />}
        </AdminLayout>
    );
}
