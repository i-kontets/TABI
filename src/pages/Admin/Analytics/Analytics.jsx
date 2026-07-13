import { useCallback, useEffect, useState } from 'react';
import AdminLayout from '../../../components/Admin/AdminLayout';
import { StatCard, Card, LineChart, DonutChart } from '../../../components/Admin/ui/Ui';
import { fetchAnalytics } from '../../../services/admin';
import { useAdminRealtimeRefresh } from '../Realtime/useAdminRealtimeRefresh';
import styles from './Analytics.module.css';

const REALTIME_EVENTS = [
    'admin:user_created',
    'admin:user_updated',
    'admin:user_deleted',
    'admin:group_created',
    'admin:group_updated',
    'admin:group_deleted',
    'admin:post_created',
    'admin:post_updated',
    'admin:post_deleted',
    'admin:report_created',
    'admin:report_updated',
    'admin:inquiry_created',
    'admin:inquiry_updated',
];

const formatDate = (date) => new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'Asia/Tokyo',
}).format(date);

const periodLabel = () => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 6);
    return `${formatDate(start)} 〜 ${formatDate(end)}`;
};

export default function Analytics() {
    const [analytics, setAnalytics] = useState(null);

    const loadAnalytics = useCallback(() => {
        fetchAnalytics().then(setAnalytics);
    }, []);

    useEffect(() => {
        loadAnalytics();
    }, [loadAnalytics]);

    useAdminRealtimeRefresh(REALTIME_EVENTS, loadAnalytics);

    if (!analytics) return <AdminLayout title="分析・利用状況" back><div /></AdminLayout>;

    const { summary, activeUserTrend, userAttributes, usage, featureRanking } = analytics;
    const maxCount = Math.max(...featureRanking.map((f) => f.count), 1);

    return (
        <AdminLayout title="分析・利用状況">
            <div className={styles.periodBar}>{periodLabel()}</div>

            <div className={styles.statGrid}>
                <StatCard label="アクティブユーザー" value={summary.activeUsers.value} unit="人" />
                <StatCard label="新規ユーザー(7日)" value={usage.newUsers7d} unit="人" />
                <StatCard label="グループ作成数(7日)" value={usage.groupsCreated7d} unit="件" />
                <StatCard label="投稿数(7日)" value={usage.posts7d} unit="件" />
                <StatCard label="画像アップロード(7日)" value={usage.uploads7d} unit="枚" />
                <StatCard label="全ユーザー数" value={summary.totalUsers.toLocaleString()} unit="人" />
            </div>

            <Card title="アクティブユーザー推移">
                <LineChart data={activeUserTrend.data} labels={activeUserTrend.labels} />
            </Card>

            <Card title="ユーザー属性">
                <DonutChart
                    items={userAttributes}
                    centerLabel="全体"
                    centerValue={`${summary.totalUsers.toLocaleString()}人`}
                />
            </Card>

            <Card title="よく使われる機能ランキング">
                {featureRanking.map((f, i) => (
                    <div key={f.name} className={styles.rankRow}>
                        <span className={styles.rankNum}>{i + 1}</span>
                        <div className={styles.rankBody}>
                            <div className={styles.rankHead}>
                                <span>{f.name}</span>
                                <span className={styles.rankCount}>{f.count.toLocaleString()}回</span>
                            </div>
                            <div className={styles.rankBarBg}>
                                <div className={styles.rankBar} style={{ width: `${(f.count / maxCount) * 100}%` }} />
                            </div>
                        </div>
                    </div>
                ))}
            </Card>
        </AdminLayout>
    );
}
