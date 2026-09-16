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
import styles from './Chat.module.css';
import GlobalNav from '../../components/GlobalNav/GlobalNav';
import ChatSidebar from '../../components/ChatSidebar/ChatSidebar';
import ChatHeader from '../../components/ChatHeader/ChatHeader';
import MessageList from '../../components/MessageList/MessageList';
import MessageInput from '../../components/MessageInput/MessageInput';

const chatApiBase = `${import.meta.env.BASE_URL}api/Chat`;
const pollingIntervalMs = 3000;
const listPollingIntervalMs = 10000; // 一覧は10秒ごとで十分

function isAbortError(error) {
    // 画面移動や再取得でブラウザが通信を止めた場合は、故障ではなく正常な中断として扱います。
    return error instanceof DOMException && error.name === 'AbortError';
}

async function parseApiResponse(response) {
    const data = await response.json().catch(() => null);

    // ここで条件を確認し、状況に合う処理だけを実行します。
    if (!response.ok || !data?.success) {
        throw new Error(data?.message || 'チャットAPIとの通信に失敗しました。');
    }

    return data;
}

/**
 * mergeReadStatuses は、このファイルの中心となる処理をまとめた関数です。
 * 画面から渡された値や API の結果を使い、次に表示する内容を決めます。
 */
function mergeReadStatuses(messages, reads) {
    const statusByMessageId = new Map(
        // 配列のデータを1件ずつ画面表示用の形に変換します。
        reads.map((read) => [Number(read.message_id), read]),
    );

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

const Chat = ({ embedded = false, groupId: groupIdProp = null }) => {
    const location = useLocation();
    const pollingRef       = useRef(false);
    const loadingContactsRef = useRef(false);
    const loadingMessagesRef = useRef(false);
    const mountedRef = useRef(true);
    const initialLoadIdRef = useRef(0);
    const lastMessageIdRef = useRef(0);   // 差分ポーリング用：最後に受信したmessage_id
    const currentChatIdRef = useRef(null);
    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const [activeCategory, setActiveCategory] = useState('all');
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
    const [isMemberPickerOpen, setIsMemberPickerOpen] = useState(false);
    const [groupMembers, setGroupMembers] = useState([]);
    const [memberLoading, setMemberLoading] = useState(false);
    const [currentUserId, setCurrentUserId] = useState(null);

    const urlParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
    const requestedChatId = urlParams.get('chat_id') || urlParams.get('chatId');

    const activeContact = contacts.find((contact) => contact.id === activeContactId) || null;
    const filteredContacts = activeCategory === 'all'
        ? contacts
        // 条件に合うデータだけを残して、画面に出す内容を絞り込みます。
        : contacts.filter((contact) => contact.category === activeCategory);
    const visibleContacts = filteredContacts;
    const availableMembers = groupMembers.filter((member) => (
        Number(member.id) !== currentUserId
        && !contacts.some((contact) => (
            contact.category === 'friend' && Number(contact.manager_user_id) === Number(member.id)
        ))
    ));

    useEffect(() => {
        mountedRef.current = true;

        return () => {
            // 通信自体は止めず、画面を離れた後の古い結果だけを反映しないようにします。
            mountedRef.current = false;
        };
    }, []);

    const loadContacts = useCallback(async (signal = undefined, options = {}) => {
        const { showNotice = true } = options;

        // 同じ一覧取得が終わる前に次を始めると、Networkに同じAPIが並ぶため止めます。
        if (loadingContactsRef.current) {
            return [];
        }

        loadingContactsRef.current = true;

        // API 通信やデータ処理で失敗する可能性があるため、例外を受け取れる形で実行します。
        try {
            // バックエンド API へ通信し、画面で使うデータの取得や保存を依頼します。
            const listParams = new URLSearchParams();
            if (groupIdProp) {
                listParams.set('group_id', groupIdProp);
            }

            const response = await fetch(
                `${chatApiBase}/List.php${listParams.toString() ? `?${listParams.toString()}` : ''}`,
                {
                credentials: 'include',
                signal,
                },
            );
            const data = await parseApiResponse(response);
            const nextContacts = data.contacts || [];

            if (mountedRef.current) {
                setContacts(nextContacts);
            }
            return nextContacts;
        // エラーが起きた場合は、画面にメッセージを出すなど安全な処理に切り替えます。
        } catch (error) {
            // ここで条件を確認し、状況に合う処理だけを実行します。
            if (mountedRef.current && !isAbortError(error) && showNotice) {
                setNotice(error.message);
            }
            return [];
        } finally {
            loadingContactsRef.current = false;
        }
    }, [groupIdProp]);

    const markMessagesAsRead = useCallback(async (chatId, signal = undefined) => {
        // バックエンド API へ通信し、画面で使うデータの取得や保存を依頼します。
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

        if (mountedRef.current) {
            setMessages((currentMessages) => mergeReadStatuses(currentMessages, data.reads || []));
        }
    }, []);

    const loadMessages = useCallback(async (chatId, signal = undefined, options = {}) => {
        const { showLoading = true, showNotice = true } = options;
        const requestedChatId = Number(chatId);

        // ここで条件を確認し、状況に合う処理だけを実行します。
        if (!requestedChatId) {
            currentChatIdRef.current = null;
            if (mountedRef.current) {
                setMessages([]);
            }
            return;
        }

        currentChatIdRef.current = requestedChatId;

        // 同じチャットの全件取得が進行中なら、新しい取得を重ねずに既存の結果を待ちます。
        if (loadingMessagesRef.current === requestedChatId) {
            return;
        }

        loadingMessagesRef.current = requestedChatId;

        // ここで条件を確認し、状況に合う処理だけを実行します。
        if (showLoading) {
            setLoading(true);
            setMessages([]);
        }

        // ここで条件を確認し、状況に合う処理だけを実行します。
        if (showNotice) {
            setNotice('');
        }

        // API 通信やデータ処理で失敗する可能性があるため、例外を受け取れる形で実行します。
        try {
            // バックエンド API へ通信し、画面で使うデータの取得や保存を依頼します。
            const response = await fetch(
                `${chatApiBase}/Messages.php?chat_id=${encodeURIComponent(requestedChatId)}`,
                {
                    credentials: 'include',
                    signal,
                },
            );
            const data = await parseApiResponse(response);
            const resolvedChatId = Number(data.chat_id || requestedChatId);

            // ここで条件を確認し、状況に合う処理だけを実行します。
            if (signal?.aborted || !mountedRef.current || currentChatIdRef.current !== requestedChatId) {
                return;
            }

            setActiveContactId(resolvedChatId);
            // msgs は、画面操作や API 結果に合わせて必要な処理をまとめた関数です。
            const msgs = (data.messages || []).filter((message) => Number(message.chat_id) === resolvedChatId);
            setMessages(msgs);
            // 差分ポーリング用に最大IDを記録
            const maxId = msgs.reduce((max, m) => Math.max(max, m.message_id ?? 0), 0);
            lastMessageIdRef.current = maxId;
            await markMessagesAsRead(resolvedChatId, signal);
        // エラーが起きた場合は、画面にメッセージを出すなど安全な処理に切り替えます。
        } catch (error) {
            // ここで条件を確認し、状況に合う処理だけを実行します。
            if (mountedRef.current && !isAbortError(error) && showNotice) {
                setMessages([]);
                setNotice(error.message);
            }
        // 成功・失敗に関係なく最後に必要な後片付けを行います。
        } finally {
            // ここで条件を確認し、状況に合う処理だけを実行します。
            if (!signal?.aborted && mountedRef.current && currentChatIdRef.current === requestedChatId && showLoading) {
                setLoading(false);
            }
            if (loadingMessagesRef.current === requestedChatId) {
                loadingMessagesRef.current = false;
            }
        }
    }, [markMessagesAsRead]);

    // 差分ポーリング：Since.php で新着のみ取得してリストに追記
    const pollNewMessages = useCallback(async (chatId) => {
        // ここで条件を確認し、状況に合う処理だけを実行します。
        if (!chatId) return;
        // API 通信やデータ処理で失敗する可能性があるため、例外を受け取れる形で実行します。
        try {
            // バックエンド API へ通信し、画面で使うデータの取得や保存を依頼します。
            const response = await fetch(
                `${chatApiBase}/Since.php?chat_id=${encodeURIComponent(chatId)}&after_id=${lastMessageIdRef.current}`,
                { credentials: 'include' },
            );
            const data = await response.json().catch(() => null);
            // ここで条件を確認し、状況に合う処理だけを実行します。
            if (!data?.success || !data.messages?.length) return;
            // ここで条件を確認し、状況に合う処理だけを実行します。
            if (currentChatIdRef.current !== Number(chatId)) return;

            setMessages((prev) => {
                // 配列のデータを1件ずつ画面表示用の形に変換します。
                const existingIds = new Set(prev.map((m) => m.message_id));
                // 条件に合うデータだけを残して、画面に出す内容を絞り込みます。
                const newMsgs = data.messages.filter((m) => (
                    Number(m.chat_id) === Number(chatId)
                    && !existingIds.has(m.message_id)
                ));
                // ここで条件を確認し、状況に合う処理だけを実行します。
                if (!newMsgs.length) return prev;
                return [...prev, ...newMsgs];
            });

            // 最大IDを更新
            const maxId = data.messages.reduce((max, m) => Math.max(max, m.message_id ?? 0), 0);
            // ここで条件を確認し、状況に合う処理だけを実行します。
            if (maxId > lastMessageIdRef.current) lastMessageIdRef.current = maxId;

            // 新着を既読にする
            await markMessagesAsRead(chatId).catch(() => {});
        // エラーが起きた場合は、画面にメッセージを出すなど安全な処理に切り替えます。
        } catch {
            // silent
        }
    }, [markMessagesAsRead]);

    // 初回：コンタクト一覧 + 最初のチャットメッセージを読み込む
    useEffect(() => {
        const initialLoadId = initialLoadIdRef.current + 1;
        initialLoadIdRef.current = initialLoadId;

        // initialize は、画面操作や API 結果に合わせて必要な処理をまとめた関数です。
        const initialize = async () => {
            setLoading(true);
            setNotice('');

            const nextContacts = await loadContacts();
            if (!mountedRef.current || initialLoadIdRef.current !== initialLoadId) {
                return;
            }

            const requestedId = requestedChatId ? Number(requestedChatId) : null;
            const firstChatId = requestedId || nextContacts[0]?.id || null;

            setActiveContactId(firstChatId);
            await loadMessages(firstChatId, undefined, { showLoading: false });

            // ここで条件を確認し、状況に合う処理だけを実行します。
            if (mountedRef.current && initialLoadIdRef.current === initialLoadId) setLoading(false);
        };

        initialize();
        return () => {
            // Networkの赤い×を出さないため、画面を離れるだけではfetchを中断しません。
            // 古い結果は上のinitialLoadIdRefとmountedRefで捨てるので、表示は上書きされません。
        };
    }, [loadContacts, loadMessages, requestedChatId]);

    // 差分ポーリング：3秒ごとに新着メッセージを追記、10秒ごとにコンタクト一覧も更新
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
                // コンタクト一覧は10秒に1回（3回に1回）
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

    // サイドバーから会話相手を選んだときに、その相手の会話を開く。
    useEffect(() => {
        // handleRealtimeChatUpdate は、画面操作や API 結果に合わせて必要な処理をまとめた関数です。
        const handleRealtimeChatUpdate = () => {
            loadContacts(undefined, { showNotice: false });
            // ここで条件を確認し、状況に合う処理だけを実行します。
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

    // handleContactSelect は、画面操作や API 結果に合わせて必要な処理をまとめた関数です。
    const handleContactSelect = (id) => {
        const nextChatId = Number(id);
        currentChatIdRef.current = nextChatId;
        setActiveContactId(id);
        setIsMobileChatView(true);
        loadMessages(nextChatId);
    };

    const handleOpenMemberPicker = async () => {
        if (!groupIdProp) return;

        setMemberLoading(true);
        setIsMemberPickerOpen(true);
        try {
            const response = await fetch(`${import.meta.env.BASE_URL}api/Itinerary/Members.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ group_id: groupIdProp }),
            });
            const data = await response.json().catch(() => null);
            if (!response.ok || !data?.success) throw new Error(data?.message || 'メンバーを取得できませんでした。');
            setGroupMembers(data.members || []);
            setCurrentUserId(Number(data.current_user_id) || null);
        } catch (error) {
            setNotice(error.message);
            setIsMemberPickerOpen(false);
        } finally {
            setMemberLoading(false);
        }
    };

    const handleMemberSelect = async (member) => {
        setMemberLoading(true);
        try {
            const response = await fetch(`${import.meta.env.BASE_URL}api/Chat/CreateDirect.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ group_id: groupIdProp, user_id: member.id }),
            });
            const data = await response.json().catch(() => null);
            if (!response.ok || !data?.success) throw new Error(data?.message || '個人チャットを作成できませんでした。');

            setIsMemberPickerOpen(false);
            await loadContacts(undefined, { showNotice: false });
            handleContactSelect(Number(data.chat_id));
        } catch (error) {
            setNotice(error.message);
        } finally {
            setMemberLoading(false);
        }
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

            // ここで条件を確認し、状況に合う処理だけを実行します。
            if (Number(data.message?.chat_id) === Number(activeContactId)) {
                setMessages((currentMessages) => [...currentMessages, data.message]);
            }
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
            // 1. 画像をアップロード
            const formData = new FormData();
            formData.append('image', file);
            // バックエンド API へ通信し、画面で使うデータの取得や保存を依頼します。
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

            // ここで条件を確認し、状況に合う処理だけを実行します。
            if (Number(sendData.message?.chat_id) === Number(activeContactId)) {
                setMessages((currentMessages) => [...currentMessages, sendData.message]);
            }
            await loadContacts(undefined, { showNotice: false });
        // エラーが起きた場合は、画面にメッセージを出すなど安全な処理に切り替えます。
        } catch (error) {
            setNotice(error.message);
        // 成功・失敗に関係なく最後に必要な後片付けを行います。
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
        <div className={`${styles.appContainer} ${embedded ? styles.embedded : ''} ${isMobileChatView ? styles.mobileChatActive : ''}`}>
            {/* 左側: グローバルナビとチャット相手一覧 */}
            <div className={styles.sidebarWrapper}>
                {!embedded && (
                    <GlobalNav
                        activeCategory={activeCategory}
                        onSelectCategory={setActiveCategory}
                        onBack={handleBackToApp}
                    />
                )}
                <ChatSidebar
                    contacts={visibleContacts}
                    activeId={activeContactId}
                    onSelect={handleContactSelect}
                    onAddChat={handleOpenMemberPicker}
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

            {isMemberPickerOpen && (
                <div className={styles.memberPickerBackdrop} role="presentation" onClick={() => setIsMemberPickerOpen(false)}>
                    <section className={styles.memberPicker} role="dialog" aria-modal="true" aria-labelledby="member-picker-title" onClick={(event) => event.stopPropagation()}>
                        <div className={styles.memberPickerHeader}>
                            <h2 id="member-picker-title">メンバーから追加</h2>
                            <button type="button" className={styles.memberPickerClose} onClick={() => setIsMemberPickerOpen(false)} aria-label="閉じる">×</button>
                        </div>
                        {memberLoading ? (
                            <p className={styles.memberPickerState}>メンバーを読み込んでいます...</p>
                        ) : availableMembers.length === 0 ? (
                            <p className={styles.memberPickerState}>追加できるチャットがありません</p>
                        ) : (
                            <div className={styles.memberPickerList}>
                                {availableMembers.map((member) => (
                                    <button type="button" className={styles.memberPickerItem} key={member.id} onClick={() => handleMemberSelect(member)}>
                                        <span className={styles.memberPickerAvatar}>{member.initial || member.name?.slice(0, 1) || '?'}</span>
                                        <span>{member.name}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </section>
                </div>
            )}
        </div>
    );
};

export default Chat;
