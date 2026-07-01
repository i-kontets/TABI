import Modal from '../../components/Modal/Modal';
import styles from './TouristDetailModal.module.css';

function TouristDetailModal({ isOpen, spot, isLoading, message, onClose }) {
    return (
        <Modal isOpen={isOpen} onClose={onClose}>
            <div className={styles.header}>
                <div>
                    <p className={styles.label}>Spot Detail</p>
                    <h2>{spot?.name || '観光地詳細'}</h2>
                </div>
                <button className={styles.closeButton} type="button" onClick={onClose} aria-label="閉じる">
                    ×
                </button>
            </div>

            {isLoading && (
                <div className={styles.status}>詳細情報を取得しています。</div>
            )}

            {!isLoading && message && (
                <div className={styles.status}>{message}</div>
            )}

            {!isLoading && !message && spot && (
                <div className={styles.content}>
                    {spot.image_url && (
                        <img className={styles.image} src={spot.image_url} alt={spot.name} />
                    )}

                    <div className={styles.summary}>
                        <span>{spot.prefecture || '都道府県未設定'}</span>
                        <span>{spot.city || '市区町村未設定'}</span>
                        <span>{spot.category || spot.type || 'カテゴリ未設定'}</span>
                    </div>

                    {spot.description && (
                        <p className={styles.description}>{spot.description}</p>
                    )}

                    <dl className={styles.detailList}>
                        <div>
                            <dt>住所</dt>
                            <dd>{spot.address || '未設定'}</dd>
                        </div>
                        <div>
                            <dt>種別</dt>
                            <dd>{spot.type || '未設定'}</dd>
                        </div>
                        <div>
                            <dt>緯度</dt>
                            <dd>{spot.lat ?? '未設定'}</dd>
                        </div>
                        <div>
                            <dt>経度</dt>
                            <dd>{spot.lon ?? '未設定'}</dd>
                        </div>
                        <div>
                            <dt>情報元</dt>
                            <dd>{spot.source || '未設定'}</dd>
                        </div>
                    </dl>
                </div>
            )}
        </Modal>
    );
}

export default TouristDetailModal;
