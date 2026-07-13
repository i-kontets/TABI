import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ImagePicker from '../../components/ImagePicker/ImagePicker';
import styles from './MyPageSubPages.module.css';

const api = {
    profile: '/TABI/api/User/Profile.php',
    uploadIcon: '/TABI/api/User/UploadIcon.php',
    emailSend: '/TABI/api/User/EmailChangeSendCode.php',
    emailVerify: '/TABI/api/User/EmailChangeVerify.php',
    notifications: '/TABI/api/User/NotificationSettings.php',
    inquiry: '/TABI/api/User/Inquiry.php',
    faq: '/TABI/api/User/Faq.php',
};

function BackIcon({ className }) {
    return <svg className={className} viewBox="0 0 24 24" aria-hidden="true"><path d="m15 5-7 7 7 7" /></svg>;
}

function HomeIcon({ className }) {
    return <svg className={className} viewBox="0 0 24 24" aria-hidden="true"><path d="M3 11.5 12 4l9 7.5" /><path d="M5.5 10.5V20h13v-9.5" /><path d="M9.5 20v-5h5v5" /></svg>;
}

function UserIcon({ className }) {
    return <svg className={className} viewBox="0 0 24 24" aria-hidden="true"><path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" /><path d="M4.5 20a7.5 7.5 0 0 1 15 0" /></svg>;
}

function BellIcon({ className }) {
    return <svg className={className} viewBox="0 0 24 24" aria-hidden="true"><path d="M18 16v-5a6 6 0 0 0-12 0v5l-2 2h16l-2-2Z" /><path d="M10 20h4" /></svg>;
}

function MailIcon({ className }) {
    return <svg className={className} viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16v12H4V6Z" /><path d="m4 7 8 6 8-6" /></svg>;
}

function ChatIcon({ className }) {
    return <svg className={className} viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5h14v10H8l-3 3V5Z" /><path d="M9 10h6" /></svg>;
}

function CalendarIcon({ className }) {
    return <svg className={className} viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5h14v15H5V5Z" /><path d="M8 3v4M16 3v4M5 10h14" /></svg>;
}

function GroupIcon({ className }) {
    return <svg className={className} viewBox="0 0 24 24" aria-hidden="true"><path d="M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" /><path d="M3.5 20a5.5 5.5 0 0 1 11 0" /><path d="M17 11a2.5 2.5 0 1 0 0-5" /><path d="M16 15.5A5 5 0 0 1 20.5 20" /></svg>;
}

function WalletIcon({ className }) {
    return <svg className={className} viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16v12H4V7Z" /><path d="M16 12h4v4h-4a2 2 0 0 1 0-4Z" /><path d="M6 7V5h10v2" /></svg>;
}

function ShieldIcon({ className }) {
    return <svg className={className} viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 19 6v5c0 4.5-2.7 8.2-7 10-4.3-1.8-7-5.5-7-10V6l7-3Z" /><path d="m9 12 2 2 4-4" /></svg>;
}

function HelpIcon({ className }) {
    return <svg className={className} viewBox="0 0 24 24" aria-hidden="true"><path d="M12 18h.01" /><path d="M9.2 9a3 3 0 1 1 5.1 2.1c-.9.8-1.8 1.3-2.1 2.9" /><circle cx="12" cy="12" r="9" /></svg>;
}

function ChevronIcon({ className }) {
    return <svg className={className} viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7" /></svg>;
}

function normalizeUser(user) {
    return user || null;
}

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

function formatPhoneNumber(value) {
    const digits = String(value || '').replace(/\D/g, '').slice(0, 11);

    if (digits.length <= 3) {
        return digits;
    }

    if (digits.length <= 7) {
        return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    }

    if (digits.length <= 11) {
        return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7, 11)}`;
    }

    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7, 11)}`;
}

async function parseJson(response) {
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.success === false) {
        throw new Error(data.message || '通信に失敗しました。');
    }
    return data;
}

function useCurrentUser() {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let mounted = true;
        const load = async () => {
            try {
                const response = await fetch(api.profile, { credentials: 'include' });
                if (response.status === 401) {
                    localStorage.removeItem('loginUser');
                    navigate('/');
                    return;
                }
                const data = await parseJson(response);
                if (mounted) {
                    const next = normalizeUser(data.user);
                    setUser(next);
                }
            } catch {
                if (mounted) {
                    setUser(null);
                }
            } finally {
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

function PageShell({ title, children }) {
    const navigate = useNavigate();
    return (
        <div className={styles.page}>
            <header className={styles.header}>
                <button type="button" className={styles.backButton} onClick={() => navigate('/MyPage')} aria-label="戻る">
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

function Field({ label, children, hint }) {
    return (
        <label className={styles.field}>
            <span className={styles.label}>{label}</span>
            {children}
            {hint && <span className={styles.hint}>{hint}</span>}
        </label>
    );
}

function StatusMessage({ type = 'success', children }) {
    if (!children) {
        return null;
    }
    return <p className={type === 'error' ? styles.errorMessage : styles.successMessage}>{children}</p>;
}

function profilePreviewValue(currentUser, selectedIcon) {
    if (selectedIcon) {
        return selectedIcon;
    }
    if (currentUser.icon_url) {
        return { previewUrl: currentUser.icon_url };
    }
    return null;
}

async function uploadUserIcon(file) {
    const body = new FormData();
    body.append('image', file);
    const response = await fetch(api.uploadIcon, {
        method: 'POST',
        credentials: 'include',
        body,
    });
    const data = await parseJson(response);
    return data.file_url || data.image_url || '';
}

async function saveProfile(payload) {
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
    const [name, setName] = useState(currentUser.name);
    const [bio, setBio] = useState(currentUser.self_introduction || '');
    const [selectedIcon, setSelectedIcon] = useState(null);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        setName(currentUser.name || '');
        setBio(currentUser.self_introduction || '');
    }, [user]);

    const handleSave = async () => {
        setSaving(true);
        setMessage('');
        setError('');
        try {
            let iconUrl = currentUser.icon_url || '';
            if (selectedIcon?.file) {
                iconUrl = await uploadUserIcon(selectedIcon.file);
            }
            const data = await saveProfile({ name, self_introduction: bio, icon_url: iconUrl });
            const next = normalizeUser(data.user || { ...currentUser, name, self_introduction: bio, icon_url: iconUrl });
            setUser(next);
            setSelectedIcon(null);
            setMessage('プロフィールを保存しました。');
        } catch (err) {
            setError(err.message);
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
    const [form, setForm] = useState(currentUser);
    const [selectedIcon, setSelectedIcon] = useState(null);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        setForm({
            ...currentUser,
            phone_number: formatPhoneNumber(currentUser.phone_number || ''),
        });
    }, [user]);

    const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
    const updatePhoneNumber = (value) => update('phone_number', formatPhoneNumber(value));

    const handleSave = async () => {
        setSaving(true);
        setMessage('');
        setError('');
        try {
            let iconUrl = form.icon_url || '';
            if (selectedIcon?.file) {
                iconUrl = await uploadUserIcon(selectedIcon.file);
            }
            const payload = { ...form, icon_url: iconUrl, phone_number: formatPhoneNumber(form.phone_number || '') };
            const data = await saveProfile(payload);
            const next = normalizeUser(data.user || payload);
            setUser(next);
            setSelectedIcon(null);
            setMessage('ユーザー情報を保存しました。');
        } catch (err) {
            setError(err.message);
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

            <section className={styles.userEditCard}>
                <h2 className={styles.userEditSectionTitle}>詳細情報</h2>
                <div className={styles.userEditFields}>
                    <Field label="生年月日">
                        <input className={styles.input} type="date" value={form.birthday || ''} onChange={(event) => update('birthday', event.target.value)} />
                    </Field>
                    <Field label="性別">
                        <select className={styles.input} value={form.gender || ''} onChange={(event) => update('gender', event.target.value)}>
                            <option value="">未設定</option>
                            <option value="男性">男性</option>
                            <option value="女性">女性</option>
                            <option value="その他">その他</option>
                        </select>
                    </Field>
                    <Field label="国・地域">
                        <select className={styles.input} value={form.country_code || 'JP'} onChange={(event) => update('country_code', event.target.value)}>
                            <option value="JP">日本</option>
                            <option value="US">アメリカ</option>
                            <option value="KR">韓国</option>
                            <option value="TW">台湾</option>
                        </select>
                    </Field>
                    <Field label="言語">
                        <select className={styles.input} value={form.language_code || 'ja'} onChange={(event) => update('language_code', event.target.value)}>
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

function isEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function maskPhone(value) {
    if (!value) {
        return '';
    }
    const text = String(value);
    if (text.includes('*')) {
        return text;
    }
    return text.replace(/(\d{2,3})[- ]?(\d{3,4})[- ]?(\d{4})/, '$1-****-$3');
}

export function EmailChangePage() {
    const { user, setUser } = useCurrentUser();
    const currentUser = user || emptyUser();
    const [newEmail, setNewEmail] = useState('');
    const [confirmEmail, setConfirmEmail] = useState('');
    const [code, setCode] = useState('');
    const [codeSent, setCodeSent] = useState(false);
    const [cooldown, setCooldown] = useState(0);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        if (cooldown <= 0) {
            return undefined;
        }
        const id = window.setInterval(() => setCooldown((value) => Math.max(0, value - 1)), 1000);
        return () => window.clearInterval(id);
    }, [cooldown]);

    const validateEmailInput = () => {
        if (!isEmail(newEmail)) {
            return 'メールアドレスの形式を確認してください。';
        }
        if (newEmail !== confirmEmail) {
            return '新しいメールアドレスと確認用メールアドレスが一致しません。';
        }
        return '';
    };

    const handleSendCode = async () => {
        const validation = validateEmailInput();
        setMessage('');
        setError(validation);
        if (validation || cooldown > 0) {
            return;
        }
        try {
            const response = await fetch(api.emailSend, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ new_email: newEmail }),
            });
            const data = await parseJson(response);
            setCodeSent(true);
            setCooldown(60);
            setMessage(data.message || '登録済み電話番号へ認証コードを送信しました。');
        } catch (err) {
            setError(err.message);
        }
    };

    const handleVerify = async () => {
        const validation = validateEmailInput();
        setMessage('');
        setError(validation);
        if (validation) {
            return;
        }
        if (!code.trim()) {
            setError('認証コードを入力してください。');
            return;
        }
        try {
            const response = await fetch(api.emailVerify, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ new_email: newEmail, code }),
            });
            const data = await parseJson(response);
            const next = normalizeUser({ ...currentUser, ...(data.user || {}), email: newEmail });
            setUser(next);
            setMessage('メールアドレスを変更しました。');
        } catch (err) {
            setError(err.message);
        }
    };

    return (
        <PageShell title="メールアドレスの変更">
            <section className={styles.card}>
                <p className={styles.lead}>新しいメールアドレスに確認後、登録済み電話番号へ認証コードを送信します。</p>
                <Field label="現在のメールアドレス">
                    <input className={styles.input} value={currentUser.email || ''} readOnly />
                </Field>
                <Field label="新しいメールアドレス">
                    <input className={styles.input} value={newEmail} onChange={(event) => setNewEmail(event.target.value)} placeholder="新しいメールアドレスを入力" />
                </Field>
                <Field label="新しいメールアドレス（確認）">
                    <input className={styles.input} value={confirmEmail} onChange={(event) => setConfirmEmail(event.target.value)} placeholder="もう一度入力してください" />
                </Field>
                <div className={styles.phoneNotice}>
                    <MailIcon className={styles.noticeIcon} />
                    <span>認証コード送信先: {maskPhone(currentUser.phone_number)}</span>
                </div>
                <button type="button" className={styles.primaryButton} onClick={handleSendCode} disabled={cooldown > 0}>
                    {cooldown > 0 ? cooldown + '秒後に再送信' : '認証コードを送信'}
                </button>
                {codeSent && (
                    <Field label="認証コード">
                        <input className={styles.input} value={code} onChange={(event) => setCode(event.target.value)} inputMode="numeric" placeholder="6桁のコード" />
                    </Field>
                )}
                <StatusMessage>{message}</StatusMessage>
                <StatusMessage type="error">{error}</StatusMessage>
                <button type="button" className={styles.primaryButton} onClick={handleVerify} disabled={!codeSent}>
                    メールアドレスを変更
                </button>
            </section>
        </PageShell>
    );
}

const notificationItems = [
    { key: 'chat', title: 'チャット通知', description: '新しいメッセージを受信したとき', icon: ChatIcon },
    { key: 'survey_deadline', title: 'アンケート締切通知', description: 'アンケートの締切が近づいたとき', icon: HelpIcon },
    { key: 'schedule_reminder', title: '予定リマインド通知', description: '予定の開始前にリマインドします', icon: CalendarIcon },
    { key: 'member_join', title: 'メンバー参加通知', description: '旅行グループにメンバーが参加したとき', icon: GroupIcon },
    { key: 'split_bill', title: '割り勘更新通知', description: '割り勘の内容が更新されたとき', icon: WalletIcon },
];

export function NotificationSettingsPage() {
    const [settings, setSettings] = useState({});
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        let mounted = true;
        fetch(api.notifications, { credentials: 'include' })
            .then(parseJson)
            .then((data) => {
                if (mounted && data.settings) {
                    setSettings((prev) => ({ ...prev, ...data.settings }));
                }
            })
            .catch(() => {});
        return () => {
            mounted = false;
        };
    }, []);

    const toggle = async (key) => {
        const next = { ...settings, [key]: !settings[key] };
        setSettings(next);
        setMessage('');
        try {
            await fetch(api.notifications, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ settings: next }),
            }).then(parseJson);
            setMessage('通知設定を保存しました。');
        } catch {
            setError('通知設定の保存に失敗しました。');
        }
    };

    return (
        <PageShell title="通知設定">
            <section className={styles.listCard}>
                {notificationItems.map((item) => {
                    const Icon = item.icon;
                    return (
                        <button key={item.key} type="button" className={styles.toggleRow} onClick={() => toggle(item.key)}>
                            <span className={styles.rowIconWrap}><Icon className={styles.rowIcon} /></span>
                            <span className={styles.rowText}>
                                <span className={styles.rowTitle}>{item.title}</span>
                                <span className={styles.rowDescription}>{item.description}</span>
                            </span>
                            <span className={[styles.switch, settings[item.key] ? styles.switchOn : ''].join(' ')} aria-hidden="true"><span /></span>
                        </button>
                    );
                })}
            </section>
            <StatusMessage>{message}</StatusMessage>
            <StatusMessage type="error">{error}</StatusMessage>
        </PageShell>
    );
}

function permissionLabel(permission) {
    if (permission === 'granted') return { title: 'プッシュ通知は許可されています', body: 'TABIからの通知を受信できます。' };
    if (permission === 'denied') return { title: 'プッシュ通知はブロックされています', body: 'ブラウザまたは端末の通知設定から許可してください。' };
    if (permission === 'default') return { title: 'プッシュ通知は未許可です', body: '通知を受け取るには許可が必要です。' };
    return { title: '通知許可状況を判定できません', body: 'このブラウザでは通知APIを利用できない可能性があります。' };
}

export function NotificationPermissionPage() {
    const [permission, setPermission] = useState(() => (typeof Notification === 'undefined' ? 'unknown' : Notification.permission));
    const status = permissionLabel(permission);

    const requestPermission = async () => {
        if (typeof Notification === 'undefined' || !Notification.requestPermission) {
            setPermission('unknown');
            return;
        }
        const next = await Notification.requestPermission();
        setPermission(next);
    };

    return (
        <PageShell title="通知許可状況">
            <section className={styles.permissionHero}>
                <div className={styles.permissionIcon}><BellIcon className={styles.permissionSvg} /></div>
                <h2>{status.title}</h2>
                <p>{status.body}</p>
            </section>
            <section className={styles.card}>
                <h2 className={styles.cardTitle}>許可の確認方法</h2>
                <p className={styles.lead}>端末の設定アプリやブラウザ設定から、TABI の通知が「許可」になっているか確認してください。</p>
                <button type="button" className={styles.secondaryButton} onClick={requestPermission}>
                    通知を許可する
                </button>
                <p className={styles.note}>ブラウザ仕様により、設定アプリを直接開けない場合があります。</p>
            </section>
        </PageShell>
    );
}

export function ContactPage() {
    const [category, setCategory] = useState('');
    const [subject, setSubject] = useState('');
    const [body, setBody] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = async () => {
        setMessage('');
        if (!subject.trim()) {
            setError('件名を入力してください。');
            return;
        }
        if (!body.trim()) {
            setError('内容を入力してください。');
            return;
        }
        setError('');
        try {
            await fetch(api.inquiry, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ category, subject, body }),
            }).then(parseJson);
            setMessage('お問い合わせを送信しました。');
            setSubject('');
            setBody('');
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
    const [keyword, setKeyword] = useState('');
    const [tab, setTab] = useState('すべて');
    const [openIndex, setOpenIndex] = useState(0);
    const [items, setItems] = useState([]);
    const [error, setError] = useState('');

    useEffect(() => {
        const params = new URLSearchParams();
        if (keyword) params.set('keyword', keyword);
        if (tab !== 'すべて') params.set('category', tab);

        fetch(api.faq + '?' + params.toString(), { credentials: 'include' })
            .then(parseJson)
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
