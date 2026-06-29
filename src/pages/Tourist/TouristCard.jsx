import styles from './TouristCard.module.css';

function TouristCard({ spot }) {
    return (
        <article className={styles.card}>
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
        </article>
    );
}

export default TouristCard;
