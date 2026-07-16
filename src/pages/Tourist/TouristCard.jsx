import styles from './TouristCard.module.css';

function TouristCard({
    spot,
    isFavorite,
    isFavoriteLoading,
    onSelect,
    onToggleFavorite,
}) {
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
