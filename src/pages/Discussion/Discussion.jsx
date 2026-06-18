import { useLayoutEffect, useMemo, useRef, useState } from "react";
import Header from "../../components/header/Header";
import BottomNav from "../../components/bottomNav/BottomNav";
import "./Discussion.css";

const trip = {
    title: "三重旅行",
    dates: "2026/05/14 - 05/16",
    members: ["さくら", "たくや", "みほ", "ゆうき"],
};

const tabs = [
    { id: "chat", label: "話し合い" },
    { id: "candidate", label: "候補" },
    { id: "poll", label: "投票" },
];

const initialMessages = [
    {
        id: 1,
        date: "2026年5月10日 日曜日",
        sender: "さくら",
        avatar: "桜",
        text: "みんな、どこに行きたい？伊勢神宮は外せないよね〜！",
        time: "10:30",
        readCount: 3,
    },
    {
        id: 2,
        date: "2026年5月10日 日曜日",
        sender: "たくや",
        avatar: "拓",
        text: "鳥羽の水族館も行きたい！イルカショー見たい",
        time: "10:32",
        readCount: 3,
    },
    {
        id: 3,
        date: "2026年5月10日 日曜日",
        sender: "みほ",
        avatar: "美",
        text: "宿泊は温泉付きがいいな〜",
        time: "10:33",
        readCount: 2,
    },
    {
        id: 4,
        date: "2026年5月11日 月曜日",
        sender: "ゆうき",
        avatar: "悠",
        text: "予算は1人2万円くらいでおさえたいかも！",
        time: "09:18",
        readCount: 2,
    },
    {
        id: 5,
        date: "2026年5月11日 月曜日",
        sender: "自分",
        avatar: "自",
        text: "伊勢神宮 + 水族館のルートよさそう！移動時間も見てみるね",
        time: "09:24",
        readCount: 3,
        isMine: true,
    },
    {
        id: 6,
        date: "2026年5月11日 月曜日",
        sender: "さくら",
        avatar: "桜",
        text: "賛成！宿もそのあたりで探そう",
        time: "09:26",
        readCount: 3,
    },
];

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

function Discussion() {
    const [activeTab, setActiveTab] = useState("chat");
    const [draft, setDraft] = useState("");
    const [messages, setMessages] = useState(initialMessages);
    const messageListRef = useRef(null);

    useLayoutEffect(() => {
        const messageList = messageListRef.current;

        if (activeTab === "chat" && messageList) {
            messageList.scrollTo({
                top: messageList.scrollHeight,
                behavior: "auto",
            });
        }
    }, [activeTab, messages.length]);

    const chatContent = useMemo(() => {
        return messages.map((message, index) => {
            const showDate = index === 0 || message.date !== messages[index - 1].date;

            return (
                <div className="chatBlock" key={message.id}>
                    {showDate && <div className="dateChip">{message.date}</div>}
                    <article className={`messageRow ${message.isMine ? "mine" : ""}`}>
                        {!message.isMine && <div className="avatar">{message.avatar}</div>}
                        <div className="messageStack">
                            {!message.isMine && <span className="senderName">{message.sender}</span>}
                            <div className="bubbleLine">
                                {message.isMine && (
                                    <div className="messageMeta mineMeta">
                                        <span>既読 {message.readCount}</span>
                                        <time>{message.time}</time>
                                    </div>
                                )}
                                <div className="bubble">{message.text}</div>
                                {!message.isMine && (
                                    <div className="messageMeta">
                                        <span>既読 {message.readCount}</span>
                                        <time>{message.time}</time>
                                    </div>
                                )}
                            </div>
                        </div>
                    </article>
                </div>
            );
        });
    }, [messages]);

    const sendMessage = (event) => {
        event.preventDefault();
        const text = draft.trim();

        if (!text) {
            return;
        }

        const now = new Date();
        const dateFormatter = new Intl.DateTimeFormat("ja-JP", {
            year: "numeric",
            month: "long",
            day: "numeric",
            weekday: "long",
        });
        const timeFormatter = new Intl.DateTimeFormat("ja-JP", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
        });

        setMessages((currentMessages) => [
            ...currentMessages,
            {
                id: Date.now(),
                date: dateFormatter.format(now),
                sender: "自分",
                avatar: "自",
                text,
                time: timeFormatter.format(now),
                readCount: 0,
                isMine: true,
            },
        ]);
        setDraft("");
    };

    return (
        <main className="discussionShell">
            <section className="phoneFrame" aria-label="旅行グループの話し合い">
                <Header tripName={trip.title} />

                <nav className="tabBar" aria-label="話し合いメニュー">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            className={activeTab === tab.id ? "active" : ""}
                            type="button"
                            onClick={() => setActiveTab(tab.id)}
                        >
                            {tab.label}
                        </button>
                    ))}
                </nav>

                <div className="contentArea">
                    {activeTab === "chat" && (
                        <section className="chatPanel" aria-label="チャット">
                            <div className="memberPill">
                                <span>{trip.members.length}人が参加中</span>
                                <div className="miniAvatars" aria-hidden="true">
                                    {trip.members.map((member) => (
                                        <span key={member}>{member.slice(0, 1)}</span>
                                    ))}
                                </div>
                            </div>
                            <div className="messageList" ref={messageListRef}>
                                {chatContent}
                            </div>
                            <form className="composer" onSubmit={sendMessage}>
                                <button type="button" aria-label="画像を追加">
                                    <svg viewBox="0 0 24 24" aria-hidden="true">
                                        <rect x="4" y="5" width="16" height="14" rx="3" />
                                        <path d="m8 15 3-3 3 3 2-2 3 4" />
                                        <path d="M8.5 9.5h.01" />
                                    </svg>
                                </button>
                                <input
                                    value={draft}
                                    onChange={(event) => setDraft(event.target.value)}
                                    placeholder="メッセージを入力..."
                                    aria-label="メッセージ"
                                />
                                <button className="sendButton" type="submit" aria-label="送信">
                                    <svg viewBox="0 0 24 24" aria-hidden="true">
                                        <path d="m22 2-7 20-4-9-9-4 20-7Z" />
                                        <path d="M22 2 11 13" />
                                    </svg>
                                </button>
                            </form>
                        </section>
                    )}

                    {activeTab === "candidate" && (
                        <section className="candidatePanel" aria-label="旅行先の候補">
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
                    )}

                    {activeTab === "poll" && (
                        <section className="pollPanel" aria-label="投票">
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
                    )}
                </div>

                <BottomNav />
            </section>
        </main>
    );
}

export default Discussion;
