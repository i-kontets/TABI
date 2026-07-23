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

/**
 * Activities は、このファイルの中心となる処理をまとめた関数です。
 * 画面から渡された値や API の結果を使い、次に表示する内容を決めます。
 */
export default function Activities() {
    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const [page, setPage] = useState(1);
    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const [result, setResult] = useState(null);

    const loadActivities = useCallback(() => {
        // API などの非同期処理が終わった後に、受け取った結果を次の処理へ渡します。
        fetchActivityPage({ page }).then(setResult);
    }, [page]);

    // 画面が表示された直後や監視している値が変わった時に、必要なデータ取得や初期設定を行います。
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
