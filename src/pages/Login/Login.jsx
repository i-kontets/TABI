import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./Login.module.css";

import eyeIcon from "../../assets/icons/eye.svg";
import eyeOffIcon from "../../assets/icons/eye_off.svg";

// public/assets/login/ 直下にあるすべてのjpg,jpeg,png,webp画像を自動で読み込む
const imageModules = import.meta.glob("/public/assets/login/*.{jpg,jpeg,png,webp}", { eager: true });
const BACKGROUND_IMAGES = Object.values(imageModules).map((mod) => mod.default);

export default function Login() {
    const navigate = useNavigate();
    const [email, setEmail] = useState("2410041@i-seifu.jp");
    const [password, setPassword] = useState("2024Gakusei");
    const [showPassword, setShowPassword] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const [bgImage, setBgImage] = useState(BACKGROUND_IMAGES[0] || "");

    useEffect(() => {
        if (BACKGROUND_IMAGES.length > 0) {
            const randomIndex = Math.floor(Math.random() * BACKGROUND_IMAGES.length);
            setBgImage(BACKGROUND_IMAGES[randomIndex]);
        }
    }, []);

    // ログインフォーム送信ハンドラ
    const handleLogin = async (event) => {
        // フォームのデフォルト送信動作をキャンセル
        event.preventDefault();

        // 前回のエラーメッセージをクリア
        setErrorMessage("");

        // メールアドレスとパスワードの空チェック
        if (!email || !password) {
            setErrorMessage("メールアドレスとパスワードを入力してください");
            return;
        }

        try {
            // ローディング状態を有効化
            setIsLoading(true);

            // バックエンドのログインAPIにPOSTリクエストを送信
            const response = await fetch("/TABI/api/Auth/login.php", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                // Cookie送信を有効化（セッション管理用）
                credentials: "include",
                body: JSON.stringify({
                    email: email,
                    password: password,
                }),
            });

            // レスポンスをJSON形式でパース
            const data = await response.json();

            // レスポンスステータスまたはsuccess フラグをチェック
            if (!response.ok || !data.success) {
                setErrorMessage(data.message || "ログインに失敗しました");
                return;
            }

            // ログイン成功：ユーザー情報をローカルストレージに保存（クライアント側のキャッシュ）
            localStorage.setItem("loginUser", JSON.stringify(data.user));

            // ホームページにリダイレクト
            navigate("/Home");

        } catch (error) {
            // 通信エラーやパース エラーをキャッチ
            console.error(error);
            setErrorMessage("通信エラーが発生しました");
        } finally {
            // エラーの有無に関わらず、ローディング状態を無効化
            setIsLoading(false);
        }
    };

    return (
        <div
            className={styles.loginPage}
            style={{ backgroundImage: bgImage ? `url(${bgImage})` : "none" }}
        >
            <div className={styles.loginContainer}>
                <div className={styles.loginCard}>
                    <h2 className={styles.title}>Login</h2>

                    <form onSubmit={handleLogin}>
                        <input
                            className={styles.input}
                            type="email"
                            placeholder="メールアドレス"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />

                        <div className={styles.passwordWrapper}>
                            <input
                                className={`${styles.input} ${styles.passwordInput}`}
                                type={showPassword ? "text" : "password"}
                                placeholder="パスワード"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />

                            <img
                                src={showPassword ? eyeIcon : eyeOffIcon}
                                alt="toggle password"
                                className={styles.eyeIcon}
                                onClick={() => setShowPassword(!showPassword)}
                            />
                        </div>

                        {errorMessage && (
                            <p className={styles.errorMessage}>
                                {errorMessage}
                            </p>
                        )}

                        <button
                            type="submit"
                            className={`${styles.btn} ${styles.loginBtn}`}
                            disabled={isLoading}
                        >
                            {isLoading ? "ログイン中..." : "ログイン"}
                        </button>
                    </form>

                    <button
                        type="button"
                        className={`${styles.btn} ${styles.registerBtn}`}
                        onClick={() => navigate("/Newreg")}
                    >
                        新規登録
                    </button>
                </div>
            </div>
        </div>
    );
}