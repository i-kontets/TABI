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

function TouristCard({
    spot,
    isFavorite,
    isFavoriteLoading,
    onSelect,
    onToggleFavorite,
}) {
    // handleSelect は、画面操作や API 結果に合わせて必要な処理をまとめた関数です。
    const handleSelect = () => {
        onSelect(spot);
    };

    const handleFavoriteClick = (event) => {
        event.stopPropagation();
        onToggleFavorite(spot.tourist_spot_id);
    };

    return (
        <article className={styles.card}>
            <div className={styles.cardInner}>
                <button
                    className={styles.cardButton}
                    type="button"
                    onClick={handleSelect}
                    aria-label={`${spot.name}の詳細を見る`}
                >
                    <div className={styles.pin} aria-hidden="true">
                        📍
                    </div>
                    <div className={styles.body}>
                        <h3>{spot.name}</h3>
                        <p>{spot.address || `${spot.prefecture || ''}${spot.city || ''}` || '住所未登録'}</p>
                        <dl className={styles.meta}>
                            <div>
                                <dt>地域</dt>
                                <dd>{spot.city || spot.prefecture || '未設定'}</dd>
                            </div>
                            <div>
                                <dt>カテゴリ</dt>
                                <dd>{spot.category || spot.type || '未設定'}</dd>
                            </div>
                        </dl>
                    </div>
                </button>
                <div className={styles.headerRow}>
                    <button
                        className={`${styles.favoriteButton} ${isFavorite ? styles.favoriteActive : ''}`}
                        type="button"
                        onClick={handleFavoriteClick}
                        disabled={isFavoriteLoading}
                        aria-label={isFavorite ? 'お気に入り解除' : 'お気に入り追加'}
                    >
                        {isFavorite ? '★' : '☆'}
                    </button>
                </div>
            </div>
        </article>
    );
}

export default TouristCard;
