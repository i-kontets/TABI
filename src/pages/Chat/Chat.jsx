import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import styles from './Chat.module.css';
import GlobalNav from '../../components/GlobalNav/GlobalNav';
import ChatSidebar from '../../components/ChatSidebar/ChatSidebar';
import ChatHeader from '../../components/ChatHeader/ChatHeader';
import MessageList from '../../components/MessageList/MessageList';
import MessageInput from '../../components/MessageInput/MessageInput';

// チャット機能で使う API の共通ベース URL。
// ここを起点に Messages / Reads / Send の各 PHP を呼び分ける。
const chatApiBase = `${import.meta.env.BASE_URL}api/Chat`;

// メッセージの自動更新間隔。
// 新着確認のため、選択中の会話を数秒おきに取り直す。
const pollingIntervalMs = 3000;

// API の JSON レスポンスを共通で検証するヘルパー。
// HTTP エラー、または success=false の場合は画面表示用の例外に変換する。
async function parseApiResponse(response) {
    const data = await response.json().catch(() => null);

    if (!response.ok || !data?.success) {
        throw new Error(data?.message || 'チャットAPIとの通信に失敗しました。');
    }

    return data;
}

// 取得済みメッセージ一覧に、既読情報を重ねるための関数。
// message_id をキーにして、対応する read 状態を各メッセージへ反映する。
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
    // 多重ポーリングを防ぐためのフラグ。
    // 前回の更新が終わる前に次回更新が始まらないようにする。
    const pollingRef = useRef(false);

    // 左メニューの絞り込みカテゴリ。
    const [activeCategory, setActiveCategory] = useState('all');
    // 現在選択中のチャット相手の ID。
    const [activeContactId, setActiveContactId] = useState(null);
    // API から返ってきた会話相手情報。
    // ヘッダーやサイドバーの表示元になる。
    const [contact, setContact] = useState(null);
    // 表示中のメッセージ配列。
    const [messages, setMessages] = useState([]);
    // 入力欄に編集中のメッセージ本文。
    const [draft, setDraft] = useState('');
    // 画面初期読み込み中かどうか。
    const [loading, setLoading] = useState(true);
    // 送信中かどうか。
    // 二重送信防止のため、送信ボタンを無効化する用途で使う。
    const [sending, setSending] = useState(false);
    // API エラーや補足メッセージを表示する領域。
    const [notice, setNotice] = useState('');
    // モバイル表示で会話画面を前面に出しているかどうか。
    const [isMobileChatView, setIsMobileChatView] = useState(false);

    // URL のクエリパラメータを使い、特定の会話を直接開けるようにする。
    // location.search が変わったときだけ再生成する。
    const urlParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
    // 個別チャットを指定するクエリ。
    const requestedChatId = urlParams.get('chat_id') || urlParams.get('chatId');
    // グループ起点で表示するためのクエリ。
    const requestedGroupId = urlParams.get('group_id') || urlParams.get('groupId');

    // 現時点では contact を 1 件だけ扱う構成なので、配列にして一覧へ渡す。
    const contacts = useMemo(() => (contact ? [contact] : []), [contact]);
    // サイドバーで選ばれている相手、または取得済み contact を表示対象にする。
    const activeContact = contacts.find((item) => item.id === activeContactId) || contact;
    // カテゴリ絞り込みを適用した連絡先一覧。
    const filteredContacts = activeCategory === 'all'
        ? contacts
        : contacts.filter((item) => item.category === activeCategory);

    // 既読情報だけをサーバーへ問い合わせて、既存メッセージへ反映する。
    // 会話本文を取り直さず、既読カウントだけ更新したいときに使う。
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

    // メッセージ一覧を取得する中心処理。
    // chatId が指定されていればそれを優先し、なければ URL のクエリを参照する。
    // options で loading 表示や notice 初期化の有無を切り替えられる。
    const loadMessages = useCallback(async (chatId = null, signal = undefined, options = {}) => {
        const { showLoading = true, showNotice = true } = options;

        // ポーリング時は画面全体のローディングを出したくないため、必要時のみ表示する。
        if (showLoading) {
            setLoading(true);
        }

        // エラー表示を毎回クリアするかどうかも呼び出し元で制御する。
        if (showNotice) {
            setNotice('');
        }

        try {
            // リクエスト条件を検索パラメータとして組み立てる。
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
            // レスポンス内の chat_id は数値化して、以降の state 更新で共通利用する。
            const resolvedChatId = Number(data.chat_id || data.contact?.chat_id);

            // 表示対象の相手情報とメッセージ群を state に反映する。
            setActiveContactId(resolvedChatId || null);
            setContact(data.contact || null);
            setMessages(data.messages || []);

            // 会話が確定できたら、その会話の既読情報もすぐ取得する。
            if (resolvedChatId) {
                await markMessagesAsRead(resolvedChatId, signal);
            }
        } catch (error) {
            // AbortError は画面遷移時などの正常終了なので、ユーザー向け表示はしない。
            if (error.name !== 'AbortError' && showNotice) {
                setContact(null);
                setMessages([]);
                setNotice(error.message);
            }
        } finally {
            // ポーリングの中など、画面側でローディング表示を抑えたい場合は state を戻さない。
            if (!signal?.aborted && showLoading) {
                setLoading(false);
            }
        }
    }, [markMessagesAsRead, requestedChatId, requestedGroupId]);

    // 初回表示時に 1 回だけ会話を読み込む。
    // AbortController を使って、アンマウント後の state 更新を防ぐ。
    useEffect(() => {
        const controller = new AbortController();
        loadMessages(null, controller.signal);

        return () => controller.abort();
    }, [loadMessages]);

    // 選択中の相手がある場合だけ、一定間隔で新着を取りに行く。
    // すでに更新処理中なら重複呼び出しを避ける。
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
                // ポーリングでは画面をちらつかせないよう、読み込み表示と通知表示を抑制する。
                await loadMessages(activeContactId, undefined, {
                    showLoading: false,
                    showNotice: false,
                });
            } finally {
                pollingRef.current = false;
            }
        }, pollingIntervalMs);

        return () => window.clearInterval(intervalId);
    }, [activeContactId, loadMessages]);

    // サイドバーから会話相手を選んだときに、その相手の会話を開く。
    const handleContactSelect = (id) => {
        setActiveContactId(id);
        setIsMobileChatView(true);
        loadMessages(id);
    };

    // 送信フォームの送信処理。
    // 空文字、送信中、相手未選択の場合は何もしない。
    const handleSendMessage = async (event) => {
        event.preventDefault();

        const text = draft.trim();
        if (!text || sending || !activeContactId) {
            return;
        }

        // 送信中にして、二重送信を防止する。
        setSending(true);
        setNotice('');

        try {
            // 送信先 chat_id と本文を JSON で API へ送る。
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

            // 送信成功後は、ローカルのメッセージ一覧に追記して入力欄を空にする。
            setMessages((currentMessages) => [...currentMessages, data.message]);
            setDraft('');
        } catch (error) {
            // 送信失敗時は、その理由を画面に出す。
            setNotice(error.message);
        } finally {
            setSending(false);
        }
    };

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

                {/* 通信エラーや案内を表示するエリア */}
                {notice && (
                    <div className={styles.stateMessage} role="alert">
                        {notice}
                    </div>
                )}

                {/* 読み込み中 -> メッセージなし -> メッセージ一覧、の順で出し分ける */}
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