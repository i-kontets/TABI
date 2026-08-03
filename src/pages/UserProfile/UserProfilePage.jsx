/**
 * 他ユーザーの公開プロフィールを取得して表示する画面です。
 *
 * 主な流れ:
 * 1. 必要な部品や API 関数を読み込む
 * 2. 画面表示やデータ取得に必要な値を準備する
 * 3. ユーザー操作や API の結果に合わせて表示を更新する
 *
 * 扱うデータ: React の state、props、フォーム入力、API から返ったデータを主に扱います。
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import styles from './UserProfilePage.module.css';

const profileApi = `${import.meta.env.BASE_URL}api/User/PublicProfile.php`;
const reportApi = `${import.meta.env.BASE_URL}api/User/Report.php`;
const REPORT_REASONS = ['迷惑行為', '不適切な内容', 'なりすまし', 'その他'];

/**
 * BackIcon は、このファイルの中心となる処理をまとめた関数です。
 * 画面から渡された値や API の結果を使い、次に表示する内容を決めます。
 */
function BackIcon({ className }) {
    return (
        <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
            <path d="m15 6-6 6 6 6" />
        </svg>
    );
}

/**
 * MoreIcon は、このファイルの中心となる処理をまとめた関数です。
 * 画面から渡された値や API の結果を使い、次に表示する内容を決めます。
 */
function MoreIcon({ className }) {
    return (
        <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="5" cy="12" r="1.5" />
            <circle cx="12" cy="12" r="1.5" />
            <circle cx="19" cy="12" r="1.5" />
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
 * UserProfilePage は、このファイルの中心となる処理をまとめた関数です。
 * 画面から渡された値や API の結果を使い、次に表示する内容を決めます。
 */
export default function UserProfilePage() {
    const { userId } = useParams();
    const navigate = useNavigate();
    const menuRef = useRef(null);
    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const [profile, setProfile] = useState(null);
    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const [loading, setLoading] = useState(true);
    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const [error, setError] = useState('');
    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const [menuOpen, setMenuOpen] = useState(false);
    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const [reportOpen, setReportOpen] = useState(false);
    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const [reportReason, setReportReason] = useState(REPORT_REASONS[0]);
    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const [reportDetail, setReportDetail] = useState('');
    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const [reportSending, setReportSending] = useState(false);
    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const [reportMessage, setReportMessage] = useState('');

    // 画面が表示された直後や監視している値が変わった時に、必要なデータ取得や初期設定を行います。
    useEffect(() => {
        const controller = new AbortController();

        // loadProfile は、画面操作や API 結果に合わせて必要な処理をまとめた関数です。
        const loadProfile = async () => {
            setLoading(true);
            setError('');

            // API 通信やデータ処理で失敗する可能性があるため、例外を受け取れる形で実行します。
            try {
                // バックエンド API へ通信し、画面で使うデータの取得や保存を依頼します。
                const response = await fetch(`${profileApi}?user_id=${encodeURIComponent(userId)}`, {
                    credentials: 'include',
                    signal: controller.signal,
                });
                const data = await response.json().catch(() => null);

                // ここで条件を確認し、状況に合う処理だけを実行します。
                if (response.status === 401) {
                    navigate('/');
                    return;
                }

                // ここで条件を確認し、状況に合う処理だけを実行します。
                if (!response.ok || !data?.success) {
                    throw new Error(data?.message || 'プロフィールを取得できませんでした。');
                }

                setProfile(data.user);
            // エラーが起きた場合は、画面にメッセージを出すなど安全な処理に切り替えます。
            } catch (fetchError) {
                // ここで条件を確認し、状況に合う処理だけを実行します。
                if (fetchError.name !== 'AbortError') {
                    setProfile(null);
                    setError(fetchError.message || 'プロフィールを取得できませんでした。');
                }
            // 成功・失敗に関係なく最後に必要な後片付けを行います。
            } finally {
                // ここで条件を確認し、状況に合う処理だけを実行します。
                if (!controller.signal.aborted) {
                    setLoading(false);
                }
            }
        };

        loadProfile();

        return () => controller.abort();
    }, [navigate, userId]);

    // 画面が表示された直後や監視している値が変わった時に、必要なデータ取得や初期設定を行います。
    useEffect(() => {
        // handlePointerDown は、画面操作や API 結果に合わせて必要な処理をまとめた関数です。
        const handlePointerDown = (event) => {
            // ここで条件を確認し、状況に合う処理だけを実行します。
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

    // handleReportClick は、画面操作や API 結果に合わせて必要な処理をまとめた関数です。
    const handleReportClick = () => {
        setMenuOpen(false);
        setReportMessage('');
        setReportReason(REPORT_REASONS[0]);
        setReportDetail('');
        setReportOpen(true);
    };

    // submitReport は、画面操作や API 結果に合わせて必要な処理をまとめた関数です。
    const submitReport = async (event) => {
        event.preventDefault();
        // ここで条件を確認し、状況に合う処理だけを実行します。
        if (!profile || reportSending) return;

        setReportSending(true);
        setReportMessage('');

        // API 通信やデータ処理で失敗する可能性があるため、例外を受け取れる形で実行します。
        try {
            // バックエンド API へ通信し、画面で使うデータの取得や保存を依頼します。
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

            // ここで条件を確認し、状況に合う処理だけを実行します。
            if (!response.ok || !data?.success) {
                throw new Error(data?.message || '通報を送信できませんでした。');
            }

            setReportOpen(false);
            window.alert('通報を送信しました。');
        // エラーが起きた場合は、画面にメッセージを出すなど安全な処理に切り替えます。
        } catch (submitError) {
            setReportMessage(submitError.message || '通報を送信できませんでした。');
        // 成功・失敗に関係なく最後に必要な後片付けを行います。
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
