import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import "./Chat.css";

const chatApiBase = `${import.meta.env.BASE_URL}api/Chat`;
const reportApi = `${import.meta.env.BASE_URL}api/User/Report.php`;
const pollingIntervalMs = 3000;
const REPORT_REASONS = ["不適切な内容", "迷惑行為", "個人情報", "その他"];

// avatarが画像URLかどうか判定（URLでなければ頭文字テキストとして表示）
function isImageAvatar(value) {
    return typeof value === "string" && (/^(https?:)?\/\//.test(value) || value.startsWith("/"));
}

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
    const navigate = useNavigate();
    const queryGroupId = new URLSearchParams(location.search).get("groupId");
    const groupId = pathGroupId || queryGroupId || "1";

    const [draft, setDraft] = useState("");
    const [messages, setMessages] = useState([]);
    const [chatId, setChatId] = useState(null);
    const [memberCount, setMemberCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [notice, setNotice] = useState("");
    const [reportTarget, setReportTarget] = useState(null);
    const [reportReason, setReportReason] = useState(REPORT_REASONS[0]);
    const [reportDetail, setReportDetail] = useState("");
    const [reportSending, setReportSending] = useState(false);
    const [reportNotice, setReportNotice] = useState("");
    const [actionTarget, setActionTarget] = useState(null);
    const messageListRef = useRef(null);
    const textareaRef = useRef(null);
    const pollingRef = useRef(false);
    const longPressTimerRef = useRef(null);
    const lastMessageIdRef = useRef(0);   // 差分ポーリング用

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
            // 初回表示はgroup_idからチャットを取得する。
            // chatIdの更新でloadMessagesが作り直されることを防ぐ。
            const query = `group_id=${encodeURIComponent(groupId)}`;
            
            const response = await fetch(`${chatApiBase}/Messages.php?${query}`, {
                credentials: "include",
                signal,
            });
            const data = await parseApiResponse(response);
            const resolvedChatId = Number(data.chat_id);

            setChatId(resolvedChatId);
            setMemberCount(Number(data.member_count || data.contact?.memberCount || 0));
            const msgs = data.messages || [];
            setMessages(msgs);
            // 差分ポーリング用に最大IDを記録
            const maxId = msgs.reduce((max, m) => Math.max(max, m.message_id ?? 0), 0);
            lastMessageIdRef.current = maxId;

            if (resolvedChatId) {
                await markMessagesAsRead(resolvedChatId, signal);
            }
        } catch (error) {
            if (error.name !== "AbortError" && showNotice) {
                setMessages([]);
                setChatId(null);
                setMemberCount(0);
                setNotice(error.message === "Group chat not found." ? "" : error.message);
            }
        } finally {
            if (!signal?.aborted && showLoading) {
                setLoading(false);
            }
        }
    }, [groupId, markMessagesAsRead]);

    useEffect(() => {
        if (!active) {
            return undefined;
        }

        const controller = new AbortController();
        loadMessages({ signal: controller.signal });

        return () => controller.abort();
    }, [active, loadMessages]);

    // 差分ポーリング：Since.php で新着のみ取得してリストに追記
    const pollNewMessages = useCallback(async () => {
        if (!chatId) return;
        try {
            const response = await fetch(
                `${chatApiBase}/Since.php?chat_id=${encodeURIComponent(chatId)}&after_id=${lastMessageIdRef.current}`,
                { credentials: "include" },
            );
            const data = await response.json().catch(() => null);
            if (!data?.success || !data.messages?.length) return;

            setMessages((prev) => {
                const existingIds = new Set(prev.map((m) => m.message_id));
                const newMsgs = data.messages.filter((m) => !existingIds.has(m.message_id));
                if (!newMsgs.length) return prev;
                return [...prev, ...newMsgs];
            });

            const newMax = data.messages.reduce((max, m) => Math.max(max, m.message_id ?? 0), 0);
            if (newMax > lastMessageIdRef.current) lastMessageIdRef.current = newMax;

            await markMessagesAsRead(chatId).catch(() => { });
        } catch {
            // silent
        }
    }, [chatId, markMessagesAsRead]);

    useEffect(() => {
        if (!active || !chatId) {
            return undefined;
        }

        const intervalId = window.setInterval(async () => {
            if (pollingRef.current) return;
            pollingRef.current = true;
            try {
                await pollNewMessages();
            } finally {
                pollingRef.current = false;
            }
        }, pollingIntervalMs);

        return () => window.clearInterval(intervalId);
    }, [active, chatId, pollNewMessages]);

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
            const openProfile = () => {
                if (canOpenProfile) {
                    navigate(`/user/${senderUserId}`);
                }
            };
            const openReport = () => {
                setReportTarget(message);
                setActionTarget(null);
                setReportReason(REPORT_REASONS[0]);
                setReportDetail("");
                setReportNotice("");
            };
            const openActions = () => {
                if (!message.isMine) {
                    setActionTarget(message);
                }
            };
            const startLongPress = () => {
                if (message.isMine) return;
                window.clearTimeout(longPressTimerRef.current);
                longPressTimerRef.current = window.setTimeout(openActions, 520);
            };
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
    }, [memberCount, messages, navigate]);

    const submitMessageReport = async (event) => {
        event.preventDefault();
        if (!reportTarget || reportSending) return;

        setReportSending(true);
        setReportNotice("");

        try {
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

            if (!response.ok || !data?.success) {
                throw new Error(data?.message || "通報を送信できませんでした。");
            }

            setReportTarget(null);
            window.alert("通報を送信しました。");
        } catch (error) {
            setReportNotice(error.message || "通報を送信できませんでした。");
        } finally {
            setReportSending(false);
        }
    };

    const handleImageUpload = async (file) => {
        if (sending) return;
        setSending(true);
        setNotice("");
        try {
            const formData = new FormData();
            formData.append('image', file);
            const uploadRes = await fetch(`${chatApiBase}/Upload.php`, {
                method: 'POST',
                credentials: 'include',
                body: formData,
            });
            const uploadData = await parseApiResponse(uploadRes);

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
        } catch (error) {
            setNotice(error.message);
        } finally {
            setSending(false);
        }
    };

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
                                    navigate(`/user/${senderUserId}`);
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
