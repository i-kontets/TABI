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
import { useParams, Link } from 'react-router-dom';
import AdminLayout from '../../../components/Admin/AdminLayout';
import { Badge, Avatar, Tabs, Card, DetailRow, EmptyState } from '../../../components/Admin/ui/Ui';
import { fetchGroup, fetchPosts } from '../../../services/admin';
import { useAdminRealtimeRefresh } from '../Realtime/useAdminRealtimeRefresh';
import styles from './Groups.module.css';

const TABS = ['メンバー', 'しおり', '話し合い', '履歴'];

/**
 * GroupDetail は、このファイルの中心となる処理をまとめた関数です。
 * 画面から渡された値や API の結果を使い、次に表示する内容を決めます。
 */
export default function GroupDetail() {
    const { groupId } = useParams();
    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const [group, setGroup] = useState(null);
    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const [tab, setTab] = useState('メンバー');
    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const [posts, setPosts] = useState([]);

    const loadGroupDetail = useCallback(() => {
        // API などの非同期処理が終わった後に、受け取った結果を次の処理へ渡します。
        fetchGroup(groupId).then(setGroup);
        // API などの非同期処理が終わった後に、受け取った結果を次の処理へ渡します。
        fetchPosts().then((r) => setPosts(r.items));
    }, [groupId]);

    // 画面が表示された直後や監視している値が変わった時に、必要なデータ取得や初期設定を行います。
    useEffect(() => {
        loadGroupDetail();
    }, [loadGroupDetail]);

    useAdminRealtimeRefresh(['admin:group_updated', 'admin:group_deleted', 'admin:post_created', 'admin:post_updated', 'admin:post_deleted'], loadGroupDetail);

    // ここで条件を確認し、状況に合う処理だけを実行します。
    if (!group) {
        return (
            <AdminLayout title="グループ詳細" back>
                <EmptyState message="グループが見つかりません" />
            </AdminLayout>
        );
    }

    // 条件に合うデータだけを残して、画面に出す内容を絞り込みます。
    const groupPosts = posts.filter((p) => p.groupId === group.id);

    return (
        <AdminLayout title="グループ詳細" back>
            <div className={styles.head}>
                <div className={styles.headTop}>
                    <span className={styles.headName}>{group.name}</span>
                    <Badge label={group.status} />
                </div>
                <div className={styles.rowSub}>{group.creator}・作成 {group.createdAt}</div>
                <div className={styles.period}>{group.period}</div>
                <div className={styles.countGrid}>
                    <div><b>{group.memberCount}</b><span>メンバー</span></div>
                    <div><b>{group.itineraryCount}</b><span>しおり</span></div>
                    <div><b>{group.scheduleCount}</b><span>スケジュール</span></div>
                    <div><b>{group.albumCount}</b><span>アルバム</span></div>
                </div>
            </div>

            <Tabs tabs={TABS} active={tab} onChange={setTab} />

            {tab === 'メンバー' && (
                <Card>
                    {group.members.map((m) => (
                        <Link key={m.id} to={`/admin/users/${m.id}`} className={styles.memberRow}>
                            <Avatar name={m.name} size={34} />
                            <span className={styles.memberName}>{m.name}</span>
                            <Badge label={m.role} />
                        </Link>
                    ))}
                </Card>
            )}

            {tab === 'しおり' && (
                <Card>
                    <DetailRow label="しおり数">{group.itineraryCount}件</DetailRow>
                    <DetailRow label="スケジュール">{group.scheduleCount}件</DetailRow>
                </Card>
            )}

            {tab === '話し合い' && (
                <Card>
                    {groupPosts.length === 0 && <EmptyState message="投稿がありません" />}
                    {groupPosts.map((p) => (
                        <Link key={p.id} to={`/admin/posts/${p.id}`} className={styles.memberRow}>
                            <Avatar name={p.author} size={30} />
                            <span className={styles.postBody}>{p.body}</span>
                        </Link>
                    ))}
                </Card>
            )}

            {tab === '履歴' && (
                <Card>
                    <DetailRow label="作成日">{group.createdAt}</DetailRow>
                    <DetailRow label="アルバム写真数">{group.albumCount}枚</DetailRow>
                </Card>
            )}
        </AdminLayout>
    );
}
