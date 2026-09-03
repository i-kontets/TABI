import { useLocation, useNavigate } from 'react-router-dom';
import styles from './MainBottomNav.module.css';

function HomeIcon({ className }) {
    return (
        <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
            <path d="M3 11.5 12 4l9 7.5" />
            <path d="M5.5 10.5V20h13v-9.5" />
            <path d="M9.5 20v-5h5v5" />
        </svg>
    );
}

function UserIcon({ className }) {
    return (
        <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
            <path d="M4.5 20a7.5 7.5 0 0 1 15 0" />
        </svg>
    );
}

const navItems = [
    { id: 'home', label: 'ホーム', path: '/Home', icon: HomeIcon },
    { id: 'mypage', label: 'マイページ', path: '/MyPage', icon: UserIcon },
];

function getActiveItemId(pathname) {
    const normalizedPath = pathname.toLowerCase();

    if (normalizedPath === '/home') return 'home';
    if (normalizedPath === '/mypage' || normalizedPath.startsWith('/mypage/')) return 'mypage';

    return '';
}

export default function MainBottomNav({ activeItemId }) {
    const navigate = useNavigate();
    const location = useLocation();
    const resolvedActiveItemId = activeItemId ?? getActiveItemId(location.pathname);

    const handleNavigation = (event, path) => {
        // 通知カードなど親要素のクリック処理へ伝播すると、フッター操作後に通知遷移が再実行されるためここで止めます。
        event.stopPropagation();
        navigate(path);
    };

    return (
        <footer className={styles.footer}>
            {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = resolvedActiveItemId === item.id;

                return (
                    <button
                        key={item.id}
                        type="button"
                        className={[styles.footerItem, isActive ? styles.footerItemActive : ''].filter(Boolean).join(' ')}
                        onClick={(event) => handleNavigation(event, item.path)}
                        aria-label={item.label}
                    >
                        <Icon className={styles.footerIcon} />
                        <span>{item.label}</span>
                    </button>
                );
            })}
        </footer>
    );
}
