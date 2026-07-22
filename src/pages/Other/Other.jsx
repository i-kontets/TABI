import { useContext } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { TripContext } from '../../App';
import BottomNav from '../../components/bottomNav/BottomNav';
import Header from '../../components/header/Header';
import styles from './Other.module.css';

const supportItems = [
    {
        id: 'weather',
        title: '天気情報',
        description: '現在地や目的地の天気を確認',
        icon: '☀',
        tone: 'sky',
        path: '/album',
        withGroupId: true,
    },
    {
        id: 'Invoice',
        title: '割り勘',
        description: '建て替えた分を管理',
        icon: '¥',
        tone: 'gold',
        path: '/Invoice',
    },
    {
        id: 'translate',
        title: '翻訳',
        description: 'テキストや会話を翻訳',
        icon: '文',
        tone: 'paper',
    },
    {
        id: 'transport',
        title: '交通情報',
        description: '電車・バス・フライトの情報を検索',
        icon: '↔',
        tone: 'blue',
    },
    {
        id: 'nearby',
        title: '周辺スポット',
        description: '近くの観光スポットや人気スポットを探す',
        icon: '⌖',
        tone: 'green',
        path: '/Tourist',
    },

];

/**
 * ArrowIcon は、このファイルの中心となる処理をまとめた関数です。
 * 画面から渡された値や API の結果を使い、次に表示する内容を決めます。
 */
function ArrowIcon() {
    return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="m9 5 7 7-7 7" />
        </svg>
    );
}

/**
 * Other は、このファイルの中心となる処理をまとめた関数です。
 * 画面から渡された値や API の結果を使い、次に表示する内容を決めます。
 */
export default function Other() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { trip } = useContext(TripContext);
    const groupId = searchParams.get('groupId') || trip.id;

    return (
        <>
        <Header />
        <div className={styles.page}>
            <main className={styles.content}>
                <section className={styles.supportCard}>
                    <div className={styles.menu}>
                        {supportItems.map((item) => (
                            <button
                                className={styles.menuItem}
                                type="button"
                                key={item.id}
                                onClick={() => {
                                    if (item.path) {
                                        if (item.withGroupId && groupId) {
                                            navigate(`${item.path}?groupId=${encodeURIComponent(groupId)}`);
                                            return;
                                        }

                                        navigate(item.path);
                                    }
                                }}
                            >
                                <span className={`${styles.thumbnail} ${styles[item.tone]}`}>
                                    <span>{item.icon}</span>
                                </span>
                                <span className={styles.itemText}>
                                    <strong>{item.title}</strong>
                                    <small>{item.description}</small>
                                </span>
                                <span className={styles.arrow}>
                                    <ArrowIcon />
                                </span>
                            </button>
                        ))}
                    </div>
                </section>
            </main>
        <BottomNav />
        </div>
        </>
    );
}
