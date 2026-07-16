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
import { useParams, Link } from 'react-router-dom';
import AdminLayout from '../../../components/Admin/AdminLayout';
import { Badge, Card, DetailRow, Button, EmptyState } from '../../../components/Admin/ui/Ui';
import { fetchReport, updateReport } from '../../../services/admin';
import { useAdminRealtimeRefresh } from '../Realtime/useAdminRealtimeRefresh';
import styles from './Reports.module.css';

const STATUS_OPTIONS = ['未対応', '確認中', '対応済み'];

/**
 * ReportDetail は、このファイルの中心となる処理をまとめた関数です。
 * 画面から渡された値や API の結果を使い、次に表示する内容を決めます。
 */
export default function ReportDetail() {
    const { reportId } = useParams();
    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const [report, setReport] = useState(null);
    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const [status, setStatus] = useState('未対応');
    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const [note, setNote] = useState('');

    const loadReport = useCallback(() => {
        // API などの非同期処理が終わった後に、受け取った結果を次の処理へ渡します。
        fetchReport(reportId).then((r) => {
            setReport(r);
            // ここで条件を確認し、状況に合う処理だけを実行します。
            if (r) {
                setStatus(r.status);
                setNote(r.note || '');
            }
        });
    }, [reportId]);

    // 画面が表示された直後や監視している値が変わった時に、必要なデータ取得や初期設定を行います。
    useEffect(() => {
        loadReport();
    }, [loadReport]);

    useAdminRealtimeRefresh(['admin:report_updated'], loadReport);

    // ここで条件を確認し、状況に合う処理だけを実行します。
    if (!report) {
        return (
            <AdminLayout title="通報詳細" back backTo="/admin/support?type=reports">
                <EmptyState message="通報が見つかりません" />
            </AdminLayout>
        );
    }

    // handleSubmit は、画面操作や API 結果に合わせて必要な処理をまとめた関数です。
    const handleSubmit = async () => {
        const updated = await updateReport(report.id, { status, note });
        setReport({ ...updated });
        window.alert('対応内容を保存しました。');
    };

    return (
        <AdminLayout title="通報詳細" back backTo="/admin/support?type=reports">
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
