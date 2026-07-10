import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import AdminLayout from '../../../components/Admin/AdminLayout';
import { Badge, Avatar, Tabs, Card, DetailRow, Button, EmptyState } from '../../../components/Admin/ui/Ui';
import { fetchUser, suspendUser, deleteUser, fetchGroups } from '../../../services/admin';
import styles from './Users.module.css';

const TABS = ['基本情報', '活動履歴', '所属グループ'];

export default function UserDetail() {
    const { userId } = useParams();
    const [user, setUser] = useState(null);
    const [tab, setTab] = useState('基本情報');
    const [groups, setGroups] = useState([]);
    const [memo, setMemo] = useState('');
    const [showMemo, setShowMemo] = useState(false);

    useEffect(() => {
        fetchUser(userId).then(setUser);
        fetchGroups().then((r) => setGroups(r.items));
    }, [userId]);

    if (!user) {
        return (
            <AdminLayout title="ユーザー詳細" back>
                <EmptyState message="ユーザーが見つかりません" />
            </AdminLayout>
        );
    }

    const belongGroups = groups.filter((g) => g.members.some((m) => m.id === user.id));

    const handleSuspend = async () => {
        if (!window.confirm(user.status === '停止中' ? '利用停止を解除しますか?' : 'このユーザーを利用停止にしますか?')) return;
        const updated = await suspendUser(user.id);
        setUser({ ...updated });
    };

    const handleDelete = async () => {
        if (!window.confirm('このユーザーを削除(退会処理)しますか?この操作は取り消せません。')) return;
        const updated = await deleteUser(user.id);
        setUser({ ...updated });
    };

    return (
        <AdminLayout title="ユーザー詳細" back>
            <div className={styles.profile}>
                <Avatar name={user.name} size={56} />
                <div className={styles.profileBody}>
                    <div className={styles.profileName}>{user.name}</div>
                    <div className={styles.rowSub}>{user.email}</div>
                    <div className={styles.rowSub}>ユーザーID: {user.id}</div>
                </div>
                <Badge label={user.status} />
            </div>

            <Tabs tabs={TABS} active={tab} onChange={setTab} />

            {tab === '基本情報' && (
                <Card>
                    <DetailRow label="登録日">{user.registeredAt}</DetailRow>
                    <DetailRow label="最終ログイン">{user.lastLoginAt}</DetailRow>
                    <DetailRow label="年齢">{user.age}歳</DetailRow>
                    <DetailRow label="性別">{user.gender}</DetailRow>
                    <DetailRow label="アカウント状態"><Badge label={user.status} /></DetailRow>
                    <DetailRow label="メール認証済み">{user.emailVerified ? '✓ 済み' : '未認証'}</DetailRow>
                    <DetailRow label="電話番号">{user.phone}</DetailRow>
                    <DetailRow label="自己紹介">{user.bio || '-'}</DetailRow>
                </Card>
            )}

            {tab === '活動履歴' && (
                <Card>
                    <DetailRow label="作成した旅行数">{user.groupCount}件</DetailRow>
                    <DetailRow label="投稿数">{user.postCount}件</DetailRow>
                    <DetailRow label="最終ログイン">{user.lastLoginAt}</DetailRow>
                </Card>
            )}

            {tab === '所属グループ' && (
                <Card>
                    {belongGroups.length === 0 && <EmptyState message="所属グループがありません" />}
                    {belongGroups.map((g) => (
                        <Link key={g.id} to={`/admin/groups/${g.id}`} className={styles.groupLink}>
                            <span>{g.name}</span>
                            <Badge label={g.status} />
                        </Link>
                    ))}
                </Card>
            )}

            {showMemo && (
                <Card title="管理者メモ">
                    <textarea
                        className={styles.memoArea}
                        value={memo}
                        onChange={(e) => setMemo(e.target.value)}
                        placeholder="メモを入力してください"
                        rows={3}
                    />
                </Card>
            )}

            <div className={styles.actionRow}>
                <Button variant="outline" onClick={() => setShowMemo((v) => !v)}>メモを追加</Button>
                <Button variant="danger" onClick={handleSuspend}>
                    {user.status === '停止中' ? '停止解除' : '利用停止'}
                </Button>
                <Button variant="danger" onClick={handleDelete}>削除</Button>
            </div>
        </AdminLayout>
    );
}
