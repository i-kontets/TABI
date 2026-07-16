import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import styles from './UserProfilePage.module.css';

const profileApi = `${import.meta.env.BASE_URL}api/User/PublicProfile.php`;
const reportApi = `${import.meta.env.BASE_URL}api/User/Report.php`;
const REPORT_REASONS = ['迷惑行為', '不適切な内容', 'なりすまし', 'その他'];

function BackIcon({ className }) {
    return (
        <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
            <path d="m15 6-6 6 6 6" />
        </svg>
    );
}

function MoreIcon({ className }) {
    return (
        <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="5" cy="12" r="1.5" />
            <circle cx="12" cy="12" r="1.5" />
            <circle cx="19" cy="12" r="1.5" />
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

export default function UserProfilePage() {
    const { userId } = useParams();
    const navigate = useNavigate();
    const menuRef = useRef(null);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [menuOpen, setMenuOpen] = useState(false);
    const [reportOpen, setReportOpen] = useState(false);
    const [reportReason, setReportReason] = useState(REPORT_REASONS[0]);
    const [reportDetail, setReportDetail] = useState('');
    const [reportSending, setReportSending] = useState(false);
    const [reportMessage, setReportMessage] = useState('');

    useEffect(() => {
        const controller = new AbortController();

        const loadProfile = async () => {
            setLoading(true);
            setError('');

            try {
                const response = await fetch(`${profileApi}?user_id=${encodeURIComponent(userId)}`, {
                    credentials: 'include',
                    signal: controller.signal,
                });
                const data = await response.json().catch(() => null);

                if (response.status === 401) {
                    navigate('/');
                    return;
                }

                if (!response.ok || !data?.success) {
                    throw new Error(data?.message || 'プロフィールを取得できませんでした。');
                }

                setProfile(data.user);
            } catch (fetchError) {
                if (fetchError.name !== 'AbortError') {
                    setProfile(null);
                    setError(fetchError.message || 'プロフィールを取得できませんでした。');
                }
            } finally {
                if (!controller.signal.aborted) {
                    setLoading(false);
                }
            }
        };

        loadProfile();

        return () => controller.abort();
    }, [navigate, userId]);

    useEffect(() => {
        const handlePointerDown = (event) => {
            if (!menuRef.current?.contains(event.target)) {
                setMenuOpen(false);
            }
        };

        document.addEventListener('pointerdown', handlePointerDown);
        return () => document.removeEventListener('pointerdown', handlePointerDown);
    }, []);

    const initial = useMemo(() => {
        return (profile?.name || '?').trim().slice(0, 1) || '?';
    }, [profile?.name]);

    const commonGroups = Array.isArray(profile?.common_groups) ? profile.common_groups : [];

    const handleReportClick = () => {
        setMenuOpen(false);
        setReportMessage('');
        setReportReason(REPORT_REASONS[0]);
        setReportDetail('');
        setReportOpen(true);
    };

    const submitReport = async (event) => {
        event.preventDefault();
        if (!profile || reportSending) return;

        setReportSending(true);
        setReportMessage('');

        try {
            const response = await fetch(reportApi, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({
                    target_type: 'user',
                    target_id: profile.user_id,
                    reason: reportReason,
                    detail: reportDetail,
                }),
            });
            const data = await response.json().catch(() => null);

            if (!response.ok || !data?.success) {
                throw new Error(data?.message || '通報を送信できませんでした。');
            }

            setReportOpen(false);
            window.alert('通報を送信しました。');
        } catch (submitError) {
            setReportMessage(submitError.message || '通報を送信できませんでした。');
        } finally {
            setReportSending(false);
        }
    };

    return (
        <div className={styles.page}>
            <header className={styles.header}>
                <button type="button" className={styles.headerButton} onClick={() => navigate(-1)} aria-label="戻る">
                    <BackIcon className={styles.headerIcon} />
                </button>
                <h1 className={styles.headerTitle}>プロフィール</h1>
                <div className={styles.menuArea} ref={menuRef}>
                    <button
                        type="button"
                        className={styles.headerButton}
                        onClick={() => setMenuOpen((current) => !current)}
                        aria-label="プロフィールメニュー"
                    >
                        <MoreIcon className={styles.headerIcon} />
                    </button>
                    {menuOpen && (
                        <div className={styles.menu}>
                            <button type="button" className={styles.menuItem} onClick={handleReportClick}>
                                このユーザーを通報
                            </button>
                        </div>
                    )}
                </div>
            </header>

            <main className={styles.content}>
                {loading && <p className={styles.stateMessage}>プロフィールを読み込んでいます...</p>}

                {!loading && error && (
                    <section className={styles.stateCard} role="alert">
                        <p>{error}</p>
                    </section>
                )}

                {!loading && profile && (
                    <>
                        <section className={styles.profileCard}>
                            <div className={styles.avatar}>
                                {profile.icon_url ? (
                                    <img src={profile.icon_url} alt="" className={styles.avatarImage} />
                                ) : (
                                    <span>{initial}</span>
                                )}
                            </div>
                            <h2 className={styles.userName}>{profile.name}</h2>
                            {profile.registered_at && (
                                <p className={styles.registeredAt}>登録日 {profile.registered_at}</p>
                            )}
                        </section>

                        {profile.self_introduction && (
                            <section className={styles.sectionCard}>
                                <h2 className={styles.sectionTitle}>自己紹介</h2>
                                <p className={styles.bio}>{profile.self_introduction}</p>
                            </section>
                        )}

                        {commonGroups.length > 0 && (
                            <section className={styles.sectionCard}>
                                <h2 className={styles.sectionTitle}>共通の旅行グループ</h2>
                                <div className={styles.groupList}>
                                    {commonGroups.map((group) => (
                                        <div key={group.group_id} className={styles.groupItem}>
                                            {group.group_name}
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}
                    </>
                )}
            </main>

            <footer className={styles.footer}>
                <button type="button" className={styles.footerItem} onClick={() => navigate('/Home')} aria-label="ホーム">
                    <HomeIcon className={styles.footerIcon} />
                    <span>ホーム</span>
                </button>
                <button type="button" className={styles.footerItem} onClick={() => navigate('/mypage')} aria-label="マイページ">
                    <UserIcon className={styles.footerIcon} />
                    <span>マイページ</span>
                </button>
            </footer>

            {reportOpen && (
                <div className={styles.modalBackdrop} role="presentation">
                    <form className={styles.reportModal} onSubmit={submitReport}>
                        <h2 className={styles.reportTitle}>このユーザーを通報</h2>
                        <p className={styles.reportLead}>管理者が内容を確認します。</p>

                        <label className={styles.reportLabel}>
                            通報理由
                            <select
                                className={styles.reportSelect}
                                value={reportReason}
                                onChange={(event) => setReportReason(event.target.value)}
                            >
                                {REPORT_REASONS.map((reason) => (
                                    <option key={reason} value={reason}>{reason}</option>
                                ))}
                            </select>
                        </label>

                        <label className={styles.reportLabel}>
                            詳細（任意）
                            <textarea
                                className={styles.reportTextarea}
                                value={reportDetail}
                                onChange={(event) => setReportDetail(event.target.value)}
                                rows={4}
                                maxLength={1000}
                                placeholder="確認してほしい内容を入力してください"
                            />
                        </label>

                        {reportMessage && <p className={styles.reportError}>{reportMessage}</p>}

                        <div className={styles.reportActions}>
                            <button
                                type="button"
                                className={styles.reportCancel}
                                onClick={() => setReportOpen(false)}
                                disabled={reportSending}
                            >
                                キャンセル
                            </button>
                            <button type="submit" className={styles.reportSubmit} disabled={reportSending}>
                                {reportSending ? '送信中...' : '通報する'}
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}
