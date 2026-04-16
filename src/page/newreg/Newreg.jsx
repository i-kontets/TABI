import { useState } from "react";
import { useNavigate } from "react-router-dom";
import PasswordInput from "../../components/Zxcvbn/Password";
import styles from "./Newreg.module.css";

export default function Newreg() {
    const navigate = useNavigate();
    const [email, setEmail] = useState("");
    const [touched, setTouched] = useState(false);
    const [passwordData, setPasswordData] = useState({
        password: "",
        confirm: "",
        isValid: false
    });

    const isEmailValid = email.trim() !== "";

    const handleRegister = (e) => {
        e.preventDefault();
        setTouched(true);

        if (!isEmailValid || !passwordData.isValid) {
        return;
        }

        console.log("登録成功:", {
        email,
        password: passwordData.password
        });
        navigate("/Home");
    };

  return (
    <div className={styles.loginPage}>
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

          <PasswordInput onChange={setPasswordData} />

          <button
            className={styles.btn}
            type="submit"
            disabled={!isEmailValid || !passwordData.isValid}
          >
            登録
          </button>
        </form>
      </div>
    </div>
    </div>
  );
}