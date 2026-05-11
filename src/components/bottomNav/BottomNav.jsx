import { useNavigate } from 'react-router-dom';
import styles from './bottomNav.module.css';
import timeIcon from '../../assets/icons/time.svg';
import planIcon from '../../assets/icons/plan.svg';
import photoIcon from '../../assets/icons/photo.svg';
import splitIcon from '../../assets/icons/split.svg';
import Tbook from '../../assets/icons/Tbook.svg';

function BottomNav() {
    const navigate = useNavigate();

    const menuItems = [
        { id: 'bookmark', label: 'しおり', path: '#', icon: Tbook},
        { id: 'planning', label: '計画立案', path: '#', icon: planIcon },
        { id: 'album', label: 'アルバム', path: '#', icon: photoIcon },
        { id: 'time', label: 'スケジュール', path: '#', icon: timeIcon },
        { id: 'split', label: '割り勘', path: '#', icon: splitIcon },
    ];

    const handleNavigation = (path) => {
        navigate(path);
    };

    return (
        <nav className={styles.bottomNav}>
            {menuItems.map((item) => (
                <button
                    key={item.id}
                    className={styles.navItem}
                    onClick={() => handleNavigation(item.path)}
                    aria-label={item.label}
                >
                    {item.icon ? (
                        <img src={item.icon} alt={item.label} className={styles.icon} />
                    ) : (
                        <div className={styles.iconPlaceholder}></div>
                    )}
                    <span className={styles.label}>{item.label}</span>
                </button>
            ))}
        </nav>
    );
}

export default BottomNav;
