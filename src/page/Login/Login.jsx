import { useState } from "react";
import "./Login.css";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = (e) => {
    e.preventDefault();
    console.log("ログイン:", { email, password });
  };

  const handleRegister = () => {
    console.log("新規登録へ");
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

          <input
            className="input"
            type="password"
            placeholder="パスワード"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button className="btn login-btn" type="submit">
            ログイン
          </button>
        </form>

        <button className="btn register-btn" onClick={handleRegister}>
          新規登録
        </button>
      </div>
    </div>
  );
}