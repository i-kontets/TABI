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
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ImagePicker from '../../components/ImagePicker/ImagePicker';
import { registerNotificationDevice, fetchNotificationSettings, updateNotificationSettings } from '../../api/notificationApi';
import { requestFirebasePushToken } from '../../firebase/firebasePushToken';
import styles from './MyPageSubPages.module.css';

const api = {
    profile: '/TABI/api/User/Profile.php',
    uploadIcon: '/TABI/api/User/UploadIcon.php',
    emailSend: '/TABI/api/User/EmailChangeSendCode.php',
    emailVerify: '/TABI/api/User/EmailChangeVerify.php',
    inquiry: '/TABI/api/User/Inquiry.php',
    faq: '/TABI/api/User/Faq.php',
};

/**
 * BackIcon は、このファイルの中心となる処理をまとめた関数です。
 * 画面から渡された値や API の結果を使い、次に表示する内容を決めます。
 */
function BackIcon({ className }) {
    return <svg className={className} viewBox="0 0 24 24" aria-hidden="true"><path d="m15 5-7 7 7 7" /></svg>;
}

/**
 * HomeIcon は、このファイルの中心となる処理をまとめた関数です。
 * 画面から渡された値や API の結果を使い、次に表示する内容を決めます。
 */
function HomeIcon({ className }) {
    return <svg className={className} viewBox="0 0 24 24" aria-hidden="true"><path d="M3 11.5 12 4l9 7.5" /><path d="M5.5 10.5V20h13v-9.5" /><path d="M9.5 20v-5h5v5" /></svg>;
}

/**
 * UserIcon は、このファイルの中心となる処理をまとめた関数です。
 * 画面から渡された値や API の結果を使い、次に表示する内容を決めます。
 */
function UserIcon({ className }) {
    return <svg className={className} viewBox="0 0 24 24" aria-hidden="true"><path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" /><path d="M4.5 20a7.5 7.5 0 0 1 15 0" /></svg>;
}

/**
 * BellIcon は、このファイルの中心となる処理をまとめた関数です。
 * 画面から渡された値や API の結果を使い、次に表示する内容を決めます。
 */
function BellIcon({ className }) {
    return <svg className={className} viewBox="0 0 24 24" aria-hidden="true"><path d="M18 16v-5a6 6 0 0 0-12 0v5l-2 2h16l-2-2Z" /><path d="M10 20h4" /></svg>;
}

/**
 * MailIcon は、このファイルの中心となる処理をまとめた関数です。
 * 画面から渡された値や API の結果を使い、次に表示する内容を決めます。
 */
function MailIcon({ className }) {
    return <svg className={className} viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16v12H4V6Z" /><path d="m4 7 8 6 8-6" /></svg>;
}

/**
 * ChatIcon は、このファイルの中心となる処理をまとめた関数です。
 * 画面から渡された値や API の結果を使い、次に表示する内容を決めます。
 */
function ChatIcon({ className }) {
    return <svg className={className} viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5h14v10H8l-3 3V5Z" /><path d="M9 10h6" /></svg>;
}

/**
 * CalendarIcon は、このファイルの中心となる処理をまとめた関数です。
 * 画面から渡された値や API の結果を使い、次に表示する内容を決めます。
 */
function CalendarIcon({ className }) {
    return <svg className={className} viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5h14v15H5V5Z" /><path d="M8 3v4M16 3v4M5 10h14" /></svg>;
}

/**
 * GroupIcon は、このファイルの中心となる処理をまとめた関数です。
 * 画面から渡された値や API の結果を使い、次に表示する内容を決めます。
 */
function GroupIcon({ className }) {
    return <svg className={className} viewBox="0 0 24 24" aria-hidden="true"><path d="M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" /><path d="M3.5 20a5.5 5.5 0 0 1 11 0" /><path d="M17 11a2.5 2.5 0 1 0 0-5" /><path d="M16 15.5A5 5 0 0 1 20.5 20" /></svg>;
}

/**
 * WalletIcon は、このファイルの中心となる処理をまとめた関数です。
 * 画面から渡された値や API の結果を使い、次に表示する内容を決めます。
 */
function WalletIcon({ className }) {
    return <svg className={className} viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16v12H4V7Z" /><path d="M16 12h4v4h-4a2 2 0 0 1 0-4Z" /><path d="M6 7V5h10v2" /></svg>;
}

/**
 * ShieldIcon は、このファイルの中心となる処理をまとめた関数です。
 * 画面から渡された値や API の結果を使い、次に表示する内容を決めます。
 */
function ShieldIcon({ className }) {
    return <svg className={className} viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 19 6v5c0 4.5-2.7 8.2-7 10-4.3-1.8-7-5.5-7-10V6l7-3Z" /><path d="m9 12 2 2 4-4" /></svg>;
}

/**
 * HelpIcon は、このファイルの中心となる処理をまとめた関数です。
 * 画面から渡された値や API の結果を使い、次に表示する内容を決めます。
 */
function HelpIcon({ className }) {
    return <svg className={className} viewBox="0 0 24 24" aria-hidden="true"><path d="M12 18h.01" /><path d="M9.2 9a3 3 0 1 1 5.1 2.1c-.9.8-1.8 1.3-2.1 2.9" /><circle cx="12" cy="12" r="9" /></svg>;
}

/**
 * ChevronIcon は、このファイルの中心となる処理をまとめた関数です。
 * 画面から渡された値や API の結果を使い、次に表示する内容を決めます。
 */
function ChevronIcon({ className }) {
    return <svg className={className} viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7" /></svg>;
}

/**
 * normalizeUser は、このファイルの中心となる処理をまとめた関数です。
 * 画面から渡された値や API の結果を使い、次に表示する内容を決めます。
 */
function normalizeUser(user) {
    return user || null;
}

/**
 * emptyUser は、このファイルの中心となる処理をまとめた関数です。
 * 画面から渡された値や API の結果を使い、次に表示する内容を決めます。
 */
function emptyUser() {
    return {
        user_id: null,
        name: '',
        email: '',
        icon_url: '',
        icon_key: '',
        self_introduction: '',
        birthday: '',
        gender: '',
        country_code: '',
        language_code: '',
        phone_number: '',
    };
}

/**
 * formatPhoneNumber は、このファイルの中心となる処理をまとめた関数です。
 * 画面から渡された値や API の結果を使い、次に表示する内容を決めます。
 */
function formatPhoneNumber(value) {
    const digits = String(value || '').replace(/\D/g, '').slice(0, 11);

    // ここで条件を確認し、状況に合う処理だけを実行します。
    if (digits.length <= 3) {
        return digits;
    }

    // ここで条件を確認し、状況に合う処理だけを実行します。
    if (digits.length <= 7) {
        return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    }

    // ここで条件を確認し、状況に合う処理だけを実行します。
    if (digits.length <= 11) {
        return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7, 11)}`;
    }

    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7, 11)}`;
}

async function parseJson(response) {
    const data = await response.json().catch(() => ({}));
    // ここで条件を確認し、状況に合う処理だけを実行します。
    if (!response.ok || data.success === false) {
        throw new Error(data.message || '通信に失敗しました。');
    }
    return data;
}

/**
 * useCurrentUser は、このファイルの中心となる処理をまとめた関数です。
 * 画面から渡された値や API の結果を使い、次に表示する内容を決めます。
 */
function useCurrentUser() {
    const navigate = useNavigate();
    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const [user, setUser] = useState(null);
    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const [loading, setLoading] = useState(true);

    // 画面が表示された直後や監視している値が変わった時に、必要なデータ取得や初期設定を行います。
    useEffect(() => {
        let mounted = true;
        // load は、画面操作や API 結果に合わせて必要な処理をまとめた関数です。
        const load = async () => {
            // API 通信やデータ処理で失敗する可能性があるため、例外を受け取れる形で実行します。
            try {
                // バックエンド API へ通信し、画面で使うデータの取得や保存を依頼します。
                const response = await fetch(api.profile, { credentials: 'include' });
                // ここで条件を確認し、状況に合う処理だけを実行します。
                if (response.status === 401) {
                    localStorage.removeItem('loginUser');
                    navigate('/');
                    return;
                }
                const data = await parseJson(response);
                // ここで条件を確認し、状況に合う処理だけを実行します。
                if (mounted) {
                    const next = normalizeUser(data.user);
                    setUser(next);
                }
            // エラーが起きた場合は、画面にメッセージを出すなど安全な処理に切り替えます。
            } catch {
                // ここで条件を確認し、状況に合う処理だけを実行します。
                if (mounted) {
                    setUser(null);
                }
            // 成功・失敗に関係なく最後に必要な後片付けを行います。
            } finally {
                // ここで条件を確認し、状況に合う処理だけを実行します。
                if (mounted) {
                    setLoading(false);
                }
            }
        };
        load();
        return () => {
            mounted = false;
        };
    }, [navigate]);

    return { user, setUser, loading };
}

/**
 * PageShell は、このファイルの中心となる処理をまとめた関数です。
 * 画面から渡された値や API の結果を使い、次に表示する内容を決めます。
 */
function PageShell({ title, children, onBack }) {
    const navigate = useNavigate();
    return (
        <div className={styles.page}>
            <header className={styles.header}>
                <button type="button" className={styles.backButton} onClick={onBack || (() => navigate('/MyPage'))} aria-label="戻る">
                    <BackIcon className={styles.headerIcon} />
                </button>
                <h1 className={styles.headerTitle}>{title}</h1>
                <span className={styles.headerSpacer} />
            </header>

            <main className={styles.content}>{children}</main>

            <footer className={styles.footer}>
                <button type="button" className={styles.footerItem} onClick={() => navigate('/Home')} aria-label="ホーム">
                    <HomeIcon className={styles.footerIcon} />
                    <span>ホーム</span>
                </button>
                <button type="button" className={[styles.footerItem, styles.footerItemActive].join(' ')} onClick={() => navigate('/MyPage')} aria-label="マイページ">
                    <UserIcon className={styles.footerIcon} />
                    <span>マイページ</span>
                </button>
            </footer>
        </div>
    );
}

/**
 * Field は、このファイルの中心となる処理をまとめた関数です。
 * 画面から渡された値や API の結果を使い、次に表示する内容を決めます。
 */
function Field({ label, children, hint, className }) {
    return (
        <label className={[styles.field, className].filter(Boolean).join(' ')}>
            <span className={styles.label}>{label}</span>
            {children}
            {hint && <span className={styles.hint}>{hint}</span>}
        </label>
    );
}

/**
 * StatusMessage は、このファイルの中心となる処理をまとめた関数です。
 * 画面から渡された値や API の結果を使い、次に表示する内容を決めます。
 */
function StatusMessage({ type = 'success', children }) {
    // ここで条件を確認し、状況に合う処理だけを実行します。
    if (!children) {
        return null;
    }
    return <p className={type === 'error' ? styles.errorMessage : styles.successMessage}>{children}</p>;
}

/**
 * profilePreviewValue は、このファイルの中心となる処理をまとめた関数です。
 * 画面から渡された値や API の結果を使い、次に表示する内容を決めます。
 */
function profilePreviewValue(currentUser, selectedIcon) {
    // ここで条件を確認し、状況に合う処理だけを実行します。
    if (selectedIcon) {
        return selectedIcon;
    }
    // ここで条件を確認し、状況に合う処理だけを実行します。
    if (currentUser.icon_url) {
        return { previewUrl: currentUser.icon_url };
    }
    return null;
}

// 画像ファイルをプロフィール画像アップロードAPIへ送る関数です。AWS/S3の認証や保存処理はバックエンド側だけで行います。
async function uploadUserIcon(file) {
    const body = new FormData();
    body.append('image', file);
    // バックエンド API へ通信し、画面で使うデータの取得や保存を依頼します。
    const response = await fetch(api.uploadIcon, {
        method: 'POST',
        credentials: 'include',
        body,
    });
    const data = await parseJson(response);
    return data.file_url || data.image_url || '';
}

async function saveProfile(payload) {
    // バックエンド API へ通信し、画面で使うデータの取得や保存を依頼します。
    const response = await fetch(api.profile, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    return parseJson(response);
}

export function ProfileEditPage() {
    const { user, setUser } = useCurrentUser();
    const currentUser = user || emptyUser();
    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const [name, setName] = useState(currentUser.name);
    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const [bio, setBio] = useState(currentUser.self_introduction || '');
    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const [selectedIcon, setSelectedIcon] = useState(null);
    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const [saving, setSaving] = useState(false);
    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const [message, setMessage] = useState('');
    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const [error, setError] = useState('');

    // 画面が表示された直後や監視している値が変わった時に、必要なデータ取得や初期設定を行います。
    useEffect(() => {
        setName(currentUser.name || '');
        setBio(currentUser.self_introduction || '');
    }, [user]);

    // handleSave は、画面操作や API 結果に合わせて必要な処理をまとめた関数です。
    const handleSave = async () => {
        setSaving(true);
        setMessage('');
        setError('');
        // API 通信やデータ処理で失敗する可能性があるため、例外を受け取れる形で実行します。
        try {
            let iconUrl = currentUser.icon_key || '';
            // ここで条件を確認し、状況に合う処理だけを実行します。
            if (selectedIcon?.file) {
                iconUrl = await uploadUserIcon(selectedIcon.file);
            }
            const data = await saveProfile({ name, self_introduction: bio, icon_url: iconUrl });
            const next = normalizeUser(data.user || { ...currentUser, name, self_introduction: bio, icon_url: iconUrl });
            setUser(next);
            setSelectedIcon(null);
            setMessage('プロフィールを保存しました。');
        // エラーが起きた場合は、画面にメッセージを出すなど安全な処理に切り替えます。
        } catch (err) {
            setError(err.message);
        // 成功・失敗に関係なく最後に必要な後片付けを行います。
        } finally {
            setSaving(false);
        }
    };

    return (
        <PageShell title="プロフィール編集">
            <section className={styles.card}>
                <div className={styles.avatarPicker}>
                    <ImagePicker
                        label="ユーザーアイコン"
                        value={profilePreviewValue(currentUser, selectedIcon)}
                        onChange={setSelectedIcon}
                        fileName="user-icon.jpg"
                        circular
                        editorTitle="アイコンを変更"
                        previewAlt="ユーザーアイコン"
                        addLabel="アイコンを変更"
                        changeLabel="アイコンを変更"
                        doneLabel="決定"
                    />
                </div>

                <Field label="ユーザー名">
                    <input className={styles.input} value={name} onChange={(event) => setName(event.target.value)} />
                </Field>

                <Field label="メールアドレス" hint="メールアドレスは専用画面から変更できます。">
                    <input className={styles.input} value={currentUser.email || ''} readOnly />
                </Field>

                <Field label="自己紹介（任意）">
                    <textarea className={styles.textarea} value={bio} maxLength={100} onChange={(event) => setBio(event.target.value)} />
                    <span className={styles.count}>{bio.length}/100</span>
                </Field>

                <StatusMessage>{message}</StatusMessage>
                <StatusMessage type="error">{error}</StatusMessage>
                <button type="button" className={styles.primaryButton} onClick={handleSave} disabled={saving}>
                    {saving ? '保存中...' : '保存する'}
                </button>
            </section>
        </PageShell>
    );
}

export function UserEditPage() {
    const { user, setUser } = useCurrentUser();
    const currentUser = user || emptyUser();
    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const [form, setForm] = useState(currentUser);
    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const [selectedIcon, setSelectedIcon] = useState(null);
    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const [message, setMessage] = useState('');
    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const [error, setError] = useState('');
    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const [saving, setSaving] = useState(false);

    // 画面が表示された直後や監視している値が変わった時に、必要なデータ取得や初期設定を行います。
    useEffect(() => {
        setForm({
            ...currentUser,
            phone_number: formatPhoneNumber(currentUser.phone_number || ''),
        });
    }, [user]);

    // update は、画面操作や API 結果に合わせて必要な処理をまとめた関数です。
    const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
    // updatePhoneNumber は、画面操作や API 結果に合わせて必要な処理をまとめた関数です。
    const updatePhoneNumber = (value) => update('phone_number', formatPhoneNumber(value));

    // handleSave は、画面操作や API 結果に合わせて必要な処理をまとめた関数です。
    const handleSave = async () => {
        setSaving(true);
        setMessage('');
        setError('');
        // API 通信やデータ処理で失敗する可能性があるため、例外を受け取れる形で実行します。
        try {
            let iconUrl = form.icon_key || '';
            // ここで条件を確認し、状況に合う処理だけを実行します。
            if (selectedIcon?.file) {
                iconUrl = await uploadUserIcon(selectedIcon.file);
            }
            const payload = { ...form, icon_url: iconUrl, phone_number: formatPhoneNumber(form.phone_number || '') };
            const data = await saveProfile(payload);
            const next = normalizeUser(data.user || payload);
            setUser(next);
            setSelectedIcon(null);
            setMessage('ユーザー情報を保存しました。');
        // エラーが起きた場合は、画面にメッセージを出すなど安全な処理に切り替えます。
        } catch (err) {
            setError(err.message);
        // 成功・失敗に関係なく最後に必要な後片付けを行います。
        } finally {
            setSaving(false);
        }
    };

    return (
        <PageShell title="ユーザー情報の編集">
            <section className={styles.userEditCard}>
                <h2 className={styles.userEditSectionTitle}>プロフィール</h2>
                <div className={styles.userEditAvatarRow}>
                    <ImagePicker
                        label="アイコン"
                        value={profilePreviewValue(form, selectedIcon)}
                        onChange={setSelectedIcon}
                        fileName="user-icon.jpg"
                        circular
                        editorTitle="アイコンを変更"
                        previewAlt="ユーザーアイコン"
                        addLabel="アイコンを変更"
                        changeLabel="アイコンを変更"
                        doneLabel="決定"
                    />
                </div>
                <div className={styles.userEditFields}>
                    <Field label="名前">
                        <input className={styles.input} value={form.name || ''} onChange={(event) => update('name', event.target.value)} />
                    </Field>
                    <Field label="メールアドレス">
                        <input className={styles.input} value={form.email || ''} readOnly />
                    </Field>
                    <Field label="電話番号">
                        <input
                            className={styles.input}
                            type="tel"
                            inputMode="tel"
                            value={form.phone_number || ''}
                            onChange={(event) => updatePhoneNumber(event.target.value)}
                            placeholder="例）09012345678"
                        />
                    </Field>
                </div>
            </section>

            <section className={styles.userEditCard}>
                <h2 className={styles.userEditSectionTitle}>自己紹介</h2>
                <Field label="自己紹介（任意）">
                    <textarea
                        className={[styles.textarea, styles.userEditBioTextarea].join(' ')}
                        value={form.self_introduction || ''}
                        maxLength={100}
                        onChange={(event) => update('self_introduction', event.target.value)}
                    />
                    <span className={styles.count}>{(form.self_introduction || '').length}/100</span>
                </Field>
            </section>

            <section className={[styles.userEditCard, styles.userEditDetailCard].join(' ')}>
                <h2 className={styles.userEditSectionTitle}>詳細情報</h2>
                <div className={[styles.userEditFields, styles.userEditDetailFields].join(' ')}>
                    <Field label="生年月日" className={styles.formGroup}>
                        <div className={[styles.formControl, styles.dateInputWrapper].join(' ')}>
                            <input className={styles.dateInput} type="date" value={form.birthday || ''} onChange={(event) => update('birthday', event.target.value)} />
                        </div>
                    </Field>
                    <Field label="性別" className={styles.formGroup}>
                        <select className={styles.formControl} value={form.gender || ''} onChange={(event) => update('gender', event.target.value)}>
                            <option value="">未設定</option>
                            <option value="男性">男性</option>
                            <option value="女性">女性</option>
                            <option value="その他">その他</option>
                        </select>
                    </Field>
                    <Field label="国・地域" className={styles.formGroup}>
                        <select className={styles.formControl} value={form.country_code || 'JP'} onChange={(event) => update('country_code', event.target.value)}>
                            <option value="JP">日本</option>
                            <option value="US">アメリカ</option>
                            <option value="KR">韓国</option>
                            <option value="TW">台湾</option>
                        </select>
                    </Field>
                    <Field label="言語" className={styles.formGroup}>
                        <select className={styles.formControl} value={form.language_code || 'ja'} onChange={(event) => update('language_code', event.target.value)}>
                            <option value="ja">日本語</option>
                            <option value="en">English</option>
                        </select>
                    </Field>
                </div>
            </section>

            <StatusMessage>{message}</StatusMessage>
            <StatusMessage type="error">{error}</StatusMessage>
            <button type="button" className={[styles.primaryButton, styles.userEditSaveButton].join(' ')} onClick={handleSave} disabled={saving}>
                {saving ? '保存中...' : '保存する'}
            </button>
        </PageShell>
    );
}

/**
 * isEmail は、このファイルの中心となる処理をまとめた関数です。
 * 画面から渡された値や API の結果を使い、次に表示する内容を決めます。
 */
function isEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

/**
 * maskEmail は、このファイルの中心となる処理をまとめた関数です。
 * 画面から渡された値や API の結果を使い、次に表示する内容を決めます。
 */
function maskEmail(value) {
    const [local, domain] = String(value || '').split('@');
    // ここで条件を確認し、状況に合う処理だけを実行します。
    if (!local || !domain) return value || '';
    return `${local.slice(0, Math.min(3, local.length))}***@${domain}`;
}

/**
 * formatCountdown は、このファイルの中心となる処理をまとめた関数です。
 * 画面から渡された値や API の結果を使い、次に表示する内容を決めます。
 */
function formatCountdown(seconds) {
    const safe = Math.max(0, seconds);
    const minutes = String(Math.floor(safe / 60)).padStart(2, '0');
    const rest = String(safe % 60).padStart(2, '0');
    return `${minutes}:${rest}`;
}

/**
 * StepIndicator は、このファイルの中心となる処理をまとめた関数です。
 * 画面から渡された値や API の結果を使い、次に表示する内容を決めます。
 */
function StepIndicator({ step }) {
    return (
        <div className={styles.emailSteps} aria-label="メールアドレス変更の進行状況">
            {[1, 2, 3].map((value) => (
                <div key={value} className={styles.emailStepItem}>
                    <span className={`${styles.emailStepCircle} ${step === value ? styles.emailStepActive : ''}`}>{value}</span>
                    <span className={`${styles.emailStepLabel} ${step === value ? styles.emailStepLabelActive : ''}`}>
                        {value === 1 ? '入力' : value === 2 ? '認証' : '完了'}
                    </span>
                </div>
            ))}
        </div>
    );
}

export function EmailChangePage() {
    const navigate = useNavigate();
    const { user, setUser } = useCurrentUser();
    const currentUser = user || emptyUser();
    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const [step, setStep] = useState(1);
    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const [newEmail, setNewEmail] = useState('');
    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const [confirmEmail, setConfirmEmail] = useState('');
    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const [codeDigits, setCodeDigits] = useState(Array(6).fill(''));
    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const [expiresAt, setExpiresAt] = useState(null);
    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const [resendAvailableAt, setResendAvailableAt] = useState(null);
    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const [changedAt, setChangedAt] = useState('');
    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const [maskedSentEmail, setMaskedSentEmail] = useState('');
    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const [sending, setSending] = useState(false);
    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const [verifying, setVerifying] = useState(false);
    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const [error, setError] = useState('');
    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const [fieldError, setFieldError] = useState('');
    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const [nowMs, setNowMs] = useState(Date.now());
    const codeRefs = useRef([]);

    // 画面が表示された直後や監視している値が変わった時に、必要なデータ取得や初期設定を行います。
    useEffect(() => {
        const timer = window.setInterval(() => setNowMs(Date.now()), 1000);
        return () => window.clearInterval(timer);
    }, []);

    const normalizedNewEmail = newEmail.trim();
    const normalizedConfirmEmail = confirmEmail.trim();
    const code = codeDigits.join('');
    const expiresMs = expiresAt ? new Date(expiresAt).getTime() : 0;
    const resendMs = resendAvailableAt ? new Date(resendAvailableAt).getTime() : 0;
    const remainingSeconds = expiresMs ? Math.max(0, Math.ceil((expiresMs - nowMs) / 1000)) : 0;
    const resendSeconds = resendMs ? Math.max(0, Math.ceil((resendMs - nowMs) / 1000)) : 0;
    const isExpired = step === 2 && remainingSeconds <= 0;

    // validateEmailInput は、画面操作や API 結果に合わせて必要な処理をまとめた関数です。
    const validateEmailInput = () => {
        // ここで条件を確認し、状況に合う処理だけを実行します。
        if (!normalizedNewEmail || !normalizedConfirmEmail) {
            return '新しいメールアドレスと確認用メールアドレスを入力してください。';
        }
        // ここで条件を確認し、状況に合う処理だけを実行します。
        if (!isEmail(normalizedNewEmail)) {
            return 'メールアドレスの形式を確認してください。';
        }
        // ここで条件を確認し、状況に合う処理だけを実行します。
        if (normalizedNewEmail !== normalizedConfirmEmail) {
            return '新しいメールアドレスと確認用メールアドレスが一致しません。';
        }
        // ここで条件を確認し、状況に合う処理だけを実行します。
        if (currentUser.email && normalizedNewEmail.toLowerCase() === String(currentUser.email).toLowerCase()) {
            return '現在のメールアドレスとは別のメールアドレスを入力してください。';
        }
        return '';
    };

    const emailValidation = validateEmailInput();
    const canSend = !!currentUser.email && !emailValidation && !sending;
    const canVerify = code.length === 6 && !isExpired && !verifying;

    // clearCode は、画面操作や API 結果に合わせて必要な処理をまとめた関数です。
    const clearCode = () => {
        setCodeDigits(Array(6).fill(''));
    };

    // handleSendCode は、画面操作や API 結果に合わせて必要な処理をまとめた関数です。
    const handleSendCode = async () => {
        const validation = validateEmailInput();
        setFieldError(validation);
        setError('');
        // ここで条件を確認し、状況に合う処理だけを実行します。
        if (validation || sending || resendSeconds > 0) return;

        setSending(true);
        // API 通信やデータ処理で失敗する可能性があるため、例外を受け取れる形で実行します。
        try {
            // バックエンド API へ通信し、画面で使うデータの取得や保存を依頼します。
            const response = await fetch(api.emailSend, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ new_email: normalizedNewEmail }),
            });
            const data = await parseJson(response);
            clearCode();
            setMaskedSentEmail(data.maskedEmail || maskEmail(normalizedNewEmail));
            setExpiresAt(data.expiresAt || null);
            setResendAvailableAt(data.resendAvailableAt || null);
            setStep(2);
            window.setTimeout(() => codeRefs.current[0]?.focus(), 80);
        // エラーが起きた場合は、画面にメッセージを出すなど安全な処理に切り替えます。
        } catch (err) {
            setError(err.message);
        // 成功・失敗に関係なく最後に必要な後片付けを行います。
        } finally {
            setSending(false);
        }
    };

    // handleCodeChange は、画面操作や API 結果に合わせて必要な処理をまとめた関数です。
    const handleCodeChange = (index, value) => {
        const digits = value.replace(/\D/g, '');
        // ここで条件を確認し、状況に合う処理だけを実行します。
        if (digits.length > 1) {
            const next = Array(6).fill('');
            digits.slice(0, 6).split('').forEach((digit, digitIndex) => {
                next[digitIndex] = digit;
            });
            setCodeDigits(next);
            codeRefs.current[Math.min(5, digits.length - 1)]?.focus();
            return;
        }
        setCodeDigits((prev) => {
            const next = [...prev];
            next[index] = digits;
            return next;
        });
        // ここで条件を確認し、状況に合う処理だけを実行します。
        if (digits && index < 5) {
            codeRefs.current[index + 1]?.focus();
        }
    };

    // handleCodeKeyDown は、画面操作や API 結果に合わせて必要な処理をまとめた関数です。
    const handleCodeKeyDown = (index, event) => {
        // ここで条件を確認し、状況に合う処理だけを実行します。
        if (event.key === 'Backspace' && !codeDigits[index] && index > 0) {
            codeRefs.current[index - 1]?.focus();
        }
    };

    // handleVerify は、画面操作や API 結果に合わせて必要な処理をまとめた関数です。
    const handleVerify = async () => {
        setError('');
        // ここで条件を確認し、状況に合う処理だけを実行します。
        if (!canVerify) return;

        setVerifying(true);
        // API 通信やデータ処理で失敗する可能性があるため、例外を受け取れる形で実行します。
        try {
            // バックエンド API へ通信し、画面で使うデータの取得や保存を依頼します。
            const response = await fetch(api.emailVerify, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ new_email: normalizedNewEmail, code }),
            });
            const data = await parseJson(response);
            const next = normalizeUser({ ...currentUser, ...(data.user || {}), email: normalizedNewEmail });
            setUser(next);
            setChangedAt(data.changedAt || new Date().toLocaleString('ja-JP'));
            setStep(3);
        // エラーが起きた場合は、画面にメッセージを出すなど安全な処理に切り替えます。
        } catch (err) {
            setError(err.message);
            // ここで条件を確認し、状況に合う処理だけを実行します。
            if (err.message.includes('上限') || err.message.includes('期限')) {
                clearCode();
            }
        // 成功・失敗に関係なく最後に必要な後片付けを行います。
        } finally {
            setVerifying(false);
        }
    };

    // handleBack は、画面操作や API 結果に合わせて必要な処理をまとめた関数です。
    const handleBack = () => {
        // ここで条件を確認し、状況に合う処理だけを実行します。
        if (step === 2) {
            clearCode();
            setError('');
            setStep(1);
            return;
        }
        navigate('/MyPage');
    };

    return (
        <PageShell title="メールアドレスの変更" onBack={handleBack}>
            {step === 1 && (
                <section className={styles.emailChangeCard}>
                    <p className={styles.lead}>新しいメールアドレスを確認後、認証コードを送信します。</p>
                    <Field label="現在のメールアドレス">
                        <input className={styles.input} value={currentUser.email || ''} readOnly />
                    </Field>
                    <Field label="新しいメールアドレス">
                        <input className={styles.input} type="email" value={newEmail} onChange={(event) => setNewEmail(event.target.value)} placeholder="新しいメールアドレスを入力" />
                    </Field>
                    <Field label="新しいメールアドレス（確認）" hint={fieldError}>
                        <input className={styles.input} type="email" value={confirmEmail} onChange={(event) => setConfirmEmail(event.target.value)} placeholder="もう一度入力してください" />
                    </Field>
                    <div className={styles.emailInfoBox}>
                        <MailIcon className={styles.noticeIcon} />
                        <div>
                            <strong>認証コード送信先</strong>
                            <span>新しいメールアドレス宛に<br />6桁の認証コードを送信します。</span>
                        </div>
                    </div>
                    <div className={styles.emailNoteBox}>
                        <strong>ご注意</strong>
                        <ul>
                            <li>メールアドレスの変更には認証が必要です。</li>
                            <li>認証コードの有効期限は10分間です。</li>
                            <li>すでに登録されているメールアドレスは利用できません。</li>
                        </ul>
                    </div>
                    <StatusMessage type="error">{error}</StatusMessage>
                    <button type="button" className={styles.primaryButton} onClick={handleSendCode} disabled={!canSend}>
                        {sending ? '送信中...' : '認証コードを送信する'}
                    </button>
                </section>
            )}

            {step === 2 && (
                <section className={styles.emailChangeCard}>
                    <StepIndicator step={2} />
                    <div className={styles.emailSuccessBox}>
                        <span className={styles.emailCheckIcon}>✓</span>
                        <div>
                            <strong>認証コードを新しいメールアドレスへ送信しました。</strong>
                            <span>送信先：{maskedSentEmail || maskEmail(normalizedNewEmail)}</span>
                            <span>6桁の認証コードを入力してください。</span>
                        </div>
                    </div>
                    <Field label="新しいメールアドレス">
                        <input className={styles.input} value={normalizedNewEmail} readOnly />
                    </Field>
                    <div className={styles.codeField}>
                        <span className={styles.label}>認証コード</span>
                        <p>送信された6桁の認証コードを入力してください。</p>
                        <div className={styles.codeInputs}>
                            {codeDigits.map((digit, index) => (
                                <input
                                    key={index}
                                    ref={(node) => { codeRefs.current[index] = node; }}
                                    value={digit}
                                    inputMode="numeric"
                                    autoComplete={index === 0 ? 'one-time-code' : 'off'}
                                    maxLength={1}
                                    onChange={(event) => handleCodeChange(index, event.target.value)}
                                    onKeyDown={(event) => handleCodeKeyDown(index, event)}
                                    onPaste={(event) => {
                                        event.preventDefault();
                                        handleCodeChange(index, event.clipboardData.getData('text'));
                                    }}
                                />
                            ))}
                        </div>
                    </div>
                    <p className={styles.emailTimer}>有効期限：残り {formatCountdown(remainingSeconds)}</p>
                    {isExpired && <StatusMessage type="error">認証コードの有効期限が切れました。再送信してください。</StatusMessage>}
                    <div className={styles.emailHelpBox}>
                        <MailIcon className={styles.noticeIcon} />
                        <div>
                            <strong>認証コードが届かない場合</strong>
                            <ul>
                                <li>迷惑メールフォルダをご確認ください。</li>
                                <li>60秒後に再送信できます。</li>
                            </ul>
                        </div>
                    </div>
                    <button type="button" className={styles.textButton} onClick={handleSendCode} disabled={sending || resendSeconds > 0}>
                        {resendSeconds > 0 ? `${resendSeconds}秒後に再送信可能` : sending ? '再送信中...' : '認証コードを再送信する'}
                    </button>
                    <StatusMessage type="error">{error}</StatusMessage>
                    <button type="button" className={styles.primaryButton} onClick={handleVerify} disabled={!canVerify}>
                        {verifying ? '変更中...' : 'メールアドレスを変更する'}
                    </button>
                </section>
            )}

            {step === 3 && (
                <section className={styles.emailCompleteCard}>
                    <StepIndicator step={3} />
                    <div className={styles.completeMark}>✓</div>
                    <h2>メールアドレスの変更が完了しました</h2>
                    <p>ご登録のメールアドレスを<br />以下の内容に変更しました。</p>
                    <div className={styles.completeInfoCard}>
                        <strong>新しいメールアドレス</strong>
                        <span>{normalizedNewEmail}</span>
                        <strong>変更日時</strong>
                        <span>{changedAt}</span>
                    </div>
                    <div className={styles.emailInfoBox}>
                        <span className={styles.emailInfoIcon}>i</span>
                        <span>変更前のメールアドレスにもお知らせメールを送信しました。</span>
                    </div>
                    <button type="button" className={styles.primaryButton} onClick={() => navigate('/MyPage')}>
                        マイページに戻る
                    </button>
                </section>
            )}
        </PageShell>
    );
}

const notificationItems = [
    { key: 'chatNotification', title: 'チャット通知', description: '新しいメッセージを受信したとき', icon: ChatIcon },
    { key: 'surveyDeadlineNotification', title: 'アンケート締切通知', description: 'アンケートの締切が近づいたとき', icon: HelpIcon },
    { key: 'scheduleReminderNotification', title: '予定リマインド通知', description: '予定の開始前にリマインドします', icon: CalendarIcon },
    { key: 'memberJoinNotification', title: 'メンバー参加通知', description: '旅行グループにメンバーが参加したとき', icon: GroupIcon },
    { key: 'splitBillNotification', title: '割り勘更新通知', description: '割り勘の内容が更新されたとき', icon: WalletIcon },
];

function detectBrowserName() {
    if (typeof navigator === 'undefined') {
        return null;
    }

    const userAgent = navigator.userAgent || '';

    if (userAgent.includes('Edg/')) return 'Edge';
    if (userAgent.includes('Chrome/')) return 'Chrome';
    if (userAgent.includes('Firefox/')) return 'Firefox';
    if (userAgent.includes('Safari/')) return 'Safari';

    return 'Browser';
}

function currentNotificationPermission() {
    if (typeof window === 'undefined' || typeof Notification === 'undefined') {
        return 'unsupported';
    }

    if (!window.isSecureContext) {
        return 'insecure-context';
    }

    return Notification.permission;
}

export function NotificationSettingsPage() {
    const [settings, setSettings] = useState(null);
    const [loading, setLoading] = useState(true);
    const [savingKey, setSavingKey] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        let mounted = true;

        const loadSettings = async () => {
            try {
                const data = await fetchNotificationSettings();

                if (mounted) {
                    setSettings(data.settings || {});
                    setError('');
                }
            } catch (err) {
                if (mounted) {
                    setSettings({});
                    setError(err.message || '通知設定を取得できませんでした。');
                }
            } finally {
                if (mounted) {
                    setLoading(false);
                }
            }
        };

        loadSettings();

        return () => {
            mounted = false;
        };
    }, []);

    const toggle = async (key) => {
        if (loading || savingKey || !settings) {
            return;
        }

        const previous = settings;
        const next = { ...settings, [key]: !settings[key] };

        setSettings(next);
        setSavingKey(key);
        setMessage('');
        setError('');

        try {
            const data = await updateNotificationSettings({ [key]: next[key] });
            setSettings(data.settings || next);
            setMessage('通知設定を保存しました。');
        } catch (err) {
            setSettings(previous);
            setError(err.message || '通知設定の保存に失敗しました。');
        } finally {
            setSavingKey('');
        }
    };

    return (
        <PageShell title="通知設定">
            <section className={styles.listCard}>
                {loading && <div className={styles.inlineState}>通知設定を読み込んでいます。</div>}
                {!loading && notificationItems.map((item) => {
                    const Icon = item.icon;
                    const checked = Boolean(settings?.[item.key]);
                    const disabled = Boolean(savingKey);

                    return (
                        <button key={item.key} type="button" className={styles.toggleRow} onClick={() => toggle(item.key)} disabled={disabled}>
                            <span className={styles.rowIconWrap}><Icon className={styles.rowIcon} /></span>
                            <span className={styles.rowText}>
                                <span className={styles.rowTitle}>{item.title}</span>
                                <span className={styles.rowDescription}>{item.description}</span>
                            </span>
                            <span className={[styles.switch, checked ? styles.switchOn : ''].join(' ')} aria-hidden="true"><span /></span>
                        </button>
                    );
                })}
            </section>
            <StatusMessage>{message}</StatusMessage>
            <StatusMessage type="error">{error}</StatusMessage>
        </PageShell>
    );
}

function permissionLabel(status) {
    if (status === 'ready') return { title: 'プッシュ通知を受け取れます', body: '通知許可と端末登録が完了しています。' };
    if (status === 'granted') return { title: 'プッシュ通知は許可されています', body: '通知を受け取るには、この端末をTABIに登録してください。' };
    if (status === 'denied') return { title: 'プッシュ通知はブロックされています', body: 'ブラウザまたは端末の通知設定から許可してください。' };
    if (status === 'default') return { title: 'プッシュ通知は未許可です', body: '通知を受け取るには許可が必要です。' };
    if (status === 'insecure-context') return { title: '安全な接続が必要です', body: 'プッシュ通知はHTTPSまたはlocalhostで利用できます。' };
    if (status === 'service-worker-error') return { title: '通知の準備が完了していません', body: 'Service Workerを登録できる環境で再度お試しください。' };
    if (status === 'token-error') return { title: '通知登録に失敗しました', body: 'FCMトークンを取得できませんでした。時間をおいて再度お試しください。' };
    if (status === 'device-save-error') return { title: '端末登録に失敗しました', body: '通知許可は取得できましたが、端末情報を保存できませんでした。' };

    return { title: '通知を利用できない環境です', body: 'このブラウザでは通知機能を利用できない可能性があります。' };
}

export function NotificationPermissionPage() {
    const [status, setStatus] = useState(currentNotificationPermission);
    const [processing, setProcessing] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const label = permissionLabel(status);
    const disabled = processing || ['ready', 'denied', 'unsupported', 'insecure-context'].includes(status);

    useEffect(() => {
        setStatus(currentNotificationPermission());
    }, []);

    const requestPermission = async () => {
        setProcessing(true);
        setMessage('');
        setError('');

        try {
            const result = await requestFirebasePushToken();
            setStatus(result.status || result.permission || 'unsupported');

            if (!result.success || !result.token) {
                setError('通知登録を完了できませんでした。');
                return;
            }

            await registerNotificationDevice({
                token: result.token,
                platform: 'web',
                appType: 'pwa',
                browser: detectBrowserName(),
            });

            setStatus('ready');
            setMessage('この端末で通知を受け取れるようになりました。');
        } catch (err) {
            setStatus('device-save-error');
            setError(err.message || '端末情報の保存に失敗しました。');
        } finally {
            setProcessing(false);
        }
    };

    return (
        <PageShell title="通知許可状況">
            <section className={styles.permissionHero}>
                <div className={styles.permissionIcon}><BellIcon className={styles.permissionSvg} /></div>
                <h2>{label.title}</h2>
                <p>{label.body}</p>
            </section>
            <section className={styles.card}>
                <h2 className={styles.cardTitle}>許可の確認方法</h2>
                <p className={styles.lead}>端末の設定アプリやブラウザ設定から、TABI の通知が「許可」になっているか確認してください。</p>
                <button type="button" className={styles.secondaryButton} onClick={requestPermission} disabled={disabled}>
                    {processing ? '通知を登録しています' : '通知を許可する'}
                </button>
                <p className={styles.note}>ブラウザ仕様により、設定アプリを直接開けない場合があります。</p>
            </section>
            <StatusMessage>{message}</StatusMessage>
            <StatusMessage type="error">{error}</StatusMessage>
        </PageShell>
    );
}

export function ContactPage() {
    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const [category, setCategory] = useState('');
    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const [subject, setSubject] = useState('');
    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const [body, setBody] = useState('');
    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const [message, setMessage] = useState('');
    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const [error, setError] = useState('');

    // handleSubmit は、画面操作や API 結果に合わせて必要な処理をまとめた関数です。
    const handleSubmit = async () => {
        setMessage('');
        // ここで条件を確認し、状況に合う処理だけを実行します。
        if (!subject.trim()) {
            setError('件名を入力してください。');
            return;
        }
        // ここで条件を確認し、状況に合う処理だけを実行します。
        if (!body.trim()) {
            setError('内容を入力してください。');
            return;
        }
        setError('');
        // API 通信やデータ処理で失敗する可能性があるため、例外を受け取れる形で実行します。
        try {
            // バックエンド API へ通信し、画面で使うデータの取得や保存を依頼します。
            await fetch(api.inquiry, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ category, subject, body }),
            // API などの非同期処理が終わった後に、受け取った結果を次の処理へ渡します。
            }).then(parseJson);
            setMessage('お問い合わせを送信しました。');
            setSubject('');
            setBody('');
        // エラーが起きた場合は、画面にメッセージを出すなど安全な処理に切り替えます。
        } catch (err) {
            setError(err.message || 'お問い合わせの送信に失敗しました。');
        }
    };

    return (
        <PageShell title="お問い合わせ">
            <section className={styles.card}>
                <Field label="お問い合わせカテゴリ">
                    <select className={styles.input} value={category} onChange={(event) => setCategory(event.target.value)}>
                        <option value="">選択してください</option>
                        <option value="不具合">不具合</option>
                        <option value="アカウント">アカウント</option>
                        <option value="旅行グループ">旅行グループ</option>
                        <option value="通知">通知</option>
                        <option value="その他">その他</option>
                    </select>
                </Field>
                <Field label="件名">
                    <input className={styles.input} value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="件名を入力してください" />
                </Field>
                <Field label="内容">
                    <textarea className={styles.largeTextarea} value={body} maxLength={500} onChange={(event) => setBody(event.target.value)} placeholder="詳しい内容を入力してください" />
                    <span className={styles.count}>{body.length}/500</span>
                </Field>
                <StatusMessage>{message}</StatusMessage>
                <StatusMessage type="error">{error}</StatusMessage>
                <button type="button" className={styles.primaryButton} onClick={handleSubmit}>送信する</button>
            </section>
        </PageShell>
    );
}

const faqTabs = ['すべて', 'アカウント', 'グループ', '通知', 'その他'];

export function FaqPage() {
    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const [keyword, setKeyword] = useState('');
    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const [tab, setTab] = useState('すべて');
    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const [openIndex, setOpenIndex] = useState(0);
    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const [items, setItems] = useState([]);
    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const [error, setError] = useState('');

    // 画面が表示された直後や監視している値が変わった時に、必要なデータ取得や初期設定を行います。
    useEffect(() => {
        const params = new URLSearchParams();
        // ここで条件を確認し、状況に合う処理だけを実行します。
        if (keyword) params.set('keyword', keyword);
        // ここで条件を確認し、状況に合う処理だけを実行します。
        if (tab !== 'すべて') params.set('category', tab);

        // バックエンド API へ通信し、画面で使うデータの取得や保存を依頼します。
        fetch(api.faq + '?' + params.toString(), { credentials: 'include' })
            // API などの非同期処理が終わった後に、受け取った結果を次の処理へ渡します。
            .then(parseJson)
            // API などの非同期処理が終わった後に、受け取った結果を次の処理へ渡します。
            .then((data) => {
                setItems(Array.isArray(data.items) ? data.items : []);
                setError('');
            })
            .catch((err) => {
                setItems([]);
                setError(err.message || 'FAQを取得できませんでした。');
            });
    }, [keyword, tab]);

    const filtered = items;

    return (
        <PageShell title="よくある質問">
            <div className={styles.searchWrap}>
                <input className={styles.searchInput} value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="キーワードで検索" />
            </div>
            <div className={styles.tabs}>
                {faqTabs.map((item) => (
                    <button key={item} type="button" className={[styles.tab, tab === item ? styles.tabActive : ''].join(' ')} onClick={() => setTab(item)}>
                        {item}
                    </button>
                ))}
            </div>
            <section className={styles.listCard}>
                {filtered.length === 0 && (
                    <div className={styles.emptyState}>{error || 'FAQは登録されていません。'}</div>
                )}
                {filtered.map((item, index) => (
                    <button key={item.question} type="button" className={styles.faqRow} onClick={() => setOpenIndex(openIndex === index ? -1 : index)}>
                        <span className={styles.faqQuestion}>{item.question}</span>
                        <ChevronIcon className={[styles.chevronIcon, openIndex === index ? styles.chevronOpen : ''].join(' ')} />
                        {openIndex === index && <span className={styles.faqAnswer}>{item.answer}</span>}
                    </button>
                ))}
            </section>
        </PageShell>
    );
}
