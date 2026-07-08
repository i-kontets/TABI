import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import './CottageChatPage.css';

const cottageChatApiBase = `${import.meta.env.BASE_URL}api/CottageChat`;
const pollingIntervalMs = 3000;
const listPollingIntervalMs = 10000;


async function parseApiResponse(response) {
    const data = await response.json().catch(() => null);

    if (!response.ok || !data?.success) {
        throw new Error(data?.message || 'CottageChat API エラー');
    }

    return data;
}

function mergeReadStatuses(messages, reads) {
    const statusByMessageId = new Map(reads.map((read) => [Number(read.message_id), read]));

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

export default function CottageChatPage({ active, isAdmin = false }) {
    const location = useLocation();
    const pollingRef = useRef(false);
    const lastMessageIdRef = useRef(0);
    const [activeContactId, setActiveContactId] = useState(null);
    const [contacts, setContacts] = useState([]);
    const [messages, setMessages] = useState([]);
    const [draft, setDraft] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [notice, setNotice] = useState('');
    const [isMobileChatView, setIsMobileChatView] = useState(false);

    const urlParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
    const requestedChatId = urlParams.get('chat_id') || urlParams.get('chatId');

    const activeContact = contacts.find((contact) => contact.id === activeContactId) || null;
    const loadContacts = useCallback(async (signal = undefined, options = {}) => {
        const { showNotice = true } = options;

        try {
            const response = await fetch(`${cottageChatApiBase}/List.php`, {
                credentials: 'include',
                signal,
            });
            const data = await parseApiResponse(response);
            const nextContacts = data.contacts || [];

            setContacts(nextContacts);
            return nextContacts;
        } catch (error) {
            if (error.name !== 'AbortError' && showNotice) {
                setNotice(error.message);
            }
            return [];
        }
    }, []);

    const markMessagesAsRead = useCallback(async (chatId, signal = undefined) => {
        const response = await fetch(`${cottageChatApiBase}/Read.php`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({ chat_id: chatId }),
            signal,
        });
        const data = await parseApiResponse(response);

        setMessages((currentMessages) => mergeReadStatuses(currentMessages, data.reads || []));
    }, []);

    const loadMessages = useCallback(async (chatId, signal = undefined, options = {}) => {
        const { showLoading = true, showNotice = true } = options;

        if (!chatId) {
            setMessages([]);
            return;
        }

        if (showLoading) {
            setLoading(true);
        }

        if (showNotice) {
            setNotice('');
        }

        try {
            const response = await fetch(
                `${cottageChatApiBase}/Messages.php?chat_id=${encodeURIComponent(chatId)}`,
                {
                    credentials: 'include',
                    signal,
                },
            );
            const data = await parseApiResponse(response);
            const resolvedChatId = Number(data.chat_id || chatId);

            setActiveContactId(resolvedChatId);
            const msgs = data.messages || [];
            setMessages(msgs);
            const maxId = msgs.reduce((max, m) => Math.max(max, m.message_id ?? 0), 0);
            lastMessageIdRef.current = maxId;
            await markMessagesAsRead(resolvedChatId, signal);
        } catch (error) {
            if (error.name !== 'AbortError' && showNotice) {
                setMessages([]);
                setNotice(error.message);
            }
        } finally {
            if (!signal?.aborted && showLoading) {
                setLoading(false);
            }
        }
    }, [markMessagesAsRead]);

    const pollNewMessages = useCallback(async (chatId) => {
        if (!chatId) return;

        try {
            const response = await fetch(
                `${cottageChatApiBase}/Messages.php?chat_id=${encodeURIComponent(chatId)}&after_id=${lastMessageIdRef.current}`,
                { credentials: 'include' },
            );
            const data = await response.json().catch(() => null);
            if (!data?.success || !data.messages?.length) return;

            setMessages((prev) => {
                const existingIds = new Set(prev.map((m) => m.message_id));
                const newMsgs = data.messages.filter((m) => !existingIds.has(m.message_id));
                if (!newMsgs.length) return prev;
                return [...prev, ...newMsgs];
            });

            const maxId = data.messages.reduce((max, m) => Math.max(max, m.message_id ?? 0), 0);
            if (maxId > lastMessageIdRef.current) lastMessageIdRef.current = maxId;

            await markMessagesAsRead(chatId).catch(() => { });
        } catch {
            // silent
        }
    }, [markMessagesAsRead]);

    useEffect(() => {
        const controller = new AbortController();

        const initialize = async () => {
            setLoading(true);
            setNotice('');

            const nextContacts = await loadContacts(controller.signal);
            const requestedId = requestedChatId ? Number(requestedChatId) : null;
            const firstChatId = requestedId || nextContacts[0]?.id || null;

            setActiveContactId(firstChatId);
            await loadMessages(firstChatId, controller.signal, { showLoading: false });

            if (!controller.signal.aborted) setLoading(false);
        };

        initialize();
        return () => controller.abort();
    }, [loadContacts, loadMessages, requestedChatId]);

    useEffect(() => {
        if (!activeContactId) return undefined;

        let msgTick = 0;

        const intervalId = window.setInterval(async () => {
            if (pollingRef.current) return;
            pollingRef.current = true;
            try {
                await pollNewMessages(activeContactId);
                msgTick++;
                if (msgTick % Math.round(listPollingIntervalMs / pollingIntervalMs) === 0) {
                    await loadContacts(undefined, { showNotice: false });
                }
            } finally {
                pollingRef.current = false;
            }
        }, pollingIntervalMs);

        return () => window.clearInterval(intervalId);
    }, [activeContactId, pollNewMessages, loadContacts]);

    const handleContactSelect = (id) => {
        setActiveContactId(id);
        setIsMobileChatView(true);
        loadMessages(id);
    };

    const handleSendMessage = async (event) => {
        event.preventDefault();

        const text = draft.trim();
        if (!text || sending || !activeContactId) {
            return;
        }

        setSending(true);
        setNotice('');

        try {
            const response = await fetch(`${cottageChatApiBase}/Send.php`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({
                    chat_id: activeContactId,
                    body: text,
                }),
            });
            const data = await parseApiResponse(response);

            setMessages((currentMessages) => [...currentMessages, data.message]);
            setDraft('');
            await loadContacts(undefined, { showNotice: false });
        } catch (error) {
            setNotice(error.message);
        } finally {
            setSending(false);
        }
    };

    const handleImageUpload = async (file) => {
        if (!activeContactId || sending) return;
        setSending(true);
        setNotice('');
        try {
            const formData = new FormData();
            formData.append('image', file);
            const uploadRes = await fetch(`${cottageChatApiBase}/UploadImage.php`, {
                method: 'POST',
                credentials: 'include',
                body: formData,
            });
            const uploadData = await parseApiResponse(uploadRes);

            const sendRes = await fetch(`${cottageChatApiBase}/Send.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    chat_id: activeContactId,
                    image_url: uploadData.image_url,
                }),
            });
            const sendData = await parseApiResponse(sendRes);

            setMessages((currentMessages) => [...currentMessages, sendData.message]);
            await loadContacts(undefined, { showNotice: false });
        } catch (error) {
            setNotice(error.message);
        } finally {
            setSending(false);
        }
    };

    const handleBackToApp = () => {
        window.history.back();
    };

    const groupedMessages = useMemo(() => (
        messages.map((msg, index) => ({
            msg,
            isNewDate: index === 0 || msg.date !== messages[index - 1]?.date,
        }))
    ), [messages]);

    return (
        <div
            id="appScreen"
            className={`screen ${isMobileChatView ? 'mobileChatActive' : ''} ${isAdmin ? 'admin-view' : ''}`}
        >
            <header className="app-header">
                <span className="hd-logo">TABI コテージ管理人チャット</span>
                <div className="hd-right">
                    <button type="button" className="btn-logout" onClick={handleBackToApp}>
                        戻る
                    </button>
                </div>
            </header>

            <div className="app-body">
                <aside className="list-pane">
                    <div className="list-header">
                        <h2>コテージチャット</h2>
                        <span className="list-sub">{notice || 'コテージごとのメッセージ'}</span>
                    </div>

                    <div className="chat-list">
                        {loading && contacts.length === 0 ? (
                            <div className="loading-txt">読み込み中...</div>
                        ) : contacts.length === 0 ? (
                            <div className="loading-txt">チャットがありません</div>
                        ) : (
                            contacts.map((contact) => {
                                console.log("ADMIN CLASS:", isAdmin);
                                const isActive = contact.id === activeContactId;
                                const preview = contact.lastMessage || 'まだメッセージはありません';

                                return (
                                    <button
                                        key={contact.id}
                                        type="button"
                                        className={`chat-item${isActive ? ' active' : ''}`}
                                        onClick={() => handleContactSelect(contact.id)}
                                    >
                                        <span className="ci-avatar">{contact.avatar}</span>
                                        <span className="ci-body">
                                            <span className="ci-top">
                                                <span className="ci-title">{contact.name}</span>
                                                <span className="ci-time">{contact.time}</span>
                                            </span>
                                            <span className="ci-bot">
                                                <span className="ci-last">{preview}</span>
                                                <span className="ci-badge">{contact.unread || 0}</span>
                                            </span>
                                        </span>
                                    </button>
                                );
                            })
                        )}
                    </div>
                </aside>

                <main className="chat-pane open">
                    <div className="chat-header">
                        <button type="button" className="back-btn" onClick={() => setIsMobileChatView(false)}>
                            一覧
                        </button>
                        <div className="chat-title-block">
                            <h3 className="chat-title">{activeContact?.name || 'コテージチャット'}</h3>
                            <span className="chat-sub">{activeContact?.trip_title || ''}</span>
                        </div>
                        <span className="conn-badge conn-ok">接続中</span>
                    </div>

                    <div className="msg-area">
                        {loading ? (
                            <div className="date-divider">
                                <span className="date-badge">読み込み中...</span>
                            </div>
                        ) : messages.length === 0 ? (
                            <div className="date-divider">
                                <span className="date-badge">メッセージはまだありません</span>
                            </div>
                        ) : (
                            groupedMessages.map(({ msg, isNewDate }) => {
                                const isMine = msg.isMine;
                                return (
                                    <React.Fragment key={msg.id || msg.message_id}>
                                        {isNewDate && (
                                            <div className="date-divider">
                                                <span className="date-badge">{msg.date}</span>
                                            </div>
                                        )}
                                        <div className={`msg-row ${isMine ? 'msg-row-me' : 'msg-row-other'}`}>
                                            {!isMine && (
                                                <div className="msg-avatar">{msg.avatar}</div>
                                            )}
                                            <div className="msg-content">
                                                {!isMine && (
                                                    <div className="sender-line">
                                                        <span className="sender-name">{msg.sender_name || msg.sender}</span>
                                                    </div>
                                                )}
                                                <div className="bubble-wrap">
                                                    {isMine && (
                                                        <div className="meta-me">
                                                            {msg.readCount > 0 && (
                                                                <span className="read-lbl">
                                                                    既読 {msg.readCount}
                                                                </span>
                                                            )}

                                                            <span className="msg-time">
                                                                {msg.time}
                                                            </span>
                                                        </div>
                                                    )}

                                                    <div
                                                        className={
                                                            isMine
                                                                ? "bubble bubble-me"
                                                                : "bubble bubble-other"
                                                        }
                                                    >
                                                        {msg.image_url ? (
                                                            <img
                                                                src={msg.image_url}
                                                                alt="送信画像"
                                                                className="chat-img"
                                                                loading="lazy"
                                                                onClick={() => window.open(msg.image_url, "_blank")}
                                                            />
                                                        ) : (
                                                            msg.text || msg.body
                                                        )}
                                                    </div>

                                                    {!isMine && (
                                                        <div className="meta-other">
                                                            <span className="msg-time">
                                                                {msg.time}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </React.Fragment>
                                );
                            })
                        )}
                    </div>

                    <div className="input-area">
                        <form onSubmit={handleSendMessage}>
                            <button type="button" className="btn-image" aria-label="画像を添付" onClick={() => document.getElementById('cottageChatImageInput')?.click()}>
                                +
                            </button>
                            <input
                                id="cottageChatImageInput"
                                type="file"
                                accept="image/*"
                                hidden
                                onChange={(event) => {
                                    const file = event.target.files?.[0];
                                    if (file) {
                                        handleImageUpload(file);
                                    }
                                    event.target.value = '';
                                }}
                            />
                            <textarea
                                id="msgInput"
                                placeholder="メッセージを入力..."
                                maxLength={1000}
                                rows={1}
                                value={draft}
                                onChange={(event) => setDraft(event.target.value)}
                            />
                            <button type="submit" className="btn-send" aria-label="送信" disabled={sending || !activeContactId}>
                                &gt;
                            </button>
                        </form>
                    </div>
                </main>
            </div>
        </div>
    );
}
