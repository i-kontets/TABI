import { NavLink, useLocation } from 'react-router-dom';
import styles from './AdminBottomNav.module.css';

const HomeIcon = (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path d="M3 10.5 12 3l9 7.5V21h-6v-6h-6v6H3v-10.5Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
);
const UserIcon = (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.8" />
        <path d="M4.5 20c1.2-3.2 4-5 7.5-5s6.3 1.8 7.5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
);
const GroupIcon = (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <circle cx="8.5" cy="9" r="3" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="16" cy="10.5" r="2.4" stroke="currentColor" strokeWidth="1.8" />
        <path d="M2.8 19c.9-2.6 3-4 5.7-4s4.8 1.4 5.7 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M16.5 15.4c2 .3 3.6 1.5 4.4 3.6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
);
const ChatIcon = (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path d="M4 5.5h16v11H9l-5 4v-15Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
);
const SettingIcon = (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
        <path d="M19.4 13.5a7.6 7.6 0 0 0 0-3l2-1.6-2-3.4-2.4 1a7.7 7.7 0 0 0-2.6-1.5L14 2.5h-4L9.6 5a7.7 7.7 0 0 0-2.6 1.5l-2.4-1-2 3.4 2 1.6a7.6 7.6 0 0 0 0 3l-2 1.6 2 3.4 2.4-1a7.7 7.7 0 0 0 2.6 1.5l.4 2.5h4l.4-2.5a7.7 7.7 0 0 0 2.6-1.5l2.4 1 2-3.4-2-1.6Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
);

const ITEMS = [
    { to: '/admin', label: 'ホーム', icon: HomeIcon, end: true },
    { to: '/admin/users', label: 'ユーザー', icon: UserIcon, match: ['/admin/users'] },
    { to: '/admin/groups', label: 'グループ', icon: GroupIcon, match: ['/admin/groups', '/admin/posts'] },
    { to: '/admin/support', label: '対応', icon: ChatIcon, match: ['/admin/support', '/admin/inquiries', '/admin/reports'] },
    { to: '/admin/settings', label: '設定', icon: SettingIcon, match: ['/admin/settings', '/admin/notices', '/admin/spots', '/admin/analytics', '/admin/activities', '/admin/managers', '/admin/logs'] },
];

export default function AdminBottomNav() {
    const { pathname } = useLocation();

    const isActive = (item) => {
        if (item.end) return pathname === item.to;
        return (item.match || [item.to]).some((path) => pathname.startsWith(path));
    };

    return (
        <nav className={styles.nav}>
            {ITEMS.map((item) => (
                <NavLink
                    key={item.to}
                    to={item.to}
                    className={`${styles.item} ${isActive(item) ? styles.active : ''}`}
                >
                    {item.icon}
                    <span>{item.label}</span>
                </NavLink>
            ))}
        </nav>
    );
}
