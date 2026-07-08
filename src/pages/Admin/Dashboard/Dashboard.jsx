import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AdminLayout from '../../../components/Admin/AdminLayout';
import { StatCard, Card, LineChart, DonutChart, Badge } from '../../../components/Admin/ui/Ui';
import { fetchAnalytics, fetchActivities } from '../../../services/admin';
import styles from './Dashboard.module.css';

const ACTIVITY_LINKS = {
    user: '/admin/users',
    group: '/admin/groups',
    inquiry: '/admin/inquiries',
    report: '/admin/reports',
    notice: '/admin/notices',
    post: '/admin/posts',
    spot: '/admin/spots',
    admin: '/admin/logs',
};

export default function Dashboard() {
    const [analytics, setAnalytics] = useState(null);
    const [activities, setActivities] = useState([]);

    const loadDashboard = useCallback(() => {
        fetchAnalytics().then(setAnalytics);
        fetchActivities().then(setActivities);
    }, []);

    useEffect(() => {
        loadDashboard();
    }, [loadDashboard]);

    useEffect(() => {
        const handleRealtimeUpdate = (event) => {
            if (import.meta.env.DEV) {
                console.log(`${event.type} received`);
            }
            loadDashboard();
        };

        window.addEventListener('admin:inquiry_created', handleRealtimeUpdate);
        window.addEventListener('admin:report_created', handleRealtimeUpdate);

        return () => {
            window.removeEventListener('admin:inquiry_created', handleRealtimeUpdate);
            window.removeEventListener('admin:report_created', handleRealtimeUpdate);
        };
    }, [loadDashboard]);

    if (!analytics) return <AdminLayout title="TABI Admin"><div /></AdminLayout>;

    const { summary, activeUserTrend, userAttributes, notificationPermissions } = analytics;
    const notificationPermissionItems = notificationPermissions || userAttributes;
    const notificationPermissionTotal = notificationPermissionItems.reduce((total, item) => total + item.value, 0);

    return (
        <AdminLayout title="TABI Admin">
            <p className={styles.greeting}>おはようございます、管理者さん<br />
                <span>本日のアプリ全体の状況を確認できます。</span>
            </p>

            <h2 className={styles.sectionTitle}>本日のサマリー(2026/07/02 時点)</h2>
            <div className={styles.statGrid}>
                <StatCard label="新規ユーザー" value={summary.newUsers.value} unit="人" diff={summary.newUsers.diff} />
                <StatCard label="旅行グループ作成数" value={summary.newGroups.value} unit="件" diff={summary.newGroups.diff} />
                <StatCard label="アクティブユーザー" value={summary.activeUsers.value} unit="人" diff={summary.activeUsers.diff} />
                <StatCard label="未対応お問い合わせ" value={summary.pendingInquiries} unit="件" warn={summary.pendingInquiries > 0} />
                <StatCard label="未対応通報" value={summary.pendingReports} unit="件" warn={summary.pendingReports > 0} />
                <StatCard label="システムエラー" value={summary.systemErrors} unit="件" />
            </div>

            <Card title="アクティブユーザー推移(過去7日間)">
                <LineChart data={activeUserTrend.data} labels={activeUserTrend.labels} />
            </Card>

            <Card title="最近のアクティビティ">
                <ul className={styles.activityList}>
                    {activities.length === 0 && (
                        <li className={styles.emptyActivity}>最近のアクティビティはありません</li>
                    )}
                    {activities.map((action) => (
                        <li key={action.id}>
                            <Link to={ACTIVITY_LINKS[action.type] || '/admin'} className={styles.activityLink}>
                                <span className={styles.activityText}>{action.text}</span>
                                <span className={styles.activityTime}>{action.time}</span>
                            </Link>
                        </li>
                    ))}
                </ul>
            </Card>

            <Card title="通知許可状況">
                <DonutChart
                    items={notificationPermissionItems}
                    centerLabel="合計"
                    centerValue={`${notificationPermissionTotal.toLocaleString()}人`}
                />
            </Card>

            <Card title="要対応の一覧">
                <div className={styles.todoRow}>
                    <Badge label="未対応" />
                    <Link to="/admin/inquiries" className={styles.todoLink}>ログインできないお問い合わせ</Link>
                </div>
                <div className={styles.todoRow}>
                    <Badge label="未対応" />
                    <Link to="/admin/reports" className={styles.todoLink}>不適切投稿の通報</Link>
                </div>
            </Card>
        </AdminLayout>
    );
}
