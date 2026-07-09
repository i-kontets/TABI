import { useNavigate } from 'react-router-dom';
import styles from './AdminHeader.module.css';

/**
 * 管理者画面共通ヘッダー
 * back=true で戻るボタンを表示
 */
export default function AdminHeader({ title, back = false, right = null }) {
    const navigate = useNavigate();

    return (
        <header className={styles.header}>
            <div className={styles.left}>
                {back && (
                    <button
                        type="button"
                        className={styles.backBtn}
                        onClick={() => navigate(-1)}
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
