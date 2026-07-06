import AdminHeader from './AdminHeader';
import AdminBottomNav from './AdminBottomNav';
import styles from './AdminLayout.module.css';

/**
 * 管理者画面の共通レイアウト
 * ヘッダー + コンテンツ + BottomNav
 */
export default function AdminLayout({ title, back = false, headerRight = null, children }) {
    return (
        <div className={styles.wrap}>
            <AdminHeader title={title} back={back} right={headerRight} />
            <main className={styles.content}>{children}</main>
            <AdminBottomNav />
        </div>
    );
}
