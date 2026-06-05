import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import styles from "./InviteModal.module.css";

export function InviteHeader({ title, onClose }) {
    return (
        <header className={styles.header}>
            <h2 className={styles.title}>{title}</h2>
            <button className={styles.closeButton} onClick={onClose} aria-label="閉じる">×</button>
        </header>
    );
}

export function InviteForm({ onInvite }) {
    const [email, setEmail] = useState("");

    const submit = (e) => {
        e.preventDefault();
        if (!email) return;
        onInvite(email);
        setEmail("");
    };

    return (
        <form className={styles.form} onSubmit={submit}>
            <input
                className={styles.input}
                type="email"
                placeholder="招待するメールアドレスを入力"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
            />
            <button className={styles.inviteButton} type="submit">招待する</button>
        </form>
    );
}

export function InviteList({ invites = [] }) {
    if (!invites.length) {
        return <p className={styles.empty}>まだ招待はありません</p>;
    }

    return (
        <ul className={styles.list}>
            {invites.map((item, idx) => (
                <li key={idx} className={styles.listItem}>
                    <span>{item.email}</span>
                    <span className={styles.status}>{item.status}</span>
                </li>
            ))}
        </ul>
    );
}

export function InviteActions({ onCancel }) {
    return (
        <div className={styles.actions}>
            <button className={styles.cancel} onClick={onCancel}>キャンセル</button>
        </div>
    );
}

// コンポジション用の Invite コンテンツ。Modal の子として使う想定
export default function InviteModalContent({ onClose }) {
    const [invites, setInvites] = useState([]);
    const [copyStatus, setCopyStatus] = useState("");
    const location = useLocation();

    const inviteLink = useMemo(() => {
        const basePath = import.meta.env.BASE_URL ?? "/";
        const normalizedBasePath = basePath.endsWith("/") ? basePath.slice(0, -1) : basePath;
        const currentPath = `${location.pathname}${location.search}${location.hash}`;
        return `${window.location.origin}${normalizedBasePath}${currentPath}++test`;
    }, [location.hash, location.pathname, location.search]);

    const handleInvite = (email) => {
        // 仮処理: 即時反映するだけ（実際はAPI呼び出しなど）
        setInvites((prev) => [{ email, status: "招待済み" }, ...prev]);
    };

    const handleCopy = async () => {
        await navigator.clipboard.writeText(inviteLink);
        setCopyStatus("コピーしました");
    };

    useEffect(() => {
        if (!copyStatus) {
            return;
        }

        const timer = window.setTimeout(() => setCopyStatus(""), 2000);
        return () => window.clearTimeout(timer);
    }, [copyStatus]);

    return (
        <div className={styles.container}>
            <InviteHeader title="招待する" onClose={onClose} />
            <div className={styles.body}>
                <div className={styles.linkSection}>
                    <label className={styles.linkLabel} htmlFor="invite-link">
                        今開いているページの招待リンク
                    </label>
                    <div className={styles.linkRow}>
                        <input
                            id="invite-link"
                            className={styles.linkInput}
                            type="text"
                            readOnly
                            value={inviteLink}
                            onFocus={(event) => event.target.select()}
                        />
                        <button className={styles.copyButton} type="button" onClick={handleCopy}>
                            コピー
                        </button>
                    </div>
                    {copyStatus ? <p className={styles.copyStatus}>{copyStatus}</p> : null}
                </div>
                <InviteForm onInvite={handleInvite} />
                <InviteList invites={invites} />
            </div>
            <InviteActions onCancel={onClose} />
        </div>
    );
}
