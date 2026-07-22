/**
 * マイページとプロフィール編集、通知設定、問い合わせなどの個人設定画面を担当します。
 *
 * 主な流れ:
 * 1. 必要な部品や API 関数を読み込む
 * 2. 画面表示やデータ取得に必要な値を準備する
 * 3. ユーザー操作や API の結果に合わせて表示を更新する
 *
 * 扱うデータ: React の state、props、フォーム入力、API から返ったデータを主に扱います。
 */
import { createElement, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Modal from '../../components/Modal/Modal';
import PasswordResetRequestModal from '../../components/PasswordReset/PasswordResetRequestModal';
import styles from './MyPage.module.css';
import { fetchUnreadNotificationCount } from '../../api/notificationApi';

/**
 * BellIcon は、このファイルの中心となる処理をまとめた関数です。
 * 画面から渡された値や API の結果を使い、次に表示する内容を決めます。
 */
function BellIcon({ className }) {
    return (
        <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
            <path d="M18 16v-5a6 6 0 0 0-12 0v5l-2 2v1h16v-1l-2-2Z" />
            <path d="M9.5 21a2.5 2.5 0 0 0 5 0" />
        </svg>
    );
}

/**
 * HomeIcon は、このファイルの中心となる処理をまとめた関数です。
 * 画面から渡された値や API の結果を使い、次に表示する内容を決めます。
 */
function HomeIcon({ className }) {
    return (
        <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
            <path d="M3 11.5 12 4l9 7.5" />
            <path d="M5.5 10.5V20h13v-9.5" />
            <path d="M9.5 20v-5h5v5" />
        </svg>
    );
}

/**
 * UserIcon は、このファイルの中心となる処理をまとめた関数です。
 * 画面から渡された値や API の結果を使い、次に表示する内容を決めます。
 */
function UserIcon({ className }) {
    return (
        <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
            <path d="M4.5 20a7.5 7.5 0 0 1 15 0" />
        </svg>
    );
}

/**
 * PencilIcon は、このファイルの中心となる処理をまとめた関数です。
 * 画面から渡された値や API の結果を使い、次に表示する内容を決めます。
 */
function PencilIcon({ className }) {
    return (
        <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4 11.5-11.5Z" />
        </svg>
    );
}

/**
 * MailIcon は、このファイルの中心となる処理をまとめた関数です。
 * 画面から渡された値や API の結果を使い、次に表示する内容を決めます。
 */
function MailIcon({ className }) {
    return (
        <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 6h16v12H4V6Z" />
            <path d="m4 7 8 6 8-6" />
        </svg>
    );
}

/**
 * LockIcon は、このファイルの中心となる処理をまとめた関数です。
 * 画面から渡された値や API の結果を使い、次に表示する内容を決めます。
 */
function LockIcon({ className }) {
    return (
        <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6 10h12v10H6V10Z" />
            <path d="M8.5 10V7.5a3.5 3.5 0 0 1 7 0V10" />
        </svg>
    );
}

/**
 * NoticeIcon は、このファイルの中心となる処理をまとめた関数です。
 * 画面から渡された値や API の結果を使い、次に表示する内容を決めます。
 */
function NoticeIcon({ className }) {
    return (
        <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
            <path d="M18 16v-5a6 6 0 0 0-12 0v5l-2 2h16l-2-2Z" />
            <path d="M10 20h4" />
        </svg>
    );
}

/**
 * ShieldIcon は、このファイルの中心となる処理をまとめた関数です。
 * 画面から渡された値や API の結果を使い、次に表示する内容を決めます。
 */
function ShieldIcon({ className }) {
    return (
        <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 3 19 6v5c0 4.5-2.7 8.2-7 10-4.3-1.8-7-5.5-7-10V6l7-3Z" />
            <path d="m9 12 2 2 4-4" />
        </svg>
    );
}

/**
 * HelpIcon は、このファイルの中心となる処理をまとめた関数です。
 * 画面から渡された値や API の結果を使い、次に表示する内容を決めます。
 */
function HelpIcon({ className }) {
    return (
        <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 18h.01" />
            <path d="M9.2 9a3 3 0 1 1 5.1 2.1c-.9.8-1.8 1.3-2.1 2.9" />
            <circle cx="12" cy="12" r="9" />
        </svg>
    );
}

/**
 * DocumentIcon は、このファイルの中心となる処理をまとめた関数です。
 * 画面から渡された値や API の結果を使い、次に表示する内容を決めます。
 */
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

/**
 * LogoutIcon は、このファイルの中心となる処理をまとめた関数です。
 * 画面から渡された値や API の結果を使い、次に表示する内容を決めます。
 */
function LogoutIcon({ className }) {
    return (
        <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
            <path d="M10 5H5v14h5" />
            <path d="M14 8l4 4-4 4" />
            <path d="M8 12h10" />
        </svg>
    );
}

/**
 * ChevronRightIcon は、このファイルの中心となる処理をまとめた関数です。
 * 画面から渡された値や API の結果を使い、次に表示する内容を決めます。
 */
function ChevronRightIcon({ className }) {
    return (
        <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
            <path d="m9 5 7 7-7 7" />
        </svg>
    );
}

/**
 * ItemRow は、このファイルの中心となる処理をまとめた関数です。
 * 画面から渡された値や API の結果を使い、次に表示する内容を決めます。
 */
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

/**
 * SectionCard は、このファイルの中心となる処理をまとめた関数です。
 * 画面から渡された値や API の結果を使い、次に表示する内容を決めます。
 */
function SectionCard({ title, children }) {
    return (
        <section className={styles.sectionCard} aria-label={title}>
            <h2 className={styles.sectionTitle}>{title}</h2>
            <div className={styles.sectionRows}>{children}</div>
        </section>
    );
}

/**
 * MyPage は、このファイルの中心となる処理をまとめた関数です。
 * 画面から渡された値や API の結果を使い、次に表示する内容を決めます。
 */
function MyPage() {
    const navigate = useNavigate();
    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const [user, setUser] = useState(null);
    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const [isPasswordOpen, setIsPasswordOpen] = useState(false);
    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const [isLogoutOpen, setIsLogoutOpen] = useState(false);

    // 画面が表示された直後や監視している値が変わった時に、必要なデータ取得や初期設定を行います。
    useEffect(() => {
        let isMounted = true;

        // fetchUser は、画面操作や API 結果に合わせて必要な処理をまとめた関数です。
        const fetchUser = async () => {
            // API 通信やデータ処理で失敗する可能性があるため、例外を受け取れる形で実行します。
            try {
                // バックエンド API へ通信し、画面で使うデータの取得や保存を依頼します。
                const response = await fetch('/TABI/api/Auth/whoami.php', {
                    method: 'GET',
                    credentials: 'include',
                });

                // ここで条件を確認し、状況に合う処理だけを実行します。
                if (response.status === 401) {
                    navigate('/');
                    return;
                }

                const data = await response.json();
                // ここで条件を確認し、状況に合う処理だけを実行します。
                if (isMounted && data.success && data.user) {
                    const nextUser = {
                        ...data.user,
                        role: '一般ユーザー',
                    };
                    setUser(nextUser);
                }
            // エラーが起きた場合は、画面にメッセージを出すなど安全な処理に切り替えます。
            } catch {
                // ここで条件を確認し、状況に合う処理だけを実行します。
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
    const [notificationBadgeText, setNotificationBadgeText] = useState(null);

    useEffect(() => {
        let isMounted = true;
        const controller = new AbortController();

        const fetchNotificationBadge = async () => {
            try {
                const data = await fetchUnreadNotificationCount({ signal: controller.signal });
                const count = Number(data?.data?.unreadCount ?? 0);
                const badgeText = data?.data?.badgeText || (count > 99 ? '99+' : String(count));

                if (isMounted) {
                    setNotificationBadgeText(count > 0 ? badgeText : null);
                }
            } catch (caughtError) {
                if (isMounted && caughtError?.name !== 'AbortError') {
                    setNotificationBadgeText(null);
                }
            }
        };

        fetchNotificationBadge();

        return () => {
            isMounted = false;
            controller.abort();
        };
    }, []);

    // handleLogout は、画面操作や API 結果に合わせて必要な処理をまとめた関数です。
    const handleLogout = async () => {
        // API 通信やデータ処理で失敗する可能性があるため、例外を受け取れる形で実行します。
        try {
            // バックエンド API へ通信し、画面で使うデータの取得や保存を依頼します。
            await fetch('/TABI/api/Auth/logout.php', {
                method: 'POST',
                credentials: 'include',
            });
        // 成功・失敗に関係なく最後に必要な後片付けを行います。
        } finally {
            navigate('/');
        }
    };

    return (
        <div className={styles.page}>
            <header className={styles.header}>
                <span className={styles.headerSpacer} />
                <h1 className={styles.headerTitle}>マイページ</h1>
                <button type="button" className={styles.noticeButton} onClick={() => navigate('/notifications')} aria-label="通知一覧">
                    <BellIcon className={styles.headerIcon} />
                    {notificationBadgeText && <span className={styles.noticeBadge}>{notificationBadgeText}</span>}
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

            <PasswordResetRequestModal
                isOpen={isPasswordOpen}
                onClose={() => setIsPasswordOpen(false)}
                initialEmail={user?.email || ''}
                isEmailReadOnly
            />

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