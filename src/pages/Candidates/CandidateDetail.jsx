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
import { useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import Minimap from '../../components/Minimap/Minimap';
import styles from './CandidateDetail.module.css';
import { getCandidatePlaceById, typeLabels } from './candidateData';

// 主要な観光地の緯度経度マッピング（テスト用）
const LOCATION_MAP = {
    '京都': [135.7681, 35.0116],
    '伊勢神宮': [136.7194, 34.4854],
    '鳥羽水族館': [136.8436, 34.4862],
    '奈良': [135.8048, 34.6852],
    '大阪': [135.5023, 34.6937],
    '神戸': [135.1955, 34.6901],
    '広島': [132.4549, 34.3853],
    '福岡': [130.4017, 33.5904],
    '東京': [139.6917, 35.6895],
    '横浜': [139.6380, 35.4437],
    '鎌倉': [139.5551, 35.3149],
    '箱根': [139.1220, 35.2328],
    '富士山': [138.7274, 35.3608],
    '松本': [137.9727, 36.2384],
};

// 候補名から緯度経度を取得する関数
function getLocationFromName(name) {
    if (!name) return null;
    
    // 完全一致を確認
    if (LOCATION_MAP[name]) {
        return LOCATION_MAP[name];
    }
    
    // 部分一致を確認
    const lowerName = name.toLowerCase();
    for (const [key, coords] of Object.entries(LOCATION_MAP)) {
        if (lowerName.includes(key.toLowerCase()) || key.toLowerCase().includes(lowerName)) {
            return coords;
        }
    }
    
    return null;
}

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
    const groupId = new URLSearchParams(location.search).get('group_id') || new URLSearchParams(location.search).get('groupId') || '1';
    const candidateFromState = location.state?.place;

    const candidate = useMemo(() => {
        return candidateFromState || getCandidatePlaceById(candidateId);
    }, [candidateFromState, candidateId]);

    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const [activeImageIndex, setActiveImageIndex] = useState(0);
    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const [isAdded, setIsAdded] = useState(
        candidate?.status === 'candidate' || candidate?.status === 'selected'
    );
    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

    // ここで条件を確認し、状況に合う処理だけを実行します。
    if (!candidate || (!candidate.name && !candidate.candidate_name)) {
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
    const gallery = candidate.images?.length ? candidate.images : [candidate.image || candidate.img_url].filter(Boolean);
    const currentImage = gallery[Math.min(activeImageIndex, gallery.length - 1)];
    
    // 候補名からマップセンターを取得（mapCenter がない場合は候補名で検索）
    const hasSavedCoordinates = candidate.longitude != null && candidate.latitude != null
        && Number.isFinite(Number(candidate.longitude)) && Number.isFinite(Number(candidate.latitude));
    const savedMapCenter = hasSavedCoordinates
        ? [Number(candidate.longitude), Number(candidate.latitude)]
        : null;
    const mapCenter = savedMapCenter || candidate.mapCenter || getLocationFromName(candidate.name || candidate.candidate_name);

    const infoRows = [
        { label: 'カテゴリ', value: typeLabels[candidate.type || candidate.candidate_type] || candidate.type || candidate.candidate_type },
        { label: '説明', value: candidate.description || '詳細情報はありません' },
    ];
    const facilityDetails = [
        { label: '営業時間', value: candidate.opening_hours },
        { label: '定休日', value: candidate.regular_holiday },
        { label: '電話番号', value: candidate.phone_number },
        { label: '料金', value: candidate.fee_info },
    ].filter((item) => item.value);
    const facilityFeatures = [
        ['多目的トイレ', candidate.has_accessible_toilet],
        ['車椅子貸出', candidate.has_wheelchair_rental],
        ['ベビーカー貸出', candidate.has_stroller_rental],
        ['授乳室', candidate.has_nursing_room],
        ['コインロッカー', candidate.has_coin_locker],
        ['Wi-Fi', candidate.has_wifi],
    ].filter(([, value]) => value !== null && value !== undefined && value !== '');

    // handleAdd は、画面操作や API 結果に合わせて必要な処理をまとめた関数です。
    const handleAdd = async () => {
        if (!candidate?.candidate_id || isUpdatingStatus) {
            return;
        }

        try {
            setIsUpdatingStatus(true);
            const response = await fetch(`${import.meta.env.BASE_URL}api/Trips/UpdateCandidateStatus.php`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    candidate_id: candidate.candidate_id,
                    status: 'candidate',
                }),
            });
            const data = await response.json().catch(() => null);

            if (!response.ok || !data?.success) {
                throw new Error(data?.message || '候補の追加に失敗しました');
            }

            setIsAdded(true);
            navigate(`/group/${encodeURIComponent(groupId)}/talk?tab=candidate&category=${encodeURIComponent(candidate.candidate_type || candidate.type || 'destination')}`);
        } catch (error) {
            window.alert(error instanceof Error ? error.message : '候補の追加に失敗しました');
        } finally {
            setIsUpdatingStatus(false);
        }
    };

    const handleRemove = async () => {
        if (!candidate?.candidate_id || isUpdatingStatus || !isAdded) {
            return;
        }

        try {
            setIsUpdatingStatus(true);
            const response = await fetch(`${import.meta.env.BASE_URL}api/Trips/UpdateCandidateStatus.php`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    candidate_id: candidate.candidate_id,
                    status: 'rejected',
                }),
            });
            const data = await response.json().catch(() => null);

            if (!response.ok || !data?.success) {
                throw new Error(data?.message || '候補の削除に失敗しました');
            }

            setIsAdded(false);
        } catch (error) {
            window.alert(error instanceof Error ? error.message : '候補の削除に失敗しました');
        } finally {
            setIsUpdatingStatus(false);
        }
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
                            aria-label={isAdded ? "候補に追加済み" : "候補に追加"}
                        >
                            <PlusIcon />
                        </button>
                    </div>

                    <div className={styles.heroText}>
                        <p>{candidate.area || '候補地'}</p>
                        <h1>{candidate.name || candidate.candidate_name}</h1>
                        <div className={styles.heroMeta}>
                            <span className={styles.typeBadge}>
                                {typeLabels[candidate.type || candidate.candidate_type] || candidate.type || candidate.candidate_type}
                            </span>
                            {candidate.vote_count !== undefined && (
                                <span className={styles.reviewsBadge}>投票数 {candidate.vote_count}件</span>
                            )}
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
                                    onClick={() => setActiveImageIndex(index)}
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
                            {isUpdatingStatus ? '追加中...' : isAdded ? '追加済み' : '候補に追加する'}
                        </button>
                        {isAdded && (
                            <button className={styles.removeButton} type="button" onClick={handleRemove} disabled={isUpdatingStatus}>
                                候補から削除
                            </button>
                        )}
                    </section>

                    <section className={styles.section}>
                        <div className={styles.sectionHeader}>
                            <h3>基本情報</h3>
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

                    {(facilityDetails.length > 0 || facilityFeatures.length > 0) && (
                        <section className={`${styles.section} ${styles.facilitySection}`}>
                            <div className={styles.sectionHeader}>
                                <div>
                                    <p className={styles.sectionEyebrow}>VISITOR GUIDE</p>
                                    <h3>訪問前にチェック</h3>
                                </div>
                                <span className={styles.infoMark}>INFO</span>
                            </div>

                            {facilityDetails.length > 0 && (
                                <dl className={styles.facilityGrid}>
                                    {facilityDetails.map((item) => (
                                        <div key={item.label} className={styles.facilityItem}>
                                            <dt>{item.label}</dt>
                                            <dd>{item.value}</dd>
                                        </div>
                                    ))}
                                </dl>
                            )}

                            {facilityFeatures.length > 0 && (
                                <div className={styles.featureBlock}>
                                    <p className={styles.featureTitle}>設備・サービス</p>
                                    <div className={styles.featureList}>
                                        {facilityFeatures.map(([label, value]) => (
                                            <span key={label} className={styles.featureBadge} data-available={Number(value) === 1}>
                                                <span className={styles.featureDot} aria-hidden="true" />
                                                {label}: {Number(value) === 1 ? 'あり' : 'なし'}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </section>
                    )}

                    {mapCenter && (
                        <section className={styles.section}>
                            <div className={styles.sectionHeader}>
                                <h3>地図</h3>
                                <span className={styles.mapProvider}>Mapbox</span>
                            </div>
                            <div className={styles.mapContainer}>
                                <Minimap
                                    place={candidate.name || candidate.candidate_name}
                                    address={candidate.address}
                                    label={candidate.name || candidate.candidate_name}
                                    center={mapCenter}
                                    zoom={14}
                                />
                            </div>
                        </section>
                    )}
                </div>
            </section>
        </main>
    );
}

export default CandidateDetail;
