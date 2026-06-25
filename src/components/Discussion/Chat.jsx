import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import "./Chat.css";

// チャットAPIの共通ベースURL
const chatApiBase = `${import.meta.env.BASE_URL}api/Discussion`;

// APIレスポンスを共通の形式で検証し、成功時だけデータを返す
async function parseApiResponse(response) {
    // JSONとして読めない場合もあるので、失敗時は null を返す
    const data = await response.json().catch(() => null);

    // HTTPステータスと success フラグの両方を確認して、APIとして正常か判断する
    if (!response.ok || !data?.success) {
        // API側の message があればそれを優先し、なければ汎用エラーを返す
        throw new Error(data?.message || "チャットAPIとの通信に失敗しました");
    }

    return data;
}

// 旅行グループのチャット一覧表示と送信を行うコンポーネント
function Chat({ active }) {
    // URLパラメータから groupId を取得する。パスに無ければクエリにも対応する
    const { groupId: pathGroupId } = useParams();
    const location = useLocation();
    const queryGroupId = new URLSearchParams(location.search).get("groupId");
    const groupId = pathGroupId || queryGroupId || "1";

    // 入力中のメッセージ本文
    const [draft, setDraft] = useState("");
    // 画面に表示するメッセージ一覧
    const [messages, setMessages] = useState([]);
    // 現在のチャットID。初回読み込み後に確定する
    const [chatId, setChatId] = useState(null);
    // 一覧取得中のフラグ
    const [loading, setLoading] = useState(true);
    // 送信中のフラグ。二重送信を防ぐ
    const [sending, setSending] = useState(false);
    // ユーザー向け通知メッセージ
    const [notice, setNotice] = useState("");
    // メッセージ一覧のDOM参照。スクロール制御に使う
    const messageListRef = useRef(null);
    // テキストエリアのDOM参照。送信後の高さ調整に使う
    const textareaRef = useRef(null);

    // 読み取り済み情報をメッセージ配列へ反映する
    const applyReadStatuses = useCallback((reads) => {
        // message_id をキーにしたMapへ変換し、メッセージごとの既読情報を引けるようにする
        const statusByMessageId = new Map(
            reads.map((read) => [Number(read.message_id), read]),
        );

        // 既存メッセージを走査し、既読数や既読状態を差し替える
        setMessages((currentMessages) => currentMessages.map((message) => {
            // message.message_id が無い場合もあるため id も見ておく
            const status = statusByMessageId.get(Number(message.message_id ?? message.id));

            // 対応する既読情報がなければ、そのメッセージはそのまま返す
            if (!status) {
                return message;
            }

            // 既読数と既読状態を React state 用の形にそろえる
            return {
                ...message,
                readCount: Number(status.read_count),
                read_count: Number(status.read_count),
                isRead: Boolean(status.is_read),
            };
        }));
    }, []);

    // 特定のチャットの既読情報をサーバーへ通知し、その結果を state に反映する
    const markMessagesAsRead = useCallback(async (targetChatId, signal) => {
        // Reads.php に対象チャットIDを送って既読更新を依頼する
        const response = await fetch(`${chatApiBase}/Reads.php`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            credentials: "include",
            body: JSON.stringify({ chat_id: targetChatId }),
            signal,
        });
        // レスポンスの妥当性を共通処理でチェックする
        const data = await parseApiResponse(response);
        // 返却された既読情報を画面に反映する
        applyReadStatuses(data.reads || []);
    }, [applyReadStatuses]);

    // active になったタイミングでチャットを読み込み、メッセージを取得する
    useEffect(() => {
        // このコンポーネントが非表示なら何もしない
        if (!active) {
            return undefined;
        }

        // 非同期処理のキャンセル制御用。アンマウント後の state 更新を防ぐ
        const controller = new AbortController();

        // 画面表示用のメッセージ一覧を取得する本体処理
        const loadMessages = async () => {
            setLoading(true);
            setNotice("");

            try {
                // Messages.php から指定グループのチャットメッセージを取得する
                const response = await fetch(
                    `${chatApiBase}/Messages.php?group_id=${encodeURIComponent(groupId)}`,
                    {
                        credentials: "include",
                        signal: controller.signal,
                    },
                );
                // 取得結果を共通のレスポンス処理で検証する
                const data = await parseApiResponse(response);

                // 取得したチャットIDとメッセージ一覧を state に保存する
                setChatId(Number(data.chat_id));
                setMessages(data.messages || []);

                // 読み込み直後のメッセージを既読にして、既読情報も反映する
                await markMessagesAsRead(Number(data.chat_id), controller.signal);
            } catch (error) {
                // AbortError はコンポーネント切り替え時のキャンセルなので通知しない
                if (error.name !== "AbortError") {
                    setMessages([]);
                    setNotice(error.message);
                }
            } finally {
                // キャンセルされていなければローディングを終了する
                if (!controller.signal.aborted) {
                    setLoading(false);
                }
            }
        };

        // 実際の読み込みを開始する
        loadMessages();

        // アンマウント時や再実行時に通信を中断する
        return () => controller.abort();
    }, [active, groupId, markMessagesAsRead]);

    // メッセージが増えたら末尾へスクロールして、最新メッセージを見せる
    useLayoutEffect(() => {
        const messageList = messageListRef.current;

        // パネルが開いていて、一覧要素が存在する場合だけスクロールする
        if (active && messageList) {
            messageList.scrollTo({
                top: messageList.scrollHeight,
                behavior: "auto",
            });
        }
    }, [active, messages.length]);

    // メッセージ一覧を JSX として組み立てる。描画処理を見通しよくするために分離している
    const chatContent = useMemo(() => {
        return messages.map((message, index) => {
            // 同じ日付が連続する場合は日付チップを省略し、日付が切り替わる箇所だけ表示する
            const showDate = index === 0 || message.date !== messages[index - 1].date;

            return (
                <div className="chatBlock" key={message.id}>
                    {/* 日付区切り */}
                    {showDate && <div className="dateChip">{message.date}</div>}
                    <article className={`messageRow ${message.isMine ? "mine" : ""}`}>
                        <div className="messageStack">
                            {/* 自分以外のメッセージは、送信者情報を上に表示する */}
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
                                {/* 自分のメッセージは、本文の上に既読数と時刻を並べる */}
                                {message.isMine && (
                                    <div className="messageMeta mineMeta">
                                        {message.readCount > 0 && (
                                            <span>既読 {message.readCount}</span>
                                        )}
                                        <time>{message.time}</time>
                                    </div>
                                )}
                                {/* 吹き出し本体 */}
                                <div className="bubble">{message.text}</div>
                                {/* 相手のメッセージは、本文の下に時刻を表示する */}
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
    }, [messages]);

    // メッセージ送信処理。フォーム送信時に呼ばれる
    const sendMessage = async (event) => {
        event.preventDefault();

        // 前後の空白を除去した送信本文
        const text = draft.trim();

        // 空送信と送信中の多重実行は無視する
        if (!text || sending) {
            return;
        }

        setSending(true);
        setNotice("");

        try {
            // Send.php に送信する。chatId があるなら既存チャットへ、ないなら group_id から新規紐付けする
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
                // レスポンスを検証して、送信結果を取り出す
            const data = await parseApiResponse(response);

                // サーバーが採番した chat_id を保存する
            setChatId(Number(data.message.chat_id));
                // 送信済みメッセージを画面末尾に追加する
            setMessages((currentMessages) => [
                ...currentMessages,
                data.message,
            ]);
                // 入力欄を空にする
            setDraft("");

                // テキストエリアの高さも初期状態に戻す
            if (textareaRef.current) {
                textareaRef.current.style.height = "40px";
            }
        } catch (error) {
                // 通信失敗やバリデーション失敗のメッセージを表示する
            setNotice(error.message);
        } finally {
                // 送信完了後は送信中フラグを戻す
            setSending(false);
        }
    };

    return (
            // active が false の場合は非表示になるチャットパネル
        <section className="chatPanel" aria-label="チャット" hidden={!active}>
                {/* メッセージ一覧領域。ここへ自動スクロールする */}
            <div className="messageList" ref={messageListRef}>
                    {/* エラーや通知を上部に表示する */}
                {notice && (
                    <p className="chatNotice" role="alert">{notice}</p>
                )}
                    {/* 読み込み中 / 空状態 / メッセージ一覧を条件分岐で表示する */}
                {loading ? (
                    <p className="chatState">メッセージを読み込んでいます…</p>
                ) : messages.length === 0 && !notice ? (
                        // メッセージがまだ無い場合の案内
                    <p className="chatState">まだメッセージはありません。</p>
                ) : (
                        // 取得したメッセージをそのまま描画する
                    chatContent
                )}
            </div>
                {/* メッセージ入力フォーム */}
            <form className="composer" onSubmit={sendMessage}>
                <textarea
                    ref={textareaRef}
                    value={draft}
                    onChange={(event) => {
                            // 入力内容を state に反映する
                        setDraft(event.target.value);

                            // 入力に合わせて高さを自動調整する
                        event.target.style.height = "auto";
                        event.target.style.height =
                            `${event.target.scrollHeight}px`;
                    }}
                    placeholder="メッセージを入力..."
                    aria-label="メッセージ"
                    rows={1}
                    disabled={sending}
                />
                {/* 送信ボタン。入力が空なら無効化する */}
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
