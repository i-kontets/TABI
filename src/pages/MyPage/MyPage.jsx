import { createElement, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Modal from '../../components/Modal/Modal';
import styles from './MyPage.module.css';

function BellIcon({ className }) {
    return (
        <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
            <path d="M18 16v-5a6 6 0 0 0-12 0v5l-2 2v1h16v-1l-2-2Z" />
            <path d="M9.5 21a2.5 2.5 0 0 0 5 0" />
        </svg>
    );
}

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

function PencilIcon({ className }) {
    return (
        <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4 11.5-11.5Z" />
        </svg>
    );
}

function MailIcon({ className }) {
    return (
        <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 6h16v12H4V6Z" />
            <path d="m4 7 8 6 8-6" />
        </svg>
    );
}

function LockIcon({ className }) {
    return (
        <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6 10h12v10H6V10Z" />
            <path d="M8.5 10V7.5a3.5 3.5 0 0 1 7 0V10" />
        </svg>
    );
}

function NoticeIcon({ className }) {
    return (
        <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
            <path d="M18 16v-5a6 6 0 0 0-12 0v5l-2 2h16l-2-2Z" />
            <path d="M10 20h4" />
        </svg>
    );
}

function ShieldIcon({ className }) {
    return (
        <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 3 19 6v5c0 4.5-2.7 8.2-7 10-4.3-1.8-7-5.5-7-10V6l7-3Z" />
            <path d="m9 12 2 2 4-4" />
        </svg>
    );
}

function HelpIcon({ className }) {
    return (
        <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 18h.01" />
            <path d="M9.2 9a3 3 0 1 1 5.1 2.1c-.9.8-1.8 1.3-2.1 2.9" />
            <circle cx="12" cy="12" r="9" />
        </svg>
    );
}

function DocumentIcon({ className }) {
    return (
        <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
            <path d="M7 3h7l4 4v14H7V3Z" />
            <path d="M14 3v5h5" />
            <path d="M9.5 13h5" />
            <path d="M9.5 17h5" />
        </svg>
    );
}

function LogoutIcon({ className }) {
    return (
        <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
            <path d="M10 5H5v14h5" />
            <path d="M14 8l4 4-4 4" />
            <path d="M8 12h10" />
        </svg>
    );
}

function ChevronRightIcon({ className }) {
    return (
        <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
            <path d="m9 5 7 7-7 7" />
        </svg>
    );
}

function ItemRow({ icon, title, description, onClick }) {
    return (
        <button type="button" className={styles.itemRow} onClick={onClick}>
            <span className={styles.itemIconWrap}>
                {createElement(icon, { className: styles.itemIcon })}
            </span>
            <span className={styles.itemText}>
                <span className={styles.itemTitle}>{title}</span>
                {description && <span className={styles.itemDescription}>{description}</span>}
            </span>
            <ChevronRightIcon className={styles.chevronIcon} />
        </button>
    );
}

function SectionCard({ title, children }) {
    return (
        <section className={styles.sectionCard} aria-label={title}>
            <h2 className={styles.sectionTitle}>{title}</h2>
            <div className={styles.sectionRows}>{children}</div>
        </section>
    );
}

function MyPage() {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [isPasswordOpen, setIsPasswordOpen] = useState(false);
    const [isLogoutOpen, setIsLogoutOpen] = useState(false);
    const [passwordMessage, setPasswordMessage] = useState('');
    const [isSendingPasswordMail, setIsSendingPasswordMail] = useState(false);

    useEffect(() => {
        let isMounted = true;

        const fetchUser = async () => {
            try {
                const response = await fetch('/TABI/api/Auth/whoami.php', {
                    method: 'GET',
                    credentials: 'include',
                });

                if (response.status === 401) {
                    navigate('/');
                    return;
                }

                const data = await response.json();
                if (isMounted && data.success && data.user) {
                    const nextUser = {
                        ...data.user,
                        role: '一般ユーザー',
                    };
                    setUser(nextUser);
                }
            } catch {
                if (isMounted) {
                    setUser(null);
                }
            }
        };

        fetchUser();

        return () => {
            isMounted = false;
        };
    }, [navigate]);

    const initials = useMemo(() => {
        const name = user?.name || '';
        return name.trim().slice(0, 1).toUpperCase();
    }, [user?.name]);

    const handlePasswordReset = async () => {
        setIsSendingPasswordMail(true);
        setPasswordMessage('');

        try {
            // TODO: パスワード再設定APIが用意できたら、以下の仮成功処理を
            // POST /api/password/reset-request body: { email: string } への呼び出しに差し替える。
            await new Promise((resolve) => setTimeout(resolve, 450));
            setPasswordMessage('再設定メールを送信しました。メールに記載されたリンクから新しいパスワードを設定してください。');
        } finally {
            setIsSendingPasswordMail(false);
        }
    };

    const handleLogout = async () => {
        try {
            await fetch('/TABI/api/Auth/logout.php', {
                method: 'POST',
                credentials: 'include',
            });
        } finally {
            navigate('/');
        }
    };

    return (
        <div className={styles.page}>
            <header className={styles.header}>
                <span className={styles.headerSpacer} />
                <h1 className={styles.headerTitle}>マイページ</h1>
                <button type="button" className={styles.noticeButton} aria-label="通知">
                    <BellIcon className={styles.headerIcon} />
                </button>
            </header>

            <main className={styles.content}>
                <section className={styles.profileCard} aria-label="プロフィール">
                    <div className={styles.profileTop}>
                        <div className={styles.avatar}>
                            {user?.icon_url ? (
                                <img src={user.icon_url} alt="" className={styles.avatarImage} />
                            ) : (
                                <span>{initials || '未'}</span>
                            )}
                        </div>
                        <div className={styles.profileBody}>
                            <h2 className={styles.userName}>{user?.name || '未設定'}</h2>
                            <p className={styles.userEmail}>{user?.email || '未設定'}</p>
                            <span className={styles.roleBadge}>{user?.role || '一般ユーザー'}</span>
                        </div>
                        <ChevronRightIcon className={styles.profileChevron} />
                    </div>

                    <button
                        type="button"
                        className={styles.editProfileButton}
                        onClick={() => navigate('/mypage/profile-edit')}
                    >
                        <PencilIcon className={styles.editIcon} />
                        プロフィールを編集
                    </button>
                </section>

                <SectionCard title="アカウント設定">
                    <ItemRow
                        icon={UserIcon}
                        title="ユーザー情報の編集"
                        description="名前・アイコン・自己紹介など"
                        onClick={() => navigate('/mypage/user-edit')}
                    />
                    <ItemRow
                        icon={MailIcon}
                        title="メールアドレスの変更"
                        description="登録メールアドレスを変更します"
                        onClick={() => navigate('/mypage/email-change')}
                    />
                    <ItemRow
                        icon={LockIcon}
                        title="パスワードの変更"
                        description="登録メールに再設定リンクを送信します"
                        onClick={() => {
                            setPasswordMessage('');
                            setIsPasswordOpen(true);
                        }}
                    />
                </SectionCard>

                <SectionCard title="通知設定">
                    <ItemRow
                        icon={NoticeIcon}
                        title="通知設定"
                        description="各種通知の受信設定を変更します"
                        onClick={() => navigate('/mypage/notification-settings')}
                    />
                    <ItemRow
                        icon={ShieldIcon}
                        title="通知許可状況"
                        description="プッシュ通知の許可状態を確認します"
                        onClick={() => navigate('/mypage/notification-permission')}
                    />
                </SectionCard>

                <SectionCard title="サポート">
                    <ItemRow
                        icon={HelpIcon}
                        title="お問い合わせ"
                        description="管理者にお問い合わせできます"
                        onClick={() => navigate('/mypage/contact')}
                    />
                    <ItemRow
                        icon={HelpIcon}
                        title="よくある質問"
                        description="困ったときはこちら"
                        onClick={() => navigate('/mypage/faq')}
                    />
                    <ItemRow
                        icon={DocumentIcon}
                        title="利用規約"
                        onClick={() => navigate('/terms')}
                    />
                    <ItemRow
                        icon={DocumentIcon}
                        title="プライバシーポリシー"
                        onClick={() => navigate('/privacy-policy')}
                    />
                </SectionCard>

                <button type="button" className={styles.logoutButton} onClick={() => setIsLogoutOpen(true)}>
                    <LogoutIcon className={styles.logoutIcon} />
                    ログアウト
                </button>
            </main>

            <footer className={styles.footer}>
                <button
                    type="button"
                    className={styles.footerItem}
                    onClick={() => navigate('/Home')}
                    aria-label="ホーム"
                >
                    <HomeIcon className={styles.footerIcon} />
                    <span>ホーム</span>
                </button>

                <button
                    type="button"
                    className={[styles.footerItem, styles.footerItemActive].join(' ')}
                    onClick={() => navigate('/MyPage')}
                    aria-label="マイページ"
                >
                    <UserIcon className={styles.footerIcon} />
                    <span>マイページ</span>
                </button>
            </footer>

            <Modal isOpen={isPasswordOpen} onClose={() => setIsPasswordOpen(false)}>
                <div className={styles.modalContent}>
                    <h2 className={styles.modalTitle}>パスワードの変更</h2>
                    <p className={styles.modalLead}>登録メールアドレスに再設定リンクを送信します。</p>

                    <label className={styles.emailLabel}>
                        登録メールアドレス
                        <input className={styles.emailInput} value={user?.email || '未設定'} readOnly />
                    </label>

                    {passwordMessage && <p className={styles.successMessage}>{passwordMessage}</p>}

                    <div className={styles.modalActions}>
                        <button
                            type="button"
                            className={styles.secondaryButton}
                            onClick={() => setIsPasswordOpen(false)}
                        >
                            閉じる
                        </button>
                        <button
                            type="button"
                            className={styles.primaryButton}
                            onClick={handlePasswordReset}
                            disabled={isSendingPasswordMail}
                        >
                            {isSendingPasswordMail ? '送信中...' : '再設定メールを送信'}
                        </button>
                    </div>
                </div>
            </Modal>

            <Modal isOpen={isLogoutOpen} onClose={() => setIsLogoutOpen(false)}>
                <div className={styles.modalContent}>
                    <h2 className={styles.modalTitle}>ログアウトしますか？</h2>
                    <p className={styles.modalLead}>現在のアカウントからログアウトします。</p>
                    <div className={styles.modalActions}>
                        <button
                            type="button"
                            className={styles.secondaryButton}
                            onClick={() => setIsLogoutOpen(false)}
                        >
                            キャンセル
                        </button>
                        <button type="button" className={styles.dangerButton} onClick={handleLogout}>
                            ログアウト
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}

export default MyPage;
