import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import BottomNav from '../../components/bottomNav/BottomNav';
import styles from './Candidates.module.css';
import { candidatePlaces, categories, typeLabels } from './candidateData';

function SearchIcon() {
    return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="m20 20-4.1-4.1M18 10.8a7.2 7.2 0 1 1-14.4 0 7.2 7.2 0 0 1 14.4 0Z" />
        </svg>
    );
}

function BackIcon() {
    return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M15 5 8 12l7 7" />
        </svg>
    );
}

function HeartIcon() {
    return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M20.4 8.7c0 5-8.4 9.8-8.4 9.8S3.6 13.7 3.6 8.7A4.4 4.4 0 0 1 12 6.8a4.4 4.4 0 0 1 8.4 1.9Z" />
        </svg>
    );
}

function Candidates() {
    const navigate = useNavigate();
    const [keyword, setKeyword] = useState('京都');
    const [submittedArea, setSubmittedArea] = useState('京都');
    const [selectedCategory, setSelectedCategory] = useState('all');

    const filteredPlaces = useMemo(() => {
        return candidatePlaces.filter((place) => {
            const matchesArea = submittedArea.trim() === '' || place.city.includes(submittedArea.trim()) || place.area.includes(submittedArea.trim());
            const matchesCategory = selectedCategory === 'all' || place.type === selectedCategory;
            return matchesArea && matchesCategory;
        });
    }, [selectedCategory, submittedArea]);

    const handleSubmit = (event) => {
        event.preventDefault();
        setSubmittedArea(keyword);
    };

    const openDetail = (place) => {
        navigate(`/Candidates/${place.id}`, { state: { place } });
    };

    return (
        <div className={styles.page}>
            <div className={styles.phone}>
                <header className={styles.hero}>
                    <div className={styles.topBar}>
                        <button className={styles.iconButton} type="button" onClick={() => navigate(-1)} aria-label="戻る">
                            <BackIcon />
                        </button>
                        <p className={styles.brand}>TABI</p>
                        <button className={styles.iconButton} type="button" aria-label="お気に入り">
                            <HeartIcon />
                        </button>
                    </div>

                    <div className={styles.heroText}>
                        <p>候補先を探す</p>
                        <h1>{submittedArea || '旅行先'}のおすすめ</h1>
                    </div>

                    <form className={styles.searchBox} onSubmit={handleSubmit}>
                        <SearchIcon />
                        <input
                            value={keyword}
                            onChange={(event) => setKeyword(event.target.value)}
                            type="search"
                            placeholder="地名で検索"
                            aria-label="地名で検索"
                        />
                        <button type="submit">検索</button>
                    </form>
                </header>

                <main className={styles.content}>
                    <section className={styles.quickFilters} aria-label="カテゴリ">
                        {categories.map((category) => (
                            <button
                                className={`${styles.filterButton} ${selectedCategory === category.id ? styles.activeFilter : ''}`}
                                type="button"
                                key={category.id}
                                onClick={() => setSelectedCategory(category.id)}
                            >
                                {category.label}
                            </button>
                        ))}
                    </section>

                    <section className={styles.summary}>
                        <div>
                            <span>{filteredPlaces.length}件</span>
                            <h2>{submittedArea || 'すべてのエリア'}の候補先</h2>
                        </div>
                        <button type="button">並び替え</button>
                    </section>

                    <div className={styles.list}>
                        {filteredPlaces.map((place) => (
                            <article className={styles.card} key={place.id}>
                                <div className={styles.imageWrap}>
                                    <img src={place.image} alt={place.name} />
                                    <span>{typeLabels[place.type]}</span>
                                </div>
                                <div className={styles.cardBody}>
                                    <div className={styles.cardHeader}>
                                        <div>
                                            <h3>{place.name}</h3>
                                            <p>{place.area}</p>
                                        </div>
                                        <button type="button" aria-label={`${place.name}の詳細を見る`} onClick={() => openDetail(place)}>＋</button>
                                    </div>

                                    <p className={styles.description}>{place.description}</p>

                                    <div className={styles.metaRow}>
                                        <span className={styles.rating}>{place.rating}</span>
                                        <span>口コミ {place.reviews}件</span>
                                    </div>

                                    <div className={styles.footerRow}>
                                        <span>{place.tag}</span>
                                        <strong>{place.price}</strong>
                                    </div>

                                    <button className={styles.detailButton} type="button" onClick={() => openDetail(place)}>
                                        詳細を見る
                                    </button>
                                </div>
                            </article>
                        ))}
                    </div>

                    {filteredPlaces.length === 0 && (
                        <div className={styles.empty}>
                            <h2>候補先が見つかりません</h2>
                            <p>地名を変えて検索してください。</p>
                        </div>
                    )}
                </main>

                <BottomNav />
            </div>
        </div>
    );
}

export default Candidates;
