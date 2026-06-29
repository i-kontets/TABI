import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import BottomNav from '../../components/bottomNav/BottomNav';
import styles from './Candidates.module.css';

const categories = [
    { id: 'all', label: 'すべて' },
    { id: 'spot', label: '観光スポット' },
    { id: 'hotel', label: '宿泊先' },
    { id: 'food', label: '飲食店' },
];

const candidatePlaces = [
    {
        id: 1,
        type: 'spot',
        name: '清水寺',
        area: '京都・東山',
        city: '京都',
        rating: 4.6,
        reviews: '12,480',
        price: '拝観料 500円〜',
        tag: '歴史・景色',
        image: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=760&q=80',
        description: '京都らしい街並みと舞台からの眺めを楽しめる定番スポット。',
    },
    {
        id: 2,
        type: 'hotel',
        name: '京都ステイ 四条',
        area: '京都・四条',
        city: '京都',
        rating: 4.4,
        reviews: '2,103',
        price: '1泊 8,800円〜',
        tag: '駅近・朝食あり',
        image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=760&q=80',
        description: '観光にも食事にも動きやすい中心エリアのホテル。',
    },
    {
        id: 3,
        type: 'food',
        name: '京だし茶漬け ことのは',
        area: '京都・祇園',
        city: '京都',
        rating: 4.5,
        reviews: '864',
        price: '昼 1,600円〜',
        tag: '和食・予約可',
        image: 'https://images.unsplash.com/photo-1519984388953-d2406bc725e1?auto=format&fit=crop&w=760&q=80',
        description: '歩き疲れた日にも入りやすい、やさしい味の和食店。',
    },
    {
        id: 4,
        type: 'spot',
        name: '浅草寺',
        area: '東京・浅草',
        city: '東京',
        rating: 4.5,
        reviews: '18,920',
        price: '入場無料',
        tag: '街歩き・写真',
        image: 'https://images.unsplash.com/photo-1536098561742-ca998e48cbcc?auto=format&fit=crop&w=760&q=80',
        description: '仲見世通りと合わせて楽しめる、東京観光の人気エリア。',
    },
    {
        id: 5,
        type: 'hotel',
        name: 'ベイサイドホテル 東京',
        area: '東京・湾岸',
        city: '東京',
        rating: 4.3,
        reviews: '1,582',
        price: '1泊 11,200円〜',
        tag: '夜景・大浴場',
        image: 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?auto=format&fit=crop&w=760&q=80',
        description: '夜景を見ながらゆっくり過ごせる旅行向けホテル。',
    },
    {
        id: 6,
        type: 'food',
        name: '築地 海鮮小路',
        area: '東京・築地',
        city: '東京',
        rating: 4.4,
        reviews: '2,776',
        price: '朝食 1,900円〜',
        tag: '海鮮・朝営業',
        image: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=760&q=80',
        description: '朝から旅行気分を上げられる海鮮メニューが人気。',
    },
];

const typeLabels = {
    spot: '観光',
    hotel: '宿泊',
    food: '食事',
};

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
                                        <button type="button" aria-label={`${place.name}を候補に追加`}>＋</button>
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
