import { Link } from 'react-router-dom';
import AdminLayout from '../../../components/Admin/AdminLayout';
import styles from './Settings.module.css';

const MENU = [
    { to: '/admin/notices', label: 'お知らせ管理', desc: '運営からのお知らせ作成・配信管理' },
    { to: '/admin/spots', label: 'スポット管理', desc: 'スポット・カテゴリ等のマスターデータ' },
    { to: '/admin/analytics', label: '分析・利用状況', desc: 'ユーザー数やアクティブ数の統計' },
    { to: '/admin/managers', label: '管理者・権限管理', desc: '管理者アカウントと権限ロール' },
    { to: '/admin/logs', label: '操作ログ(監査ログ)', desc: '管理画面の操作履歴を確認' },
];

export default function Settings() {
    return (
        <AdminLayout title="設定">
            <div className={styles.list}>
                {MENU.map((m) => (
                    <Link key={m.to} to={m.to} className={styles.row}>
                        <div className={styles.rowBody}>
                            <div className={styles.rowTitle}>{m.label}</div>
                            <div className={styles.rowSub}>{m.desc}</div>
                        </div>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                            <path d="m9 6 6 6-6 6" stroke="#8a94a6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </Link>
                ))}
            </div>
        </AdminLayout>
    );
}
