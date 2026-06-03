import { useNavigate } from 'react-router-dom';
import styles from './header.module.css';
import ArrowBack from '../../assets/icons/arrow_back.svg?react';
import ChatIcon from '../../assets/icons/chat.svg?react';

import { Link } from 'react-router-dom';

function Header() {
    const navigate = useNavigate();
    const subtitle = '2026年05月14日 - 2026年05月160日';

    const handleBackClick = () => {
        navigate('/Home');
    };

    return (
        <header className={styles.header}>
            <button
                className={styles.backButton}
                onClick={handleBackClick}
                aria-label="戻る"
            >
                {/* aria-hidden="true"は画面上で読み上げ機能を使用した際にsvgを範囲に含めないための命令です。 */}
                <ArrowBack className={styles.icon} aria-hidden="true"/>
            </button>

            <div className={styles.titleWrapper}>
                <h1 className={styles.title}>{tripName}</h1>
                <p className={styles.subtitle}>{subtitle}</p>
            </div>

            <Link to="/chat" className={styles.chatButton} aria-label="チャット">
                <img src={chatIcon} alt="チャット" className={styles.icon} />
            </Link>
        </header>
    );
}

export default Header;
