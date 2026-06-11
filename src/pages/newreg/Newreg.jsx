import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import PasswordInput from "../../components/Zxcvbn/Password";
import styles from "./Newreg.module.css";

// public/assets/login/ 直下にあるすべてのjpg,jpeg,png,webp画像を自動で読み込む
const imageModules = import.meta.glob("/public/assets/login/*.{jpg,jpeg,png,webp}", { eager: true });
const BACKGROUND_IMAGES = Object.values(imageModules).map((mod) => mod.default);

export default function Newreg() {
    const navigate = useNavigate();
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

    const isEmailValid = email.trim() !== "";
    const isFormValid = isEmailValid && passwordData.isValid;

    const handleRegister = (e) => {
        e.preventDefault();
        setTouched(true);

        if (!isFormValid) {
            return;
        }
        console.log("登録成功:", { email, password: passwordData.password });
        navigate("/Home");
    };

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
                </div>
            </div>
        </div>
    );
}