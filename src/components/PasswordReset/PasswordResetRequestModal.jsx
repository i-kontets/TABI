import { useEffect, useState } from "react";
import Modal from "../Modal/Modal";
import styles from "./PasswordResetRequestModal.module.css";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SUCCESS_MESSAGE = "入力されたメールアドレスが登録されている場合、パスワード再設定メールを送信しました。";

function PasswordResetRequestModal({
    isOpen,
    onClose,
    initialEmail = "",
    isEmailReadOnly = false,
}) {
    const [email, setEmail] = useState(initialEmail);
    const [errorMessage, setErrorMessage] = useState("");
    const [successMessage, setSuccessMessage] = useState("");
    const [isSending, setIsSending] = useState(false);

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        // モーダルを開くたびに、前回の結果を残さず新しい状態で使えるようにする。
        setEmail(initialEmail);
        setErrorMessage("");
        setSuccessMessage("");
        setIsSending(false);
    }, [initialEmail, isOpen]);

    const validateEmail = () => {
        const trimmedEmail = email.trim();

        // 空欄やメールアドレスとして読めない値は、APIへ送らず画面側で止める。
        if (trimmedEmail === "") {
            setErrorMessage("登録メールアドレスを入力してください。");
            return null;
        }

        if (!EMAIL_PATTERN.test(trimmedEmail)) {
            setErrorMessage("メールアドレスの形式を確認してください。");
            return null;
        }

        return trimmedEmail;
    };

    const handleSubmit = async () => {
        const trimmedEmail = validateEmail();

        if (!trimmedEmail) {
            return;
        }

        setIsSending(true);
        setErrorMessage("");
        setSuccessMessage("");

        try {
            const response = await fetch("/TABI/api/Auth/PasswordResetRequest.php", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                credentials: "include",
                body: JSON.stringify({ email: trimmedEmail }),
            });
            const data = await response.json();

            if (!response.ok || !data.success) {
                setErrorMessage(data.message || "メール送信の受付に失敗しました。時間をおいて再度お試しください。");
                return;
            }

            // 登録済みかどうかを画面で判別できないよう、API成功時は常に同じ文言を表示する。
            setSuccessMessage(data.message || SUCCESS_MESSAGE);
        } catch {
            setErrorMessage("通信エラーが発生しました。時間をおいて再度お試しください。");
        } finally {
            // 送信中だけボタンを無効化し、同じメールが何度も送られることを防ぐ。
            setIsSending(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose}>
            <div className={styles.modalContent}>
                <h2 className={styles.modalTitle}>パスワードの再設定</h2>
                <p className={styles.modalLead}>
                    登録メールアドレスにパスワード再設定用のリンクを送信します。
                    リンクは送信から1時間のみ使用できます。
                </p>

                <label className={styles.emailLabel}>
                    登録メールアドレス
                    <input
                        className={styles.emailInput}
                        type="email"
                        value={email}
                        readOnly={isEmailReadOnly}
                        onChange={(event) => setEmail(event.target.value)}
                    />
                </label>

                {errorMessage && <p className={styles.errorMessage}>{errorMessage}</p>}
                {successMessage && <p className={styles.successMessage}>{successMessage}</p>}

                <div className={styles.modalActions}>
                    <button
                        type="button"
                        className={styles.secondaryButton}
                        onClick={onClose}
                    >
                        閉じる
                    </button>
                    <button
                        type="button"
                        className={styles.primaryButton}
                        onClick={handleSubmit}
                        disabled={isSending}
                    >
                        {isSending ? "送信中..." : "再設定メールを送信"}
                    </button>
                </div>
            </div>
        </Modal>
    );
}

export default PasswordResetRequestModal;
