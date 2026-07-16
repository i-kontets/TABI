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
import AdminLayout from '../../../components/Admin/AdminLayout';
import { Badge, Avatar, Card, Button, EmptyState } from '../../../components/Admin/ui/Ui';
import { fetchManagers, createManager, toggleManagerStatus } from '../../../services/admin';
import { useAdminRealtimeRefresh } from '../Realtime/useAdminRealtimeRefresh';
import styles from './Managers.module.css';

const ROLES = ['管理者', 'サポート', '閲覧のみ'];

/**
 * Managers は、このファイルの中心となる処理をまとめた関数です。
 * 画面から渡された値や API の結果を使い、次に表示する内容を決めます。
 */
export default function Managers() {
    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const [managers, setManagers] = useState([]);
    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const [showForm, setShowForm] = useState(false);
    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const [form, setForm] = useState({ name: '', email: '', role: 'サポート' });

    // API などの非同期処理が終わった後に、受け取った結果を次の処理へ渡します。
    const load = useCallback(() => fetchManagers().then((list) => setManagers([...list])), []);

    // 画面が表示された直後や監視している値が変わった時に、必要なデータ取得や初期設定を行います。
    useEffect(() => {
        load();
    }, [load]);

    useAdminRealtimeRefresh(['admin:manager_created', 'admin:manager_updated', 'admin:manager_deleted'], load);

    // handleAdd は、画面操作や API 結果に合わせて必要な処理をまとめた関数です。
    const handleAdd = async () => {
        // ここで条件を確認し、状況に合う処理だけを実行します。
        if (!form.name.trim() || !form.email.trim()) {
            window.alert('名前とメールアドレスは必須です。');
            return;
        }
        await createManager(form);
        setForm({ name: '', email: '', role: 'サポート' });
        setShowForm(false);
        load();
    };

    // handleToggle は、画面操作や API 結果に合わせて必要な処理をまとめた関数です。
    const handleToggle = async (m) => {
        // ここで条件を確認し、状況に合う処理だけを実行します。
        if (m.role === 'オーナー') {
            window.alert('オーナーは停止できません。');
            return;
        }
        // ここで条件を確認し、状況に合う処理だけを実行します。
        if (!window.confirm(m.status === '停止中' ? 'アカウントを復旧しますか?' : 'このアカウントを停止しますか?')) return;
        await toggleManagerStatus(m.id);
        load();
    };

    return (
        <AdminLayout
            title="管理者一覧"
            headerRight={<Button variant="primary" onClick={() => setShowForm((v) => !v)}>+ 追加</Button>}
        >
            {showForm && (
                <Card title="管理者を追加">
                    <label className={styles.field}>
                        <span className={styles.fieldLabel}>名前</span>
                        <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                    </label>
                    <label className={styles.field}>
                        <span className={styles.fieldLabel}>メールアドレス</span>
                        <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                    </label>
                    <label className={styles.field}>
                        <span className={styles.fieldLabel}>権限ロール</span>
                        <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                            {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                        </select>
                    </label>
                    <Button variant="primary" full onClick={handleAdd}>追加する</Button>
                </Card>
            )}

            <div className={styles.list}>
                {managers.map((m) => (
                    <div key={m.id} className={styles.row}>
                        <Avatar name={m.name} size={40} />
                        <div className={styles.rowBody}>
                            <div className={styles.rowName}>
                                {m.name}
                                <Badge label={m.role} />
                                {m.status === '停止中' && <Badge label="停止中" />}
                            </div>
                            <div className={styles.rowSub}>最終ログイン {m.lastLoginAt}</div>
                        </div>
                        {m.role !== 'オーナー' && (
                            <button type="button" className={styles.iconBtn} onClick={() => handleToggle(m)} aria-label="停止/復旧">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                                    <rect x="4" y="4" width="16" height="16" rx="3" stroke="#d93025" strokeWidth="1.8" />
                                    <path d="M9 9h6v6H9z" fill="#d93025" />
                                </svg>
                            </button>
                        )}
                    </div>
                ))}
                {managers.length === 0 && <EmptyState message="管理者がいません" />}
            </div>
        </AdminLayout>
    );
}
