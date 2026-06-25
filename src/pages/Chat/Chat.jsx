import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import styles from './Chat.module.css';
import GlobalNav from '../../components/GlobalNav/GlobalNav';
import ChatSidebar from '../../components/ChatSidebar/ChatSidebar';
import ChatHeader from '../../components/ChatHeader/ChatHeader';
import MessageList from '../../components/MessageList/MessageList';
import MessageInput from '../../components/MessageInput/MessageInput';

const chatApiBase = `${import.meta.env.BASE_URL}api/Chat`;
const pollingIntervalMs = 3000;

async function parseApiResponse(response) {
    const data = await response.json().catch(() => null);

    if (!response.ok || !data?.success) {
        throw new Error(data?.message || 'チャットAPIとの通信に失敗しました。');
    }

    return data;
}

function mergeReadStatuses(messages, reads) {
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

const Chat = () => {
    const location = useLocation();
    const pollingRef = useRef(false);
    const [activeCategory, setActiveCategory] = useState('all');
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
    const filteredContacts = activeCategory === 'all'
        ? contacts
        : contacts.filter((contact) => contact.category === activeCategory);

    const loadContacts = useCallback(async (signal = undefined, options = {}) => {
        const { showNotice = true } = options;

        try {
            const response = await fetch(`${chatApiBase}/List.php`, {
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
        const response = await fetch(`${chatApiBase}/Reads.php`, {
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
                `${chatApiBase}/Messages.php?chat_id=${encodeURIComponent(chatId)}`,
                {
                    credentials: 'include',
                    signal,
                },
            );
            const data = await parseApiResponse(response);
            const resolvedChatId = Number(data.chat_id || chatId);

            setActiveContactId(resolvedChatId);
            setMessages(data.messages || []);
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

    useEffect(() => {
        const controller = new AbortController();

        const initialize = async () => {
            setLoading(true);
            setNotice('');

            const nextContacts = await loadContacts(controller.signal);
            const requestedId = requestedChatId ? Number(requestedChatId) : null;
            const firstChatId = requestedId || nextContacts[0]?.id || null;

            setActiveContactId(firstChatId);
            await loadMessages(firstChatId, controller.signal, {
                showLoading: false,
            });

            if (!controller.signal.aborted) {
                setLoading(false);
            }
        };

        initialize();

        return () => controller.abort();
    }, [loadContacts, loadMessages, requestedChatId]);

    useEffect(() => {
        if (!activeContactId) {
            return undefined;
        }

        const intervalId = window.setInterval(async () => {
            if (pollingRef.current) {
                return;
            }

            pollingRef.current = true;

            try {
                await loadContacts(undefined, { showNotice: false });
                await loadMessages(activeContactId, undefined, {
                    showLoading: false,
                    showNotice: false,
                });
            } finally {
                pollingRef.current = false;
            }
        }, pollingIntervalMs);

        return () => window.clearInterval(intervalId);
    }, [activeContactId, loadContacts, loadMessages]);

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
            const response = await fetch(`${chatApiBase}/Send.php`, {
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

    const handleBackToApp = () => {
        window.history.back();
    };

    return (
        <div className={`${styles.appContainer} ${isMobileChatView ? styles.mobileChatActive : ''}`}>
            <div className={styles.sidebarWrapper}>
                <GlobalNav
                    activeCategory={activeCategory}
                    onSelectCategory={setActiveCategory}
                    onBack={handleBackToApp}
                />
                <ChatSidebar
                    contacts={filteredContacts}
                    activeId={activeContactId}
                    onSelect={handleContactSelect}
                />
            </div>

            <div className={styles.mainArea}>
                <ChatHeader
                    contact={activeContact}
                    reservation={null}
                    onMobileBack={() => setIsMobileChatView(false)}
                />

                {notice && (
                    <div className={styles.stateMessage} role="alert">
                        {notice}
                    </div>
                )}

                {loading ? (
                    <div className={styles.stateMessage}>メッセージを読み込んでいます...</div>
                ) : messages.length === 0 ? (
                    <div className={styles.stateMessage}>まだメッセージはありません。</div>
                ) : (
                    <MessageList messages={messages} />
                )}

                <MessageInput
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    onSubmit={handleSendMessage}
                    disabled={sending || !activeContactId}
                />
            </div>
        </div>
    );
};

export default Chat;