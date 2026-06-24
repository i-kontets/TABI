import styles from './TouristRanking.module.css';
import Header from '../../components/header/Header';
import BtmNav from '../../components/bottomNav/BottomNav';

const rankingSpots = [
    {
        id: 1,
        name: '清水寺',
        location: '京都府京都市',
        rating: 4.6,
        reviews: '2,345',
        image: 'https://images.unsplash.com/photo-1624253321171-1be53e12f5f4?auto=format&fit=crop&w=420&q=80',
    },
    {
        id: 2,
        name: '厳島神社',
        location: '広島県廿日市市',
        rating: 4.5,
        reviews: '2,112',
        image: 'https://images.unsplash.com/photo-1545569341-9eb8b30979d9?auto=format&fit=crop&w=420&q=80',
    },
    {
        id: 3,
        name: '道頓堀',
        location: '大阪府大阪市',
        rating: 4.4,
        reviews: '1,987',
        image: 'https://images.unsplash.com/photo-1590253230532-a67f6bc61c9e?auto=format&fit=crop&w=420&q=80',
    },
    {
        id: 4,
        name: '草津温泉',
        location: '群馬県草津町',
        rating: 4.4,
        reviews: '1,654',
        image: 'https://images.unsplash.com/photo-1578469645742-46cae010e5d4?auto=format&fit=crop&w=420&q=80',
    },
    {
        id: 5,
        name: '沖縄美ら海水族館',
        location: '沖縄県本部町',
        rating: 4.3,
        reviews: '1,532',
        image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=420&q=80',
    },
];

const trendSpots = [
    {
        id: 1,
        name: '鎌倉高校前駅',
        location: '神奈川県鎌倉市',
        rating: 4.2,
        reviews: 812,
        image: 'https://images.unsplash.com/photo-1536098561742-ca998e48cbcc?auto=format&fit=crop&w=520&q=80',
    },
    {
        id: 2,
        name: 'あしかがフラワーパーク',
        location: '栃木県足利市',
        rating: 4.5,
        reviews: 723,
        image: 'https://images.unsplash.com/photo-1522383225653-ed111181a951?auto=format&fit=crop&w=520&q=80',
    },
    {
        id: 3,
        name: '小豆島オリーブ公園',
        location: '香川県小豆郡',
        rating: 4.4,
        reviews: 645,
        image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=520&q=80',
    },
];

const searchMenus = [
    { label: 'エリアから探す', icon: 'pin' },
    { label: 'ジャンルから探す', icon: 'grid' },
    { label: 'テーマから探す', icon: 'crown' },
    { label: '地図から探す', icon: 'map' },
];

function Icon({ name, className = '' }) {
    const commonProps = {
        className: `${styles.icon} ${className}`,
        viewBox: '0 0 24 24',
        fill: 'none',
        xmlns: 'http://www.w3.org/2000/svg',
        'aria-hidden': 'true',
    };

    const icons = {
        menu: (
            <svg {...commonProps}>
                <path d="M4 6.5h16M4 12h16M4 17.5h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
        ),
        search: (
            <svg {...commonProps}>
                <path d="m20 20-4.2-4.2M18 10.8a7.2 7.2 0 1 1-14.4 0 7.2 7.2 0 0 1 14.4 0Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
        ),
        bell: (
            <svg {...commonProps}>
                <path d="M18 9.6c0-3.2-2.1-5.6-5.3-6.1V2h-1.4v1.5C8.1 4 6 6.4 6 9.6V14l-1.8 2.4c-.4.6 0 1.4.7 1.4h14.2c.7 0 1.1-.8.7-1.4L18 14V9.6ZM9.5 20a2.8 2.8 0 0 0 5 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
        ),
        arrowRight: (
            <svg {...commonProps}>
                <path d="M9 5.5 15.5 12 9 18.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
        ),
        crown: (
            <svg {...commonProps}>
                <path d="m3.5 8.2 4.1 3.5L12 5l4.4 6.7 4.1-3.5-1.8 9.6H5.3L3.5 8.2Z" fill="currentColor" />
                <path d="M5.4 20h13.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
        ),
        pin: (
            <svg {...commonProps}>
                <path d="M12 21s6.5-5.5 6.5-11A6.5 6.5 0 0 0 5.5 10c0 5.5 6.5 11 6.5 11Z" fill="currentColor" opacity=".18" />
                <path d="M12 21s6.5-5.5 6.5-11A6.5 6.5 0 0 0 5.5 10c0 5.5 6.5 11 6.5 11Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                <path d="M12 12.2a2.2 2.2 0 1 0 0-4.4 2.2 2.2 0 0 0 0 4.4Z" fill="currentColor" />
            </svg>
        ),
        grid: (
            <svg {...commonProps}>
                <path d="M4 4h6v6H4V4Zm10 0h6v6h-6V4ZM4 14h6v6H4v-6Zm10 0h6v6h-6v-6Z" fill="currentColor" />
            </svg>
        ),
        map: (
            <svg {...commonProps}>
                <path d="m4 6 5-2 6 2 5-2v14l-5 2-6-2-5 2V6Z" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M9 4v14M15 6v14" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
            </svg>
        ),
        trend: (
            <svg {...commonProps}>
                <path d="M4 16.5 9 11l3.6 3.6L20 7.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M15 7.5h5v5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
        ),
        chevronDown: (
            <svg {...commonProps}>
                <path d="m7 10 5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
        ),
        refresh: (
            <svg {...commonProps}>
                <path d="M20 12a8 8 0 0 1-13.6 5.7M4 12A8 8 0 0 1 17.6 6.3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <path d="M17.6 3.5v2.8h-2.8M6.4 20.5v-2.8h2.8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
        ),
        home: (
            <svg {...commonProps}>
                <path d="M4 10.6 12 4l8 6.6V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.4Z" fill="currentColor" />
            </svg>
        ),
        heart: (
            <svg {...commonProps}>
                <path d="M20.5 8.8c0 5.2-8.5 10.2-8.5 10.2S3.5 14 3.5 8.8A4.5 4.5 0 0 1 12 6.7a4.5 4.5 0 0 1 8.5 2.1Z" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round" />
            </svg>
        ),
        user: (
            <svg {...commonProps}>
                <path d="M12 12.5a4.2 4.2 0 1 0 0-8.4 4.2 4.2 0 0 0 0 8.4ZM4.5 20.2c.8-3.5 3.6-5.4 7.5-5.4s6.7 1.9 7.5 5.4" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
            </svg>
        ),
    };

    return icons[name];
}

function Rating({ score, reviews }) {
    return (
        <div className={styles.rating} aria-label={`評価 ${score}`}>
            <span className={styles.stars}>★★★★★</span>
            <span className={styles.score}>{score}</span>
            <span className={styles.reviews}>({reviews})</span>
        </div>
    );
}

function TouristRanking() {
    return (
        <div>
        <Header />
        <div className={styles.page}>
            <div className={styles.phoneCanvas}>
                <main className={styles.content}>
                    <section className={styles.hero}>
                        <div className={styles.heroText}>
                            <p className={styles.heroLead}>人気スポットを見つけよう</p>
                            <h1>観光地ランキング</h1>
                            <p className={styles.heroCopy}>口コミ・レビュー・アクセス数などをもとにした人気スポットを紹介！</p>
                            <button className={styles.heroButton} type="button">
                                ランキングを見る
                                <Icon name="arrowRight" />
                            </button>
                        </div>
                    </section>
                    <div className={styles.dots} aria-hidden="true">
                        <span className={styles.activeDot} />
                        <span />
                        <span />
                        <span />
                    </div>

                    <section className={styles.section}>
                        <div className={styles.sectionHeader}>
                            <div className={styles.sectionTitle}>
                                <Icon name="crown" className={styles.crownIcon} />
                                <h2>総合人気ランキング TOP 5</h2>
                            </div>
                            <button className={styles.moreButton} type="button">
                                もっと見る
                                <Icon name="arrowRight" />
                            </button>
                        </div>

                        <div className={styles.rankingScroller}>
                            {rankingSpots.map((spot) => (
                                <article className={styles.rankingCard} key={spot.id}>
                                    <span className={`${styles.rankBadge} ${styles[`rank${spot.id}`]}`}>{spot.id}</span>
                                    <img src={spot.image} alt={spot.name} className={styles.rankingImage} />
                                    <div className={styles.cardBody}>
                                        <h3>{spot.name}</h3>
                                        <p>{spot.location}</p>
                                        <Rating score={spot.rating} reviews={spot.reviews} />
                                    </div>
                                </article>
                            ))}
                        </div>
                    </section>

                    <section className={styles.searchCard}>
                        <h2>人気スポットを探す</h2>
                        <div className={styles.searchMenu}>
                            {searchMenus.map((item) => (
                                <button className={styles.searchItem} type="button" key={item.label}>
                                    <Icon name={item.icon} />
                                    <span>{item.label}</span>
                                </button>
                            ))}
                        </div>
                    </section>

                    <section className={styles.section}>
                        <div className={styles.sectionHeader}>
                            <div className={styles.sectionTitle}>
                                <Icon name="trend" />
                                <h2>トレンドのスポット</h2>
                            </div>
                            <button className={styles.periodButton} type="button">
                                直近30日間
                                <Icon name="chevronDown" />
                            </button>
                        </div>

                        <div className={styles.trendScroller}>
                            {trendSpots.map((spot) => (
                                <article className={styles.trendCard} key={spot.id}>
                                    <div className={styles.trendImageWrap}>
                                        <img src={spot.image} alt={spot.name} className={styles.trendImage} />
                                        <span className={styles.newLabel}>NEW</span>
                                    </div>
                                    <h3>{spot.name}</h3>
                                    <p>{spot.location}</p>
                                    <Rating score={spot.rating} reviews={spot.reviews} />
                                </article>
                            ))}
                        </div>
                    </section>

                    <section className={styles.updateCard}>
                        <Icon name="refresh" />
                        <div>
                            <h2>データは毎日更新</h2>
                            <p>最新のAPIデータをもとにランキングを自動更新しています</p>
                        </div>
                        <Icon name="arrowRight" className={styles.updateArrow} />
                    </section>
                </main>
            </div>
        </div>
        <div className={styles.btmNavWrapper}>
        <BtmNav />
      </div>
        </div>
    );
}

export default TouristRanking;
