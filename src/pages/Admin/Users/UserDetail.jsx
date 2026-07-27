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
import { Badge, Avatar, Tabs, Card, DetailRow, Button, EmptyState } from '../../../components/Admin/ui/Ui';
import { fetchUser, suspendUser, deleteUser, fetchGroups } from '../../../services/admin';
import { useAdminRealtimeRefresh } from '../Realtime/useAdminRealtimeRefresh';
import styles from './Users.module.css';

const TABS = ['基本情報', '活動履歴', '所属グループ'];

/**
 * UserDetail は、このファイルの中心となる処理をまとめた関数です。
 * 画面から渡された値や API の結果を使い、次に表示する内容を決めます。
 */
export default function UserDetail() {
    const { userId } = useParams();
    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const [user, setUser] = useState(null);
    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const [tab, setTab] = useState('基本情報');
    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const [groups, setGroups] = useState([]);
    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const [memo, setMemo] = useState('');
    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const [showMemo, setShowMemo] = useState(false);

    const loadUserDetail = useCallback(() => {
        // API などの非同期処理が終わった後に、受け取った結果を次の処理へ渡します。
        fetchUser(userId).then(setUser);
        // API などの非同期処理が終わった後に、受け取った結果を次の処理へ渡します。
        fetchGroups().then((r) => setGroups(r.items));
    }, [userId]);

    // 画面が表示された直後や監視している値が変わった時に、必要なデータ取得や初期設定を行います。
    useEffect(() => {
        loadUserDetail();
    }, [loadUserDetail]);

    useAdminRealtimeRefresh(['admin:user_updated', 'admin:user_deleted', 'admin:group_updated'], loadUserDetail);

    // ここで条件を確認し、状況に合う処理だけを実行します。
    if (!user) {
        return (
            <AdminLayout title="ユーザー詳細" back>
                <EmptyState message="ユーザーが見つかりません" />
            </AdminLayout>
        );
    }

    // 条件に合うデータだけを残して、画面に出す内容を絞り込みます。
    const belongGroups = groups.filter((g) => g.members.some((m) => m.id === user.id));

    // handleSuspend は、画面操作や API 結果に合わせて必要な処理をまとめた関数です。
    const handleSuspend = async () => {
        // ここで条件を確認し、状況に合う処理だけを実行します。
        if (!window.confirm(user.status === '停止中' ? '利用停止を解除しますか?' : 'このユーザーを利用停止にしますか?')) return;
        const updated = await suspendUser(user.id);
        setUser({ ...updated });
    };

    // handleDelete は、画面操作や API 結果に合わせて必要な処理をまとめた関数です。
    const handleDelete = async () => {
        // ここで条件を確認し、状況に合う処理だけを実行します。
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
