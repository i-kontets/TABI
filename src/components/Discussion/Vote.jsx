import "./Vote.css";

const polls = [
    {
        id: 1,
        title: "旅行の日程はどれがいい？",
        limit: "回答期限：5/10（土）12:00",
        options: [
            { id: 1, label: "5/14（木）〜 5/16（土）", count: 3, selected: true },
            { id: 2, label: "5/15（金）〜 5/17（日）", count: 2 },
            { id: 3, label: "5/21（木）〜 5/23（土）", count: 1 },
        ],
    },
    {
        id: 2,
        title: "予算はどのくらいが理想？",
        limit: "回答期限：5/10（土）12:00",
        options: [
            { id: 1, label: "〜1.5万円", count: 1 },
            { id: 2, label: "1.5〜2万円", count: 3, selected: true },
            { id: 3, label: "2〜2.5万円", count: 1 },
            { id: 4, label: "2.5万円〜", count: 0 },
        ],
    },
];

function Vote({ active }) {
    return (
        <section className="pollPanel" aria-label="投票" hidden={!active}>
            <div className="sectionHeader">
                <div>
                    <span className="sectionKicker">進行中</span>
                    <h2>アンケート</h2>
                </div>
                <button type="button">+ 作成</button>
            </div>

            <div className="pollList">
                {polls.map((poll) => (
                    <article className="pollCard" key={poll.id}>
                        <h3>{poll.title}</h3>
                        <p>{poll.limit}</p>
                        <div className="pollOptions">
                            {poll.options.map((option) => {
                                const max = Math.max(...poll.options.map((item) => item.count), 1);
                                const width = `${(option.count / max) * 100}%`;

                                return (
                                    <button className={option.selected ? "selected" : ""} type="button" key={option.id}>
                                        <span className="pollFill" style={{ width }} />
                                        <span className="pollLabel">{option.label}</span>
                                        <span className="pollCount">{option.count}人</span>
                                        {option.selected && <span className="checkMark">✓</span>}
                                    </button>
                                );
                            })}
                        </div>
                    </article>
                ))}
            </div>
        </section>
    );
}

export default Vote;
