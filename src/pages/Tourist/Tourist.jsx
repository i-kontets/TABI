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
import { useCallback, useState } from 'react';
import Header from '../../components/header/Header';
import BottomNav from '../../components/bottomNav/BottomNav';
import SearchBar from './SearchBar';
import TouristCard from './TouristCard';
import TouristDetailModal from './TouristDetailModal';
import styles from './Tourist.module.css';

/**
 * Tourist は、このファイルの中心となる処理をまとめた関数です。
 * 画面から渡された値や API の結果を使い、次に表示する内容を決めます。
 */
function Tourist() {
    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const [spots, setSpots] = useState([]);
    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const [city, setCity] = useState('京都');
    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const [message, setMessage] = useState('地域名を入力して検索してください。');
    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
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

    const fetchTouristSpots = useCallback(async (keyword) => {
        const searchCity = keyword.trim();

        // ここで条件を確認し、状況に合う処理だけを実行します。
        if (!searchCity) {
            return;
        }

        setIsLoading(true);
        setMessage('');

        // API 通信やデータ処理で失敗する可能性があるため、例外を受け取れる形で実行します。
        try {
            const params = new URLSearchParams({ city: searchCity });
            // バックエンド API へ通信し、画面で使うデータの取得や保存を依頼します。
            const response = await fetch(`${import.meta.env.BASE_URL}api/tourist/getTouristSpots.php?${params.toString()}`);
            const data = await response.json();

            // ここで条件を確認し、状況に合う処理だけを実行します。
            if (!data.success) {
                setSpots([]);
                setCity(searchCity);
                setMessage(data.message || '観光地を取得できませんでした。');
                return;
            }

            setSpots(data.spots || []);
            setCity(data.city || searchCity);
            setMessage(data.message || '');
        // エラーが起きた場合は、画面にメッセージを出すなど安全な処理に切り替えます。
        } catch (error) {
            console.error('観光地取得エラー:', error);
            setSpots([]);
            setCity(searchCity);
            setMessage('通信に失敗しました。時間をおいて再度お試しください。');
        // 成功・失敗に関係なく最後に必要な後片付けを行います。
        } finally {
            setIsLoading(false);
        }
    }, []);

    const fetchFavoriteIds = useCallback(async () => {
        setIsFavoriteLoading(true);
        setFavoriteMessage('');

        // API 通信やデータ処理で失敗する可能性があるため、例外を受け取れる形で実行します。
        try {
            // バックエンド API へ通信し、画面で使うデータの取得や保存を依頼します。
            const response = await fetch(`${import.meta.env.BASE_URL}api/tourist/getFavorites.php`, {
                credentials: 'include',
            });
            const data = await response.json();

            // ここで条件を確認し、状況に合う処理だけを実行します。
            if (response.status === 401) {
                setFavoriteIds(new Set());
                setFavoriteMessage('ログインするとお気に入り登録できます。');
                return;
            }

            // ここで条件を確認し、状況に合う処理だけを実行します。
            if (!response.ok || !data.success) {
                setFavoriteMessage(data.message || 'お気に入り状態を取得できませんでした。');
                return;
            }

            // 配列のデータを1件ずつ画面表示用の形に変換します。
            setFavoriteIds(new Set((data.favorites || []).map((favorite) => favorite.tourist_spot_id)));
            setFavoriteMessage('');
        // エラーが起きた場合は、画面にメッセージを出すなど安全な処理に切り替えます。
        } catch (error) {
            console.error('お気に入り一覧取得エラー:', error);
            setFavoriteMessage('お気に入り状態を取得できませんでした。');
        // 成功・失敗に関係なく最後に必要な後片付けを行います。
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

        // API 通信やデータ処理で失敗する可能性があるため、例外を受け取れる形で実行します。
        try {
            const params = new URLSearchParams({ id: spot.tourist_spot_id });
            // バックエンド API へ通信し、画面で使うデータの取得や保存を依頼します。
            const response = await fetch(`${import.meta.env.BASE_URL}api/tourist/getTouristSpotDetail.php?${params.toString()}`);
            const data = await response.json();

            // ここで条件を確認し、状況に合う処理だけを実行します。
            if (!data.success) {
                setDetailMessage(data.message || '観光地の詳細を取得できませんでした。');
                return;
            }

            setSelectedSpot(data.spot);
        // エラーが起きた場合は、画面にメッセージを出すなど安全な処理に切り替えます。
        } catch (error) {
            console.error('観光地詳細取得エラー:', error);
            setDetailMessage('通信に失敗しました。時間をおいて再度お試しください。');
        // 成功・失敗に関係なく最後に必要な後片付けを行います。
        } finally {
            setIsDetailLoading(false);
        }
    }, [fetchFavoriteIds]);

    const toggleFavorite = useCallback(async () => {
        // ここで条件を確認し、状況に合う処理だけを実行します。
        if (!selectedSpot || isFavoriteLoading) {
            return;
        }

        const touristSpotId = selectedSpot.tourist_spot_id;
        const isFavorite = favoriteIds.has(touristSpotId);

        setIsFavoriteLoading(true);
        setFavoriteMessage('');

        // API 通信やデータ処理で失敗する可能性があるため、例外を受け取れる形で実行します。
        try {
            // バックエンド API へ通信し、画面で使うデータの取得や保存を依頼します。
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

            // ここで条件を確認し、状況に合う処理だけを実行します。
            if (!response.ok || !data.success) {
                setFavoriteMessage(data.message || 'お気に入りの更新に失敗しました。');
                return;
            }

            setFavoriteIds((currentIds) => {
                const nextIds = new Set(currentIds);

                // ここで条件を確認し、状況に合う処理だけを実行します。
                if (isFavorite) {
                    nextIds.delete(touristSpotId);
                } else {
                    nextIds.add(touristSpotId);
                }

                return nextIds;
            });
            setFavoriteMessage(data.message || 'お気に入りを更新しました。');
        // エラーが起きた場合は、画面にメッセージを出すなど安全な処理に切り替えます。
        } catch (error) {
            console.error('お気に入り更新エラー:', error);
            setFavoriteMessage('通信に失敗しました。時間をおいて再度お試しください。');
        // 成功・失敗に関係なく最後に必要な後片付けを行います。
        } finally {
            setIsFavoriteLoading(false);
        }
    }, [favoriteIds, isFavoriteLoading, selectedSpot]);

    // closeDetailModal は、画面操作や API 結果に合わせて必要な処理をまとめた関数です。
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
