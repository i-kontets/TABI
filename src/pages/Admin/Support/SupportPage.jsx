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

function normalizeType(value) {
    return value === SUPPORT_TYPES.reports ? SUPPORT_TYPES.reports : SUPPORT_TYPES.inquiries;
}

export default function SupportPage() {
    const [searchParams, setSearchParams] = useSearchParams();
    const activeType = normalizeType(searchParams.get('type'));

    const [inquiryTab, setInquiryTab] = useState('未対応');
    const [reportTab, setReportTab] = useState('未対応');
    const [inquiryPage, setInquiryPage] = useState(1);
    const [reportPage, setReportPage] = useState(1);
    const [inquiryResult, setInquiryResult] = useState(null);
    const [reportResult, setReportResult] = useState(null);
    const [inquiryCounts, setInquiryCounts] = useState({});
    const [reportCounts, setReportCounts] = useState({});

    const loadInquiries = useCallback(() => {
        fetchInquiries({ status: inquiryTab, page: inquiryPage }).then(setInquiryResult);
        fetchInquiryCounts().then(setInquiryCounts);
    }, [inquiryTab, inquiryPage]);

    const loadReports = useCallback(() => {
        fetchReports({ status: reportTab, page: reportPage }).then(setReportResult);
        fetchReportCounts().then(setReportCounts);
    }, [reportTab, reportPage]);

    useEffect(() => {
        if (activeType === SUPPORT_TYPES.reports) {
            loadReports();
            return;
        }
        loadInquiries();
    }, [activeType, loadInquiries, loadReports]);

    useAdminRealtimeRefresh(INQUIRY_EVENTS, () => {
        if (activeType === SUPPORT_TYPES.inquiries) {
            loadInquiries();
        }
    });

    useAdminRealtimeRefresh(REPORT_EVENTS, () => {
        if (activeType === SUPPORT_TYPES.reports) {
            loadReports();
        }
    });

    const supportTabs = useMemo(() => ([
        { key: SUPPORT_TYPES.inquiries, label: 'お問い合わせ' },
        { key: SUPPORT_TYPES.reports, label: '通報' },
    ]), []);

    const inquiryTabs = ['未対応', '対応中', '対応済み'].map((key) => ({
        key,
        label: inquiryCounts[key] != null ? `${key} ${inquiryCounts[key]}` : key,
    }));

    const reportTabs = ['未対応', '確認中', '対応済み'].map((key) => ({
        key,
        label: reportCounts[key] != null ? `${key} ${reportCounts[key]}` : key,
    }));

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
