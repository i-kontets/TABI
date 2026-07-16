/**
 * 管理画面で共通して使うヘッダー、レイアウト、カードなどの部品です。
 *
 * 主な流れ:
 * 1. 必要な部品や API 関数を読み込む
 * 2. 画面表示やデータ取得に必要な値を準備する
 * 3. ユーザー操作や API の結果に合わせて表示を更新する
 *
 * 扱うデータ: React の state、props、フォーム入力、API から返ったデータを主に扱います。
 */
import AdminHeader from './AdminHeader';
import AdminBottomNav from './AdminBottomNav';
import styles from './AdminLayout.module.css';

/**
 * 管理者画面の共通レイアウト
 * ヘッダー + コンテンツ + BottomNav
 */
export default function AdminLayout({ title, back = false, backTo = null, headerRight = null, children }) {
    return (
        <div className={styles.wrap}>
            <AdminHeader title={title} back={back} backTo={backTo} right={headerRight} />
            <main className={styles.content}>{children}</main>
            <AdminBottomNav />
        </div>
    );
}
