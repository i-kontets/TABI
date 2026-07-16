import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AdminLayout from '../../../components/Admin/AdminLayout';
import { EmptyState } from '../../../components/Admin/ui/Ui';
import { fetchActivityPage } from '../../../services/admin';
import { useAdminRealtimeRefresh } from '../Realtime/useAdminRealtimeRefresh';
import styles from './Activities.module.css';

const ACTIVITY_LINKS = {
    user: '/admin/users',
    group: '/admin/groups',
    inquiry: '/admin/support?type=inquiries',
    report: '/admin/support?type=reports',
    notice: '/admin/notices',
};

const REALTIME_EVENTS = [
    'admin:user_created',
    'admin:user_updated',
    'admin:user_deleted',
    'admin:user_active_updated',
    'admin:system_error_created',
    'admin:group_created',
    'admin:group_updated',
    'admin:group_deleted',
    'admin:post_created',
    'admin:post_updated',
    'admin:post_deleted',
    'admin:inquiry_created',
    'admin:inquiry_updated',
    'admin:report_created',
    'admin:report_updated',
    'admin:notice_created',
    'admin:notice_updated',
    'admin:notice_deleted',
];

export default function Activities() {
    const [page, setPage] = useState(1);
    const [result, setResult] = useState(null);

    const loadActivities = useCallback(() => {
        fetchActivityPage({ page }).then(setResult);
    }, [page]);

    useEffect(() => {
        loadActivities();
    }, [loadActivities]);

    useAdminRealtimeRefresh(REALTIME_EVENTS, loadActivities);

    const totalPages = result?.totalPages || 1;

    return (
        <AdminLayout title="最近のアクティビティ" back>
            <div className={styles.list}>
                {result?.items.map((activity) => (
                    <Link key={activity.id} to={ACTIVITY_LINKS[activity.type] || '/admin'} className={styles.row}>
                        <span className={styles.rowText}>{activity.text}</span>
                        <span className={styles.rowTime}>{activity.time}</span>
                    </Link>
                ))}
                {result && result.items.length === 0 && <EmptyState message="最近のアクティビティはありません" />}
            </div>
            {result && totalPages > 1 && (
                <div className={styles.pagination}>
                    <button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page <= 1}>
                        前へ
                    </button>
                    <span>{page} / {totalPages}</span>
                    <button type="button" onClick={() => setPage((current) => Math.min(totalPages, current + 1))} disabled={page >= totalPages}>
                        次へ
                    </button>
                </div>
            )}
        </AdminLayout>
    );
}
