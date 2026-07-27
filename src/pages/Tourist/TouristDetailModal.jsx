/**
 * 観光スポットの詳細をモーダル(ポップアップ)で表示するコンポーネントです。
 * 基本情報の表示に加えて、お気に入りの切り替えとレビューの投稿・更新・削除ができます。
 *
 * 主な流れ:
 * 1. モーダルが開いたら、そのスポットのレビュー一覧・件数・平均評価をAPIから取得する
 * 2. 自分のレビューが既にあればフォームへ反映し、更新・削除もできるようにする
 * 3. お気に入りボタンは親コンポーネントから渡された処理(onToggleFavorite)を呼ぶ
 *
 * 扱うデータ: スポット情報(props)、レビュー一覧、評価・コメントのフォーム入力値。
 */

import { useEffect, useMemo, useState } from 'react';
import Modal from '../../components/Modal/Modal';
import styles from './TouristDetailModal.module.css';

// 観光スポット系PHP APIの共通URL(ベースパス)です。
const touristApiBase = `${import.meta.env.BASE_URL}api/tourist`;

/**
 * TouristDetailModal は、観光スポット詳細モーダルの本体コンポーネントです。
 *
 * props:
 * - isOpen: モーダルを表示するか
 * - spot: 表示するスポットの情報
 * - isLoading / message: 詳細情報の読み込み状態とメッセージ(親が管理)
 * - isFavorite / favoriteMessage / isFavoriteLoading / onToggleFavorite: お気に入り関連(親が管理)
 * - onClose: モーダルを閉じる処理
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
    // localStorage からログインユーザー情報を読み取ります(初回のみ計算)。
    // 「自分のレビュー」を見分けるために user_id が必要です。
    const currentUser = useMemo(() => {
        try {
            return JSON.parse(localStorage.getItem('loginUser') || 'null');
        } catch (error) {
            // JSONが壊れていた場合も画面を止めず、未ログイン扱いにします。
            console.error('ログインユーザー情報の取得に失敗しました。', error);
            return null;
        }
    }, []);
    // ユーザーIDを数値化します(取得できなければ null)。
    const currentUserId = Number(currentUser?.user_id) || null;

    // ===== レビュー関連の state =====
    const [reviews, setReviews] = useState([]);              // レビュー一覧
    const [reviewCount, setReviewCount] = useState(0);       // レビュー件数
    const [averageRating, setAverageRating] = useState(null); // 平均評価(0件なら null)
    const [reviewMessage, setReviewMessage] = useState('');  // レビュー関連のメッセージ
    const [isReviewLoading, setIsReviewLoading] = useState(false);     // 一覧取得中フラグ
    const [isSubmittingReview, setIsSubmittingReview] = useState(false); // 投稿・削除の処理中フラグ
    const [rating, setRating] = useState('5');               // フォームの評価(select用に文字列)
    const [comment, setComment] = useState('');              // フォームのコメント

    // レビュー一覧から自分の投稿を探します(無ければ null = 新規投稿モード)。
    const ownReview = reviews.find((review) => review.user_id === currentUserId) || null;

    /**
     * 指定スポットのレビュー一覧・件数・平均評価をAPIから取得します。
     */
    const loadReviews = async (touristSpotId) => {
        setIsReviewLoading(true);
        setReviewMessage('');

        try {
            // スポットIDをクエリパラメータにしてAPIを呼びます。
            const params = new URLSearchParams({ tourist_spot_id: String(touristSpotId) });
            const response = await fetch(`${touristApiBase}/getReviews.php?${params.toString()}`);
            const data = await response.json();

            // APIがエラーを返した場合は表示をリセットしてメッセージを出します。
            if (!response.ok || !data.success) {
                setReviews([]);
                setReviewCount(0);
                setAverageRating(null);
                setReviewMessage(data.message || 'レビューの取得に失敗しました。');
                return;
            }

            // 取得結果を state へ反映します(配列でない場合に備えて確認します)。
            setReviews(Array.isArray(data.reviews) ? data.reviews : []);
            setReviewCount(data.review_count || 0);
            setAverageRating(data.average_rating ?? null);
        } catch (error) {
            // 通信自体の失敗(オフライン等)の場合も表示をリセットします。
            console.error('レビューの取得に失敗しました。', error);
            setReviews([]);
            setReviewCount(0);
            setAverageRating(null);
            setReviewMessage('通信に失敗しました。時間をおいて再度お試しください。');
        } finally {
            setIsReviewLoading(false);
        }
    };

    // モーダルが開いたとき(またはスポットが変わったとき)にレビューを読み込みます。
    useEffect(() => {
        // 閉じている・スポット未指定なら何もしません。
        if (!isOpen || !spot?.tourist_spot_id) {
            return;
        }

        // setTimeout(0) で描画完了後に実行し、描画のブロックを避けます。
        const timerId = window.setTimeout(() => {
            loadReviews(spot.tourist_spot_id);
        }, 0);

        // モーダルが閉じられたら、実行前のタイマーを取り消します。
        return () => window.clearTimeout(timerId);
    }, [isOpen, spot?.tourist_spot_id]);

    // モーダルの開閉や自分のレビュー有無に応じて、フォームの内容を整えます。
    useEffect(() => {
        const timerId = window.setTimeout(() => {
            // 閉じたとき: フォームとレビュー表示をすべて初期状態へ戻します。
            if (!isOpen) {
                setRating('5');
                setComment('');
                setReviewMessage('');
                setReviews([]);
                setReviewCount(0);
                setAverageRating(null);
                return;
            }

            // 自分のレビューが既にある場合: その内容をフォームへ反映します(編集モード)。
            if (ownReview) {
                setRating(String(ownReview.rating || 5));
                setComment(ownReview.comment || '');
                return;
            }

            // 自分のレビューが無い場合: フォームを新規投稿用の初期値にします。
            setRating('5');
            setComment('');
        }, 0);

        return () => window.clearTimeout(timerId);
    }, [isOpen, ownReview]);

    /**
     * お気に入りボタンを押したときの処理です。
     * 実際の追加・解除は親コンポーネントの onToggleFavorite が行います。
     */
    const handleFavoriteClick = async () => {
        if (!spot?.tourist_spot_id) {
            return;
        }

        await onToggleFavorite(spot.tourist_spot_id);
    };

    /**
     * レビューフォームの送信処理です。
     * 自分のレビューが既にあれば更新API(PUT)、無ければ新規投稿API(POST)を呼びます。
     */
    const handleReviewSubmit = async (event) => {
        // フォーム送信によるページリロードを防ぎます。
        event.preventDefault();

        if (!spot?.tourist_spot_id) {
            return;
        }

        setIsSubmittingReview(true);
        setReviewMessage('');

        try {
            // APIへ送るデータを組み立てます(評価は数値へ変換)。
            const payload = {
                tourist_spot_id: spot.tourist_spot_id,
                rating: Number(rating),
                comment,
            };

            // 既存レビューの有無で、呼ぶAPIとHTTPメソッドを切り替えます。
            const response = await fetch(
                ownReview ? `${touristApiBase}/updateReview.php` : `${touristApiBase}/addReview.php`,
                {
                    method: ownReview ? 'PUT' : 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    credentials: 'include', // セッションCookieを送ってログイン状態を伝えます。
                    body: JSON.stringify(payload),
                }
            );
            const data = await response.json();

            // 失敗時はAPIのメッセージを表示します。
            if (!response.ok || !data.success) {
                setReviewMessage(data.message || 'レビューの保存に失敗しました。');
                return;
            }

            // 成功時はメッセージを表示し、一覧を取り直して最新化します。
            setReviewMessage(data.message || 'レビューを保存しました。');
            await loadReviews(spot.tourist_spot_id);
        } catch (error) {
            console.error('レビューの保存に失敗しました。', error);
            setReviewMessage('通信に失敗しました。時間をおいて再度お試しください。');
        } finally {
            setIsSubmittingReview(false);
        }
    };

    /**
     * 自分のレビューを削除する処理です。
     */
    const handleReviewDelete = async () => {
        // スポット未指定、または自分のレビューが無ければ何もしません。
        if (!spot?.tourist_spot_id || !ownReview) {
            return;
        }

        setIsSubmittingReview(true);
        setReviewMessage('');

        try {
            // 削除APIをDELETEメソッドで呼びます(対象はクエリパラメータで指定)。
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

            // 削除成功: フォームを初期化し、一覧を取り直します。
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
                {/* ===== ヘッダー(スポット名と閉じるボタン) ===== */}
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
                    {/* 読み込み中の表示 */}
                    {isLoading && (
                        <div className={styles.status}>詳細情報を取得しています。</div>
                    )}

                    {/* エラーメッセージ等の表示(親から渡されます) */}
                    {!isLoading && message && (
                        <div className={styles.status}>{message}</div>
                    )}

                    {/* ===== スポット詳細の本体(データが揃ったときだけ表示) ===== */}
                    {!isLoading && !message && spot && (
                        <div className={styles.content}>
                            {/* スポット画像(登録されている場合のみ) */}
                            {spot.image_url && (
                                <img className={styles.image} src={spot.image_url} alt={spot.name} />
                            )}

                            {/* ===== お気に入りボタン ===== */}
                            <div className={styles.actions}>
                                <button
                                    // お気に入り済みなら強調用のCSSクラスを追加します。
                                    className={`${styles.favoriteButton} ${isFavorite ? styles.favoriteActive : ''}`}
                                    type="button"
                                    onClick={handleFavoriteClick}
                                    disabled={isFavoriteLoading}
                                >
                                    {/* 処理中 → 状態に応じた文言 の順で表示を切り替えます */}
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

                            {/* ===== 概要(都道府県・市区町村・カテゴリ) ===== */}
                            <div className={styles.summary}>
                                <span>{spot.prefecture || '都道府県未設定'}</span>
                                <span>{spot.city || '市区町村未設定'}</span>
                                <span>{spot.category || spot.type || 'カテゴリ未設定'}</span>
                            </div>

                            {/* ===== 詳細情報(住所・カテゴリ・説明) ===== */}
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

                            {/* ===== レビューセクション ===== */}
                            <section className={styles.reviewSection}>
                                {/* 見出しと件数・平均評価 */}
                                <div className={styles.reviewHeader}>
                                    <h3>レビュー</h3>
                                    <p>
                                        {reviewCount}件
                                        {averageRating !== null ? ` / 平均 ${averageRating}` : ''}
                                    </p>
                                </div>

                                {/* レビュー読み込み中の表示 */}
                                {isReviewLoading && (
                                    <div className={styles.status}>レビューを取得しています。</div>
                                )}

                                {/* レビュー関連のメッセージ(成功・失敗どちらも) */}
                                {!isReviewLoading && reviewMessage && (
                                    <p className={styles.reviewMessage}>{reviewMessage}</p>
                                )}

                                {!isReviewLoading && (
                                    <>
                                        {/* ===== レビュー投稿・編集フォーム ===== */}
                                        <form className={styles.reviewForm} onSubmit={handleReviewSubmit}>
                                            <label className={styles.formLabel}>
                                                評価
                                                {/* 星評価(1〜5)の選択です */}
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
                                                {/* コメント入力欄(最大1000文字。API側の上限と合わせています) */}
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
                                                {/* 自分のレビュー有無でボタンの文言が変わります */}
                                                <button className={styles.submitButton} type="submit" disabled={isSubmittingReview}>
                                                    {isSubmittingReview ? '保存中...' : ownReview ? 'レビュー更新' : 'レビュー投稿'}
                                                </button>
                                                {/* 削除ボタンは自分のレビューがあるときだけ表示します */}
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

                                        {/* ===== レビュー一覧 ===== */}
                                        <div className={styles.reviewList}>
                                            {/* 0件のときの表示 */}
                                            {reviews.length === 0 && (
                                                <div className={styles.status}>まだレビューはありません。</div>
                                            )}
                                            {/* レビューを1件ずつカードで表示します */}
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
