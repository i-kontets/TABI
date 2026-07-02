import styles from './TouristCard.module.css';

function TouristCard({ spot, onSelect }) {
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
