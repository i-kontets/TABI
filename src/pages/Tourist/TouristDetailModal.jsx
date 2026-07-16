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
import Modal from '../../components/Modal/Modal';
import styles from './TouristDetailModal.module.css';

/**
 * TouristDetailModal は、このファイルの中心となる処理をまとめた関数です。
 * 画面から渡された値や API の結果を使い、次に表示する内容を決めます。
 */
function TouristDetailModal({
    isOpen,
    spot,
    isLoading,
    message,
    isFavorite,
    favoriteMessage,
    isFavoriteLoading,
    onToggleFavorite,
    onClose,
}) {
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

                    <div className={styles.actions}>
                        <button
                            className={`${styles.favoriteButton} ${isFavorite ? styles.favoriteActive : ''}`}
                            type="button"
                            onClick={onToggleFavorite}
                            disabled={isFavoriteLoading}
                        >
                            {isFavoriteLoading
                                ? '処理中...'
                                : isFavorite
                                    ? 'お気に入りから削除'
                                    : 'お気に入りに追加'}
                        </button>
                        {favoriteMessage && (
                            <p className={styles.favoriteMessage}>{favoriteMessage}</p>
                        )}
                    </div>

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
