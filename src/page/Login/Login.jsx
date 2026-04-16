import { useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from"./Login.module.css";

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
    <div className="login-container">
      <div className="login-card">
        <h2 className="title">Login</h2>

        <form onSubmit={handleLogin}>
          <input
            className="input"
            type="email"
            placeholder="メールアドレス"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <div className="password-wrapper">
            <input
              className="input password-input"
              type={showPassword ? "text" : "password"}
              placeholder="パスワード"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <img
              src={showPassword ? eyeIcon : eyeOffIcon}
              alt="toggle password"
              className="eye-icon"
              onClick={() => setShowPassword(!showPassword)}
            />
          </div>

          <button className="btn login-btn" type="submit">
            ログイン
          </button>
        </form>

        <button className="btn register-btn" onClick={() => navigate("/Newreg")}>
          新規登録
        </button>
      </div>
    </div>
  );
}