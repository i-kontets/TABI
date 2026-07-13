import { useCallback, useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import AdminLayout from '../../../components/Admin/AdminLayout';
import { Badge, Card, DetailRow, Button, EmptyState } from '../../../components/Admin/ui/Ui';
import { fetchReport, updateReport } from '../../../services/admin';
import { useAdminRealtimeRefresh } from '../Realtime/useAdminRealtimeRefresh';
import styles from './Reports.module.css';

const STATUS_OPTIONS = ['未対応', '確認中', '対応済み'];

export default function ReportDetail() {
    const { reportId } = useParams();
    const [report, setReport] = useState(null);
    const [status, setStatus] = useState('未対応');
    const [note, setNote] = useState('');

    const loadReport = useCallback(() => {
        fetchReport(reportId).then((r) => {
            setReport(r);
            if (r) {
                setStatus(r.status);
                setNote(r.note || '');
            }
        });
    }, [reportId]);

    useEffect(() => {
        loadReport();
    }, [loadReport]);

    useAdminRealtimeRefresh(['admin:report_updated'], loadReport);

    if (!report) {
        return (
            <AdminLayout title="通報詳細" back>
                <EmptyState message="通報が見つかりません" />
            </AdminLayout>
        );
    }

    const handleSubmit = async () => {
        const updated = await updateReport(report.id, { status, note });
        setReport({ ...updated });
        window.alert('対応内容を保存しました。');
    };

    return (
        <AdminLayout title="通報詳細" back>
            <div className={styles.detailHead}>
                <Badge label={report.status} />
                <span className={styles.detailType}>{report.type}</span>
            </div>

            <Card title="通報された投稿">
                <p className={styles.detailBody}>{report.detail}</p>
            </Card>

            <Card>
                <DetailRow label="対象ユーザー">
                    <Link to={`/admin/users/${report.targetId}`} className={styles.userLink}>
                        {report.target} (ID: {report.targetId})
                    </Link>
                </DetailRow>
                <DetailRow label="通報理由">{report.reason}</DetailRow>
                <DetailRow label="通報者">
                    <Link to={`/admin/users/${report.reporterId}`} className={styles.userLink}>
                        {report.reporter} (ID: {report.reporterId})
                    </Link>
                </DetailRow>
                <DetailRow label="通報日時">{report.reportedAt}</DetailRow>
                {report.note && <DetailRow label="備考">{report.note}</DetailRow>}
            </Card>

            <Card title="対応ステータス">
                <select className={styles.select} value={status} onChange={(e) => setStatus(e.target.value)}>
                    {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
            </Card>

            <Card title="管理者メモ">
                <textarea
                    className={styles.memoArea}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="メモを入力"
                    rows={3}
                />
            </Card>

            <Button variant="primary" full onClick={handleSubmit}>対応する</Button>
        </AdminLayout>
    );
}
