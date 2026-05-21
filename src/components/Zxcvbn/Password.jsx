import { useState, useEffect } from "react";
import styles from "./PasswordInput.module.css";

import eyeIcon from "../../assets/icons/eye.svg";
import eyeOffIcon from "../../assets/icons/eye_off.svg";

export default function PasswordInput({ onChange }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const validatePassword = (pwd) => {
        const hasUpperCase = /[A-Z]/.test(pwd);
        const hasLowerCase = /[a-z]/.test(pwd);
        const hasNumber = /[0-9]/.test(pwd);
        const isLongEnough = pwd.length >= 6;
        
        return hasUpperCase && hasLowerCase && hasNumber && isLongEnough;
    };

    const isStrongEnough = validatePassword(password);

    useEffect(() => {
        onChange?.({
            password,
            confirm,
            isValid:
                password &&
                confirm &&
                password === confirm &&
                isStrongEnough
        });
    }, [password, confirm, isStrongEnough]);

    return (
        <>
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

      <div className={styles.passwordWrapper}>
        <input
          className={`${styles.input} ${styles.passwordInput}`}
          type={showConfirmPassword ? "text" : "password"}
          placeholder="パスワード（再入力）"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
        <img
          src={showConfirmPassword ? eyeIcon : eyeOffIcon}
          alt="toggle password"
          className={styles.eyeIcon}
          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
        />
      </div>

    </>
  );
}
