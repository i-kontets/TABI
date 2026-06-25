import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import "./Chat.css";

const chatApiBase = `${import.meta.env.BASE_URL}api/Chat`;
const pollingIntervalMs = 3000;

async function parseApiResponse(response) {
    const data = await response.json().catch(() => null);

    if (!response.ok || !data?.success) {
        throw new Error(data?.message || "チャットAPIとの通信に失敗しました");
    }

    return data;
}

function applyReadStatusesToMessages(messages, reads) {
    const statusByMessageId = new Map(
        reads.map((read) => [Number(read.message_id), read]),
    );

    return messages.map((message) => {
        const status = statusByMessageId.get(Number(message.message_id ?? message.id));

        if (!status) {
            return message;
        }

        return {
            ...message,
            readCount: Number(status.read_count),
            read_count: Number(status.read_count),
            isRead: Boolean(status.is_read),
        };
    });
}

function Chat({ active }) {
    const { groupId: pathGroupId } = useParams();
    const location = useLocation();
    const queryGroupId = new URLSearchParams(location.search).get("groupId");
    const groupId = pathGroupId || queryGroupId || "1";

    const [draft, setDraft] = useState("");
    const [messages, setMessages] = useState([]);
    const [chatId, setChatId] = useState(null);
    const [memberCount, setMemberCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [notice, setNotice] = useState("");
    const messageListRef = useRef(null);
    const textareaRef = useRef(null);
    const pollingRef = useRef(false);

    const applyReadStatuses = useCallback((reads) => {
        setMessages((currentMessages) => applyReadStatusesToMessages(currentMessages, reads));
    }, []);

    const markMessagesAsRead = useCallback(async (targetChatId, signal) => {
        const response = await fetch(`${chatApiBase}/Reads.php`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            credentials: "include",
            body: JSON.stringify({ chat_id: targetChatId }),
            signal,
        });
        const data = await parseApiResponse(response);
        applyReadStatuses(data.reads || []);
    }, [applyReadStatuses]);

    const loadMessages = useCallback(async (options = {}) => {
        const { signal, showLoading = true, showNotice = true } = options;

        if (showLoading) {
            setLoading(true);
        }

        if (showNotice) {
            setNotice("");
        }

        try {
            const query = chatId
                ? `chat_id=${encodeURIComponent(chatId)}`
                : `group_id=${encodeURIComponent(groupId)}`;
            const response = await fetch(`${chatApiBase}/Messages.php?${query}`, {
                credentials: "include",
                signal,
            });
            const data = await parseApiResponse(response);
            const resolvedChatId = Number(data.chat_id);

            setChatId(resolvedChatId);
            setMemberCount(Number(data.member_count || data.contact?.memberCount || 0));
            setMessages(data.messages || []);

            if (resolvedChatId) {
                await markMessagesAsRead(resolvedChatId, signal);
            }
        } catch (error) {
            if (error.name !== "AbortError" && showNotice) {
                setMessages([]);
                setNotice(error.message);
            }
        } finally {
            if (!signal?.aborted && showLoading) {
                setLoading(false);
            }
        }
    }, [chatId, groupId, markMessagesAsRead]);

    useEffect(() => {
        if (!active) {
            return undefined;
        }

        const controller = new AbortController();
        loadMessages({ signal: controller.signal });

        return () => controller.abort();
    }, [active, loadMessages]);

    useEffect(() => {
        if (!active || !chatId) {
            return undefined;
        }

        const intervalId = window.setInterval(async () => {
            if (pollingRef.current) {
                return;
            }

            pollingRef.current = true;

            try {
                await loadMessages({
                    showLoading: false,
                    showNotice: false,
                });
            } finally {
                pollingRef.current = false;
            }
        }, pollingIntervalMs);

        return () => window.clearInterval(intervalId);
    }, [active, chatId, loadMessages]);

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
            const readLabel = memberCount > 2 ? `既読 ${message.readCount}` : "既読";

            return (
                <div className="chatBlock" key={message.id}>
                    {showDate && <div className="dateChip">{message.date}</div>}
                    <article className={`messageRow ${message.isMine ? "mine" : ""}`}>
                        <div className="messageStack">
                            {!message.isMine && (
                                <div className="userHeader">
                                    <div className="avatar">
                                        {message.avatar}
                                    </div>
                                    <span className="senderName">
                                        {message.sender}
                                    </span>
                                </div>
                            )}
                            <div className="bubbleLine">
                                {message.isMine && (
                                    <div className="messageMeta mineMeta">
                                        {message.readCount > 0 && (
                                            <span>{readLabel}</span>
                                        )}
                                        <time>{message.time}</time>
                                    </div>
                                )}
                                <div className="bubble">{message.text}</div>
                                {!message.isMine && (
                                    <div className="messageMeta">
                                        <time>{message.time}</time>
                                    </div>
                                )}
                            </div>
                        </div>
                    </article>
                </div>
            );
        });
    }, [memberCount, messages]);

    const sendMessage = async (event) => {
        event.preventDefault();

        const text = draft.trim();

        if (!text || sending) {
            return;
        }

        setSending(true);
        setNotice("");

        try {
            const response = await fetch(`${chatApiBase}/Send.php`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                credentials: "include",
                body: JSON.stringify(
                    chatId
                        ? { chat_id: chatId, body: text }
                        : { group_id: groupId, body: text },
                ),
            });
            const data = await parseApiResponse(response);

            setChatId(Number(data.message.chat_id));
            setMessages((currentMessages) => [
                ...currentMessages,
                data.message,
            ]);
            setDraft("");

            if (textareaRef.current) {
                textareaRef.current.style.height = "40px";
            }
        } catch (error) {
            setNotice(error.message);
        } finally {
            setSending(false);
        }
    };

    return (
        <section className="chatPanel" aria-label="チャット" hidden={!active}>
            <div className="messageList" ref={messageListRef}>
                {notice && (
                    <p className="chatNotice" role="alert">{notice}</p>
                )}
                {loading ? (
                    <p className="chatState">メッセージを読み込んでいます...</p>
                ) : messages.length === 0 && !notice ? (
                    <p className="chatState">まだメッセージはありません。</p>
                ) : (
                    chatContent
                )}
            </div>
            <form className="composer" onSubmit={sendMessage}>
                <textarea
                    ref={textareaRef}
                    value={draft}
                    onChange={(event) => {
                        setDraft(event.target.value);
                        event.target.style.height = "auto";
                        event.target.style.height = `${event.target.scrollHeight}px`;
                    }}
                    placeholder="メッセージを入力..."
                    aria-label="メッセージ"
                    rows={1}
                    disabled={sending}
                />
                <button
                    className="sendButton"
                    type="submit"
                    aria-label="送信"
                    disabled={sending || draft.trim() === ""}
                >
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