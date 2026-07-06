import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AdminLayout from '../../../components/Admin/AdminLayout';
import { Tabs, Badge, Pagination, EmptyState } from '../../../components/Admin/ui/Ui';
import { fetchReports, fetchReportCounts } from '../../../services/admin';
import styles from './Reports.module.css';

export default function ReportList() {
    const [tab, setTab] = useState('未対応');
    const [page, setPage] = useState(1);
    const [result, setResult] = useState(null);
    const [counts, setCounts] = useState({});

    useEffect(() => {
        fetchReports({ status: tab, page }).then(setResult);
        fetchReportCounts().then(setCounts);
    }, [tab, page]);

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
