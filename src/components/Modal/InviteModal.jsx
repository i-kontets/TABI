/**
 * 画面の上に重ねて表示するモーダル部品を担当します。
 *
 * 主な流れ:
 * 1. 必要な部品や API 関数を読み込む
 * 2. 画面表示やデータ取得に必要な値を準備する
 * 3. ユーザー操作や API の結果に合わせて表示を更新する
 *
 * 扱うデータ: React の state、props、フォーム入力、API から返ったデータを主に扱います。
 */
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

// コンポジション用の Invite コンテンツ。Modal の子として使う想定
export default function InviteModalContent({ onClose }) {
    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const [copyStatus, setCopyStatus] = useState("");
    const location = useLocation();

    const inviteLink = useMemo(() => {
        const basePath = import.meta.env.BASE_URL ?? "/";
        const normalizedBasePath = basePath.endsWith("/") ? basePath.slice(0, -1) : basePath;
        const currentPath = `${location.pathname}${location.search}${location.hash}`;
        return `${window.location.origin}${normalizedBasePath}${currentPath}++test`;
    }, [location.hash, location.pathname, location.search]);

    // handleCopy は、画面操作や API 結果に合わせて必要な処理をまとめた関数です。
    const handleCopy = async () => {
        await navigator.clipboard.writeText(inviteLink);
        setCopyStatus("コピーしました");
    };

    // 画面が表示された直後や監視している値が変わった時に、必要なデータ取得や初期設定を行います。
    useEffect(() => {
        // ここで条件を確認し、状況に合う処理だけを実行します。
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
            <InviteActions onCancel={onClose} />
        </div>
    );
}
