/**
 * 旅行先候補の一覧や詳細を表示し、候補選びを進める画面です。
 *
 * 主な流れ:
 * 1. 必要な部品や API 関数を読み込む
 * 2. 画面表示やデータ取得に必要な値を準備する
 * 3. ユーザー操作や API の結果に合わせて表示を更新する
 *
 * 扱うデータ: React の state、props、フォーム入力、API から返ったデータを主に扱います。
 */
import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import Minimap from '../../components/Minimap/Minimap';
import styles from './CandidateDetail.module.css';
import { getCandidatePlaceById, typeLabels } from './candidateData';

/**
 * BackIcon は、このファイルの中心となる処理をまとめた関数です。
 * 画面から渡された値や API の結果を使い、次に表示する内容を決めます。
 */
function BackIcon() {
    return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M15 5 8 12l7 7" />
        </svg>
    );
}

/**
 * PlusIcon は、このファイルの中心となる処理をまとめた関数です。
 * 画面から渡された値や API の結果を使い、次に表示する内容を決めます。
 */
function PlusIcon() {
    return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 5v14M5 12h14" />
        </svg>
    );
}

/**
 * StarIcon は、このファイルの中心となる処理をまとめた関数です。
 * 画面から渡された値や API の結果を使い、次に表示する内容を決めます。
 */
function StarIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style={{ width: '14px', height: '14px', color: '#ffb800', marginRight: '4px', verticalAlign: 'middle' }}>
            <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
        </svg>
    );
}

/**
 * CandidateDetail は、このファイルの中心となる処理をまとめた関数です。
 * 画面から渡された値や API の結果を使い、次に表示する内容を決めます。
 */
function CandidateDetail() {
    const navigate = useNavigate();
    const { candidateId } = useParams();
    const location = useLocation();
    const candidateFromState = location.state?.place;

    const candidate = useMemo(() => {
        return candidateFromState || getCandidatePlaceById(candidateId);
    }, [candidateFromState, candidateId]);

    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const [activeImageIndex, useStateImageIndex] = useState(0);
    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const [isAdded, setIsAdded] = useState(false);

    // 画面が表示された直後や監視している値が変わった時に、必要なデータ取得や初期設定を行います。
    useEffect(() => {
        useStateImageIndex(0);
        setIsAdded(false);
    }, [candidateId]);

    // ここで条件を確認し、状況に合う処理だけを実行します。
    if (!candidate) {
        return (
            <main className={styles.page}>
                <section className={styles.phone}>
                    <header className={styles.hero}>
                        <button className={styles.backButton} type="button" onClick={() => navigate(-1)} aria-label="戻る">
                            <BackIcon />
                        </button>
                        <p className={styles.brand}>TABI</p>
                    </header>
                    <div className={styles.emptyState}>
                        <h1>候補地が見つかりません</h1>
                        <p>一覧から選び直してください。</p>
                        <button className={styles.primaryButton} type="button" onClick={() => navigate('/Candidates')}>
                            候補一覧へ戻る
                        </button>
                    </div>
                </section>
            </main>
        );
    }

    // 条件に合うデータだけを残して、画面に出す内容を絞り込みます。
    const gallery = candidate.images?.length ? candidate.images : [candidate.image].filter(Boolean);
    const currentImage = gallery[Math.min(activeImageIndex, gallery.length - 1)];

    const infoRows = [
        { label: 'カテゴリ', value: typeLabels[candidate.type] || candidate.type },
        { label: '評価', value: candidate.rating ? <><StarIcon />{candidate.rating} / 5</> : '未設定' },
        { label: '口コミ', value: `${candidate.reviews}件` },
        { label: '住所', value: candidate.address },
        { label: '営業時間', value: candidate.hours || '未設定' },
        { label: '料金', value: candidate.price || '未設定' },
    ];

    // handleAdd は、画面操作や API 結果に合わせて必要な処理をまとめた関数です。
    const handleAdd = () => {
        setIsAdded(!isAdded);
    };

    return (
        <main className={styles.page}>
            <section className={styles.phone}>
                <header className={styles.hero}>
                    <div className={styles.topBar}>
                        <button className={styles.backButton} type="button" onClick={() => navigate(-1)} aria-label="戻る">
                            <BackIcon />
                        </button>
                        <p className={styles.brand}>TABI</p>
                        <button 
                            className={`${styles.actionButton} ${isAdded ? styles.actionButtonActive : ''}`} 
                            type="button" 
                            onClick={handleAdd}
                            aria-label={isAdded ? "候補から削除" : "候補に追加"}
                        >
                            <PlusIcon />
                        </button>
                    </div>

                    <div className={styles.heroText}>
                        <p>{candidate.area}</p>
                        <h1>{candidate.name}</h1>
                        <div className={styles.heroMeta}>
                            <span className={styles.typeBadge}>
                                {candidate.type === 'spot' ? '観光' : candidate.type === 'hotel' ? '宿泊' : '飲食'}
                            </span>
                            <span className={styles.ratingBadge}>
                                <StarIcon />
                                {candidate.rating}
                            </span>
                            <span className={styles.reviewsBadge}>口コミ {candidate.reviews}件</span>
                        </div>
                    </div>
                </header>

                <div className={styles.gallery}>
                    {currentImage && (
                        <img className={styles.mainImage} src={currentImage} alt={candidate.name} />
                    )}
                    {gallery.length > 1 && (
                        <div className={styles.thumbnailRow}>
                            {gallery.map((image, index) => (
                                <button
                                    key={`${candidate.id}-${image}`}
                                    type="button"
                                    className={`${styles.thumbnailButton} ${index === activeImageIndex ? styles.thumbnailActive : ''}`}
                                    onClick={() => useStateImageIndex(index)}
                                    aria-label={`画像 ${index + 1} を表示`}
                                >
                                    <img src={image} alt="" />
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <div className={styles.content}>
                    <section className={styles.actionCard}>
                        <div className={styles.actionTextContent}>
                            <p className={styles.actionLabel}>MY PLAN</p>
                            <h2>{isAdded ? '候補に追加されました！' : '旅行候補として保存'}</h2>
                            <p>{isAdded ? 'このスポットは候補リストに保存されています。' : '候補に登録して、一緒に行くメンバーとしおりを共有しましょう。'}</p>
                        </div>
                        <button 
                            className={`${styles.primaryButton} ${isAdded ? styles.primaryButtonActive : ''}`} 
                            type="button" 
                            onClick={handleAdd}
                        >
                            {isAdded ? '✓ 追加済み' : '候補に追加する'}
                        </button>
                    </section>

                    <section className={styles.section}>
                        <div className={styles.sectionHeader}>
                            <h3>基本情報</h3>
                            {candidate.tag && <span className={styles.tagBadge}>{candidate.tag}</span>}
                        </div>
                        <dl className={styles.detailList}>
                            {infoRows.map((item) => (
                                <div key={item.label} className={styles.detailRow}>
                                    <dt>{item.label}</dt>
                                    <dd>{item.value || '未設定'}</dd>
                                </div>
                            ))}
                        </dl>
                    </section>

                    <section className={styles.section}>
                        <div className={styles.sectionHeader}>
                            <h3>説明</h3>
                        </div>
                        <p className={styles.description}>{candidate.description}</p>
                    </section>

                    <section className={styles.section}>
                        <div className={styles.sectionHeader}>
                            <h3>地図</h3>
                            <span className={styles.mapProvider}>Mapbox</span>
                        </div>
                        <div className={styles.mapContainer}>
                            <Minimap place={candidate.name} center={candidate.mapCenter} zoom={14} />
                        </div>
                    </section>
                </div>
            </section>
        </main>
    );
}

export default CandidateDetail;