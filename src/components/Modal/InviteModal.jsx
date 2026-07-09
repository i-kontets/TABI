import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import QRCode from "react-qr-code";
import styles from "./InviteModal.module.css";

const QRCodeComponent = QRCode?.default ?? QRCode?.QRCode ?? QRCode;

export function InviteHeader({ title }) {
    return (
        <header className={styles.header}>
            <h2 className={styles.title}>{title}</h2>
        </header>
    );
}

// コンポジション用の Invite コンテンツ。Modal の子として使う想定
export default function InviteModalContent({ onClose }) {
    const [copyStatus, setCopyStatus] = useState("");
    const location = useLocation();

    const inviteLink = useMemo(() => {
        const basePath = import.meta.env.BASE_URL ?? "/";
        const normalizedBasePath = basePath.endsWith("/") ? basePath.slice(0, -1) : basePath;
        const currentPath = `${location.pathname}${location.search}${location.hash}`;
        return `${window.location.origin}${normalizedBasePath}${currentPath}++test`;
    }, [location.hash, location.pathname, location.search]);

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
            <InviteHeader title="招待する" />
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
                <div className={styles.qrSection}>
                    <QRCodeComponent value={inviteLink} size={160} className={styles.qrCode} />
                </div>
            </div>
        </div>
    );
}
