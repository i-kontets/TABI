/**
 * 旅行グループ内の話し合い、候補、投票などの画面表示を担当します。
 *
 * 主な流れ:
 * 1. 必要な部品や API 関数を読み込む
 * 2. 画面表示やデータ取得に必要な値を準備する
 * 3. ユーザー操作や API の結果に合わせて表示を更新する
 *
 * 扱うデータ: React の state、props、フォーム入力、API から返ったデータを主に扱います。
 */
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import "./Chat.css";

const chatApiBase = `${import.meta.env.BASE_URL}api/Chat`;
const reportApi = `${import.meta.env.BASE_URL}api/User/Report.php`;
const pollingIntervalMs = 3000;
const REPORT_REASONS = ["不適切な内容", "迷惑行為", "個人情報", "その他"];

function isAbortError(error) {
    // 画面移動や再取得で通信が止まっただけなら、利用者へ出すエラーとは分けて扱います。
    return error instanceof DOMException && error.name === "AbortError";
}

// avatarが画像URLかどうか判定（URLでなければ頭文字テキストとして表示）
function isImageAvatar(value) {
    return typeof value === "string" && (/^(https?:)?\/\//.test(value) || value.startsWith("/"));
}

async function parseApiResponse(response) {
    const data = await response.json().catch(() => null);

    // ここで条件を確認し、状況に合う処理だけを実行します。
    if (!response.ok || !data?.success) {
        throw new Error(data?.message || "チャットAPIとの通信に失敗しました");
    }

    return data;
}

/**
 * applyReadStatusesToMessages は、このファイルの中心となる処理をまとめた関数です。
 * 画面から渡された値や API の結果を使い、次に表示する内容を決めます。
 */
function applyReadStatusesToMessages(messages, reads) {
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

/**
 * Chat は、このファイルの中心となる処理をまとめた関数です。
 * 画面から渡された値や API の結果を使い、次に表示する内容を決めます。
 */
function Chat({ active }) {
    const { groupId: pathGroupId } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    const queryGroupId = new URLSearchParams(location.search).get("groupId");
    const groupId = pathGroupId || queryGroupId || "1";

    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const [draft, setDraft] = useState("");
    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const [messages, setMessages] = useState([]);
    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const [chatId, setChatId] = useState(null);
    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const [memberCount, setMemberCount] = useState(0);
    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const [loading, setLoading] = useState(true);
    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const [sending, setSending] = useState(false);
    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const [notice, setNotice] = useState("");
    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const [reportTarget, setReportTarget] = useState(null);
    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const [reportReason, setReportReason] = useState(REPORT_REASONS[0]);
    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const [reportDetail, setReportDetail] = useState("");
    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const [reportSending, setReportSending] = useState(false);
    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const [reportNotice, setReportNotice] = useState("");
    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const [actionTarget, setActionTarget] = useState(null);
    const messageListRef = useRef(null);
    const textareaRef = useRef(null);
    const pollingRef = useRef(false);
    const loadingMessagesRef = useRef(false);
    const currentGroupIdRef = useRef(groupId);
    const mountedRef = useRef(true);
    const initialLoadIdRef = useRef(0);
    const longPressTimerRef = useRef(null);
    const lastMessageIdRef = useRef(0);   // 差分ポーリング用

    const applyReadStatuses = useCallback((reads) => {
        setMessages((currentMessages) => applyReadStatusesToMessages(currentMessages, reads));
    }, []);

    useEffect(() => {
        mountedRef.current = true;

        return () => {
            // 通信自体を止めるとDevToolsに赤い×が残るため、画面を離れた後の反映だけ止めます。
            mountedRef.current = false;
        };
    }, []);

    const markMessagesAsRead = useCallback(async (targetChatId, signal) => {
        // バックエンド API へ通信し、画面で使うデータの取得や保存を依頼します。
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
        if (mountedRef.current) {
            applyReadStatuses(data.reads || []);
        }
    }, [applyReadStatuses]);

    const loadMessages = useCallback(async (options = {}) => {
        const { signal, showLoading = true, showNotice = true, shouldApply = () => true } = options;
        const requestedGroupId = groupId;

        // 初回表示やWebSocket更新が近いタイミングで重なっても、同じ全件取得は1本だけにします。
        if (loadingMessagesRef.current === requestedGroupId) {
            return;
        }

        loadingMessagesRef.current = requestedGroupId;
        currentGroupIdRef.current = requestedGroupId;


        // ここで条件を確認し、状況に合う処理だけを実行します。
        if (showLoading) {
            setLoading(true);
        }

        // ここで条件を確認し、状況に合う処理だけを実行します。
        if (showNotice) {
            setNotice("");
        }

        // API 通信やデータ処理で失敗する可能性があるため、例外を受け取れる形で実行します。
        try {
            // 初回表示はgroup_idからチャットを取得する。
            // chatIdの更新でloadMessagesが作り直されることを防ぐ。
            const query = `group_id=${encodeURIComponent(groupId)}`;

            // バックエンド API へ通信し、画面で使うデータの取得や保存を依頼します。
            const response = await fetch(`${chatApiBase}/Messages.php?${query}`, {
                credentials: "include",
                signal,
            });
            const data = await parseApiResponse(response);
            const resolvedChatId = Number(data.chat_id);

            // 取得中に別グループへ移動した場合、古い応答で今の画面を書き換えないようにします。
            if (signal?.aborted || !mountedRef.current || !shouldApply() || currentGroupIdRef.current !== requestedGroupId) {
                return;
            }

            setChatId(resolvedChatId);
            setMemberCount(Number(data.member_count || data.contact?.memberCount || 0));
            const msgs = data.messages || [];
            setMessages(msgs);
            // 差分ポーリング用に最大IDを記録
            const maxId = msgs.reduce((max, m) => Math.max(max, m.message_id ?? 0), 0);
            lastMessageIdRef.current = maxId;

            // ここで条件を確認し、状況に合う処理だけを実行します。
            if (resolvedChatId) {
                await markMessagesAsRead(resolvedChatId, signal);
            }
        // エラーが起きた場合は、画面にメッセージを出すなど安全な処理に切り替えます。
        } catch (error) {
            // ここで条件を確認し、状況に合う処理だけを実行します。
            if (mountedRef.current && shouldApply() && !isAbortError(error) && showNotice) {
                setMessages([]);
                setChatId(null);
                setMemberCount(0);
                setNotice(error.message === "Group chat not found." ? "" : error.message);
            }
        // 成功・失敗に関係なく最後に必要な後片付けを行います。
        } finally {
            // ここで条件を確認し、状況に合う処理だけを実行します。
            if (!signal?.aborted && mountedRef.current && shouldApply() && showLoading) {
                setLoading(false);
            }
            if (loadingMessagesRef.current === requestedGroupId) {
                loadingMessagesRef.current = false;
            }
        }
    }, [groupId, markMessagesAsRead]);

    // 画面が表示された直後や監視している値が変わった時に、必要なデータ取得や初期設定を行います。
    useEffect(() => {
        // ここで条件を確認し、状況に合う処理だけを実行します。
        if (!active) {
            return undefined;
        }

        const initialLoadId = initialLoadIdRef.current + 1;
        initialLoadIdRef.current = initialLoadId;
        loadMessages({ shouldApply: () => mountedRef.current && initialLoadIdRef.current === initialLoadId });

        return () => {
            // 画面移動時にfetchをabortしないことで、Network上の赤い×を発生させません。
            // 古い結果はmountedRefとinitialLoadIdRefで画面へ反映しないようにします。
        };
    }, [active, loadMessages]);

    // 差分ポーリング：Since.php で新着のみ取得してリストに追記
    const pollNewMessages = useCallback(async () => {
        // ここで条件を確認し、状況に合う処理だけを実行します。
        if (!chatId) return;
        // API 通信やデータ処理で失敗する可能性があるため、例外を受け取れる形で実行します。
        try {
            // バックエンド API へ通信し、画面で使うデータの取得や保存を依頼します。
            const response = await fetch(
                `${chatApiBase}/Since.php?chat_id=${encodeURIComponent(chatId)}&after_id=${lastMessageIdRef.current}`,
                { credentials: "include" },
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

            const newMax = data.messages.reduce((max, m) => Math.max(max, m.message_id ?? 0), 0);
            // ここで条件を確認し、状況に合う処理だけを実行します。
            if (newMax > lastMessageIdRef.current) lastMessageIdRef.current = newMax;

            await markMessagesAsRead(chatId).catch(() => { });
        // エラーが起きた場合は、画面にメッセージを出すなど安全な処理に切り替えます。
        } catch {
            // silent
        }
    }, [chatId, markMessagesAsRead]);

    // 画面が表示された直後や監視している値が変わった時に、必要なデータ取得や初期設定を行います。
    useEffect(() => {
        // ここで条件を確認し、状況に合う処理だけを実行します。
        if (!active || !chatId) {
            return undefined;
        }

        const intervalId = window.setInterval(async () => {
            // ここで条件を確認し、状況に合う処理だけを実行します。
            if (pollingRef.current) return;
            pollingRef.current = true;
            // API 通信やデータ処理で失敗する可能性があるため、例外を受け取れる形で実行します。
            try {
                await pollNewMessages();
            // 成功・失敗に関係なく最後に必要な後片付けを行います。
            } finally {
                pollingRef.current = false;
            }
        }, pollingIntervalMs);

        return () => window.clearInterval(intervalId);
    }, [active, chatId, pollNewMessages]);

    useLayoutEffect(() => {
        const messageList = messageListRef.current;

        // ここで条件を確認し、状況に合う処理だけを実行します。
        if (active && messageList) {
            messageList.scrollTo({
                top: messageList.scrollHeight,
                behavior: "auto",
            });
        }
    }, [active, messages.length]);

    const chatContent = useMemo(() => {
        // 配列のデータを1件ずつ画面表示用の形に変換します。
        return messages.map((message, index) => {
            const showDate =
                index === 0 ||
                message.date !== messages[index - 1].date;

            const readLabel =
                memberCount > 2
                    ? `既読 ${message.readCount}`
                    : "既読";

            // APIから署名付きURLが返っていれば優先する
            // URLがなければavatar、さらに無ければ名前の先頭文字を使う
            const avatarValue =
                message.sender_icon_url ||
                message.avatar ||
                message.sender?.slice(0, 1) ||
                "?";
            const senderUserId = Number(message.sender_user_id || message.user_id || 0);
            const canOpenProfile = senderUserId > 0;
            // openProfile は、画面操作や API 結果に合わせて必要な処理をまとめた関数です。
            const openProfile = () => {
                // ここで条件を確認し、状況に合う処理だけを実行します。
                if (canOpenProfile) {
                    navigate(`/user/${senderUserId}`, { state: { groupId } });
                }
            };
            // openReport は、画面操作や API 結果に合わせて必要な処理をまとめた関数です。
            const openReport = () => {
                setReportTarget(message);
                setActionTarget(null);
                setReportReason(REPORT_REASONS[0]);
                setReportDetail("");
                setReportNotice("");
            };
            // openActions は、画面操作や API 結果に合わせて必要な処理をまとめた関数です。
            const openActions = () => {
                // ここで条件を確認し、状況に合う処理だけを実行します。
                if (!message.isMine) {
                    setActionTarget(message);
                }
            };
            // startLongPress は、画面操作や API 結果に合わせて必要な処理をまとめた関数です。
            const startLongPress = () => {
                // ここで条件を確認し、状況に合う処理だけを実行します。
                if (message.isMine) return;
                window.clearTimeout(longPressTimerRef.current);
                longPressTimerRef.current = window.setTimeout(openActions, 520);
            };
            // cancelLongPress は、画面操作や API 結果に合わせて必要な処理をまとめた関数です。
            const cancelLongPress = () => {
                window.clearTimeout(longPressTimerRef.current);
            };

            return (
                <div className="chatBlock" key={message.id}>
                    {showDate && (
                        <div className="dateChip">
                            {message.date}
                        </div>
                    )}

                    <article
                        className={`messageRow ${message.isMine ? "mine" : ""}`}
                    >
                        <div className="messageStack">
                            {!message.isMine && (
                                <div className="userHeader">
                                    <button
                                        type="button"
                                        className="profileTapTarget"
                                        onClick={openProfile}
                                        disabled={!canOpenProfile}
                                        aria-label={`${message.sender || "ユーザー"}のプロフィールを開く`}
                                    >
                                    <div className="avatar">
                                        {isImageAvatar(avatarValue) ? (
                                            <img
                                                src={avatarValue}
                                                alt={`${message.sender}のアイコン`}
                                                className="avatarImage"
                                                loading="lazy"
                                            />
                                        ) : (
                                            avatarValue
                                        )}
                                    </div>
                                    </button>

                                    <button
                                        type="button"
                                        className="senderName"
                                        onClick={openProfile}
                                        disabled={!canOpenProfile}
                                    >
                                        {message.sender}
                                    </button>
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

                                <div
                                    className="bubble"
                                    onPointerDown={startLongPress}
                                    onPointerUp={cancelLongPress}
                                    onPointerCancel={cancelLongPress}
                                    onPointerLeave={cancelLongPress}
                                    onContextMenu={(event) => {
                                        event.preventDefault();
                                        openActions();
                                    }}
                                >
                                    {message.image_url ? (
                                        <img
                                            src={message.image_url}
                                            alt="送信画像"
                                            style={{
                                                maxWidth: "200px",
                                                maxHeight: "260px",
                                                borderRadius: "8px",
                                                display: "block",
                                                cursor: "pointer",
                                            }}
                                            loading="lazy"
                                            onClick={() =>
                                                window.open(
                                                    message.image_url,
                                                    "_blank",
                                                )
                                            }
                                        />
                                    ) : (
                                        message.text
                                    )}
                                </div>

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
    }, [groupId, memberCount, messages, navigate]);

    // submitMessageReport は、画面操作や API 結果に合わせて必要な処理をまとめた関数です。
    const submitMessageReport = async (event) => {
        event.preventDefault();
        // ここで条件を確認し、状況に合う処理だけを実行します。
        if (!reportTarget || reportSending) return;

        setReportSending(true);
        setReportNotice("");

        // API 通信やデータ処理で失敗する可能性があるため、例外を受け取れる形で実行します。
        try {
            // バックエンド API へ通信し、画面で使うデータの取得や保存を依頼します。
            const response = await fetch(reportApi, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                credentials: "include",
                body: JSON.stringify({
                    target_type: "message",
                    target_id: reportTarget.message_id || reportTarget.id,
                    reason: reportReason,
                    detail: reportDetail,
                }),
            });
            const data = await response.json().catch(() => null);

            // ここで条件を確認し、状況に合う処理だけを実行します。
            if (!response.ok || !data?.success) {
                throw new Error(data?.message || "通報を送信できませんでした。");
            }

            setReportTarget(null);
            window.alert("通報を送信しました。");
        // エラーが起きた場合は、画面にメッセージを出すなど安全な処理に切り替えます。
        } catch (error) {
            setReportNotice(error.message || "通報を送信できませんでした。");
        // 成功・失敗に関係なく最後に必要な後片付けを行います。
        } finally {
            setReportSending(false);
        }
    };

    // handleImageUpload は、画面操作や API 結果に合わせて必要な処理をまとめた関数です。
    const handleImageUpload = async (file) => {
        // ここで条件を確認し、状況に合う処理だけを実行します。
        if (sending) return;
        setSending(true);
        setNotice("");
        // API 通信やデータ処理で失敗する可能性があるため、例外を受け取れる形で実行します。
        try {
            const formData = new FormData();
            formData.append('image', file);
            // バックエンド API へ通信し、画面で使うデータの取得や保存を依頼します。
            const uploadRes = await fetch(`${chatApiBase}/Upload.php`, {
                method: 'POST',
                credentials: 'include',
                body: formData,
            });
            const uploadData = await parseApiResponse(uploadRes);

            // バックエンド API へ通信し、画面で使うデータの取得や保存を依頼します。
            const sendRes = await fetch(`${chatApiBase}/Send.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(
                    chatId
                        ? { chat_id: chatId, image_url: uploadData.image_url }
                        : { group_id: groupId, image_url: uploadData.image_url },
                ),
            });
            const sendData = await parseApiResponse(sendRes);
            setChatId(Number(sendData.message.chat_id));
            setMessages((prev) => [...prev, sendData.message]);
        // エラーが起きた場合は、画面にメッセージを出すなど安全な処理に切り替えます。
        } catch (error) {
            setNotice(error.message);
        // 成功・失敗に関係なく最後に必要な後片付けを行います。
        } finally {
            setSending(false);
        }
    };

    // sendMessage は、画面操作や API 結果に合わせて必要な処理をまとめた関数です。
    const sendMessage = async (event) => {
        event.preventDefault();

        const text = draft.trim();

        // ここで条件を確認し、状況に合う処理だけを実行します。
        if (!text || sending) {
            return;
        }

        setSending(true);
        setNotice("");

        // API 通信やデータ処理で失敗する可能性があるため、例外を受け取れる形で実行します。
        try {
            // バックエンド API へ通信し、画面で使うデータの取得や保存を依頼します。
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

            // ここで条件を確認し、状況に合う処理だけを実行します。
            if (textareaRef.current) {
                textareaRef.current.style.height = "40px";
            }
        // エラーが起きた場合は、画面にメッセージを出すなど安全な処理に切り替えます。
        } catch (error) {
            setNotice(error.message);
        // 成功・失敗に関係なく最後に必要な後片付けを行います。
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
                    null
                ) : (
                    chatContent
                )}
            </div>
            <form className="composer" onSubmit={sendMessage}>
                {/* 非表示ファイル入力 */}
                <input
                    id="discussionImageInput"
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) { handleImageUpload(f); e.target.value = ''; }
                    }}
                />
                {/* 画像ボタン */}
                <button
                    type="button"
                    className="imageButton"
                    aria-label="画像を送信"
                    disabled={sending}
                    onClick={() => document.getElementById('discussionImageInput')?.click()}
                >
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                        <circle cx="8.5" cy="8.5" r="1.5" />
                        <polyline points="21 15 16 10 5 21" />
                    </svg>
                </button>
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
            {reportTarget && (
                <div className="reportBackdrop" role="presentation">
                    <form className="reportSheet" onSubmit={submitMessageReport}>
                        <h2>このメッセージを通報</h2>
                        <p>管理者が対象メッセージと通報内容を確認します。</p>

                        <label>
                            通報理由
                            <select
                                value={reportReason}
                                onChange={(event) => setReportReason(event.target.value)}
                            >
                                {REPORT_REASONS.map((reason) => (
                                    <option key={reason} value={reason}>{reason}</option>
                                ))}
                            </select>
                        </label>

                        <label>
                            詳細（任意）
                            <textarea
                                value={reportDetail}
                                onChange={(event) => setReportDetail(event.target.value)}
                                rows={4}
                                maxLength={1000}
                                placeholder="確認してほしい内容を入力してください"
                            />
                        </label>

                        {reportNotice && <p className="reportError">{reportNotice}</p>}

                        <div className="reportActions">
                            <button
                                type="button"
                                className="reportCancel"
                                onClick={() => setReportTarget(null)}
                                disabled={reportSending}
                            >
                                キャンセル
                            </button>
                            <button type="submit" className="reportSubmit" disabled={reportSending}>
                                {reportSending ? "送信中..." : "通報する"}
                            </button>
                        </div>
                    </form>
                </div>
            )}
            {actionTarget && (
                <div className="messageActionBackdrop" onClick={() => setActionTarget(null)} role="presentation">
                    <div className="messageActionMenu" onClick={(event) => event.stopPropagation()}>
                        <button
                            type="button"
                            className="messageActionItem"
                            onClick={() => {
                                const senderUserId = Number(actionTarget.sender_user_id || actionTarget.user_id || 0);
                                setActionTarget(null);
                                if (senderUserId > 0) {
                                    navigate(`/user/${senderUserId}`, { state: { groupId } });
                                }
                            }}
                        >
                            プロフィール
                        </button>
                        <button
                            type="button"
                            className="messageActionItem danger"
                            onClick={() => {
                                setReportTarget(actionTarget);
                                setActionTarget(null);
                                setReportReason(REPORT_REASONS[0]);
                                setReportDetail("");
                                setReportNotice("");
                            }}
                        >
                            通報
                        </button>
                    </div>
                </div>
            )}        </section>
    );
}

export default Chat;
