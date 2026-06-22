import { useLayoutEffect, useMemo, useRef, useState } from "react";
import "./Chat.css";

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

function Chat({ members, active }) {
    const [draft, setDraft] = useState("");
    const [messages, setMessages] = useState(initialMessages);
    const messageListRef = useRef(null);

    useLayoutEffect(() => {
        const messageList = messageListRef.current;

        if (active && messageList) {
            messageList.scrollTo({
                top: messageList.scrollHeight,
                behavior: "auto",
            });
        }
    }, [active, messages.length]);

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
        <section className="chatPanel" aria-label="チャット" hidden={!active}>
            <div className="memberPill">
                <span>{members.length}人が参加中</span>
                <div className="miniAvatars" aria-hidden="true">
                    {members.map((member) => (
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
    );
}

export default Chat;
