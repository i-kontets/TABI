/**
 * 複数の画面から使われる共通の表示部品です。
 *
 * 主な流れ:
 * 1. 必要な部品や API 関数を読み込む
 * 2. 画面表示やデータ取得に必要な値を準備する
 * 3. ユーザー操作や API の結果に合わせて表示を更新する
 *
 * 扱うデータ: React の state、props、フォーム入力、API から返ったデータを主に扱います。
 */
import { useNavigate, useSearchParams } from 'react-router-dom';
import styles from './header.module.css';
import Home from '../../assets/icons/home.svg?react';
import ArrowBack from '../../assets/icons/arrow_back.svg?react';
import ChatIcon from '../../assets/icons/chat.svg?react';

/**
 * Header は、このファイルの中心となる処理をまとめた関数です。
 * 画面から渡された値や API の結果を使い、次に表示する内容を決めます。
 */
function Header({ tripName, isOther = false }) {
    const [searchParams] = useSearchParams();
    const groupId = searchParams.get('groupId');
    const navigate = useNavigate();

    // handleBackClick は、画面操作や API 結果に合わせて必要な処理をまとめた関数です。
    const handleBackClick = () => {
        navigate(isOther ? `/Itinerary?groupId=${groupId}` : '/Home');
    };

    // chatClick は、画面操作や API 結果に合わせて必要な処理をまとめた関数です。
    const chatClick = () => {
        console.log("test内容");
        navigate('/Chat')
    };

    return (
        <header className={styles.header}>
            <button
                className={styles.backButton}
                onClick={handleBackClick}
                aria-label="戻る"
            >
                {isOther ? (
                    <ArrowBack className={styles.icon} aria-hidden="true" />
                ) : (
                    <Home className={styles.icon} aria-hidden="true" />
                )}
            </button>

            <div className={styles.titleWrapper}>
                <h1 className={styles.title}>{tripName}</h1>
            </div>

            <button
                className={styles.chatButton}
                onClick={chatClick}
                aria-label="チャットゥ"
            // onClick={() => {
            //     console.log("chat clicked")
            //     navigate("/chat")
            >

                <ChatIcon className={styles.icon} aria-hidden="true" />
            </button>
        </header>
    );
}

export default Header;