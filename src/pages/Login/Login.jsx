/**
 * ログイン画面の入力、認証 API への送信、ログイン後の画面遷移を担当します。
 *
 * 主な流れ:
 * 1. 必要な部品や API 関数を読み込む
 * 2. 画面表示やデータ取得に必要な値を準備する
 * 3. ユーザー操作や API の結果に合わせて表示を更新する
 *
 * 扱うデータ: React の state、props、フォーム入力、API から返ったデータを主に扱います。
 */
import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { buildAuthPath, getReturnPathFromSearchParams, resolveAuthReturnPath } from "../../utils/authReturnPath";
import styles from "./Login.module.css";
import PasswordResetRequestModal from "../../components/PasswordReset/PasswordResetRequestModal";

import eyeIcon from "../../assets/icons/eye.svg";
import eyeOffIcon from "../../assets/icons/eye_off.svg";

// public/assets/login/ 直下にあるすべてのjpg,jpeg,png,webp画像を自動で読み込む
const imageModules = import.meta.glob("/public/assets/login/*.{jpg,jpeg,png,webp}", { eager: true });
// 配列のデータを1件ずつ画面表示用の形に変換します。
const BACKGROUND_IMAGES = Object.values(imageModules).map((mod) => mod.default);

/**
 * Login は、このファイルの中心となる処理をまとめた関数です。
 * 画面から渡された値や API の結果を使い、次に表示する内容を決めます。
 */
export default function Login() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const returnPath = getReturnPathFromSearchParams(searchParams);
    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const [email, setEmail] = useState("2410041@i-seifu.jp");
    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const [password, setPassword] = useState("2024gakusei");
    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const [showPassword, setShowPassword] = useState(false);
    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const [errorMessage, setErrorMessage] = useState("");
    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const [isLoading, setIsLoading] = useState(false);
    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const [isPasswordResetOpen, setIsPasswordResetOpen] = useState(false);

    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const [bgImage] = useState(() => {
        if (BACKGROUND_IMAGES.length === 0) {
            return "";
        }

        const randomIndex = Math.floor(Math.random() * BACKGROUND_IMAGES.length);
        return BACKGROUND_IMAGES[randomIndex];
    });

    // 背景画像は初回表示時にランダムで1枚だけ選びます。

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

        // API 通信やデータ処理で失敗する可能性があるため、例外を受け取れる形で実行します。
        try {
            // ローディング状態を有効化
            setIsLoading(true);

            // バックエンドのログインAPIにPOSTリクエストを送信
            const response = await fetch("/TABI/api/auth/login.php", {
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
            navigate(resolveAuthReturnPath(returnPath));

        // エラーが起きた場合は、画面にメッセージを出すなど安全な処理に切り替えます。
        } catch (error) {
            // 通信エラーやパース エラーをキャッチ
            console.error(error);
            setErrorMessage("通信エラーが発生しました");
        // 成功・失敗に関係なく最後に必要な後片付けを行います。
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

                        <button
                            type="button"
                            className={styles.forgotPasswordLink}
                            onClick={() => setIsPasswordResetOpen(true)}
                        >
                            パスワードを忘れた方はこちら
                        </button>

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
                        onClick={() => navigate(buildAuthPath("/Newreg", returnPath))}
                    >
                        新規登録
                    </button>
                </div>
            </div>

            <PasswordResetRequestModal
                isOpen={isPasswordResetOpen}
                onClose={() => setIsPasswordResetOpen(false)}
                initialEmail={email}
            />
        </div>
    );
}
