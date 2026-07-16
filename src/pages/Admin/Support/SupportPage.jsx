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
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import AdminLayout from '../../../components/Admin/AdminLayout';
import { Avatar, Badge, EmptyState, Pagination, Tabs } from '../../../components/Admin/ui/Ui';
import { fetchInquiries, fetchInquiryCounts, fetchReports, fetchReportCounts } from '../../../services/admin';
import { useAdminRealtimeRefresh } from '../Realtime/useAdminRealtimeRefresh';
import inquiryStyles from '../Inquiries/Inquiries.module.css';
import reportStyles from '../Reports/Reports.module.css';
import styles from './SupportPage.module.css';

const SUPPORT_TYPES = {
    inquiries: 'inquiries',
    reports: 'reports',
};

const INQUIRY_EVENTS = ['admin:inquiry_created', 'admin:inquiry_updated'];
const REPORT_EVENTS = ['admin:report_created', 'admin:report_updated'];

/**
 * normalizeType は、このファイルの中心となる処理をまとめた関数です。
 * 画面から渡された値や API の結果を使い、次に表示する内容を決めます。
 */
function normalizeType(value) {
    return value === SUPPORT_TYPES.reports ? SUPPORT_TYPES.reports : SUPPORT_TYPES.inquiries;
}

/**
 * SupportPage は、このファイルの中心となる処理をまとめた関数です。
 * 画面から渡された値や API の結果を使い、次に表示する内容を決めます。
 */
export default function SupportPage() {
    const [searchParams, setSearchParams] = useSearchParams();
    const activeType = normalizeType(searchParams.get('type'));

    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const [inquiryTab, setInquiryTab] = useState('未対応');
    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const [reportTab, setReportTab] = useState('未対応');
    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const [inquiryPage, setInquiryPage] = useState(1);
    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const [reportPage, setReportPage] = useState(1);
    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const [inquiryResult, setInquiryResult] = useState(null);
    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const [reportResult, setReportResult] = useState(null);
    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const [inquiryCounts, setInquiryCounts] = useState({});
    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const [reportCounts, setReportCounts] = useState({});

    const loadInquiries = useCallback(() => {
        // API などの非同期処理が終わった後に、受け取った結果を次の処理へ渡します。
        fetchInquiries({ status: inquiryTab, page: inquiryPage }).then(setInquiryResult);
        // API などの非同期処理が終わった後に、受け取った結果を次の処理へ渡します。
        fetchInquiryCounts().then(setInquiryCounts);
    }, [inquiryTab, inquiryPage]);

    const loadReports = useCallback(() => {
        // API などの非同期処理が終わった後に、受け取った結果を次の処理へ渡します。
        fetchReports({ status: reportTab, page: reportPage }).then(setReportResult);
        // API などの非同期処理が終わった後に、受け取った結果を次の処理へ渡します。
        fetchReportCounts().then(setReportCounts);
    }, [reportTab, reportPage]);

    // 画面が表示された直後や監視している値が変わった時に、必要なデータ取得や初期設定を行います。
    useEffect(() => {
        // ここで条件を確認し、状況に合う処理だけを実行します。
        if (activeType === SUPPORT_TYPES.reports) {
            loadReports();
            return;
        }
        loadInquiries();
    }, [activeType, loadInquiries, loadReports]);

    useAdminRealtimeRefresh(INQUIRY_EVENTS, () => {
        // ここで条件を確認し、状況に合う処理だけを実行します。
        if (activeType === SUPPORT_TYPES.inquiries) {
            loadInquiries();
        }
    });

    useAdminRealtimeRefresh(REPORT_EVENTS, () => {
        // ここで条件を確認し、状況に合う処理だけを実行します。
        if (activeType === SUPPORT_TYPES.reports) {
            loadReports();
        }
    });

    const supportTabs = useMemo(() => ([
        { key: SUPPORT_TYPES.inquiries, label: 'お問い合わせ' },
        { key: SUPPORT_TYPES.reports, label: '通報' },
    ]), []);

    // 配列のデータを1件ずつ画面表示用の形に変換します。
    const inquiryTabs = ['未対応', '対応中', '対応済み'].map((key) => ({
        key,
        label: inquiryCounts[key] != null ? `${key} ${inquiryCounts[key]}` : key,
    }));

    // 配列のデータを1件ずつ画面表示用の形に変換します。
    const reportTabs = ['未対応', '確認中', '対応済み'].map((key) => ({
        key,
        label: reportCounts[key] != null ? `${key} ${reportCounts[key]}` : key,
    }));

    // changeType は、画面操作や API 結果に合わせて必要な処理をまとめた関数です。
    const changeType = (nextType) => {
        setSearchParams({ type: nextType });
    };

    return (
        <AdminLayout title="対応一覧">
            <div className={styles.typeTabs}>
                {supportTabs.map((tab) => (
                    <button
                        key={tab.key}
                        type="button"
                        className={`${styles.typeTab} ${activeType === tab.key ? styles.typeTabActive : ''}`}
                        onClick={() => changeType(tab.key)}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {activeType === SUPPORT_TYPES.inquiries ? (
                <>
                    <Tabs tabs={inquiryTabs} active={inquiryTab} onChange={(nextTab) => { setInquiryTab(nextTab); setInquiryPage(1); }} />
                    <div className={inquiryStyles.list}>
                        {inquiryResult?.items.map((item) => (
                            <Link key={item.id} to={`/admin/inquiries/${item.id}`} className={inquiryStyles.row}>
                                <Avatar name={item.user} size={38} />
                                <div className={inquiryStyles.rowBody}>
                                    <div className={inquiryStyles.rowTitle}>{item.title}</div>
                                    <div className={inquiryStyles.rowSub}>{item.user}・{item.createdAt}</div>
                                </div>
                                <Badge label={item.status} />
                            </Link>
                        ))}
                        {inquiryResult && inquiryResult.items.length === 0 && <EmptyState message="該当するお問い合わせがありません" />}
                    </div>
                    {inquiryResult && <Pagination page={inquiryResult.page} totalPages={inquiryResult.totalPages} onChange={setInquiryPage} />}
                </>
            ) : (
                <>
                    <Tabs tabs={reportTabs} active={reportTab} onChange={(nextTab) => { setReportTab(nextTab); setReportPage(1); }} />
                    <div className={reportStyles.list}>
                        {reportResult?.items.map((item) => (
                            <Link key={item.id} to={`/admin/reports/${item.id}`} className={reportStyles.row}>
                                <Badge label={item.status} />
                                <div className={reportStyles.rowBody}>
                                    <div className={reportStyles.rowTitle}>{item.type}</div>
                                    <div className={reportStyles.rowSub}>{item.reason}・通報者 {item.reporter}</div>
                                </div>
                                <span className={reportStyles.time}>{item.reportedAt.slice(11) || item.reportedAt}</span>
                            </Link>
                        ))}
                        {reportResult && reportResult.items.length === 0 && <EmptyState message="該当する通報がありません" />}
                    </div>
                    {reportResult && <Pagination page={reportResult.page} totalPages={reportResult.totalPages} onChange={setReportPage} />}
                </>
            )}
        </AdminLayout>
    );
}
