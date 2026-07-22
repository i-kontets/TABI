/**
 * パスワード再設定画面の入力と、再設定 API への送信を担当します。
 *
 * 主な流れ:
 * 1. 必要な部品や API 関数を読み込む
 * 2. 画面表示やデータ取得に必要な値を準備する
 * 3. ユーザー操作や API の結果に合わせて表示を更新する
 *
 * 扱うデータ: React の state、props、フォーム入力、API から返ったデータを主に扱います。
 */
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import styles from "./ResetPassword.module.css";

import eyeIcon from "../../assets/icons/eye.svg";
import eyeOffIcon from "../../assets/icons/eye_off.svg";

const imageModules = import.meta.glob("/public/assets/login/*.{jpg,jpeg,png,webp}", { eager: true });
// 配列のデータを1件ずつ画面表示用の形に変換します。
const BACKGROUND_IMAGES = Object.values(imageModules).map((mod) => mod.default);
const PASSWORD_RULE_MESSAGE = "パスワードは6文字以上で、大文字・小文字・数字を含めてください。";

/**
 * isPasswordValid は、このファイルの中心となる処理をまとめた関数です。
 * 画面から渡された値や API の結果を使い、次に表示する内容を決めます。
 */
function isPasswordValid(password) {
    return (
        password.length >= 6
        && /[A-Z]/.test(password)
        && /[a-z]/.test(password)
        && /[0-9]/.test(password)
    );
}

/**
 * getRandomBackgroundImage は、このファイルの中心となる処理をまとめた関数です。
 * 画面から渡された値や API の結果を使い、次に表示する内容を決めます。
 */
function getRandomBackgroundImage() {
    // ここで条件を確認し、状況に合う処理だけを実行します。
    if (BACKGROUND_IMAGES.length === 0) {
        return "";
    }

    return BACKGROUND_IMAGES[Math.floor(Math.random() * BACKGROUND_IMAGES.length)];
}

/**
 * ResetPassword は、このファイルの中心となる処理をまとめた関数です。
 * 画面から渡された値や API の結果を使い、次に表示する内容を決めます。
 */
function ResetPassword() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const token = useMemo(() => searchParams.get("token")?.trim() || "", [searchParams]);
    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const [bgImage] = useState(getRandomBackgroundImage);
    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const [password, setPassword] = useState("");
    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const [passwordConfirmation, setPasswordConfirmation] = useState("");
    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const [showPassword, setShowPassword] = useState(false);
    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const [showPasswordConfirmation, setShowPasswordConfirmation] = useState(false);
    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const [errorMessage, setErrorMessage] = useState("");
    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const [successMessage, setSuccessMessage] = useState("");
    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const [isSubmitting, setIsSubmitting] = useState(false);

    // 画面が表示された直後や監視している値が変わった時に、必要なデータ取得や初期設定を行います。
    useEffect(() => {
        // URLにトークンが無い場合は、APIを呼ぶ前に画面で止める。
        if (!token) {
            setErrorMessage("再設定リンクが無効です。もう一度、パスワード再設定メールを送信してください。");
        }
    }, [token]);

    // validateForm は、画面操作や API 結果に合わせて必要な処理をまとめた関数です。
    const validateForm = () => {
        // ここで条件を確認し、状況に合う処理だけを実行します。
        if (!token) {
            setErrorMessage("再設定リンクが無効です。もう一度、パスワード再設定メールを送信してください。");
            return false;
        }

        // 新しいパスワードと確認入力が空だと、本人が意図しない値で更新されるため送信しない。
        if (!password || !passwordConfirmation) {
            setErrorMessage("新しいパスワードと確認用パスワードを入力してください。");
            return false;
        }

        // 入力ミスを防ぐため、2つのパスワードが同じかを画面側でも確認する。
        if (password !== passwordConfirmation) {
            setErrorMessage("新しいパスワードと確認用パスワードが一致しません。");
            return false;
        }

        // ここで条件を確認し、状況に合う処理だけを実行します。
        if (!isPasswordValid(password)) {
            setErrorMessage(PASSWORD_RULE_MESSAGE);
            return false;
        }

        return true;
    };

    // handleSubmit は、画面操作や API 結果に合わせて必要な処理をまとめた関数です。
    const handleSubmit = async (event) => {
        event.preventDefault();
        setErrorMessage("");
        setSuccessMessage("");

        // ここで条件を確認し、状況に合う処理だけを実行します。
        if (!validateForm()) {
            return;
        }

        setIsSubmitting(true);

        // API 通信やデータ処理で失敗する可能性があるため、例外を受け取れる形で実行します。
        try {
            // バックエンド API へ通信し、画面で使うデータの取得や保存を依頼します。
            const response = await fetch("/TABI/api/Auth/ResetPassword.php", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                credentials: "include",
                body: JSON.stringify({
                    token,
                    password,
                    passwordConfirmation,
                }),
            });
            const data = await response.json();

            // ここで条件を確認し、状況に合う処理だけを実行します。
            if (!response.ok || !data.success) {
                setErrorMessage(data.message || "パスワードを変更できませんでした。");
                return;
            }

            setPassword("");
            setPasswordConfirmation("");
            setSuccessMessage(data.message || "パスワードを変更しました。新しいパスワードでログインしてください。");
        // エラーが起きた場合は、画面にメッセージを出すなど安全な処理に切り替えます。
        } catch {
            setErrorMessage("通信エラーが発生しました。時間をおいて再度お試しください。");
        // 成功・失敗に関係なく最後に必要な後片付けを行います。
        } finally {
            setIsSubmitting(false);
        }
    };

    const isComplete = successMessage !== "";

    return (
        <div
            className={styles.page}
            style={{ backgroundImage: bgImage ? `url(${bgImage})` : "none" }}
        >
            <main className={styles.container}>
                <section className={styles.card} aria-label="パスワード再設定">
                    <h1 className={styles.title}>新しいパスワードを設定</h1>

                    {isComplete ? (
                        <div className={styles.completeArea}>
                            <p className={styles.successMessage}>{successMessage}</p>
                            <button
                                type="button"
                                className={styles.primaryButton}
                                onClick={() => navigate("/")}
                            >
                                ログイン画面へ戻る
                            </button>
                        </div>
                    ) : (
                        <>
                            <p className={styles.lead}>
                                メールに記載されたリンクから新しいパスワードを設定できます。
                                このリンクは送信から1時間のみ使用できます。
                            </p>

                            <form className={styles.form} onSubmit={handleSubmit}>
                                <label className={styles.fieldLabel}>
                                    新しいパスワード
                                    <span className={styles.passwordWrapper}>
                                        <input
                                            className={styles.input}
                                            type={showPassword ? "text" : "password"}
                                            value={password}
                                            onChange={(event) => setPassword(event.target.value)}
                                        />
                                        <button
                                            type="button"
                                            className={styles.eyeButton}
                                            onClick={() => setShowPassword((current) => !current)}
                                            aria-label={showPassword ? "パスワードを非表示にする" : "パスワードを表示する"}
                                        >
                                            <img src={showPassword ? eyeIcon : eyeOffIcon} alt="" />
                                        </button>
                                    </span>
                                </label>

                                <label className={styles.fieldLabel}>
                                    新しいパスワード確認
                                    <span className={styles.passwordWrapper}>
                                        <input
                                            className={styles.input}
                                            type={showPasswordConfirmation ? "text" : "password"}
                                            value={passwordConfirmation}
                                            onChange={(event) => setPasswordConfirmation(event.target.value)}
                                        />
                                        <button
                                            type="button"
                                            className={styles.eyeButton}
                                            onClick={() => setShowPasswordConfirmation((current) => !current)}
                                            aria-label={showPasswordConfirmation ? "確認用パスワードを非表示にする" : "確認用パスワードを表示する"}
                                        >
                                            <img src={showPasswordConfirmation ? eyeIcon : eyeOffIcon} alt="" />
                                        </button>
                                    </span>
                                </label>

                                <p className={styles.ruleText}>{PASSWORD_RULE_MESSAGE}</p>

                                {errorMessage && <p className={styles.errorMessage}>{errorMessage}</p>}

                                <button
                                    type="submit"
                                    className={styles.primaryButton}
                                    disabled={isSubmitting || !token}
                                >
                                    {isSubmitting ? "変更中..." : "パスワードを変更"}
                                </button>
                            </form>

                            <button
                                type="button"
                                className={styles.backButton}
                                onClick={() => navigate("/")}
                            >
                                ログイン画面へ戻る
                            </button>
                        </>
                    )}
                </section>
            </main>
        </div>
    );
}

export default ResetPassword;
