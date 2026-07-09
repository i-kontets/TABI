import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AdminLayout from '../../../components/Admin/AdminLayout';
import { Tabs, Badge, Avatar, Pagination, EmptyState } from '../../../components/Admin/ui/Ui';
import { fetchInquiries, fetchInquiryCounts } from '../../../services/admin';
import styles from './Inquiries.module.css';

export default function InquiryList() {
    const [tab, setTab] = useState('未対応');
    const [page, setPage] = useState(1);
    const [result, setResult] = useState(null);
    const [counts, setCounts] = useState({});

    const loadInquiries = useCallback(() => {
        fetchInquiries({ status: tab, page }).then(setResult);
        fetchInquiryCounts().then(setCounts);
    }, [tab, page]);

    useEffect(() => {
        loadInquiries();
    }, [loadInquiries]);

    useEffect(() => {
        const handleInquiryCreated = (event) => {
            if (import.meta.env.DEV) {
                console.log('Realtime inquiry_created received', event.detail);
            }
            loadInquiries();
        };

        window.addEventListener('admin:inquiry_created', handleInquiryCreated);

        return () => {
            window.removeEventListener('admin:inquiry_created', handleInquiryCreated);
        };
    }, [loadInquiries]);

    const tabs = ['未対応', '対応中', '対応済み'].map((k) => ({
        key: k,
        label: counts[k] != null ? `${k} ${counts[k]}` : k,
    }));

    return (
        <AdminLayout title="お問い合わせ一覧">
            <Tabs tabs={tabs} active={tab} onChange={(t) => { setTab(t); setPage(1); }} />
            <div className={styles.list}>
                {result?.items.map((i) => (
                    <Link key={i.id} to={`/admin/inquiries/${i.id}`} className={styles.row}>
                        <Avatar name={i.user} size={38} />
                        <div className={styles.rowBody}>
                            <div className={styles.rowTitle}>{i.title}</div>
                            <div className={styles.rowSub}>{i.user}・{i.createdAt}</div>
                        </div>
                        <Badge label={i.status} />
                    </Link>
                ))}
                {result && result.items.length === 0 && <EmptyState message="該当するお問い合わせがありません" />}
            </div>
            {result && <Pagination page={result.page} totalPages={result.totalPages} onChange={setPage} />}
        </AdminLayout>
    );
}
