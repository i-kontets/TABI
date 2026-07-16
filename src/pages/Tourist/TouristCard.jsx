/**
 * 観光スポットの検索、一覧表示、詳細表示、お気に入り操作を担当します。
 *
 * 主な流れ:
 * 1. 必要な部品や API 関数を読み込む
 * 2. 画面表示やデータ取得に必要な値を準備する
 * 3. ユーザー操作や API の結果に合わせて表示を更新する
 *
 * 扱うデータ: React の state、props、フォーム入力、API から返ったデータを主に扱います。
 */
import styles from './TouristCard.module.css';

/**
 * TouristCard は、このファイルの中心となる処理をまとめた関数です。
 * 画面から渡された値や API の結果を使い、次に表示する内容を決めます。
 */
function TouristCard({ spot, onSelect }) {
    // handleClick は、画面操作や API 結果に合わせて必要な処理をまとめた関数です。
    const handleClick = () => {
        onSelect(spot);
    };

    return (
        <article className={styles.card}>
            <button
                className={styles.cardButton}
                type="button"
                onClick={handleClick}
                aria-label={`${spot.name}の詳細を見る`}
            >
            <div className={styles.pin} aria-hidden="true">
                📍
            </div>
            <div className={styles.body}>
                <h3>{spot.name}</h3>
                <p>{spot.city} / {spot.type}</p>
                <dl className={styles.meta}>
                    <div>
                        <dt>lat</dt>
                        <dd>{spot.lat}</dd>
                    </div>
                    <div>
                        <dt>lon</dt>
                        <dd>{spot.lon}</dd>
                    </div>
                </dl>
            </div>
            </button>
        </article>
    );
}

export default TouristCard;
