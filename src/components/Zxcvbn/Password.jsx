/**
 * パスワードの見やすい入力と強さ判定に関係する部品です。
 *
 * 主な流れ:
 * 1. 必要な部品や API 関数を読み込む
 * 2. 画面表示やデータ取得に必要な値を準備する
 * 3. ユーザー操作や API の結果に合わせて表示を更新する
 *
 * 扱うデータ: React の state、props、フォーム入力、API から返ったデータを主に扱います。
 */
import { useState, useEffect } from "react";
import styles from "./PasswordInput.module.css";

import eyeIcon from "../../assets/icons/eye.svg";
import eyeOffIcon from "../../assets/icons/eye_off.svg";

/**
 * PasswordInput は、このファイルの中心となる処理をまとめた関数です。
 * 画面から渡された値や API の結果を使い、次に表示する内容を決めます。
 */
export default function PasswordInput({ onChange }) {
  // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
  const [password, setPassword] = useState("");
  // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
  const [confirm, setConfirm] = useState("");
  // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
  const [showPassword, setShowPassword] = useState(false);
  // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    // validatePassword は、画面操作や API 結果に合わせて必要な処理をまとめた関数です。
    const validatePassword = (pwd) => {
        const hasUpperCase = /[A-Z]/.test(pwd);
        const hasLowerCase = /[a-z]/.test(pwd);
        const hasNumber = /[0-9]/.test(pwd);
        const isLongEnough = pwd.length >= 6;

        return hasUpperCase && hasLowerCase && hasNumber && isLongEnough;
    };

    const isStrongEnough = validatePassword(password);

    // 画面が表示された直後や監視している値が変わった時に、必要なデータ取得や初期設定を行います。
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
