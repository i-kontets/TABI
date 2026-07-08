import { useCallback, useEffect, useState } from 'react';
import AdminLayout from '../../../components/Admin/AdminLayout';
import { StatCard, Card, LineChart, DonutChart } from '../../../components/Admin/ui/Ui';
import { fetchAnalytics } from '../../../services/admin';
import styles from './Analytics.module.css';

export default function Analytics() {
    const [analytics, setAnalytics] = useState(null);

    const loadAnalytics = useCallback(() => {
        fetchAnalytics().then(setAnalytics);
    }, []);

    useEffect(() => {
        loadAnalytics();
    }, [loadAnalytics]);

    useEffect(() => {
        const handleRealtimeUpdate = (event) => {
            if (import.meta.env.DEV) {
                console.log(`${event.type} received`);
            }
            loadAnalytics();
        };

        window.addEventListener('admin:inquiry_created', handleRealtimeUpdate);
        window.addEventListener('admin:report_created', handleRealtimeUpdate);

        return () => {
            window.removeEventListener('admin:inquiry_created', handleRealtimeUpdate);
            window.removeEventListener('admin:report_created', handleRealtimeUpdate);
        };
    }, [loadAnalytics]);

    if (!analytics) return <AdminLayout title="分析・利用状況" back><div /></AdminLayout>;

    const { summary, activeUserTrend, userAttributes, notificationPermissions, usage, featureRanking } = analytics;
    const notificationPermissionItems = notificationPermissions || userAttributes;
    const notificationPermissionTotal = notificationPermissionItems.reduce((total, item) => total + item.value, 0);
    const maxCount = Math.max(...featureRanking.map((f) => f.count), 1);

    return (
        <AdminLayout title="分析・利用状況" back>
            <div className={styles.periodBar}>2026/06/26 〜 2026/07/02</div>

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

            <Card title="通知許可状況">
                <DonutChart
                    items={notificationPermissionItems}
                    centerLabel="全体"
                    centerValue={`${notificationPermissionTotal.toLocaleString()}人`}
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
