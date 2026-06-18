import { useLocation, useNavigate } from 'react-router-dom';
import styles from './bottomNav.module.css';
import timeIcon from '../../assets/icons/time.svg';
import photoIcon from '../../assets/icons/photo.svg';
import splitIcon from '../../assets/icons/split.svg';
import Tbook from '../../assets/icons/Tbook.svg';
import Meet from '../../assets/icons/speaker_notes.svg';

function BottomNav() {
    const navigate = useNavigate();
    const location = useLocation();
    const params = new URLSearchParams(location.search);
    const groupId = params.get('groupId') || '1';

    const menuItems = [
        { id: 'bookmark', label: 'しおり', path:'/Itinerary', icon: Tbook},
        { id: 'meeting', label: '話し合い' , path:`/group/${groupId}/talk`, icon: Meet},
        { id: 'time', label: 'スケジュール', path: '/schedule', icon: timeIcon },
        { id: 'album', label: 'アルバム', path: '/album', icon: photoIcon },
        { id: 'split', label: '割り勘', path: '/Invoice', icon: splitIcon },
    ];

    const handleNavigation = (path) => {
        if (path.startsWith('/group/')) {
            navigate(path);
            return;
        }
        navigate(`${path}${location.search}`);
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
