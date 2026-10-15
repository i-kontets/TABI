/**
 * 天気予報の画面部品です。
 *
 * Open-Meteo 接続前のため、表示する天気と検索候補は仮データです。
 * API 接続時は、この仮データを地名検索・予報 API の結果に置き換えます。
 */
import { useMemo, useState } from 'react';
import styles from './WeatherForecast.module.css';

const prefecture = '大阪府';

const forecast = [
    { day: '月', date: '11/3', condition: '晴れ', icon: '☀', high: 22, low: 13, precipitation: 10 },
    { day: '火', date: '11/4', condition: '晴れ時々くもり', icon: '⛅', high: 21, low: 12, precipitation: 20 },
    { day: '水', date: '11/5', condition: 'くもり', icon: '☁', high: 19, low: 11, precipitation: 30 },
    { day: '木', date: '11/6', condition: '雨', icon: '☂', high: 17, low: 12, precipitation: 70 },
];

const placeCandidates = [
    { id: 'osaka', name: '大阪市', description: '大阪府の代表地点', icon: '☀', temperature: '22° / 13°', condition: '晴れ' },
    { id: 'umeda', name: '梅田', description: '大阪市北区', icon: '⛅', temperature: '22° / 14°', condition: '晴れ時々くもり' },
    { id: 'usj', name: 'ユニバーサル・スタジオ・ジャパン', description: '大阪市此花区', icon: '☀', temperature: '22° / 13°', condition: '晴れ' },
    { id: 'sakai', name: '堺', description: '大阪府堺市', icon: '☁', temperature: '21° / 13°', condition: 'くもり' },
    { id: 'minoh', name: '箕面', description: '大阪府箕面市', icon: '⛅', temperature: '20° / 11°', condition: '晴れ時々くもり' },
];

function WeatherForecast() {
    const [query, setQuery] = useState('');
    const [savedPlaces, setSavedPlaces] = useState([placeCandidates[0]]);
    const [selectedPlaceId, setSelectedPlaceId] = useState('osaka');

    const searchResults = useMemo(() => {
        const normalizedQuery = query.trim().toLowerCase();
        if (!normalizedQuery) return placeCandidates.slice(1, 4);

        return placeCandidates.filter((place) => (
            `${place.name}${place.description}`.toLowerCase().includes(normalizedQuery)
        ));
    }, [query]);

    const addPlace = (place) => {
        setSavedPlaces((current) => (
            current.some((item) => item.id === place.id) ? current : [...current, place]
        ));
        setSelectedPlaceId(place.id);
        setQuery('');
    };

    const removePlace = (placeId) => {
        if (placeId === 'osaka') return;

        setSavedPlaces((current) => current.filter((place) => place.id !== placeId));
        if (selectedPlaceId === placeId) setSelectedPlaceId('osaka');
    };

    return (
        <main className={styles.page}>
            <section className={styles.hero} aria-labelledby="weather-title">
                <p className={styles.tripLabel}>大阪旅行 <span>11/3（月）〜 11/5（水）</span></p>
                <div className={styles.heroHeading}>
                    <div>
                        <p className={styles.prefecture}>{prefecture}</p>
                        <h1 id="weather-title">旅行の天気</h1>
                    </div>
                    <span className={styles.heroIcon} aria-hidden="true">☀</span>
                </div>
                <p className={styles.heroSummary}>大阪市付近は晴れ。日中は過ごしやすい気温になりそうです。</p>
            </section>

            <section className={styles.section} aria-labelledby="forecast-title">
                <div className={styles.sectionHeading}>
                    <div>
                        <p className={styles.eyebrow}>まずは代表地点を表示</p>
                        <h2 id="forecast-title">{prefecture}の天気</h2>
                    </div>
                    <span className={styles.locationLabel}>大阪市付近</span>
                </div>
                <div className={styles.forecastList}>
                    {forecast.map((item, index) => (
                        <article className={`${styles.forecastCard} ${index === 0 ? styles.today : ''}`} key={item.date}>
                            <p className={styles.day}>{index === 0 ? '今日' : item.day}</p>
                            <p className={styles.date}>{item.date}</p>
                            <span className={styles.weatherIcon} aria-hidden="true">{item.icon}</span>
                            <p className={styles.condition}>{item.condition}</p>
                            <p className={styles.temperatures}><strong>{item.high}°</strong><span> / {item.low}°</span></p>
                            <p className={styles.precipitation}>降水 {item.precipitation}%</p>
                        </article>
                    ))}
                </div>
            </section>

            <section className={styles.section} aria-labelledby="place-search-title">
                <div className={styles.sectionHeading}>
                    <div>
                        <p className={styles.eyebrow}>必要な場所だけ追加</p>
                        <h2 id="place-search-title">{prefecture}内を検索</h2>
                    </div>
                </div>
                <label className={styles.searchField}>
                    <span className={styles.searchIcon} aria-hidden="true">⌕</span>
                    <input
                        type="search"
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="例：梅田、USJ、箕面"
                        aria-label={`${prefecture}内の場所を検索`}
                    />
                </label>
                <p className={styles.searchHint}>検索結果は {prefecture} の場所に絞り込んで表示します。</p>

                <div className={styles.searchResults} aria-live="polite">
                    {searchResults.length > 0 ? searchResults.map((place) => (
                        <button type="button" className={styles.resultItem} key={place.id} onClick={() => addPlace(place)}>
                            <span className={styles.resultIcon} aria-hidden="true">⌖</span>
                            <span className={styles.resultText}>
                                <strong>{place.name}</strong>
                                <small>{place.description}</small>
                            </span>
                            <span className={styles.addLabel}>追加</span>
                        </button>
                    )) : (
                        <p className={styles.emptyResult}>「{query}」に一致する場所はありません。</p>
                    )}
                </div>
            </section>

            <section className={styles.section} aria-labelledby="saved-places-title">
                <div className={styles.sectionHeading}>
                    <div>
                        <p className={styles.eyebrow}>登録した地点は予報を更新</p>
                        <h2 id="saved-places-title">大阪の天気一覧</h2>
                    </div>
                    <span className={styles.count}>{savedPlaces.length}件</span>
                </div>

                <div className={styles.savedList}>
                    {savedPlaces.map((place) => (
                        <article className={`${styles.savedCard} ${selectedPlaceId === place.id ? styles.selected : ''}`} key={place.id}>
                            <button type="button" className={styles.savedMain} onClick={() => setSelectedPlaceId(place.id)}>
                                <span className={styles.savedIcon} aria-hidden="true">{place.icon}</span>
                                <span className={styles.savedText}>
                                    <strong>{place.name}</strong>
                                    <small>{place.description}</small>
                                </span>
                                <span className={styles.savedWeather}>
                                    <strong>{place.temperature}</strong>
                                    <small>{place.condition}</small>
                                </span>
                            </button>
                            {place.id !== 'osaka' && (
                                <button type="button" className={styles.deleteButton} onClick={() => removePlace(place.id)} aria-label={`${place.name}を一覧から削除`}>削除</button>
                            )}
                        </article>
                    ))}
                </div>
            </section>
        </main>
    );
}

export default WeatherForecast;
