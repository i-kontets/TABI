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
const listPollingIntervalMs = 10000; // 一覧は10秒ごとで十分

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
    const pollingRef       = useRef(false);
    const lastMessageIdRef = useRef(0);   // 差分ポーリング用：最後に受信したmessage_id
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
            const msgs = data.messages || [];
            setMessages(msgs);
            // 差分ポーリング用に最大IDを記録
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

    // 差分ポーリング：Since.php で新着のみ取得してリストに追記
    const pollNewMessages = useCallback(async (chatId) => {
        if (!chatId) return;
        try {
            const response = await fetch(
                `${chatApiBase}/Since.php?chat_id=${encodeURIComponent(chatId)}&after_id=${lastMessageIdRef.current}`,
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

            // 最大IDを更新
            const maxId = data.messages.reduce((max, m) => Math.max(max, m.message_id ?? 0), 0);
            if (maxId > lastMessageIdRef.current) lastMessageIdRef.current = maxId;

            // 新着を既読にする
            await markMessagesAsRead(chatId).catch(() => {});
        } catch {
            // silent
        }
    }, [markMessagesAsRead]);

    // 初回：コンタクト一覧 + 最初のチャットメッセージを読み込む
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

    // 差分ポーリング：3秒ごとに新着メッセージを追記、10秒ごとにコンタクト一覧も更新
    useEffect(() => {
        if (!activeContactId) return undefined;

        let msgTick = 0;

        const intervalId = window.setInterval(async () => {
            if (pollingRef.current) return;
            pollingRef.current = true;
            try {
                await pollNewMessages(activeContactId);
                msgTick++;
                // コンタクト一覧は10秒に1回（3回に1回）
                if (msgTick % Math.round(listPollingIntervalMs / pollingIntervalMs) === 0) {
                    await loadContacts(undefined, { showNotice: false });
                }
            } finally {
                pollingRef.current = false;
            }
        }, pollingIntervalMs);

        return () => window.clearInterval(intervalId);
    }, [activeContactId, pollNewMessages, loadContacts]);

    // サイドバーから会話相手を選んだときに、その相手の会話を開く。
    useEffect(() => {
        const handleRealtimeChatUpdate = () => {
            loadContacts(undefined, { showNotice: false });
            if (activeContactId) {
                loadMessages(activeContactId, undefined, { showLoading: false, showNotice: false });
            }
        };

        window.addEventListener('user:chat_message_created', handleRealtimeChatUpdate);
        window.addEventListener('user:chat_message_updated', handleRealtimeChatUpdate);
        window.addEventListener('user:chat_message_deleted', handleRealtimeChatUpdate);

        return () => {
            window.removeEventListener('user:chat_message_created', handleRealtimeChatUpdate);
            window.removeEventListener('user:chat_message_updated', handleRealtimeChatUpdate);
            window.removeEventListener('user:chat_message_deleted', handleRealtimeChatUpdate);
        };
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

    const handleImageUpload = async (file) => {
        if (!activeContactId || sending) return;
        setSending(true);
        setNotice('');
        try {
            // 1. 画像をアップロード
            const formData = new FormData();
            formData.append('image', file);
            const uploadRes = await fetch(`${chatApiBase}/Upload.php`, {
                method: 'POST',
                credentials: 'include',
                body: formData,
            });
            const uploadData = await parseApiResponse(uploadRes);

            // 2. image_url を含めてメッセージ送信
            const sendRes = await fetch(`${chatApiBase}/Send.php`, {
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

    // 送信フォームの送信処理。
    // 空文字、送信中、相手未選択の場合は何もしない。
    

    // モバイル表示での戻る操作。
    // ブラウザ履歴へ戻ることで、直前画面へ自然に戻れるようにする。
    const handleBackToApp = () => {
        window.history.back();
    };

    return (
        <div className={`${styles.appContainer} ${isMobileChatView ? styles.mobileChatActive : ''}`}>
            {/* 左側: グローバルナビとチャット相手一覧 */}
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

            {/* 右側: チャットヘッダー、メッセージ一覧、入力欄 */}
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
                    <MessageList messages={messages} memberCount={activeContact?.memberCount || 0} />
                )}

                <MessageInput
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    onSubmit={handleSendMessage}
                    onImageUpload={handleImageUpload}
                    disabled={sending || !activeContactId}
                />
            </div>
        </div>
    );
};

export default Chat;
