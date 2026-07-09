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
    useEffect(() => {
        if (!isOpen) {
            return;
        }

        const { overflow } = document.body.style;
        document.body.style.overflow = "hidden";

        return () => {
            document.body.style.overflow = overflow;
        };
    }, [isOpen]);

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
