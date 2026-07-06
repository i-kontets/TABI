import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import AdminLayout from '../../../components/Admin/AdminLayout';
import { Badge, Avatar, Tabs, Card, DetailRow, EmptyState } from '../../../components/Admin/ui/Ui';
import { fetchGroup, fetchPosts } from '../../../services/admin';
import styles from './Groups.module.css';

const TABS = ['メンバー', 'しおり', '話し合い', '履歴'];

export default function GroupDetail() {
    const { groupId } = useParams();
    const [group, setGroup] = useState(null);
    const [tab, setTab] = useState('メンバー');
    const [posts, setPosts] = useState([]);

    useEffect(() => {
        fetchGroup(groupId).then(setGroup);
        fetchPosts().then((r) => setPosts(r.items));
    }, [groupId]);

    if (!group) {
        return (
            <AdminLayout title="グループ詳細" back>
                <EmptyState message="グループが見つかりません" />
            </AdminLayout>
        );
    }

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
