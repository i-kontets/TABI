import { useEffect, useMemo, useState } from 'react';
import Modal from '../../components/Modal/Modal';
import styles from './TouristDetailModal.module.css';

const touristApiBase = `${import.meta.env.BASE_URL}api/tourist`;

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
    const currentUser = useMemo(() => {
        try {
            return JSON.parse(localStorage.getItem('loginUser') || 'null');
        } catch (error) {
            console.error('ログインユーザー情報の取得に失敗しました。', error);
            return null;
        }
    }, []);
    const currentUserId = Number(currentUser?.user_id) || null;

    const [reviews, setReviews] = useState([]);
    const [reviewCount, setReviewCount] = useState(0);
    const [averageRating, setAverageRating] = useState(null);
    const [reviewMessage, setReviewMessage] = useState('');
    const [isReviewLoading, setIsReviewLoading] = useState(false);
    const [isSubmittingReview, setIsSubmittingReview] = useState(false);
    const [rating, setRating] = useState('5');
    const [comment, setComment] = useState('');

    const ownReview = reviews.find((review) => review.user_id === currentUserId) || null;

    const loadReviews = async (touristSpotId) => {
        setIsReviewLoading(true);
        setReviewMessage('');

        try {
            const params = new URLSearchParams({ tourist_spot_id: String(touristSpotId) });
            const response = await fetch(`${touristApiBase}/getReviews.php?${params.toString()}`);
            const data = await response.json();

            if (!response.ok || !data.success) {
                setReviews([]);
                setReviewCount(0);
                setAverageRating(null);
                setReviewMessage(data.message || 'レビューの取得に失敗しました。');
                return;
            }

            setReviews(Array.isArray(data.reviews) ? data.reviews : []);
            setReviewCount(data.review_count || 0);
            setAverageRating(data.average_rating ?? null);
        } catch (error) {
            console.error('レビューの取得に失敗しました。', error);
            setReviews([]);
            setReviewCount(0);
            setAverageRating(null);
            setReviewMessage('通信に失敗しました。時間をおいて再度お試しください。');
        } finally {
            setIsReviewLoading(false);
        }
    };

    useEffect(() => {
        if (!isOpen || !spot?.tourist_spot_id) {
            return;
        }

        const timerId = window.setTimeout(() => {
            loadReviews(spot.tourist_spot_id);
        }, 0);

        return () => window.clearTimeout(timerId);
    }, [isOpen, spot?.tourist_spot_id]);

    useEffect(() => {
        const timerId = window.setTimeout(() => {
            if (!isOpen) {
                setRating('5');
                setComment('');
                setReviewMessage('');
                setReviews([]);
                setReviewCount(0);
                setAverageRating(null);
                return;
            }

            if (ownReview) {
                setRating(String(ownReview.rating || 5));
                setComment(ownReview.comment || '');
                return;
            }

            setRating('5');
            setComment('');
        }, 0);

        return () => window.clearTimeout(timerId);
    }, [isOpen, ownReview]);

    const handleFavoriteClick = async () => {
        if (!spot?.tourist_spot_id) {
            return;
        }

        await onToggleFavorite(spot.tourist_spot_id);
    };

    const handleReviewSubmit = async (event) => {
        event.preventDefault();

        if (!spot?.tourist_spot_id) {
            return;
        }

        setIsSubmittingReview(true);
        setReviewMessage('');

        try {
            const payload = {
                tourist_spot_id: spot.tourist_spot_id,
                rating: Number(rating),
                comment,
            };

            const response = await fetch(
                ownReview ? `${touristApiBase}/updateReview.php` : `${touristApiBase}/addReview.php`,
                {
                    method: ownReview ? 'PUT' : 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    credentials: 'include',
                    body: JSON.stringify(payload),
                }
            );
            const data = await response.json();

            if (!response.ok || !data.success) {
                setReviewMessage(data.message || 'レビューの保存に失敗しました。');
                return;
            }

            setReviewMessage(data.message || 'レビューを保存しました。');
            await loadReviews(spot.tourist_spot_id);
        } catch (error) {
            console.error('レビューの保存に失敗しました。', error);
            setReviewMessage('通信に失敗しました。時間をおいて再度お試しください。');
        } finally {
            setIsSubmittingReview(false);
        }
    };

    const handleReviewDelete = async () => {
        if (!spot?.tourist_spot_id || !ownReview) {
            return;
        }

        setIsSubmittingReview(true);
        setReviewMessage('');

        try {
            const response = await fetch(
                `${touristApiBase}/deleteReview.php?tourist_spot_id=${spot.tourist_spot_id}`,
                {
                    method: 'DELETE',
                    credentials: 'include',
                }
            );
            const data = await response.json();

            if (!response.ok || !data.success) {
                setReviewMessage(data.message || 'レビュー削除に失敗しました。');
                return;
            }

            setRating('5');
            setComment('');
            setReviewMessage(data.message || 'レビューを削除しました。');
            await loadReviews(spot.tourist_spot_id);
        } catch (error) {
            console.error('レビュー削除に失敗しました。', error);
            setReviewMessage('通信に失敗しました。時間をおいて再度お試しください。');
        } finally {
            setIsSubmittingReview(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose}>
            <div className={styles.modalInner}>
                <div className={styles.header}>
                    <div>
                        <p className={styles.label}>Spot Detail</p>
                        <h2>{spot?.name || '観光地詳細'}</h2>
                    </div>
                    <button className={styles.closeButton} type="button" onClick={onClose} aria-label="閉じる">
                        ×
                    </button>
                </div>

                <div className={styles.body}>
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
                                    onClick={handleFavoriteClick}
                                    disabled={isFavoriteLoading}
                                >
                                    {isFavoriteLoading
                                        ? '更新中...'
                                        : isFavorite
                                            ? 'お気に入り解除'
                                            : 'お気に入り追加'}
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

                            <section className={styles.infoSection}>
                                <dl className={styles.detailList}>
                                    <div>
                                        <dt>住所</dt>
                                        <dd>{spot.address || '未登録'}</dd>
                                    </div>
                                    <div>
                                        <dt>カテゴリ</dt>
                                        <dd>{spot.category || spot.type || '未登録'}</dd>
                                    </div>
                                    <div>
                                        <dt>説明</dt>
                                        <dd className={styles.descriptionText}>
                                            {spot.description || '説明はまだ登録されていません。'}
                                        </dd>
                                    </div>
                                </dl>
                            </section>

                            <section className={styles.reviewSection}>
                                <div className={styles.reviewHeader}>
                                    <h3>レビュー</h3>
                                    <p>
                                        {reviewCount}件
                                        {averageRating !== null ? ` / 平均 ${averageRating}` : ''}
                                    </p>
                                </div>

                                {isReviewLoading && (
                                    <div className={styles.status}>レビューを取得しています。</div>
                                )}

                                {!isReviewLoading && reviewMessage && (
                                    <p className={styles.reviewMessage}>{reviewMessage}</p>
                                )}

                                {!isReviewLoading && (
                                    <>
                                        <form className={styles.reviewForm} onSubmit={handleReviewSubmit}>
                                            <label className={styles.formLabel}>
                                                評価
                                                <select
                                                    className={styles.select}
                                                    value={rating}
                                                    onChange={(event) => setRating(event.target.value)}
                                                    disabled={isSubmittingReview}
                                                >
                                                    <option value="5">5</option>
                                                    <option value="4">4</option>
                                                    <option value="3">3</option>
                                                    <option value="2">2</option>
                                                    <option value="1">1</option>
                                                </select>
                                            </label>
                                            <label className={styles.formLabel}>
                                                コメント
                                                <textarea
                                                    className={styles.textarea}
                                                    value={comment}
                                                    onChange={(event) => setComment(event.target.value)}
                                                    rows="4"
                                                    maxLength="1000"
                                                    placeholder="感想を入力してください"
                                                    disabled={isSubmittingReview}
                                                />
                                            </label>
                                            <div className={styles.formActions}>
                                                <button className={styles.submitButton} type="submit" disabled={isSubmittingReview}>
                                                    {isSubmittingReview ? '保存中...' : ownReview ? 'レビュー更新' : 'レビュー投稿'}
                                                </button>
                                                {ownReview && (
                                                    <button
                                                        className={styles.deleteButton}
                                                        type="button"
                                                        onClick={handleReviewDelete}
                                                        disabled={isSubmittingReview}
                                                    >
                                                        削除
                                                    </button>
                                                )}
                                            </div>
                                        </form>

                                        <div className={styles.reviewList}>
                                            {reviews.length === 0 && (
                                                <div className={styles.status}>まだレビューはありません。</div>
                                            )}
                                            {reviews.map((review) => (
                                                <article key={review.review_id} className={styles.reviewCard}>
                                                    <div className={styles.reviewMeta}>
                                                        <strong>{review.user_name}</strong>
                                                        <span>評価 {review.rating}/5</span>
                                                    </div>
                                                    <p>{review.comment || 'コメントはありません。'}</p>
                                                </article>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </section>
                        </div>
                    )}
                </div>
            </div>
        </Modal>
    );
}

export default TouristDetailModal;
