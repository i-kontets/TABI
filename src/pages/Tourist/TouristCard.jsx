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
                    <div className={styles.visual} aria-hidden="true">
                        {spot.image_url ? (
                            <img src={spot.image_url} alt="" />
                        ) : (
                            <span>📍</span>
                        )}
                    </div>
                    <div className={styles.body}>
                        <div className={styles.titleRow}>
                            <span className={styles.rank}>{spot.rank}位</span>
                            <h3>{spot.name}</h3>
                        </div>
                        <p>{[spot.prefecture, spot.city].filter(Boolean).join(' ') || spot.address || '地域未登録'}</p>
                        <div className={styles.metrics}>
                            <span>★ {spot.average_rating == null ? '未評価' : Number(spot.average_rating).toFixed(1)}</span>
                            <span>レビュー {spot.review_count || 0}件</span>
                            <span>お気に入り {spot.favorite_count || 0}件</span>
                        </div>
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
