import "./CottageChatPage.css";

export default function CottageChatPage() {
    return (
        <div id="appScreen" className="screen">
            <header className="app-header">
                <span className="hd-logo">TABI コテージ管理</span>
                <div className="hd-right">
                    <span className="hd-user">管理者</span>
                    <button type="button" className="btn-logout">
                        ログアウト
                    </button>
                </div>
            </header>

            <div className="app-body">
                <aside className="list-pane">
                    <div className="list-header">
                        <h2>コテージチャット</h2>
                        <span className="list-sub">旅行者からのメッセージ</span>
                    </div>

                    <div className="chat-list">
                        <button type="button" className="chat-item active">
                            <span className="ci-avatar">T</span>
                            <span className="ci-body">
                                <span className="ci-top">
                                    <span className="ci-title">TABI サンプル宿泊</span>
                                    <span className="ci-time">12:30</span>
                                </span>
                                <span className="ci-bot">
                                    <span className="ci-last">チェックインについて確認したいです</span>
                                    <span className="ci-badge">1</span>
                                </span>
                            </span>
                        </button>
                    </div>
                </aside>

                <main className="chat-pane open">
                    <div className="chat-header">
                        <button type="button" className="back-btn">
                            一覧
                        </button>
                        <div className="chat-title-block">
                            <h3 className="chat-title">TABI サンプル宿泊</h3>
                            <span className="chat-sub">2026-07-01 - 2026-07-02</span>
                        </div>
                        <span className="conn-badge conn-ok">表示確認用</span>
                    </div>

                    <div className="msg-area">
                        <div className="date-divider">
                            <span className="date-badge">今日</span>
                        </div>

                        <div className="msg-row msg-row-other">
                            <div className="msg-avatar">旅</div>
                            <div className="msg-content">
                                <div className="sender-line">
                                    <span className="sender-name">旅行者</span>
                                </div>
                                <div className="bubble-wrap">
                                    <div className="bubble bubble-other">
                                        チェックイン時間を教えてください。
                                    </div>
                                    <span className="msg-time">12:30</span>
                                </div>
                            </div>
                        </div>

                        <div className="msg-row msg-row-me">
                            <div className="msg-content">
                                <div className="bubble-wrap">
                                    <div className="meta-me">
                                        <span className="read-lbl">既読</span>
                                        <span className="msg-time">12:32</span>
                                    </div>
                                    <div className="bubble bubble-me">
                                        15時からチェックインできます。
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="input-area">
                        <form>
                            <button type="button" className="btn-image" aria-label="画像を添付">
                                +
                            </button>
                            <textarea
                                id="msgInput"
                                placeholder="旅行者にメッセージを送る..."
                                maxLength={1000}
                                rows={1}
                            />
                            <button type="submit" className="btn-send" aria-label="送信">
                                &gt;
                            </button>
                        </form>
                    </div>
                </main>
            </div>
        </div>
    );
}
