/**
 * コテージ管理者専用のログイン入口です。未接続の案内→入力欄→登録・一般ログインへのリンクを表示します。
 * 施設管理権限を確認するAPIが未整備のため入力は送信せず、ログイン済みと見せかけません。
 */
import { Link } from 'react-router-dom';
import styles from './CottageOwnerAuth.module.css';

// 一般ログインから開きます。将来は施設権限を確認できるAPIの確定後に送信処理を追加します。
export default function CottageOwnerLogin() {
    return <main className={styles.page}><section className={styles.card}>
        <h1>コテージ管理者ログイン</h1>
        <p role="status">施設管理者向けの認証は未接続です。現在はログインできません。</p>
        <fieldset disabled>
            <legend>ログイン情報</legend>
            <label>メールアドレス<input type="email" autoComplete="username" /></label>
            <label>パスワード<input type="password" autoComplete="current-password" /></label>
            <button type="button" disabled>ログイン（準備中）</button>
        </fieldset>
        <Link to="/CottageOwner/register">未登録の方はこちら</Link>
        <Link to="/">一般ユーザーのログイン画面へ戻る</Link>
    </section></main>;
}
