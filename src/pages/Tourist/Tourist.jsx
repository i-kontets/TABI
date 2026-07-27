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

import { useCallback, useEffect, useState } from 'react';
import Header from '../../components/header/Header';
import BottomNav from '../../components/bottomNav/BottomNav';
import SearchBar from './SearchBar';
import TouristCard from './TouristCard';
import TouristDetailModal from './TouristDetailModal';
import styles from './Tourist.module.css';

const touristApiBase = `${import.meta.env.BASE_URL}api/tourist`;

/**
 * Tourist は、このファイルの中心となる処理をまとめた関数です。
 * 画面から渡された値や API の結果を使い、次に表示する内容を決めます。
 */

function Tourist() {
    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const [spots, setSpots] = useState([]);
    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const [city, setCity] = useState('京都');
    const [message, setMessage] = useState('地域名を入力して観光地を検索してください。');
    const [isLoading, setIsLoading] = useState(false);
    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const [selectedSpot, setSelectedSpot] = useState(null);
    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const [detailMessage, setDetailMessage] = useState('');
    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const [isDetailLoading, setIsDetailLoading] = useState(false);
    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const [favoriteIds, setFavoriteIds] = useState(new Set());
    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const [favoriteMessage, setFavoriteMessage] = useState('');
    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const [isFavoriteLoading, setIsFavoriteLoading] = useState(false);

    const fetchFavoriteIds = useCallback(async () => {
        try {
            const response = await fetch(`${touristApiBase}/getFavorites.php`, {
                credentials: 'include',
            });
            const data = await response.json();

            if (response.status === 401) {
                setFavoriteIds(new Set());
                return;
            }

            if (!response.ok || !data.success) {
                return;
            }

            setFavoriteIds(new Set((data.favorites || []).map((favorite) => favorite.tourist_spot_id)));
        } catch (error) {
            console.error('お気に入り一覧の取得に失敗しました。', error);
        }
    }, []);

    const fetchTouristSpots = useCallback(async (keyword) => {
        const searchCity = keyword.trim();

        // ここで条件を確認し、状況に合う処理だけを実行します。
        if (!searchCity) {
            setSpots([]);
            setCity('');
            setMessage('地域名を入力してください。');
            return;
        }

        setIsLoading(true);
        setMessage('');

        // API 通信やデータ処理で失敗する可能性があるため、例外を受け取れる形で実行します。
        try {
            const params = new URLSearchParams({ city: searchCity });
            const response = await fetch(`${touristApiBase}/getTouristSpots.php?${params.toString()}`);
            const data = await response.json();

            if (!response.ok || !data.success) {
                setSpots([]);
                setCity(searchCity);
                setMessage(data.message || '観光地の取得に失敗しました。');
                return;
            }

            setSpots(Array.isArray(data.spots) ? data.spots : []);
            setCity(data.city || searchCity);
            setMessage(data.message || '');
        // エラーが起きた場合は、画面にメッセージを出すなど安全な処理に切り替えます。
        } catch (error) {
            console.error('観光地の取得に失敗しました。', error);
            setSpots([]);
            setCity(searchCity);
            setMessage('通信に失敗しました。時間をおいて再度お試しください。');
        // 成功・失敗に関係なく最後に必要な後片付けを行います。
        } finally {
            setIsLoading(false);
        }
    }, []);

    const openSpotDetail = useCallback(async (spot) => {
        setSelectedSpot(spot);
        setDetailMessage('');
        setFavoriteMessage('');
        setIsDetailLoading(true);

        // API 通信やデータ処理で失敗する可能性があるため、例外を受け取れる形で実行します。
        try {
            const params = new URLSearchParams({ id: String(spot.tourist_spot_id) });
            const response = await fetch(`${touristApiBase}/getTouristSpotDetail.php?${params.toString()}`);
            const data = await response.json();

            if (!response.ok || !data.success) {
                setDetailMessage(data.message || '観光地詳細の取得に失敗しました。');
                return;
            }

            setSelectedSpot(data.spot || spot);
        } catch (error) {
            console.error('観光地詳細の取得に失敗しました。', error);
            setDetailMessage('通信に失敗しました。時間をおいて再度お試しください。');
        // 成功・失敗に関係なく最後に必要な後片付けを行います。
        } finally {
            setIsDetailLoading(false);
        }
    }, []);

    const toggleFavorite = useCallback(async (spotId) => {
        if (!spotId || isFavoriteLoading) {
            return false;
        }

        const isFavorite = favoriteIds.has(spotId);

        setIsFavoriteLoading(true);
        setFavoriteMessage('');

        // API 通信やデータ処理で失敗する可能性があるため、例外を受け取れる形で実行します。
        try {
            // バックエンド API へ通信し、画面で使うデータの取得や保存を依頼します。
            const response = await fetch(
                isFavorite
                    ? `${touristApiBase}/removeFavorite.php?tourist_spot_id=${spotId}`
                    : `${touristApiBase}/addFavorite.php`,
                {
                    method: isFavorite ? 'DELETE' : 'POST',
                    headers: isFavorite ? undefined : {
                        'Content-Type': 'application/json',
                    },
                    credentials: 'include',
                    body: isFavorite ? undefined : JSON.stringify({
                        tourist_spot_id: spotId,
                    }),
                }
            );
            const data = await response.json();

            // ここで条件を確認し、状況に合う処理だけを実行します。
            if (!response.ok || !data.success) {
                setFavoriteMessage(data.message || 'お気に入り更新に失敗しました。');
                return false;
            }

            setFavoriteIds((currentIds) => {
                const nextIds = new Set(currentIds);

                // ここで条件を確認し、状況に合う処理だけを実行します。
                if (isFavorite) {
                    nextIds.delete(spotId);
                } else {
                    nextIds.add(spotId);
                }

                return nextIds;
            });
            setFavoriteMessage(data.message || 'お気に入りを更新しました。');
            return true;
        } catch (error) {
            console.error('お気に入り更新に失敗しました。', error);
            setFavoriteMessage('通信に失敗しました。時間をおいて再度お試しください。');
            return false;
        } finally {
            setIsFavoriteLoading(false);
        }
    }, [favoriteIds, isFavoriteLoading]);

    const handleCardFavoriteToggle = useCallback(async (spotId) => {
        await toggleFavorite(spotId);
    }, [toggleFavorite]);

    const closeDetailModal = useCallback(() => {
        setSelectedSpot(null);
        setDetailMessage('');
        setFavoriteMessage('');
        setIsDetailLoading(false);
        setIsFavoriteLoading(false);
    }, []);

    useEffect(() => {
        const timerId = window.setTimeout(() => {
            fetchFavoriteIds();
            fetchTouristSpots('京都');
        }, 0);

        return () => window.clearTimeout(timerId);
    }, [fetchFavoriteIds, fetchTouristSpots]);

    return (
        <>
            <Header tripName="観光地検索" />
            <main className={styles.page}>
                <section className={styles.searchSection}>
                    <div className={styles.headingGroup}>
                        <p className={styles.label}>Tourist Spots</p>
                        <h1>観光地を探す</h1>
                        <p>地域名で検索して、気になる観光地の詳細やレビューを確認できます。</p>
                    </div>
                    <SearchBar key={city || 'kyoto'} initialValue={city || '京都'} onSearch={fetchTouristSpots} />
                </section>

                <section className={styles.section}>
                    <div className={styles.sectionHeader}>
                        <h2>{city ? `${city}の検索結果` : '検索結果'}</h2>
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
                                    isFavorite={favoriteIds.has(spot.tourist_spot_id)}
                                    isFavoriteLoading={isFavoriteLoading}
                                    onSelect={openSpotDetail}
                                    onToggleFavorite={handleCardFavoriteToggle}
                                />
                            ))}
                        </div>
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
                onClose={closeDetailModal}
            />
            <BottomNav />
        </>
    );
}

export default Tourist;
