import { useCallback, useEffect, useState } from 'react';
import Header from '../../components/header/Header';
import BottomNav from '../../components/bottomNav/BottomNav';
import SearchBar from './SearchBar';
import TouristCard from './TouristCard';
import TouristDetailModal from './TouristDetailModal';
import styles from './Tourist.module.css';

const touristApiBase = `${import.meta.env.BASE_URL}api/tourist`;
const rankingOptions = [
    { id: 'overall', label: '総合' },
    { id: 'rating', label: '評価' },
    { id: 'favorite', label: 'お気に入り' },
];

function Tourist() {
    const [spots, setSpots] = useState([]);
    const [keyword, setKeyword] = useState('');
    const [prefecture, setPrefecture] = useState('');
    const [rankingType, setRankingType] = useState('overall');
    const [prefectures, setPrefectures] = useState([]);
    const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
    const [message, setMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [selectedSpot, setSelectedSpot] = useState(null);
    const [detailMessage, setDetailMessage] = useState('');
    const [isDetailLoading, setIsDetailLoading] = useState(false);
    const [favoriteIds, setFavoriteIds] = useState(new Set());
    const [favoriteMessage, setFavoriteMessage] = useState('');
    const [isFavoriteLoading, setIsFavoriteLoading] = useState(false);

    const fetchFavoriteIds = useCallback(async () => {
        try {
            const response = await fetch(`${touristApiBase}/getFavorites.php`, { credentials: 'include' });
            const data = await response.json();

            if (response.status === 401) {
                setFavoriteIds(new Set());
            } else if (response.ok && data.success) {
                setFavoriteIds(new Set((data.favorites || []).map((favorite) => favorite.tourist_spot_id)));
            }
        } catch (error) {
            console.error('お気に入り一覧の取得に失敗しました。', error);
        }
    }, []);

    const fetchRankings = useCallback(async () => {
        setIsLoading(true);
        setMessage('');

        try {
            const params = new URLSearchParams({
                ranking: rankingType,
                prefecture,
                keyword,
                page: String(pagination.page),
                limit: String(pagination.limit),
            });
            const response = await fetch(`${touristApiBase}/getTouristRankings.php?${params.toString()}`);
            const data = await response.json();

            if (!response.ok || !data.success) {
                setSpots([]);
                setMessage(data.message || '観光地ランキングの取得に失敗しました。');
                return;
            }

            const nextSpots = Array.isArray(data.spots) ? data.spots : [];
            const nextPagination = data.pagination || {};
            setSpots(nextSpots);
            setPrefectures(Array.isArray(data.filters?.prefectures) ? data.filters.prefectures : []);
            setPagination((current) => ({
                ...current,
                page: Number(nextPagination.page) || 1,
                total: Number(nextPagination.total) || 0,
                totalPages: Number(nextPagination.total_pages) || 0,
            }));
            setMessage(nextSpots.length === 0 ? '条件に一致する観光地がありません。' : '');
        } catch (error) {
            console.error('観光地ランキングの取得に失敗しました。', error);
            setSpots([]);
            setMessage('通信に失敗しました。時間をおいて再度お試しください。');
        } finally {
            setIsLoading(false);
        }
    }, [keyword, pagination.limit, pagination.page, prefecture, rankingType]);

    const openSpotDetail = useCallback(async (spot) => {
        setSelectedSpot(spot);
        setDetailMessage('');
        setFavoriteMessage('');
        setIsDetailLoading(true);

        try {
            const params = new URLSearchParams({ id: String(spot.tourist_spot_id) });
            const response = await fetch(`${touristApiBase}/getTouristSpotDetail.php?${params.toString()}`);
            const data = await response.json();

            if (!response.ok || !data.success) {
                setDetailMessage(data.message || '観光地詳細の取得に失敗しました。');
                return;
            }
            setSelectedSpot({ ...spot, ...(data.spot || {}) });
        } catch (error) {
            console.error('観光地詳細の取得に失敗しました。', error);
            setDetailMessage('通信に失敗しました。時間をおいて再度お試しください。');
        } finally {
            setIsDetailLoading(false);
        }
    }, []);

    const toggleFavorite = useCallback(async (spotId) => {
        if (!spotId || isFavoriteLoading) return false;

        const isFavorite = favoriteIds.has(spotId);
        setIsFavoriteLoading(true);
        setFavoriteMessage('');

        try {
            const response = await fetch(
                isFavorite
                    ? `${touristApiBase}/removeFavorite.php?tourist_spot_id=${spotId}`
                    : `${touristApiBase}/addFavorite.php`,
                {
                    method: isFavorite ? 'DELETE' : 'POST',
                    headers: isFavorite ? undefined : { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: isFavorite ? undefined : JSON.stringify({ tourist_spot_id: spotId }),
                }
            );
            const data = await response.json();

            if (!response.ok || !data.success) {
                setFavoriteMessage(data.message || 'お気に入り更新に失敗しました。');
                return false;
            }

            setFavoriteIds((currentIds) => {
                const nextIds = new Set(currentIds);
                if (isFavorite) nextIds.delete(spotId);
                else nextIds.add(spotId);
                return nextIds;
            });
            setFavoriteMessage(data.message || 'お気に入りを更新しました。');
            await fetchRankings();
            return true;
        } catch (error) {
            console.error('お気に入り更新に失敗しました。', error);
            setFavoriteMessage('通信に失敗しました。時間をおいて再度お試しください。');
            return false;
        } finally {
            setIsFavoriteLoading(false);
        }
    }, [favoriteIds, fetchRankings, isFavoriteLoading]);

    const handleSearch = useCallback((nextKeyword) => {
        setPagination((current) => ({ ...current, page: 1 }));
        setKeyword(nextKeyword);
    }, []);

    const handleRankingChange = (nextRanking) => {
        setPagination((current) => ({ ...current, page: 1 }));
        setRankingType(nextRanking);
    };

    const handlePrefectureChange = (event) => {
        setPagination((current) => ({ ...current, page: 1 }));
        setPrefecture(event.target.value);
    };

    const closeDetailModal = useCallback(() => {
        setSelectedSpot(null);
        setDetailMessage('');
        setFavoriteMessage('');
        setIsDetailLoading(false);
        setIsFavoriteLoading(false);
    }, []);

    useEffect(() => {
        const timerId = window.setTimeout(fetchFavoriteIds, 0);
        return () => window.clearTimeout(timerId);
    }, [fetchFavoriteIds]);

    useEffect(() => {
        const timerId = window.setTimeout(fetchRankings, 0);
        return () => window.clearTimeout(timerId);
    }, [fetchRankings]);

    const rankingLabel = rankingOptions.find((option) => option.id === rankingType)?.label || '総合';
    const areaLabel = prefecture || '全国';

    return (
        <>
            <Header tripName="観光地ランキング" isOther={true} />
            <main className={styles.page}>
                <section className={styles.searchSection}>
                    <div className={styles.headingGroup}>
                        <p className={styles.label}>TABI Tourist Ranking</p>
                        <h1>観光地ランキング</h1>
                        <p>みんなの評価とお気に入りから、次に行きたい観光地を見つけよう。</p>
                    </div>

                    <div className={styles.rankingTabs} aria-label="ランキング種別">
                        {rankingOptions.map((option) => (
                            <button
                                key={option.id}
                                type="button"
                                className={rankingType === option.id ? styles.activeRankingTab : ''}
                                onClick={() => handleRankingChange(option.id)}
                            >
                                {option.label}
                            </button>
                        ))}
                    </div>

                    <label className={styles.prefectureField}>
                        <span>都道府県</span>
                        <select value={prefecture} onChange={handlePrefectureChange}>
                            <option value="">全国</option>
                            {prefectures.map((name) => <option key={name} value={name}>{name}</option>)}
                        </select>
                    </label>

                    <SearchBar initialValue="" onSearch={handleSearch} />
                </section>

                <section className={styles.section}>
                    <div className={styles.sectionHeader}>
                        <div>
                            <p>{areaLabel}</p>
                            <h2>{rankingLabel}ランキング</h2>
                        </div>
                        <span>{pagination.total}件</span>
                    </div>

                    {keyword && <p className={styles.searchCondition}>「{keyword}」の検索結果</p>}
                    {isLoading && <div className={styles.statusBox}>ランキングを取得しています。</div>}
                    {!isLoading && message && <div className={styles.statusBox}>{message}</div>}

                    {!isLoading && !message && (
                        <div className={styles.cardList}>
                            {spots.map((spot) => (
                                <TouristCard
                                    key={spot.tourist_spot_id}
                                    spot={spot}
                                    isFavorite={favoriteIds.has(spot.tourist_spot_id)}
                                    isFavoriteLoading={isFavoriteLoading}
                                    onSelect={openSpotDetail}
                                    onToggleFavorite={toggleFavorite}
                                />
                            ))}
                        </div>
                    )}

                    {pagination.totalPages > 1 && (
                        <nav className={styles.pagination} aria-label="ランキングのページ">
                            <button type="button" disabled={pagination.page <= 1 || isLoading} onClick={() => setPagination((current) => ({ ...current, page: current.page - 1 }))}>前へ</button>
                            <span>{pagination.page} / {pagination.totalPages}</span>
                            <button type="button" disabled={pagination.page >= pagination.totalPages || isLoading} onClick={() => setPagination((current) => ({ ...current, page: current.page + 1 }))}>次へ</button>
                        </nav>
                    )}
                </section>
            </main>
            <TouristDetailModal
                isOpen={selectedSpot !== null}
                spot={selectedSpot}
                isLoading={isDetailLoading}
                message={detailMessage}
                isFavorite={selectedSpot ? favoriteIds.has(selectedSpot.tourist_spot_id) : false}
                favoriteMessage={favoriteMessage}
                isFavoriteLoading={isFavoriteLoading}
                onToggleFavorite={toggleFavorite}
                onReviewChanged={fetchRankings}
                onClose={closeDetailModal}
            />
            <BottomNav />
        </>
    );
}

export default Tourist;
