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
    const isFormValid = isEmailValid && passwordData.isValid;

    const handleRegister = (e) => {
        e.preventDefault();
        setTouched(true);

        if (!isFormValid) {
        return;
        }
        console.log("登録成功:", {email,password: passwordData.password});
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

          <p className={styles.passwordNotice}>
            パスワードには大文字・小文字・数字を含めてください
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