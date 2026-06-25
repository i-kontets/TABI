import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import styles from './Chat.module.css';
import GlobalNav from '../../components/GlobalNav/GlobalNav';
import ChatSidebar from '../../components/ChatSidebar/ChatSidebar';
import ChatHeader from '../../components/ChatHeader/ChatHeader';
import MessageList from '../../components/MessageList/MessageList';
import MessageInput from '../../components/MessageInput/MessageInput';

// Chat 用 API の共通 URL。
// ここを基点に、各機能の PHP エンドポイントへアクセスする。
const chatApiBase = `${import.meta.env.BASE_URL}api/Chat`;

// API の共通レスポンスを検証する。
// 失敗時は、画面側でそのまま表示できる日本語メッセージを投げる。
async function parseApiResponse(response) {
    const data = await response.json().catch(() => null);

    if (!response.ok || !data?.success) {
        throw new Error(data?.message || 'チャットAPIとの通信に失敗しました。');
    }

    return data;
}

// メッセージ一覧に既読状態を反映する。
// message_id をキーにして対応する既読情報を引けるよう Map を使う。
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
    // 左側メニューのカテゴリ絞り込み状態。
    const [activeCategory, setActiveCategory] = useState('all');
    // 現在表示対象になっているチャット相手の ID。
    const [activeContactId, setActiveContactId] = useState(null);
    // 選択中の相手情報。API の返却結果をそのまま保持する。
    const [contact, setContact] = useState(null);
    // 現在のチャットに属するメッセージ一覧。
    const [messages, setMessages] = useState([]);
    // 入力欄に編集中の本文。
    const [draft, setDraft] = useState('');
    // 読み込み中フラグ。初回表示や相手切り替え時に true になる。
    const [loading, setLoading] = useState(true);
    // 送信処理の二重実行を防ぐフラグ。
    const [sending, setSending] = useState(false);
    // API エラーや案内文を画面上に出すためのメッセージ。
    const [notice, setNotice] = useState('');
    // モバイル表示で会話画面を前面に出しているかどうか。
    const [isMobileChatView, setIsMobileChatView] = useState(false);

    // URL のクエリ文字列を毎回解釈し直さないようにメモ化する。
    const urlParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
    // 画面遷移元が個別チャットを指定していた場合のチャット ID。
    const requestedChatId = urlParams.get('chat_id') || urlParams.get('chatId');
    // グループ起点で表示したい場合のグループ ID。
    const requestedGroupId = urlParams.get('group_id') || urlParams.get('groupId');

    // いまは単一の contact を配列に包んで一覧コンポーネントへ渡している。
    const contacts = useMemo(() => (contact ? [contact] : []), [contact]);
    // 現在の選択 ID と API 取得済み contact を使って、ヘッダーに出す相手を決める。
    const activeContact = contacts.find((item) => item.id === activeContactId) || contact;
    // サイドバーのカテゴリで連絡先を絞り込む。
    const filteredContacts = activeCategory === 'all'
        ? contacts
        : contacts.filter((item) => item.category === activeCategory);

    // 既読情報だけをサーバーへ問い合わせて、手元の messages に反映する。
    // 会話本文を再取得せず、既読カウントだけ更新したいときに使う。
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

    // 指定されたチャットのメッセージを取得する。
    // chatId が無ければ URL のクエリに従い、さらに groupId も見に行く。
    const loadMessages = useCallback(async (chatId = null, signal = undefined) => {
        setLoading(true);
        setNotice('');

        try {
            // どの条件でメッセージを取りに行くかを URLSearchParams で組み立てる。
            const params = new URLSearchParams();

            if (chatId) {
                params.set('chat_id', chatId);
            } else if (requestedChatId) {
                params.set('chat_id', requestedChatId);
            } else if (requestedGroupId) {
                params.set('group_id', requestedGroupId);
            }

            const query = params.toString();
            const response = await fetch(
                `${chatApiBase}/Messages.php${query ? `?${query}` : ''}`,
                {
                    credentials: 'include',
                    signal,
                },
            );
            const data = await parseApiResponse(response);
            // API から返った chat_id か contact の chat_id を正規化して使う。
            const resolvedChatId = Number(data.chat_id || data.contact?.chat_id);

            setActiveContactId(resolvedChatId || null);
            setContact(data.contact || null);
            setMessages(data.messages || []);

            // 会話が特定できた場合は、表示後すぐ既読情報を同期する。
            if (resolvedChatId) {
                await markMessagesAsRead(resolvedChatId, signal);
            }
        } catch (error) {
            if (error.name !== 'AbortError') {
                setContact(null);
                setMessages([]);
                setNotice(error.message);
            }
        } finally {
            if (!signal?.aborted) {
                setLoading(false);
            }
        }
    }, [markMessagesAsRead, requestedChatId, requestedGroupId]);

    // 初回表示時に 1 回だけ会話を読み込む。
    // AbortController を使い、画面離脱時の state 更新を防ぐ。
    useEffect(() => {
        const controller = new AbortController();
        loadMessages(null, controller.signal);

        return () => controller.abort();
    }, [loadMessages]);

    // サイドバーで別の相手を選んだときに、その会話を開き直す。
    const handleContactSelect = (id) => {
        setActiveContactId(id);
        setIsMobileChatView(true);
        loadMessages(id);
    };

    // 送信ボタンまたは Enter で発火する送信処理。
    // 空文字、送信中、相手未選択のいずれかでは送らない。
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
        } catch (error) {
            setNotice(error.message);
        } finally {
            setSending(false);
        }
    };

    // モバイル向けの戻る操作はブラウザ履歴に戻す。
    const handleBackToApp = () => {
        window.history.back();
    };

    return (
        <div className={`${styles.appContainer} ${isMobileChatView ? styles.mobileChatActive : ''}`}>
            {/* 左カラム: グローバルナビとチャット相手一覧 */}
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

            {/* 右カラム: 選択中の会話本文と入力欄 */}
            <div className={styles.mainArea}>
                <ChatHeader
                    contact={activeContact}
                    reservation={null}
                    onMobileBack={() => setIsMobileChatView(false)}
                />

                {/* 通信エラーや注意文をユーザーへ見せる領域 */}
                {notice && (
                    <div className={styles.stateMessage} role="alert">
                        {notice}
                    </div>
                )}

                {/* 読み込み中 → メッセージなし → 一覧表示、の順で出し分ける */}
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