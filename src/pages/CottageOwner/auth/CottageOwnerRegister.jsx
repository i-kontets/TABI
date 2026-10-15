/**
 * コテージ管理者の新規登録入口です。未整備の登録仕様を案内し、ログイン画面へのリンクを表示します。
 * 必須項目・施設との紐付け・承認方式が未確定なので個人情報を収集せず、登録APIも呼びません。
 */
import { Link } from 'react-router-dom';
import styles from './CottageOwnerAuth.module.css';

// 専用ログインから開きます。仕様とAPIの承認後、この画面に検証付きフォームを追加します。
export default function CottageOwnerRegister() {
    return <main className={styles.page}><section className={styles.card}>
        <h1>コテージ管理者の新規登録</h1>
        <p role="status">施設管理者向けの登録は未接続です。登録項目・施設との紐付け・承認方法を確認中のため、現在は登録できません。</p>
        <button type="button" disabled>新規登録（準備中）</button>
        <Link to="/CottageOwner/login">コテージ管理者ログインへ</Link>
        <Link to="/">一般ユーザーのログイン画面へ戻る</Link>
    </section></main>;
}
