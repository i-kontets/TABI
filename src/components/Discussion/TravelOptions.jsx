import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import "./TravelOptions.css";

const categoryLabels = {
    destination: "旅行先",
    spot: "スポット",
    hotel: "宿泊先",
};

const fallbackCandidates = [
    {
        candidate_id: 1,
        candidate_type: "destination",
        candidate_name: "三重県（伊勢・鳥羽エリア）",
        description: "伊勢神宮や鳥羽水族館、海の幸も楽しめる旅行先",
        img_url: "",
        vote_count: 3,
        has_voted: true,
    },
    {
        candidate_id: 2,
        candidate_type: "destination",
        candidate_name: "京都府",
        description: "歴史ある街並みとグルメを楽しめる旅行先",
        img_url: "",
        vote_count: 1,
        has_voted: false,
    },
    {
        candidate_id: 3,
        candidate_type: "spot",
        candidate_name: "伊勢神宮",
        description: "お気に入りから追加されたスポット",
        img_url: "",
        vote_count: 2,
        has_voted: false,
    },
    {
        candidate_id: 4,
        candidate_type: "hotel",
        candidate_name: "鳥羽シーサイドコテージ",
        description: "お気に入りから追加された宿泊先",
        img_url: "",
        vote_count: 2,
        has_voted: false,
    },
];

function CandidateVisual({ candidate }) {
    if (candidate.img_url) {
        return <img src={candidate.img_url} alt="" />;
    }

    const icon = candidate.candidate_type === "hotel" ? "⌂" : candidate.candidate_type === "spot" ? "⌖" : "◇";
    return <span aria-hidden="true">{icon}</span>;
}

async function requestCandidates(groupId) {
    const response = await fetch(
        `${import.meta.env.BASE_URL}api/trips/candidates.php?group_id=${encodeURIComponent(groupId)}`,
        { credentials: "include" },
    );
    const data = await response.json();

    if (!response.ok || !data.success) {
        throw new Error(data.message || "候補を取得できませんでした");
    }

    return data;
}

function TravelOptions({ active }) {
    const { groupId = "1" } = useParams();
    const [activeCategory, setActiveCategory] = useState("destination");
    const [candidates, setCandidates] = useState([]);
    const [tripTitle, setTripTitle] = useState("");
    const [destinationName, setDestinationName] = useState("");
    const [destinationDescription, setDestinationDescription] = useState("");
    const [favoritePickerOpen, setFavoritePickerOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [notice, setNotice] = useState("");
    const [usingFallback, setUsingFallback] = useState(false);

    const loadCandidates = async () => {
        setLoading(true);

        try {
            const data = await requestCandidates(groupId);
            setCandidates(data.candidates);
            setTripTitle(data.trip?.title || "");
            setUsingFallback(false);
        } catch {
            if (import.meta.env.DEV) {
                setCandidates(fallbackCandidates);
                setUsingFallback(true);
            } else {
                setCandidates([]);
                setNotice("候補データを取得できませんでした");
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        let cancelled = false;

        requestCandidates(groupId)
            .then((data) => {
                if (cancelled) {
                    return;
                }

                setCandidates(data.candidates);
                setTripTitle(data.trip?.title || "");
                setUsingFallback(false);
            })
            .catch(() => {
                if (cancelled) {
                    return;
                }

                if (import.meta.env.DEV) {
                    setCandidates(fallbackCandidates);
                    setUsingFallback(true);
                } else {
                    setCandidates([]);
                    setNotice("候補データを取得できませんでした");
                }
            })
            .finally(() => {
                if (!cancelled) {
                    setLoading(false);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [groupId]);

    const visibleCandidates = useMemo(
        () => candidates.filter((candidate) => candidate.candidate_type === activeCategory),
        [activeCategory, candidates],
    );

    const submitDestination = async (event) => {
        event.preventDefault();
        const name = destinationName.trim();

        if (!name) {
            setNotice("旅行先の名前を入力してください");
            return;
        }

        if (usingFallback) {
            setCandidates((current) => [
                ...current,
                {
                    candidate_id: `local-${Date.now()}`,
                    candidate_type: "destination",
                    candidate_name: name,
                    description: destinationDescription.trim(),
                    img_url: "",
                    vote_count: 0,
                    has_voted: false,
                },
            ]);
            setDestinationName("");
            setDestinationDescription("");
            setNotice("旅行先を候補に追加しました（プレビュー）");
            return;
        }

        try {
            const response = await fetch(`${import.meta.env.BASE_URL}api/trips/candidates.php`, {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "add_candidate",
                    group_id: Number(groupId),
                    candidate_type: "destination",
                    candidate_name: name,
                    description: destinationDescription.trim(),
                }),
            });
            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.message || "旅行先を追加できませんでした");
            }

            setDestinationName("");
            setDestinationDescription("");
            setNotice("旅行先を候補に追加しました");
            await loadCandidates();
        } catch (error) {
            setNotice(error.message);
        }
    };

    const voteForCandidate = async (candidateId) => {
        if (usingFallback) {
            setCandidates((current) =>
                current.map((candidate) => ({
                    ...candidate,
                    has_voted:
                        candidate.candidate_type === activeCategory
                            ? candidate.candidate_id === candidateId
                            : candidate.has_voted,
                })),
            );
            setNotice(`${categoryLabels[activeCategory]}の投票先を変更しました（プレビュー）`);
            return;
        }

        try {
            const response = await fetch(`${import.meta.env.BASE_URL}api/trips/candidates.php`, {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "vote",
                    group_id: Number(groupId),
                    candidate_id: Number(candidateId),
                }),
            });
            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.message || "投票できませんでした");
            }

            setNotice("投票先を変更しました");
            await loadCandidates();
        } catch (error) {
            setNotice(error.message);
        }
    };

    const changeCategory = (category) => {
        setActiveCategory(category);
        setFavoritePickerOpen(false);
        setNotice("");
    };

    return (
        <section className="candidatePanel" aria-label="旅行候補" hidden={!active}>
            <header className="candidateHeading">
                <div>
                    <span className="sectionKicker">みんなで1つを選ぶ</span>
                    <h2>旅行の候補</h2>
                    {tripTitle && <p>{tripTitle}</p>}
                </div>
                <span className="singleVoteBadge">各カテゴリ 1票</span>
            </header>

            <div className="candidateTypes" aria-label="候補カテゴリ">
                {Object.entries(categoryLabels).map(([category, label]) => (
                    <button
                        key={category}
                        className={activeCategory === category ? "selected" : ""}
                        type="button"
                        onClick={() => changeCategory(category)}
                    >
                        <span>{category === "destination" ? "✎" : category === "spot" ? "⌖" : "⌂"}</span>
                        {label}
                    </button>
                ))}
            </div>

            <div className="candidateBody">
                {activeCategory === "destination" ? (
                    <form className="destinationForm" onSubmit={submitDestination}>
                        <div className="sourceTitle">
                            <div>
                                <strong>旅行先を手入力</strong>
                                <p>都道府県やエリア名を候補に追加できます</p>
                            </div>
                        </div>
                        <label>
                            <span>旅行先</span>
                            <input
                                value={destinationName}
                                onChange={(event) => setDestinationName(event.target.value)}
                                placeholder="例：三重県（伊勢・鳥羽）"
                            />
                        </label>
                        <label>
                            <span>ひとことメモ</span>
                            <input
                                value={destinationDescription}
                                onChange={(event) => setDestinationDescription(event.target.value)}
                                placeholder="例：伊勢神宮と海の幸を楽しみたい"
                            />
                        </label>
                        <button type="submit">候補に追加</button>
                    </form>
                ) : (
                    <div className="favoriteSource">
                        <div className="sourceTitle">
                            <div className="favoriteMark" aria-hidden="true">♥</div>
                            <div>
                                <strong>お気に入りから追加</strong>
                                <p>
                                    {activeCategory === "spot"
                                        ? "保存した観光スポットから候補を選びます"
                                        : "保存したホテル・コテージから候補を選びます"}
                                </p>
                            </div>
                        </div>
                        <button type="button" onClick={() => setFavoritePickerOpen((open) => !open)}>
                            {favoritePickerOpen ? "閉じる" : "お気に入りを選ぶ"}
                        </button>
                        {favoritePickerOpen && (
                            <div className="favoriteEmpty">
                                <span aria-hidden="true">♡</span>
                                <strong>お気に入りのDB連携準備中</strong>
                                <p>お気に入りテーブル接続後、ここに保存済みの項目を表示します。</p>
                            </div>
                        )}
                    </div>
                )}

                {notice && <p className="candidateNotice" role="status">{notice}</p>}
                {usingFallback && (
                    <p className="previewNotice">APIに接続できないため、サンプルデータを表示しています。</p>
                )}

                <div className="candidateListHeader">
                    <div>
                        <strong>{categoryLabels[activeCategory]}の候補</strong>
                        <span>{visibleCandidates.length}件</span>
                    </div>
                    <small>投票先はいつでも変更できます</small>
                </div>

                <div className="candidateList">
                    {loading ? (
                        <div className="candidateEmpty">候補を読み込んでいます…</div>
                    ) : visibleCandidates.length === 0 ? (
                        <div className="candidateEmpty">
                            <strong>候補はまだありません</strong>
                            <p>
                                {activeCategory === "destination"
                                    ? "上の入力欄から旅行先を追加してください。"
                                    : "お気に入りから候補を追加してください。"}
                            </p>
                        </div>
                    ) : (
                        visibleCandidates.map((candidate) => (
                            <article
                                className={`candidateCard ${candidate.has_voted ? "selected" : ""}`}
                                key={candidate.candidate_id}
                            >
                                <div className="candidateIcon">
                                    <CandidateVisual candidate={candidate} />
                                </div>
                                <div className="candidateInfo">
                                    <span>{categoryLabels[candidate.candidate_type]}</span>
                                    <h3>{candidate.candidate_name}</h3>
                                    {candidate.description && <p>{candidate.description}</p>}
                                    <div className="voteSummary">
                                        <b>{candidate.vote_count}票</b>
                                        {candidate.has_voted && <span>あなたの投票</span>}
                                    </div>
                                </div>
                                <button
                                    className="candidateVoteButton"
                                    type="button"
                                    aria-pressed={candidate.has_voted}
                                    onClick={() => voteForCandidate(candidate.candidate_id)}
                                >
                                    {candidate.has_voted ? "投票中 ✓" : "この候補に投票"}
                                </button>
                            </article>
                        ))
                    )}
                </div>
            </div>
        </section>
    );
}

export default TravelOptions;
