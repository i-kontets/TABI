import "./TravelOptions.css";

const candidates = [
    {
        id: 1,
        type: "旅行先",
        icon: "castle",
        name: "三重県（伊勢・鳥羽エリア）",
        description: "伊勢神宮や鳥羽水族館、海の幸も楽しめる！",
        votes: 4,
        total: 6,
        selected: true,
    },
    {
        id: 2,
        type: "旅行先",
        icon: "gate",
        name: "京都府",
        description: "観光スポットが多くて、歴史やグルメも充実！",
        votes: 2,
        total: 6,
    },
    {
        id: 3,
        type: "旅行先",
        icon: "tree",
        name: "長野県（軽井沢）",
        description: "自然を満喫できて、ゆっくりリフレッシュできる！",
        votes: 0,
        total: 6,
    },
];

function Icon({ name }) {
    if (name === "castle") {
        return (
            <svg viewBox="0 0 40 40" aria-hidden="true">
                <path d="M9 34h22v-9H9v9Z" />
                <path d="M12 25h16v-7H12v7Z" />
                <path d="M15 18h10v-6H15v6Z" />
                <path d="M11 12h18l-3-5-3 5-3-5-3 5-3-5-3 5Z" />
            </svg>
        );
    }

    if (name === "gate") {
        return (
            <svg viewBox="0 0 40 40" aria-hidden="true">
                <path d="M8 10h24v5H8z" />
                <path d="M11 17h18v4H11z" />
                <path d="M13 21h4v13h-4zM23 21h4v13h-4z" />
            </svg>
        );
    }

    return (
        <svg viewBox="0 0 40 40" aria-hidden="true">
            <path d="M20 6 8 23h7l-5 8h20l-5-8h7L20 6Z" />
            <path d="M18 30h4v6h-4z" />
        </svg>
    );
}

function TravelOptions({ active }) {
    return (
        <section className="candidatePanel" aria-label="旅行先の候補" hidden={!active}>
            <div className="sectionHeader">
                <div>
                    <span className="sectionKicker">旅行先</span>
                    <h2>候補を比較</h2>
                </div>
                <button type="button">+ 候補を追加</button>
            </div>

            <div className="candidateTypes" aria-label="候補カテゴリ">
                {["旅行先", "スポット", "宿泊先", "飲食店"].map((type) => (
                    <button key={type} className={type === "旅行先" ? "selected" : ""} type="button">
                        {type}
                    </button>
                ))}
            </div>

            <div className="candidateList">
                {candidates.map((candidate) => {
                    const percent = Math.round((candidate.votes / candidate.total) * 100);

                    return (
                        <article className={`candidateCard ${candidate.selected ? "selected" : ""}`} key={candidate.id}>
                            <div className="candidateIcon">
                                <Icon name={candidate.icon} />
                            </div>
                            <div className="candidateInfo">
                                <span>{candidate.type}</span>
                                <h3>{candidate.name}</h3>
                                <p>{candidate.description}</p>
                                <div className="voteLine">
                                    <div className="voteTrack">
                                        <span style={{ width: `${percent}%` }} />
                                    </div>
                                    <b>{candidate.votes}票</b>
                                    <small>({percent}%)</small>
                                </div>
                            </div>
                            <button type="button">{candidate.selected ? "投票済" : "投票する"}</button>
                        </article>
                    );
                })}
            </div>
        </section>
    );
}

export default TravelOptions;
