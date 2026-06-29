import { useCallback, useState } from 'react';
import Header from '../../components/header/Header';
import BottomNav from '../../components/bottomNav/BottomNav';
import SearchBar from './SearchBar';
import TouristCard from './TouristCard';
import styles from './Tourist.module.css';

function Tourist() {
    const [spots, setSpots] = useState([]);
    const [city, setCity] = useState('京都');
    const [message, setMessage] = useState('地域名を入力して検索してください。');
    const [isLoading, setIsLoading] = useState(false);

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
                                <TouristCard key={spot.id} spot={spot} />
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
            <BottomNav />
        </>
    );
}

export default Tourist;
