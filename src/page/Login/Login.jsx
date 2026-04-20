import { useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./Login.module.css";

import eyeIcon from "../../assets/icons/eye.svg";
import eyeOffIcon from "../../assets/icons/eye_off.svg";

export default function Login() {
    const navigate = useNavigate();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);

    const handleLogin = (e) => {
        e.preventDefault();
        console.log("ログイン:", { email, password });
    };



    return (
        <div className={styles.loginPage}>
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