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
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import BottomNav from '../../components/bottomNav/BottomNav';
import styles from './Candidates.module.css';
import { categories, typeLabels } from './candidateData';
import { buildAuthPath } from '../../utils/authReturnPath';


/**
 * SearchIcon は、このファイルの中心となる処理をまとめた関数です。
 * 画面から渡された値や API の結果を使い、次に表示する内容を決めます。
 */
function SearchIcon() {
    return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="m20 20-4.1-4.1M18 10.8a7.2 7.2 0 1 1-14.4 0 7.2 7.2 0 0 1 14.4 0Z" />
        </svg>
    );
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
 * HeartIcon は、このファイルの中心となる処理をまとめた関数です。
 * 画面から渡された値や API の結果を使い、次に表示する内容を決めます。
 */
function HeartIcon() {
    return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M20.4 8.7c0 5-8.4 9.8-8.4 9.8S3.6 13.7 3.6 8.7A4.4 4.4 0 0 1 12 6.8a4.4 4.4 0 0 1 8.4 1.9Z" />
        </svg>
    );
}

/**
 * Candidates は、このファイルの中心となる処理をまとめた関数です。
 * 画面から渡された値や API の結果を使い、次に表示する内容を決めます。
 */
function Candidates() {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const contentRef = useRef(null);
    // 各フィルターのスクロール位置を記憶する
    const scrollPositionsRef = useRef({
        all: 0,
        spot: 0,
        hotel: 0,
        restaurant: 0,
    });
    const previousCategoryRef = useRef('all');

    // 両方の既存パラメーターを読み、未選択の旅行を固定値で補いません。
    const groupId = searchParams.get('group_id') || searchParams.get('groupId');
    const returnPath = `/Candidates?${searchParams}`;

    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const [keyword, setKeyword] = useState('');
    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const [submittedArea, setSubmittedArea] = useState('');
    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const selectedCategory = categories.some((item) => item.id === searchParams.get('category')) ? searchParams.get('category') : 'all';
    // URLにタブを残すことで戻る操作・再読み込み・Homeからの入口を統一します。
    const setSelectedCategory = (category) => setSearchParams((current) => {
        const next = new URLSearchParams(current);
        next.set('category', category);
        return next;
    });
    // DBから取得したデータを保持する state
    const [candidates, setCandidates] = useState([]);
    // ローディング状態を管理
    const [loading, setLoading] = useState(true);
    // エラーメッセージを管理
    const [error, setError] = useState(null);
    const [notice, setNotice] = useState('');
    const [updatingIds, setUpdatingIds] = useState([]);

    // ページロード時に API からデータを取得
    useEffect(() => {
        const controller = new AbortController();
        const fetchCandidates = async () => {
            try {
                setLoading(true);
                setError(null);
                const query = new URLSearchParams({
                    group_id: String(groupId),
                    scope: 'search',
                });
                const response = await fetch(`${import.meta.env.BASE_URL}api/Trips/GetCandidates.php?${query}`, {
                    credentials: 'include', // クッキー（セッション）を含める
                    signal: controller.signal,
                });

                // セッション切れなら、この宿泊タブへ戻れる共通ログインに案内します。
                if (response.status === 401) {
                    navigate(buildAuthPath('/', returnPath), { replace: true });
                    return;
                }
                if (!response.ok) {
                    throw new Error('データの取得に失敗しました');
                }

                const data = await response.json();

                if (data.success && data.candidates) {
                    // API から返ってきたデータを state に保存
                    setCandidates(data.candidates);
                } else {
                    throw new Error(data.message || 'データ形式が不正です');
                }
            } catch (err) {
                if (controller.signal.aborted) return;
                console.error('Error fetching candidates:', err);
                setError(err.message || 'データ取得時にエラーが発生しました');
                setCandidates([]);
            } finally {
                if (!controller.signal.aborted) setLoading(false);
            }
        };

        if (groupId) fetchCandidates();
        return () => controller.abort();
    }, [groupId, navigate, returnPath]);

    const filteredPlaces = useMemo(() => {
        // 条件に合うデータだけを残して、画面に出す内容を絞り込みます。
        return candidates.filter((place) => {
            // DBの候補にはcity/areaがないため、candidate_nameで検索
            const matchesArea = submittedArea.trim() === '' || place.candidate_name.includes(submittedArea.trim());
            const matchesCategory = selectedCategory === 'all' || place.candidate_type === selectedCategory;
            return matchesArea && matchesCategory;
        });
    }, [selectedCategory, submittedArea, candidates]);

    // フィルター変更時にスクロール位置を保持・復元
    useEffect(() => {
        if (contentRef.current) {
            // 前のカテゴリのスクロール位置を保存
            scrollPositionsRef.current[previousCategoryRef.current] = contentRef.current.scrollTop;
            previousCategoryRef.current = selectedCategory;
            
            // 新しいカテゴリのスクロール位置を復元
            const scrollPos = scrollPositionsRef.current[selectedCategory] || 0;
            
            // DOM更新後、ブラウザのペイント前に復元する
            const timer = setTimeout(() => {
                if (contentRef.current) {
                    contentRef.current.scrollTop = scrollPos;
                }
            }, 0);
            
            return () => clearTimeout(timer);
        }
    }, [selectedCategory]);

    // handleSubmit は、画面操作や API 結果に合わせて必要な処理をまとめた関数です。
    const handleSubmit = (event) => {
        event.preventDefault();
        setSubmittedArea(keyword);
    };

    // openDetail は、画面操作や API 結果に合わせて必要な処理をまとめた関数です。
    const openDetail = (place) => {
        navigate(`/Candidates/${place.candidate_id}?groupId=${encodeURIComponent(groupId)}&category=${selectedCategory}`, { state: { place } });
    };

    const returnToCandidateTab = () => {
        // 一覧から候補へ戻るときも宿泊タブの選択を引き継ぎます。
        navigate(`/group/${encodeURIComponent(groupId)}/talk?tab=candidate&category=${selectedCategory}`);
    };

    const updateCandidateStatus = async (place, status) => {
        if (!place?.candidate_id || updatingIds.includes(place.candidate_id)) {
            return;
        }

        try {
            setNotice('');
            setUpdatingIds((current) => [...current, place.candidate_id]);
            const response = await fetch(`${import.meta.env.BASE_URL}api/Trips/UpdateCandidateStatus.php`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    candidate_id: place.candidate_id,
                    status,
                }),
            });
            const data = await response.json().catch(() => null);

            if (!response.ok || !data?.success) {
                throw new Error(data?.message || '候補の追加に失敗しました');
            }

            setCandidates((current) => current.map((candidate) => (
                candidate.candidate_id === place.candidate_id
                    ? { ...candidate, status }
                    : candidate
            )));
        } catch (err) {
            setNotice(err instanceof Error ? err.message : status === 'selected'
                ? '候補の追加に失敗しました'
                : '候補の削除に失敗しました');
        } finally {
            setUpdatingIds((current) => current.filter((id) => id !== place.candidate_id));
        }
    };

    const handleAddCandidate = (place) => updateCandidateStatus(place, 'selected');
    const handleRemoveCandidate = (place) => updateCandidateStatus(place, 'rejected');

    // 未選択では通信せず、既存Homeの旅行選択へ案内します。
    if (!groupId) return <main className={styles.page}><p>旅行グループを選択してください。</p><Link to="/Home">ホームへ</Link></main>;

    return (
        <div className={styles.page}>
            <div className={styles.phone}>
                <header className={styles.hero}>
                    <div className={styles.topBar}>
                        <button className={styles.iconButton} type="button" onClick={returnToCandidateTab} aria-label="候補タブへ戻る">
                            <BackIcon />
                        </button>
                        <p className={styles.brand}>TABI</p>
                        <button className={styles.iconButton} type="button" aria-label="お気に入り">
                            <HeartIcon />
                        </button>
                    </div>

                    <div className={styles.heroText}>
                        <p>候補先を探す</p>
                        <h1>{selectedCategory === 'hotel' ? '宿泊一覧' : `${submittedArea || '旅行先'}のおすすめ`}</h1>
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

                <main className={styles.content} ref={contentRef}>
                    <section className={styles.quickFilters} aria-label="カテゴリ">
                        {categories.map((category) => (
                            <button
                                className={`${styles.filterButton} ${selectedCategory === category.id ? styles.activeFilter : ''}`}
                                type="button"
                                key={category.id}
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    // 現在のカテゴリのスクロール位置を保存
                                    if (contentRef.current) {
                                        scrollPositionsRef.current[selectedCategory] = contentRef.current.scrollTop;
                                    }
                                    // 新しいカテゴリに切り替え
                                    setSelectedCategory(category.id);
                                }}
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
                        <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>並び替え</button>
                    </section>

                    {loading && (
                        <div className={styles.empty}>
                            <h2>読み込み中...</h2>
                            <p>データを取得しています</p>
                        </div>
                    )}

                    {error && !loading && (
                        <div className={styles.empty}>
                            <h2>エラーが発生しました</h2>
                            <p>{error}</p>
                        </div>
                    )}

                    {notice && !loading && !error && (
                        <p className={styles.notice} role="status">{notice}</p>
                    )}

                    {!loading && !error && (
                        <div className={styles.list}>
                            {filteredPlaces.map((place) => (
                                (() => {
                                    const isAdded = place.status === 'selected';

                                    return (
                                <article className={styles.card} key={place.candidate_id}>
                                    <div className={styles.imageWrap}>
                                        <img src={place.img_url} alt={place.candidate_name} />
                                        <span>{typeLabels[place.candidate_type]}</span>
                                    </div>
                                    <div className={styles.cardBody}>
                                        <div className={styles.cardHeader}>
                                            <div>
                                                <h3>{place.candidate_name}</h3>
                                                <p>候補地</p>
                                            </div>
                                            <button
                                                type="button"
                                                disabled={updatingIds.includes(place.candidate_id)}
                                                onClick={() => (isAdded ? handleRemoveCandidate(place) : handleAddCandidate(place))}
                                            >
                                                {updatingIds.includes(place.candidate_id)
                                                    ? isAdded ? '削除中' : '追加中'
                                                    : isAdded ? '候補から削除' : '候補に追加'}
                                            </button>
                                        </div>

                                        <p className={styles.description}>{place.description}</p>

                                        <div className={styles.footerRow}>
                                            <span>{place.candidate_type}</span>
                                        </div>

                                        <button className={styles.detailButton} type="button" onClick={() => openDetail(place)}>
                                            詳細を見る
                                        </button>
                                    </div>
                                </article>
                                    );
                                })()
                            ))}
                        </div>
                    )}

                    {!loading && !error && filteredPlaces.length === 0 && (
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
