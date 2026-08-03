/**
 * 複数の画面から使われる共通の表示部品です。
 *
 * 主な流れ:
 * 1. 必要な部品や API 関数を読み込む
 * 2. 画面表示やデータ取得に必要な値を準備する
 * 3. ユーザー操作や API の結果に合わせて表示を更新する
 *
 * 扱うデータ: React の state、props、フォーム入力、API から返ったデータを主に扱います。
 */
import { useEffect, useState } from "react";
import Modal from "../Modal/Modal";
import styles from "./PasswordResetRequestModal.module.css";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SUCCESS_MESSAGE = "入力されたメールアドレスが登録されている場合、パスワード再設定メールを送信しました。";

/**
 * PasswordResetRequestModal は、このファイルの中心となる処理をまとめた関数です。
 * 画面から渡された値や API の結果を使い、次に表示する内容を決めます。
 */
function PasswordResetRequestModal({
    isOpen,
    onClose,
    initialEmail = "",
    isEmailReadOnly = false,
}) {
    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const [email, setEmail] = useState(initialEmail);
    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const [errorMessage, setErrorMessage] = useState("");
    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const [successMessage, setSuccessMessage] = useState("");
    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const [isSending, setIsSending] = useState(false);

    // 画面が表示された直後や監視している値が変わった時に、必要なデータ取得や初期設定を行います。
    useEffect(() => {
        // ここで条件を確認し、状況に合う処理だけを実行します。
        if (!isOpen) {
            return;
        }

        // モーダルを開くたびに、前回の結果を残さず新しい状態で使えるようにする。
        setEmail(initialEmail);
        setErrorMessage("");
        setSuccessMessage("");
        setIsSending(false);
    }, [initialEmail, isOpen]);

    // validateEmail は、画面操作や API 結果に合わせて必要な処理をまとめた関数です。
    const validateEmail = () => {
        const trimmedEmail = email.trim();

        // 空欄やメールアドレスとして読めない値は、APIへ送らず画面側で止める。
        if (trimmedEmail === "") {
            setErrorMessage("登録メールアドレスを入力してください。");
            return null;
        }

        // ここで条件を確認し、状況に合う処理だけを実行します。
        if (!EMAIL_PATTERN.test(trimmedEmail)) {
            setErrorMessage("メールアドレスの形式を確認してください。");
            return null;
        }

        return trimmedEmail;
    };

    // handleSubmit は、画面操作や API 結果に合わせて必要な処理をまとめた関数です。
    const handleSubmit = async () => {
        const trimmedEmail = validateEmail();

        // ここで条件を確認し、状況に合う処理だけを実行します。
        if (!trimmedEmail) {
            return;
        }

        setIsSending(true);
        setErrorMessage("");
        setSuccessMessage("");

        // API 通信やデータ処理で失敗する可能性があるため、例外を受け取れる形で実行します。
        try {
            // バックエンド API へ通信し、画面で使うデータの取得や保存を依頼します。
            const response = await fetch("/TABI/api/Auth/PasswordResetRequest.php", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                credentials: "include",
                body: JSON.stringify({ email: trimmedEmail }),
            });
            const data = await response.json();

            // ここで条件を確認し、状況に合う処理だけを実行します。
            if (!response.ok || !data.success) {
                setErrorMessage(data.message || "メール送信の受付に失敗しました。時間をおいて再度お試しください。");
                return;
            }

            // 登録済みかどうかを画面で判別できないよう、API成功時は常に同じ文言を表示する。
            setSuccessMessage(data.message || SUCCESS_MESSAGE);
        // エラーが起きた場合は、画面にメッセージを出すなど安全な処理に切り替えます。
        } catch {
            setErrorMessage("通信エラーが発生しました。時間をおいて再度お試しください。");
        // 成功・失敗に関係なく最後に必要な後片付けを行います。
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
