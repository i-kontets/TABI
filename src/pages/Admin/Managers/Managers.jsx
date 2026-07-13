import { useCallback, useEffect, useState } from 'react';
import AdminLayout from '../../../components/Admin/AdminLayout';
import { Badge, Avatar, Card, Button, EmptyState } from '../../../components/Admin/ui/Ui';
import { fetchManagers, createManager, toggleManagerStatus } from '../../../services/admin';
import { useAdminRealtimeRefresh } from '../Realtime/useAdminRealtimeRefresh';
import styles from './Managers.module.css';

const ROLES = ['管理者', 'サポート', '閲覧のみ'];

export default function Managers() {
    const [managers, setManagers] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ name: '', email: '', role: 'サポート' });

    const load = useCallback(() => fetchManagers().then((list) => setManagers([...list])), []);

    useEffect(() => {
        load();
    }, [load]);

    useAdminRealtimeRefresh(['admin:manager_created', 'admin:manager_updated', 'admin:manager_deleted'], load);

    const handleAdd = async () => {
        if (!form.name.trim() || !form.email.trim()) {
            window.alert('名前とメールアドレスは必須です。');
            return;
        }
        await createManager(form);
        setForm({ name: '', email: '', role: 'サポート' });
        setShowForm(false);
        load();
    };

    const handleToggle = async (m) => {
        if (m.role === 'オーナー') {
            window.alert('オーナーは停止できません。');
            return;
        }
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
