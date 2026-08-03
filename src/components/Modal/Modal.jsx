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
import { useEffect } from "react";
import styles from "./Modal.module.css";

export function InviteActions({ onCancel }) {
    return (
        <div className={styles.actions}>
            <button className={styles.cancel} type="button" onClick={onCancel}>
                閉じる
            </button>
        </div>
    );
}


function Modal({ isOpen, onClose, children }) {
    // 画面が表示された直後や監視している値が変わった時に、必要なデータ取得や初期設定を行います。
    useEffect(() => {
        // ここで条件を確認し、状況に合う処理だけを実行します。
        if (!isOpen) {
            return;
        }

        const { overflow } = document.body.style;
        document.body.style.overflow = "hidden";

        return () => {
            document.body.style.overflow = overflow;
        };
    }, [isOpen]);

    // ここで条件を確認し、状況に合う処理だけを実行します。
    if (!isOpen) {
        return null;
    }

    

    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div
                className={styles.modal}
                role="dialog"
                aria-modal="true"
                onClick={(event) => event.stopPropagation()}
            >
                {children}
            <InviteActions onCancel={onClose} />
            </div>
        </div>
    );
}

export default Modal;
