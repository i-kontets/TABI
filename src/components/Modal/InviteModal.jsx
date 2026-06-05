import { useState } from "react";
import styles from "./InviteModal.module.css";

function InviteHeader({ title, onClose }) {
    return (
        <header className={styles.header}>
            <h2 className={styles.title}>{title}</h2>
            <button className={styles.closeButton} onClick={onClose} aria-label="閉じる">×</button>
        </header>
    );
}

function InviteForm({ onInvite }) {
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

function InviteList({ invites = [] }) {
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

function InviteActions({ onCancel }) {
    return (
        <div className={styles.actions}>
            <button className={styles.cancel} onClick={onCancel}>キャンセル</button>
        </div>
    );
}

// コンポジション用の Invite コンテンツ。Modal の子として使う想定
export default function InviteModalContent({ onClose }) {
    const [invites, setInvites] = useState([]);

    const handleInvite = (email) => {
        // 仮処理: 即時反映するだけ（実際はAPI呼び出しなど）
        setInvites((prev) => [{ email, status: "招待済み" }, ...prev]);
    };

    return (
        <div className={styles.container}>
            <InviteHeader title="招待する" onClose={onClose} />
            <div className={styles.body}>
                <InviteForm onInvite={handleInvite} />
                <InviteList invites={invites} />
            </div>
            <InviteActions onCancel={onClose} />
        </div>
    );
}
