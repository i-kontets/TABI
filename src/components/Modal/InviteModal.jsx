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

export function InviteActions({ onCancel }) {
    return (
        <div className={styles.actions}>
            <button className={styles.cancel} type="button" onClick={onCancel}>
                閉じる
            </button>
        </div>
    );
}

export default function InviteModalContent({ groupId, onClose }) {
    const [copyStatus, setCopyStatus] = useState("");
    const location = useLocation();

    // Itinerary 側から groupId が渡らない場合でも、URLクエリから補完できるようにします。
    const inviteGroupId = useMemo(() => {
        if (groupId) return groupId;

        const params = new URLSearchParams(location.search);
        return params.get("groupId");
    }, [groupId, location.search]);

    // QRコードには、参加画面のURLと対象グループIDを埋め込みます。
    const inviteLink = useMemo(() => {
        const baseUrl = new URL(import.meta.env.BASE_URL, window.location.origin);
        const joinUrl = new URL("ItineraryJoin", baseUrl);

        if (inviteGroupId) {
            joinUrl.searchParams.set("groupId", inviteGroupId);
        }

        return joinUrl.toString();
    }, [inviteGroupId]);

    const handleCopy = async () => {
        await navigator.clipboard.writeText(inviteLink);
        setCopyStatus("コピーしました");
    };

    useEffect(() => {
        if (!copyStatus) return;

        const timer = window.setTimeout(() => setCopyStatus(""), 2000);
        return () => window.clearTimeout(timer);
    }, [copyStatus]);

    return (
        <div className={styles.container}>
            <InviteHeader title="招待する" />
            <div className={styles.body}>
                <div className={styles.linkSection}>
                    <label className={styles.linkLabel} htmlFor="invite-link">
                        この旅行グループへの招待リンク
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
            <InviteActions onCancel={onClose} />
        </div>
    );
}
