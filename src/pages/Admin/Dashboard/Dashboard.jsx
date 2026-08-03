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
import { Link } from 'react-router-dom';
import AdminLayout from '../../../components/Admin/AdminLayout';
import { StatCard, Card, LineChart, DonutChart, Badge } from '../../../components/Admin/ui/Ui';
import { fetchAnalytics, fetchActivities, fetchPendingSupportItems } from '../../../services/admin';
import { useAdminRealtimeRefresh } from '../Realtime/useAdminRealtimeRefresh';
import styles from './Dashboard.module.css';

/**
 * 管理者ホームダッシュボードです。
 *
 * APIから集計値、最近のアクティビティ、未対応の問い合わせ/通報を取得し、
 * 管理者がアプリ全体の状態を短時間で確認できるように表示します。
 */
const ACTIVITY_LINKS = {
    user: '/admin/users',
    group: '/admin/groups',
    inquiry: '/admin/support?type=inquiries',
    report: '/admin/support?type=reports',
    notice: '/admin/notices',
};

// todayLabel は、画面操作や API 結果に合わせて必要な処理をまとめた関数です。
const todayLabel = () => new Intl.DateTimeFormat('ja-JP', {
    // ダッシュボードの日付表示は、サーバーの場所に左右されないよう日本時間に固定します。
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'Asia/Tokyo',
}).format(new Date());

const REALTIME_EVENTS = [
    // これらのイベントを受け取ったら、ダッシュボードの集計を再取得します。
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

// ダッシュボードは概要画面なので、カード内に表示する件数だけを制限します。
// 詳細は「すべて見る」から各一覧画面で確認します。
const RESPONSE_PREVIEW_LIMIT = 4;
const ACTIVITY_PREVIEW_LIMIT = 8;

/**
 * Dashboard は、このファイルの中心となる処理をまとめた関数です。
 * 画面から渡された値や API の結果を使い、次に表示する内容を決めます。
 */
export default function Dashboard() {
    // analytics はサマリーカードやグラフ用、activities は最近の出来事、pendingSupportItems は対応が必要な一覧です。
    const [analytics, setAnalytics] = useState(null);
    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const [activities, setActivities] = useState([]);
    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const [pendingSupportItems, setPendingSupportItems] = useState([]);

    const loadDashboard = useCallback(() => {
        // 3種類のAPIをまとめて読み直し、管理画面の表示データを最新にします。
        fetchAnalytics().then(setAnalytics);
        // API などの非同期処理が終わった後に、受け取った結果を次の処理へ渡します。
        fetchActivities().then(setActivities);
        // API などの非同期処理が終わった後に、受け取った結果を次の処理へ渡します。
        fetchPendingSupportItems().then(setPendingSupportItems);
    }, []);

    // 画面が表示された直後や監視している値が変わった時に、必要なデータ取得や初期設定を行います。
    useEffect(() => {
        // 初回表示時に一度だけダッシュボード用データを取得します。
        loadDashboard();
    }, [loadDashboard]);

    // WebSocket経由で変更通知を受け取ったら、画面を手動更新しなくても最新状態にします。
    useAdminRealtimeRefresh(REALTIME_EVENTS, loadDashboard);

    // ここで条件を確認し、状況に合う処理だけを実行します。
    if (!analytics) return <AdminLayout title="TABI Admin"><div /></AdminLayout>;

    const { summary, activeUserTrend, userAttributes } = analytics;
    // 古い形式のAPIレスポンスでも表示できるよう、systemErrors はオブジェクト形式へ整えます。
    const systemErrors = typeof summary.systemErrors === 'object'
        ? summary.systemErrors
        : { value: summary.systemErrors ?? 0, today: 0 };
    // 取得した配列自体は変更せず、表示用だけ slice で先頭数件に絞ります。
    const responsePreviewItems = pendingSupportItems.slice(0, RESPONSE_PREVIEW_LIMIT);
    const activityPreviewItems = activities.slice(0, ACTIVITY_PREVIEW_LIMIT);

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

                <Card title="ユーザー属性(全体)" className={styles.attributePanel}>
                    <DonutChart
                        items={userAttributes}
                        centerLabel="合計"
                        centerValue={`${summary.totalUsers.toLocaleString()}人`}
                    />
                </Card>

                <Card
                    title={`対応一覧（${pendingSupportItems.length}件）`}
                    action={<Link to="/admin/support" className={styles.cardAction}>すべて見る →</Link>}
                    className={styles.todoPanel}
                >
                    {/* 未対応の問い合わせ・通報を最大4件だけ表示し、カードの高さが伸び続けないようにします。 */}
                    <div className={styles.todoList}>
                        {responsePreviewItems.map((item) => (
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

                <Card
                    title="最近のアクティビティ"
                    action={<Link to="/admin/activities" className={styles.cardAction}>すべて見る →</Link>}
                    className={styles.activityPanel}
                >
                    {/* 最新の出来事を最大8件だけ表示します。全件確認は専用一覧画面に任せます。 */}
                    <ul className={styles.activityList}>
                        {activityPreviewItems.map((action) => (
                            <li key={action.id}>
                                <Link to={ACTIVITY_LINKS[action.type] || '/admin'} className={styles.activityLink}>
                                    <span className={styles.activityText}>{action.text}</span>
                                    <span className={styles.activityTime}>{action.time}</span>
                                </Link>
                            </li>
                        ))}
                        {activities.length === 0 && (
                            <li className={styles.emptyRow}>最近のアクティビティはありません</li>
                        )}
                    </ul>
                </Card>
            </div>
        </AdminLayout>
    );
}
