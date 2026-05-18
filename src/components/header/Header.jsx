import { useNavigate } from 'react-router-dom';
import styles from './header.module.css';
import arrowBack from '../../assets/icons/arrow_back.svg';
import chatIcon from '../../assets/icons/chat.svg';

function Header({ subtitle }) {
    const navigate = useNavigate();

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
                <img src={arrowBack} alt="戻る" className={styles.icon} />
            </button>

            <div className={styles.titleWrapper}>
                <h1 className={styles.title}>旅行</h1>
                {subtitle ? <p className={styles.subtitle}>{subtitle}</p> : null}
            </div>

            <button className={styles.chatButton} aria-label="チャット">
                <img src={chatIcon} alt="チャット" className={styles.icon} />
            </button>
        </header>
    );
}

export default Header;
