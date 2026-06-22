import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import Modal from "../Modal/Modal";
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
    },
    {
        candidate_id: 2,
        candidate_type: "destination",
        candidate_name: "京都府",
        description: "歴史ある街並みとグルメを楽しめる旅行先",
        img_url: "",
    },
    {
        candidate_id: 3,
        candidate_type: "spot",
        candidate_name: "伊勢神宮",
        description: "お気に入りから追加されたスポット",
        img_url: "",
    },
    {
        candidate_id: 4,
        candidate_type: "hotel",
        candidate_name: "鳥羽シーサイドコテージ",
        description: "お気に入りから追加された宿泊先",
        img_url: "",
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
    const [selectedCandidate, setSelectedCandidate] = useState(null);
    const [loading, setLoading] = useState(true);
    const [notice, setNotice] = useState("");
    const [usingFallback, setUsingFallback] = useState(false);

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

    const changeCategory = (category) => {
        setActiveCategory(category);
        setNotice("");
    };

    return (
        <section className="candidatePanel" aria-label="旅行候補" hidden={!active}>
            <header className="candidateHeading">
                <div>
                    <span className="sectionKicker">みんなで候補を集める</span>
                    <h2>旅行の候補</h2>
                    {tripTitle && <p>{tripTitle}</p>}
                </div>
                <a className="addCandidateButton" href="#">
                    候補に追加
                </a>
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
                {notice && <p className="candidateNotice" role="status">{notice}</p>}
                {usingFallback && (
                    <p className="previewNotice">APIに接続できないため、サンプルデータを表示しています。</p>
                )}

                <div className="candidateListHeader">
                    <div>
                        <strong>{categoryLabels[activeCategory]}の候補</strong>
                        <span>{visibleCandidates.length}件</span>
                    </div>
                </div>

                <div className="candidateList">
                    {loading ? (
                        <div className="candidateEmpty">候補を読み込んでいます…</div>
                    ) : visibleCandidates.length === 0 ? (
                        <div className="candidateEmpty">
                            <strong>候補はまだありません</strong>
                            <p>「候補に追加」ボタンから追加してください。</p>
                        </div>
                    ) : (
                        visibleCandidates.map((candidate) => (
                            <button
                                className={`candidateCard candidateCard--${candidate.candidate_type}`}
                                type="button"
                                key={candidate.candidate_id}
                                onClick={() => setSelectedCandidate(candidate)}
                            >
                                {candidate.candidate_type !== "destination" && (
                                    <div className="candidateIcon">
                                        <CandidateVisual candidate={candidate} />
                                    </div>
                                )}
                                <div className="candidateInfo">
                                    <div className="candidateMeta">
                                        <span>{categoryLabels[candidate.candidate_type]}</span>
                                        {candidate.candidate_type === "destination" && (
                                            <small>行き先候補</small>
                                        )}
                                    </div>
                                    <h3>{candidate.candidate_name}</h3>
                                    {candidate.description && <p>{candidate.description}</p>}
                                    <span className="candidateDetailLink">詳細を見る</span>
                                </div>
                                <span className="candidateChevron" aria-hidden="true">›</span>
                            </button>
                        ))
                    )}
                </div>
            </div>

            <Modal isOpen={selectedCandidate !== null} onClose={() => setSelectedCandidate(null)}>
                {selectedCandidate && (
                    <div className="candidateDetail">
                        <div className="candidateModalHeader">
                            <div>
                                <span>{categoryLabels[selectedCandidate.candidate_type]}</span>
                                <h3>{selectedCandidate.candidate_name}</h3>
                            </div>
                            <button
                                type="button"
                                aria-label="閉じる"
                                onClick={() => setSelectedCandidate(null)}
                            >
                                ×
                            </button>
                        </div>
                        {selectedCandidate.candidate_type !== "destination" && (
                            <div className="candidateDetailVisual">
                                <CandidateVisual candidate={selectedCandidate} />
                            </div>
                        )}
                        <div className="candidateDetailBody">
                            <strong>詳細</strong>
                            <p>{selectedCandidate.description || "詳細情報はまだありません。"}</p>
                        </div>
                    </div>
                )}
            </Modal>
        </section>
    );
}

export default TravelOptions;
