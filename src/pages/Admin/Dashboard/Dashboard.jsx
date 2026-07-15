import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AdminLayout from '../../../components/Admin/AdminLayout';
import { StatCard, Card, LineChart, DonutChart, Badge } from '../../../components/Admin/ui/Ui';
import { fetchAnalytics, fetchActivities, fetchPendingSupportItems } from '../../../services/admin';
import { useAdminRealtimeRefresh } from '../Realtime/useAdminRealtimeRefresh';
import styles from './Dashboard.module.css';

const ACTIVITY_LINKS = {
    user: '/admin/users',
    group: '/admin/groups',
    inquiry: '/admin/support?type=inquiries',
    report: '/admin/support?type=reports',
    notice: '/admin/notices',
};

const todayLabel = () => new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'Asia/Tokyo',
}).format(new Date());

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

export default function Dashboard() {
    const [analytics, setAnalytics] = useState(null);
    const [activities, setActivities] = useState([]);
    const [pendingSupportItems, setPendingSupportItems] = useState([]);

    const loadDashboard = useCallback(() => {
        fetchAnalytics().then(setAnalytics);
        fetchActivities().then(setActivities);
        fetchPendingSupportItems().then(setPendingSupportItems);
    }, []);

    useEffect(() => {
        loadDashboard();
    }, [loadDashboard]);

    useAdminRealtimeRefresh(REALTIME_EVENTS, loadDashboard);

    if (!analytics) return <AdminLayout title="TABI Admin"><div /></AdminLayout>;

    const { summary, activeUserTrend, userAttributes } = analytics;
    const systemErrors = typeof summary.systemErrors === 'object'
        ? summary.systemErrors
        : { value: summary.systemErrors ?? 0, today: 0 };

    return (
        <AdminLayout title="TABI Admin">
            <p className={styles.greeting}>おはようございます、管理者さん<br />
                <span>本日のアプリ全体の状況を確認できます。</span>
            </p>

            <h2 className={styles.sectionTitle}>本日のサマリー({todayLabel()} 時点)</h2>
            <div className={styles.statGrid}>
                <StatCard label="新規ユーザー" value={summary.newUsers.value} unit="人" diff={summary.newUsers.diff} />
                <StatCard label="旅行グループ作成数" value={summary.newGroups.value} unit="件" diff={summary.newGroups.diff} />
                <StatCard label="アクティブユーザー" value={summary.activeUsers.value} unit="人" diff={summary.activeUsers.diff} />
                <StatCard label="未対応お問い合わせ" value={summary.pendingInquiries} unit="件" warn={summary.pendingInquiries > 0} />
                <StatCard label="未対応通報" value={summary.pendingReports} unit="件" warn={summary.pendingReports > 0} />
                <StatCard
                    label="システムエラー"
                    value={systemErrors.value}
                    unit="件"
                    diffLabel={`本日 +${systemErrors.today}`}
                    diffTone="warn"
                    warn={systemErrors.value > 0}
                />
            </div>

            <div className={styles.panelGrid}>
                <Card title="アクティブユーザー推移(過去7日間)" className={styles.chartPanel}>
                    <LineChart data={activeUserTrend.data} labels={activeUserTrend.labels} padding={{ left: 24, right: 12, top: 8, bottom: 8 }} />
                </Card>

                <Card title="最近のアクティビティ">
                    <ul className={styles.activityList}>
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

                <Card title="ユーザー属性(全体)">
                    <DonutChart
                        items={userAttributes}
                        centerLabel="合計"
                        centerValue={`${summary.totalUsers.toLocaleString()}人`}
                    />
                </Card>

                <Card title="要対応の一覧">
                    <div className={styles.todoList}>
                        {pendingSupportItems.map((item) => (
                            <div key={item.id} className={styles.todoRow}>
                                <Badge label={item.status} />
                                <Link to={item.to} className={styles.todoLink}>{item.title}</Link>
                                <span className={styles.todoTime}>{item.createdAt}</span>
                            </div>
                        ))}
                        {pendingSupportItems.length === 0 && (
                            <p className={styles.todoEmpty}>未対応の項目はありません</p>
                        )}
                    </div>
                </Card>
            </div>
        </AdminLayout>
    );
}
