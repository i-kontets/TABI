import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import PasswordInput from "../../components/Zxcvbn/Password";
import styles from "./Newreg.module.css";

// public/assets/login/ 直下にあるすべてのjpg,jpeg,png,webp画像を自動で読み込む
const imageModules = import.meta.glob("/public/assets/login/*.{jpg,jpeg,png,webp}", { eager: true });
const BACKGROUND_IMAGES = Object.values(imageModules).map((mod) => mod.default);

export default function Newreg() {
    const navigate = useNavigate();
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [touched, setTouched] = useState(false);
    const [passwordData, setPasswordData] = useState({
        password: "",
        confirm: "",
        isValid: false
    });

    // 💡 背景画像用のステート（初期値は見つかった画像の1枚目）
    const [bgImage, setBgImage] = useState(BACKGROUND_IMAGES[0] || "");

    // 💡 画面が表示された時にランダムで1枚選ぶ処理を追加
    useEffect(() => {
        if (BACKGROUND_IMAGES.length > 0) {
            const randomIndex = Math.floor(Math.random() * BACKGROUND_IMAGES.length);
            setBgImage(BACKGROUND_IMAGES[randomIndex]);
        }
    }, []);

    const isNameValid = name.trim() !== "";
    const isEmailValid = email.trim() !== "";
    const isFormValid = isNameValid && isEmailValid && passwordData.isValid;

    // 登録フォーム送信ハンドラ
    const handleRegister = async (event) =>{
        // フォームのデフォルト送信動作をキャンセル
        event.preventDefault();

        // 前回のエラーメッセージをクリア
        setTouched(true);

        // メールアドレスとパスワードの空チェック
        if (!email || !passwordData.password) {
            return;
        }

        // フォームのバリデーションチェック
        if (!isFormValid) {
            return;
        }

        try{
            // バックエンドの登録APIにPOSTリクエストを送信
            const response = await fetch("/TABI/api/auth/register.php", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                // Cookie送信を有効化（セッション管理用）
                credentials: "include",
                body: JSON.stringify({
                    email: email,
                    password: passwordData.password,
                    name: name
                }),
            });

            // レスをJSON形式
            const data = await response.json();

            // レスポンスステータスまたはsuccess フラグをチェック
            if (!response.ok || !data.success) {
                // エラーメッセージを表示する処理を追加（例: setErrorMessage(data.message || "登録に失敗しました")）
                return;
            }

            // 登録成功：ユーザー情報をローカルストレージに保存（クライアント側のキャッシュ）
            localStorage.setItem("loginUser", JSON.stringify(data.user));
            // ホームページにリダイレクト
            navigate("/Home");
        } catch (error) {
            // 通信エラー
            console.error("登録エラー:", error);
            // 必要に応じてユーザーにエラーメッセージを表示する処理を追加
        }
    }
    // const handleRegister = (event) => {
    //     event.preventDefault();
    //     setTouched(true);

    //     if (!isFormValid) {
    //         return;
    //     }
    //     console.log("登録成功:",
    //         {
    //             email,
    //             password: passwordData.password,
    //             name
    //         });
    //     navigate("/Home");
    // };

    return (
        <div
            className={styles.loginPage}
            style={{ backgroundImage: bgImage ? `url(${bgImage})` : "none" }}
        >
            <div className={styles.loginContainer}>
                <div className={styles.loginCard}>
                    <h2 className={styles.title}>新規登録</h2>

                    <form onSubmit={handleRegister}>
                        <input
                            className={styles.input}
                            type="text"
                            placeholder="ユーザー名"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />

                        <input
                            className={styles.input}
                            type="email"
                            placeholder="メールアドレス"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            onBlur={() => setTouched(true)}
                        />

                        {touched && !isEmailValid && (
                            <p className={styles.error}>
                                メールアドレスを入力してください
                            </p>
                        )}

                        <p className={styles.passwordNotice}>
                            パスワードには大文字・小文字・数字を含めてください
                            <br />パスワードは6文字以上にしてください。
                        </p>

                        <PasswordInput onChange={setPasswordData} />

                        <div className={styles.btnWrap}>
                            <button
                                className={styles.btn}
                                type="submit"
                                disabled={!isFormValid}
                            >
                                登録
                            </button>

                            {!isFormValid && (
                                <p className={styles.disabledHint}>
                                    入力内容に誤りがあります。各項目をご確認ください
                                </p>
                            )}
                        </div>
                    </form>

                    <button
                        type="button"
                        className={styles.btn}
                        onClick={() => navigate("/")}
                    >
                        戻る
                    </button>
                </div>
            </div>
        </div>
    );
}
