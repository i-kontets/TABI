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
import { useNavigate } from 'react-router-dom';
import styles from './AdminHeader.module.css';

/**
 * 管理者画面共通ヘッダー
 * back=true で戻るボタンを表示
 */
export default function AdminHeader({ title, back = false, backTo = null, right = null }) {
    const navigate = useNavigate();

    return (
        <header className={styles.header}>
            <div className={styles.left}>
                {back && (
                    <button
                        type="button"
                        className={styles.backBtn}
                        onClick={() => backTo ? navigate(backTo) : navigate(-1)}
                        aria-label="戻る"
                    >
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                            <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </button>
                )}
                <h1 className={styles.title}>{title}</h1>
            </div>
            {right && <div className={styles.right}>{right}</div>}
        </header>
    );
}
