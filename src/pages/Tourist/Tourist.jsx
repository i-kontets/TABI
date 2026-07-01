import { useCallback, useState } from 'react';
import Header from '../../components/header/Header';
import BottomNav from '../../components/bottomNav/BottomNav';
import SearchBar from './SearchBar';
import TouristCard from './TouristCard';
import TouristDetailModal from './TouristDetailModal';
import styles from './Tourist.module.css';

function Tourist() {
    const [spots, setSpots] = useState([]);
    const [city, setCity] = useState('京都');
    const [message, setMessage] = useState('地域名を入力して検索してください。');
    const [isLoading, setIsLoading] = useState(false);
    const [selectedSpot, setSelectedSpot] = useState(null);
    const [detailMessage, setDetailMessage] = useState('');
    const [isDetailLoading, setIsDetailLoading] = useState(false);
    const [favoriteIds, setFavoriteIds] = useState(new Set());
    const [favoriteMessage, setFavoriteMessage] = useState('');
    const [isFavoriteLoading, setIsFavoriteLoading] = useState(false);

    const fetchTouristSpots = useCallback(async (keyword) => {
        const searchCity = keyword.trim();

        if (!searchCity) {
            return;
        }

        setIsLoading(true);
        setMessage('');

        try {
            const params = new URLSearchParams({ city: searchCity });
            const response = await fetch(`${import.meta.env.BASE_URL}api/tourist/getTouristSpots.php?${params.toString()}`);
            const data = await response.json();

            if (!data.success) {
                setSpots([]);
                setCity(searchCity);
                setMessage(data.message || '観光地を取得できませんでした。');
                return;
            }

            setSpots(data.spots || []);
            setCity(data.city || searchCity);
            setMessage(data.message || '');
        } catch (error) {
            console.error('観光地取得エラー:', error);
            setSpots([]);
            setCity(searchCity);
            setMessage('通信に失敗しました。時間をおいて再度お試しください。');
        } finally {
            setIsLoading(false);
        }
    }, []);

    const fetchFavoriteIds = useCallback(async () => {
        setIsFavoriteLoading(true);
        setFavoriteMessage('');

        try {
            const response = await fetch(`${import.meta.env.BASE_URL}api/tourist/getFavorites.php`, {
                credentials: 'include',
            });
            const data = await response.json();

            if (response.status === 401) {
                setFavoriteIds(new Set());
                setFavoriteMessage('ログインするとお気に入り登録できます。');
                return;
            }

            if (!response.ok || !data.success) {
                setFavoriteMessage(data.message || 'お気に入り状態を取得できませんでした。');
                return;
            }

            setFavoriteIds(new Set((data.favorites || []).map((favorite) => favorite.tourist_spot_id)));
            setFavoriteMessage('');
        } catch (error) {
            console.error('お気に入り一覧取得エラー:', error);
            setFavoriteMessage('お気に入り状態を取得できませんでした。');
        } finally {
            setIsFavoriteLoading(false);
        }
    }, []);

    const fetchTouristSpotDetail = useCallback(async (spot) => {
        setSelectedSpot(spot);
        setDetailMessage('');
        setFavoriteMessage('');
        setIsDetailLoading(true);
        fetchFavoriteIds();

        try {
            const params = new URLSearchParams({ id: spot.tourist_spot_id });
            const response = await fetch(`${import.meta.env.BASE_URL}api/tourist/getTouristSpotDetail.php?${params.toString()}`);
            const data = await response.json();

            if (!data.success) {
                setDetailMessage(data.message || '観光地の詳細を取得できませんでした。');
                return;
            }

            setSelectedSpot(data.spot);
        } catch (error) {
            console.error('観光地詳細取得エラー:', error);
            setDetailMessage('通信に失敗しました。時間をおいて再度お試しください。');
        } finally {
            setIsDetailLoading(false);
        }
    }, [fetchFavoriteIds]);

    const toggleFavorite = useCallback(async () => {
        if (!selectedSpot || isFavoriteLoading) {
            return;
        }

        const touristSpotId = selectedSpot.tourist_spot_id;
        const isFavorite = favoriteIds.has(touristSpotId);

        setIsFavoriteLoading(true);
        setFavoriteMessage('');

        try {
            const response = await fetch(
                isFavorite
                    ? `${import.meta.env.BASE_URL}api/tourist/removeFavorite.php?tourist_spot_id=${touristSpotId}`
                    : `${import.meta.env.BASE_URL}api/tourist/addFavorite.php`,
                {
                    method: isFavorite ? 'DELETE' : 'POST',
                    headers: isFavorite ? undefined : {
                        'Content-Type': 'application/json',
                    },
                    credentials: 'include',
                    body: isFavorite ? undefined : JSON.stringify({
                        tourist_spot_id: touristSpotId,
                    }),
                }
            );
            const data = await response.json();

            if (!response.ok || !data.success) {
                setFavoriteMessage(data.message || 'お気に入りの更新に失敗しました。');
                return;
            }

            setFavoriteIds((currentIds) => {
                const nextIds = new Set(currentIds);

                if (isFavorite) {
                    nextIds.delete(touristSpotId);
                } else {
                    nextIds.add(touristSpotId);
                }

                return nextIds;
            });
            setFavoriteMessage(data.message || 'お気に入りを更新しました。');
        } catch (error) {
            console.error('お気に入り更新エラー:', error);
            setFavoriteMessage('通信に失敗しました。時間をおいて再度お試しください。');
        } finally {
            setIsFavoriteLoading(false);
        }
    }, [favoriteIds, isFavoriteLoading, selectedSpot]);

    const closeDetailModal = () => {
        setSelectedSpot(null);
        setDetailMessage('');
        setFavoriteMessage('');
        setIsDetailLoading(false);
        setIsFavoriteLoading(false);
    };

    return (
        <>
            <Header tripName="観光地検索" />
            <main className={styles.page}>
                <section className={styles.searchSection}>
                    <div className={styles.headingGroup}>
                        <p className={styles.label}>Tourist Spots</p>
                        <h1>観光地を探す</h1>
                        <p>行きたい地域を入力して、観光スポットを一覧で確認できます。</p>
                    </div>
                    <SearchBar onSearch={fetchTouristSpots} />
                </section>

                <section className={styles.section}>
                    <div className={styles.sectionHeader}>
                        <h2>{city}の検索結果</h2>
                        <span>{spots.length}件</span>
                    </div>

                    {isLoading && (
                        <div className={styles.statusBox}>観光地を取得しています。</div>
                    )}

                    {!isLoading && message && (
                        <div className={styles.statusBox}>{message}</div>
                    )}

                    {!isLoading && !message && (
                        <div className={styles.cardList}>
                            {spots.map((spot) => (
                                <TouristCard
                                    key={spot.tourist_spot_id}
                                    spot={spot}
                                    onSelect={fetchTouristSpotDetail}
                                />
                            ))}
                        </div>
                    )}
                </section>

                <section className={styles.section}>
                    <div className={styles.sectionHeader}>
                        <h2>人気ランキング</h2>
                    </div>
                    <div className={styles.todoBox}>
                        人気ランキングAPI完成後に表示
                    </div>
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
                onClose={closeDetailModal}
            />
            <BottomNav />
        </>
    );
}

export default Tourist;
