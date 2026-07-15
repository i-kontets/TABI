import styles from './AdminDatabaseOffline.module.css';

const NAV_ITEMS = [
    { label: 'ホーム', icon: HomeIcon },
    { label: 'ユーザー', icon: UserIcon },
    { label: 'グループ', icon: GroupIcon },
    { label: '対応', icon: ChatIcon },
    { label: 'お問い合わせ', icon: MailIcon },
    { label: 'システムエラー', icon: AlertIcon },
    { label: '設定', icon: GearIcon },
];

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

function formatNextOpenAt(value) {
    if (!value) {
        return '未定';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return '未定';
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const target = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
    const dayDiff = Math.round((target - today) / 86400000);
    const time = date.toLocaleTimeString('ja-JP', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    });

    if (dayDiff === 0) {
        return `本日 ${time} ～`;
    }

    if (dayDiff === 1) {
        return `明日 ${time} ～`;
    }

    const dateText = date.toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });

    return `${dateText}（${WEEKDAYS[date.getDay()]}） ${time} ～`;
}

function ServerPowerIllustration() {
    return (
        <svg className={styles.illustration} viewBox="0 0 360 260" role="img" aria-label="DB停止中のサーバー">
            <defs>
                <linearGradient id="serverFace" x1="0" x2="1" y1="0" y2="1">
                    <stop offset="0%" stopColor="#8aa2c8" />
                    <stop offset="100%" stopColor="#405a82" />
                </linearGradient>
                <linearGradient id="serverSide" x1="0" x2="1" y1="0" y2="1">
                    <stop offset="0%" stopColor="#6f87ad" />
                    <stop offset="100%" stopColor="#263d61" />
                </linearGradient>
                <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="14" stdDeviation="14" floodColor="#1c355e" floodOpacity="0.16" />
                </filter>
            </defs>
            <ellipse cx="181" cy="226" rx="124" ry="17" fill="#d8e4f4" opacity="0.9" />
            <circle cx="196" cy="120" r="82" fill="#edf4ff" />
            <g opacity="0.9">
                <path d="M82 72h12l3.7-12h18.5l3.7 12h12l9.2 15.9-8.4 8.5 6.1 10.5 11.8-3.2 9.3 16.1-8.7 8.7 3.4 11.8h-18.6l-3.4-11.8h-12.1l-3.5 11.8H98.3l3.4-11.8H89.6l-8.7-8.7 9.3-16.1 11.8 3.2 6.1-10.5-8.4-8.5L82 72Z" fill="#cfddf0" />
                <circle cx="120" cy="104" r="21" fill="#f8fbff" />
            </g>
            <g fill="none" stroke="#6293f2" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3">
                <path d="M66 147v12M60 153h12" />
                <path d="M297 124v12M291 130h12" />
                <path d="M286 75v8M282 79h8" />
                <path d="M111 39v7M107.5 42.5h7" />
            </g>
            <g filter="url(#softShadow)">
                {[0, 1, 2].map((index) => (
                    <g key={index} transform={`translate(92 ${94 + index * 44})`}>
                        <rect width="172" height="36" rx="8" fill="url(#serverSide)" />
                        <rect x="8" y="7" width="154" height="22" rx="4" fill="url(#serverFace)" />
                        <rect x="20" y="13" width="30" height="10" rx="2" fill="#dbe8fb" />
                        <circle cx="122" cy="18" r="5" fill="#1c355e" />
                        <circle cx="145" cy="18" r="5" fill="#1c355e" opacity="0.8" />
                    </g>
                ))}
                <circle cx="181" cy="183" r="43" fill="#f8fbff" stroke="#31517e" strokeWidth="5" />
                <path d="M181 158v30" stroke="#31517e" strokeLinecap="round" strokeWidth="7" />
                <path d="M164 174a25 25 0 1 0 34 0" fill="none" stroke="#31517e" strokeLinecap="round" strokeWidth="7" />
            </g>
        </svg>
    );
}

function HomeIcon() {
    return <path d="M3 10.5 12 3l9 7.5V21h-6v-6h-6v6H3v-10.5Z" />;
}

function UserIcon() {
    return <><circle cx="12" cy="8" r="3.5" /><path d="M4.5 20c1.2-3.2 4-5 7.5-5s6.3 1.8 7.5 5" /></>;
}

function GroupIcon() {
    return <><circle cx="8.5" cy="9" r="3" /><circle cx="16" cy="10.5" r="2.4" /><path d="M2.8 19c.9-2.6 3-4 5.7-4s4.8 1.4 5.7 4" /><path d="M16.5 15.4c2 .3 3.6 1.5 4.4 3.6" /></>;
}

function ChatIcon() {
    return <path d="M4 5.5h16v11H9l-5 4v-15Z" />;
}

function MailIcon() {
    return <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m4 7 8 6 8-6" /></>;
}

function AlertIcon() {
    return <><path d="M12 3 2.8 20h18.4L12 3Z" /><path d="M12 9v5M12 17h.01" /></>;
}

function GearIcon() {
    return <><circle cx="12" cy="12" r="3" /><path d="M19.4 13.5a7.6 7.6 0 0 0 0-3l2-1.6-2-3.4-2.4 1a7.7 7.7 0 0 0-2.6-1.5L14 2.5h-4L9.6 5a7.7 7.7 0 0 0-2.6 1.5l-2.4-1-2 3.4 2 1.6a7.6 7.6 0 0 0 0 3l-2 1.6 2 3.4 2.4-1a7.7 7.7 0 0 0 2.6 1.5l.4 2.5h4l.4-2.5a7.7 7.7 0 0 0 2.6-1.5l2.4 1 2-3.4-2-1.6Z" /></>;
}

function DisabledNavIcon({ children }) {
    return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
            {children}
        </svg>
    );
}

export default function AdminDatabaseOffline({ status }) {
    const isScheduledStop = status?.reason === 'OUTSIDE_SERVICE_HOURS';
    const title = isScheduledStop
        ? '現在はDBの接続をオフにしています'
        : '現在DBへ接続できません';
    const description = isScheduledStop
        ? 'DBをスケジュールに沿って停止しているため、現在、管理画面のデータを取得できません。次回のDB起動後に、もう一度アクセスしてください。'
        : '稼働予定時間内ですが、データベースへの接続を確認できない状態です。時間をおいて再度確認してください。';
    const noticeText = isScheduledStop
        ? 'DBはスケジュールに沿って起動・停止を行っています。次回の起動後に、再度アクセスしてください。'
        : 'DB接続を再確認しています。復旧後、自動的に通常の管理画面へ戻ります。';

    return (
        <div className={styles.shell}>
            <aside className={styles.sidebar} aria-label="停止中の管理メニュー">
                {NAV_ITEMS.map((item, index) => {
                    const Icon = item.icon;

                    return (
                        <div key={item.label} className={`${styles.navItem} ${index === 0 ? styles.navActive : ''}`} aria-disabled="true">
                            <DisabledNavIcon>
                                <Icon />
                            </DisabledNavIcon>
                            <span>{item.label}</span>
                        </div>
                    );
                })}
            </aside>
            <div className={styles.main}>
                <header className={styles.header}>
                    <h1>TABI Admin</h1>
                    <div className={styles.headerRight} aria-hidden="true">
                        <span className={styles.bell}>●</span>
                        <span className={styles.userCircle}>管</span>
                        <span>管理者さん</span>
                    </div>
                </header>
                <main className={styles.content}>
                    <section className={styles.heroCard} aria-labelledby="db-offline-title">
                        <div className={styles.visual}>
                            <ServerPowerIllustration />
                        </div>
                        <div className={styles.copy}>
                            <h2 id="db-offline-title">{title}</h2>
                            <p>{description}</p>
                            <div className={styles.warningBox}>
                                <span className={styles.warningIcon}>!</span>
                                <span>{noticeText}</span>
                            </div>
                            <div className={styles.scheduleBox}>
                                <span className={styles.clockIcon} aria-hidden="true">
                                    <svg viewBox="0 0 24 24">
                                        <circle cx="12" cy="12" r="9" />
                                        <path d="M12 7v5l3 2" />
                                    </svg>
                                </span>
                                <div>
                                    <strong>次回のDB起動予定</strong>
                                    <span>{formatNextOpenAt(status?.nextOpenAt)}</span>
                                </div>
                            </div>
                            <p className={styles.note}>※ スケジュールは変更される場合があります。</p>
                        </div>
                    </section>
                    <section className={styles.infoCard} aria-label="ご確認ください">
                        <span className={styles.infoIcon}>i</span>
                        <div>
                            <h2>ご確認ください</h2>
                            <ul>
                                <li>DBを手動で起動した場合、接続確認後に管理画面を利用できます。</li>
                                <li>DBの稼働スケジュールは管理者間で共有してください。</li>
                                <li>予定時間内に接続できない場合は、システム管理者へ確認してください。</li>
                            </ul>
                        </div>
                    </section>
                </main>
            </div>
        </div>
    );
}
