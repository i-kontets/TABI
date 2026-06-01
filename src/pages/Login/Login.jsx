import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./Login.module.css";

import eyeIcon from "../../assets/icons/eye.svg";
import eyeOffIcon from "../../assets/icons/eye_off.svg";

// public/assets/ 直下にあるすべてのjpg/png画像を自動で読み込む
const imageModules = import.meta.glob("/public/assets/*.{jpg,jpeg,png,webp}", { eager: true });
const BACKGROUND_IMAGES = Object.values(imageModules).map((mod) => mod.default);

export default function Login() {
    const navigate = useNavigate();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    
    // 初期値として、見つかった画像の1枚目をセットしておく
    const [bgImage, setBgImage] = useState(BACKGROUND_IMAGES[0] || "");

    useEffect(() => {
        if (BACKGROUND_IMAGES.length > 0) {
            const randomIndex = Math.floor(Math.random() * BACKGROUND_IMAGES.length);
            setBgImage(BACKGROUND_IMAGES[randomIndex]);
        }
    }, []);

    const handleLogin = (e) => {
        e.preventDefault();
        console.log("ログイン:", { email, password });
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

                        <button className={`${styles.btn} ${styles.loginBtn}`} onClick={() => navigate("/Home")}>
                            ログイン
                        </button>
                    </form>

                    <button className={`${styles.btn} ${styles.registerBtn}`} onClick={() => navigate("/Newreg")}>
                        新規登録
                    </button>
                </div>
            </div>
        </div>
    );
}