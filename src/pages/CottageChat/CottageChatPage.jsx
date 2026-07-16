/**
 * チャットの一覧、メッセージ取得、送信、既読などの表示を担当します。
 *
 * 主な流れ:
 * 1. 必要な部品や API 関数を読み込む
 * 2. 画面表示やデータ取得に必要な値を準備する
 * 3. ユーザー操作や API の結果に合わせて表示を更新する
 *
 * 扱うデータ: React の state、props、フォーム入力、API から返ったデータを主に扱います。
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import UserAvatar from '../../components/UserAvatar';
import './CottageChatPage.css';

const cottageChatApiBase = `${import.meta.env.BASE_URL}api/CottageChat`;
const pollingIntervalMs = 3000;
const listPollingIntervalMs = 10000;

async function parseApiResponse(response) {
    const data = await response.json().catch(() => null);

    // ここで条件を確認し、状況に合う処理だけを実行します。
    if (!response.ok || !data?.success) {
        throw new Error(data?.message || 'CottageChat API エラー');
    }

    return data;
}

/**
 * mergeReadStatuses は、このファイルの中心となる処理をまとめた関数です。
 * 画面から渡された値や API の結果を使い、次に表示する内容を決めます。
 */
function mergeReadStatuses(messages, reads) {
    // 配列のデータを1件ずつ画面表示用の形に変換します。
    const statusByMessageId = new Map(reads.map((read) => [Number(read.message_id), read]));

    // 配列のデータを1件ずつ画面表示用の形に変換します。
    return messages.map((message) => {
        const status = statusByMessageId.get(Number(message.message_id ?? message.id));

        // ここで条件を確認し、状況に合う処理だけを実行します。
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

/**
 * CottageChatPage は、このファイルの中心となる処理をまとめた関数です。
 * 画面から渡された値や API の結果を使い、次に表示する内容を決めます。
 */
export default function CottageChatPage({ active, isAdmin = false }) {
    const location = useLocation();
    const pollingRef = useRef(false);
    const lastMessageIdRef = useRef(0);
    const msgAreaRef = useRef(null);
    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const [activeContactId, setActiveContactId] = useState(null);
    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const [contacts, setContacts] = useState([]);
    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const [messages, setMessages] = useState([]);
    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const [draft, setDraft] = useState('');
    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const [loading, setLoading] = useState(true);
    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const [sending, setSending] = useState(false);
    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const [notice, setNotice] = useState('');
    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const [isMobileChatView, setIsMobileChatView] = useState(false);

    const urlParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
    const requestedChatId = urlParams.get('chat_id') || urlParams.get('chatId');

    const activeContact = contacts.find((contact) => contact.id === activeContactId) || null;
    // メッセージ内には相手ユーザーのアイコンが入っているため、一覧APIの管理人アイコンが空でもここから補えます。
    // ヘッダーはチャット名を表示しますが、丸アイコンは相手のものなので、相手のメッセージ情報を予備として使います。
    const activePartnerMessage = messages.find((message) => !message.isMine && (message.sender_icon_url || message.sender_name || message.sender));
    // コテージ管理人との個別チャットでは、相手である管理人のアイコンをヘッダーに出します。
    // 画像がない時だけ管理人名の先頭文字に戻すことで、チャット名と相手名を混同しないようにします。
    const headerIconUrl = activeContact?.manager_icon_url || activePartnerMessage?.sender_icon_url || activeContact?.header_avatar || '';
    const headerIconName = activeContact?.manager_name || activePartnerMessage?.sender_name || activePartnerMessage?.sender || activeContact?.representative_name || activeContact?.name || '宿';
    const loadContacts = useCallback(async (signal = undefined, options = {}) => {
        const { showNotice = true } = options;

        // API 通信やデータ処理で失敗する可能性があるため、例外を受け取れる形で実行します。
        try {
            // バックエンド API へ通信し、画面で使うデータの取得や保存を依頼します。
            const response = await fetch(`${cottageChatApiBase}/List.php`, {
                credentials: 'include',
                signal,
            });
            const data = await parseApiResponse(response);
            const nextContacts = data.contacts || [];

            setContacts(nextContacts);
            return nextContacts;
        // エラーが起きた場合は、画面にメッセージを出すなど安全な処理に切り替えます。
        } catch (error) {
            // ここで条件を確認し、状況に合う処理だけを実行します。
            if (error.name !== 'AbortError' && showNotice) {
                setNotice(error.message);
            }
            return [];
        }
    }, []);

    const markMessagesAsRead = useCallback(async (chatId, signal = undefined) => {
        // バックエンド API へ通信し、画面で使うデータの取得や保存を依頼します。
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

        // ここで条件を確認し、状況に合う処理だけを実行します。
        if (!chatId) {
            setMessages([]);
            return;
        }

        // ここで条件を確認し、状況に合う処理だけを実行します。
        if (showLoading) {
            setLoading(true);
        }

        // ここで条件を確認し、状況に合う処理だけを実行します。
        if (showNotice) {
            setNotice('');
        }

        // API 通信やデータ処理で失敗する可能性があるため、例外を受け取れる形で実行します。
        try {
            // バックエンド API へ通信し、画面で使うデータの取得や保存を依頼します。
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
        // エラーが起きた場合は、画面にメッセージを出すなど安全な処理に切り替えます。
        } catch (error) {
            // ここで条件を確認し、状況に合う処理だけを実行します。
            if (error.name !== 'AbortError' && showNotice) {
                setMessages([]);
                setNotice(error.message);
            }
        // 成功・失敗に関係なく最後に必要な後片付けを行います。
        } finally {
            // ここで条件を確認し、状況に合う処理だけを実行します。
            if (!signal?.aborted && showLoading) {
                setLoading(false);
            }
        }
    }, [markMessagesAsRead]);

    const pollNewMessages = useCallback(async (chatId) => {
        // ここで条件を確認し、状況に合う処理だけを実行します。
        if (!chatId) return;

        // API 通信やデータ処理で失敗する可能性があるため、例外を受け取れる形で実行します。
        try {
            // バックエンド API へ通信し、画面で使うデータの取得や保存を依頼します。
            const response = await fetch(
                `${cottageChatApiBase}/Messages.php?chat_id=${encodeURIComponent(chatId)}&after_id=${lastMessageIdRef.current}`,
                { credentials: 'include' },
            );
            const data = await response.json().catch(() => null);
            // ここで条件を確認し、状況に合う処理だけを実行します。
            if (!data?.success || !data.messages?.length) return;

            setMessages((prev) => {
                // 配列のデータを1件ずつ画面表示用の形に変換します。
                const existingIds = new Set(prev.map((m) => m.message_id));
                // 条件に合うデータだけを残して、画面に出す内容を絞り込みます。
                const newMsgs = data.messages.filter((m) => !existingIds.has(m.message_id));
                // ここで条件を確認し、状況に合う処理だけを実行します。
                if (!newMsgs.length) return prev;
                return [...prev, ...newMsgs];
            });

            const maxId = data.messages.reduce((max, m) => Math.max(max, m.message_id ?? 0), 0);
            // ここで条件を確認し、状況に合う処理だけを実行します。
            if (maxId > lastMessageIdRef.current) lastMessageIdRef.current = maxId;

            await markMessagesAsRead(chatId).catch(() => { });
        // エラーが起きた場合は、画面にメッセージを出すなど安全な処理に切り替えます。
        } catch {
            // silent
        }
    }, [markMessagesAsRead]);

    // 画面が表示された直後や監視している値が変わった時に、必要なデータ取得や初期設定を行います。
    useEffect(() => {
        const controller = new AbortController();

        // initialize は、画面操作や API 結果に合わせて必要な処理をまとめた関数です。
        const initialize = async () => {
            setLoading(true);
            setNotice('');

            const nextContacts = await loadContacts(controller.signal);
            const requestedId = requestedChatId ? Number(requestedChatId) : null;
            const firstChatId = requestedId || nextContacts[0]?.id || null;

            setActiveContactId(firstChatId);
            await loadMessages(firstChatId, controller.signal, { showLoading: false });
            // ここで条件を確認し、状況に合う処理だけを実行します。
            if (!requestedId) {
                setIsMobileChatView(false);
            } else {
                setIsMobileChatView(true);
            }
            // ─────────────────────────────────────

            // ここで条件を確認し、状況に合う処理だけを実行します。
            if (!controller.signal.aborted) setLoading(false);
        };

        initialize();
        return () => controller.abort();
    }, [loadContacts, loadMessages, requestedChatId]);

    // 画面が表示された直後や監視している値が変わった時に、必要なデータ取得や初期設定を行います。
    useEffect(() => {
        // ここで条件を確認し、状況に合う処理だけを実行します。
        if (!activeContactId) return undefined;

        let msgTick = 0;

        const intervalId = window.setInterval(async () => {
            // ここで条件を確認し、状況に合う処理だけを実行します。
            if (pollingRef.current) return;
            pollingRef.current = true;
            // API 通信やデータ処理で失敗する可能性があるため、例外を受け取れる形で実行します。
            try {
                await pollNewMessages(activeContactId);
                msgTick++;
                // ここで条件を確認し、状況に合う処理だけを実行します。
                if (msgTick % Math.round(listPollingIntervalMs / pollingIntervalMs) === 0) {
                    await loadContacts(undefined, { showNotice: false });
                }
            // 成功・失敗に関係なく最後に必要な後片付けを行います。
            } finally {
                pollingRef.current = false;
            }
        }, pollingIntervalMs);

        return () => window.clearInterval(intervalId);
    }, [activeContactId, pollNewMessages, loadContacts]);

    // handleContactSelect は、画面操作や API 結果に合わせて必要な処理をまとめた関数です。
    const handleContactSelect = (id) => {
        setActiveContactId(id);
        setIsMobileChatView(true);
        loadMessages(id);
    };

    // handleSendMessage は、画面操作や API 結果に合わせて必要な処理をまとめた関数です。
    const handleSendMessage = async (event) => {
        event.preventDefault();

        const text = draft.trim();
        // ここで条件を確認し、状況に合う処理だけを実行します。
        if (!text || sending || !activeContactId) {
            return;
        }

        setSending(true);
        setNotice('');

        // API 通信やデータ処理で失敗する可能性があるため、例外を受け取れる形で実行します。
        try {
            // バックエンド API へ通信し、画面で使うデータの取得や保存を依頼します。
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
        // エラーが起きた場合は、画面にメッセージを出すなど安全な処理に切り替えます。
        } catch (error) {
            setNotice(error.message);
        // 成功・失敗に関係なく最後に必要な後片付けを行います。
        } finally {
            setSending(false);
        }
    };

    // handleImageUpload は、画面操作や API 結果に合わせて必要な処理をまとめた関数です。
    const handleImageUpload = async (file) => {
        // ここで条件を確認し、状況に合う処理だけを実行します。
        if (!activeContactId || sending) return;
        setSending(true);
        setNotice('');
        // API 通信やデータ処理で失敗する可能性があるため、例外を受け取れる形で実行します。
        try {
            const formData = new FormData();
            formData.append('image', file);
            // バックエンド API へ通信し、画面で使うデータの取得や保存を依頼します。
            const uploadRes = await fetch(`${cottageChatApiBase}/UploadImage.php`, {
                method: 'POST',
                credentials: 'include',
                body: formData,
            });
            const uploadData = await parseApiResponse(uploadRes);

            // バックエンド API へ通信し、画面で使うデータの取得や保存を依頼します。
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
        // エラーが起きた場合は、画面にメッセージを出すなど安全な処理に切り替えます。
        } catch (error) {
            setNotice(error.message);
        // 成功・失敗に関係なく最後に必要な後片付けを行います。
        } finally {
            setSending(false);
        }
    };

    // handleBackToApp は、画面操作や API 結果に合わせて必要な処理をまとめた関数です。
    const handleBackToApp = () => {
        window.history.back();
    };

    // 画面が表示された直後や監視している値が変わった時に、必要なデータ取得や初期設定を行います。
    useEffect(() => {
        // ここで条件を確認し、状況に合う処理だけを実行します。
        if (msgAreaRef.current) {
            msgAreaRef.current.scrollTop = msgAreaRef.current.scrollHeight;
        }
    }, [messages]);

    const groupedMessages = useMemo(() => (
        // 配列のデータを1件ずつ画面表示用の形に変換します。
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
                                const isActive = contact.id === activeContactId;
                                const preview = contact.lastMessage || 'まだメッセージはありません';

                                return (
                                    <button
                                        key={contact.id}
                                        type="button"
                                        className={`chat-item${isActive ? ' active' : ''}`}
                                        onClick={() => handleContactSelect(contact.id)}
                                    >
                                        <UserAvatar
                                            src={contact.manager_icon_url || contact.avatar}
                                            name={contact.manager_name || contact.representative_name || contact.name}
                                            className="ci-avatar ci-avatar-image"
                                            fallbackClassName="ci-avatar"
                                            alt={`${contact.name || 'コテージ'}の管理人アイコン`}
                                            source="Cottage chat list manager icon"
                                        />
                                        <span className="ci-body">
                                            <div className="ci-top">
                                                <span className="ci-user">
                                                    {contact.representative_name}
                                                </span>

                                                <span className="ci-time">
                                                    {contact.time}
                                                </span>
                                            </div>

                                            <div className="ci-info">
                                                {contact.stay_period} ・ {contact.people_count}名
                                            </div>

                                            <div className="ci-bottom">
                                                <span className="ci-last">
                                                    {preview}
                                                </span>

                                                {contact.unread > 0 && (
                                                    <span className="ci-badge">
                                                        {contact.unread}
                                                    </span>
                                                )}
                                            </div>
                                        </span>
                                    </button>
                                );
                            })
                        )}
                    </div>
                </aside>

                <main className="chat-pane">
                    <div className="chat-header">
                        <button type="button" className="back-btn" onClick={() => setIsMobileChatView(false)}>
                            戻る
                        </button>
                        <UserAvatar
                            src={headerIconUrl}
                            name={headerIconName}
                            className="chat-header-avatar chat-header-avatar-image"
                            fallbackClassName="chat-header-avatar"
                            alt={`${activeContact?.name || 'コテージ'}の管理人アイコン`}
                            source="Cottage chat header manager icon"
                        />
                        <div className="chat-title-block">
                            <h3 className="chat-title">{activeContact?.name || 'コテージチャット'}</h3>
                        </div>
                    </div>

                    <div className="msg-area" ref={msgAreaRef}>
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
                                                <UserAvatar
                                                    src={msg.sender_icon_url || msg.avatar}
                                                    name={msg.sender_name || msg.sender || msg.avatar}
                                                    className="msg-avatar msg-avatar-image"
                                                    fallbackClassName="msg-avatar"
                                                    alt={`${msg.sender_name || msg.sender || '相手'}のアイコン`}
                                                    source="Cottage chat message user icon"
                                                />
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
