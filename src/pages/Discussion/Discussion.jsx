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
import { useContext } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { TripContext } from "../../App";
import Header from "../../components/header/Header";
import BottomNav from "../../components/bottomNav/BottomNav";
import ChatPage from "../Chat/Chat";
import TravelOptions from "../../components/Discussion/TravelOptions";
import Vote from "../../components/Discussion/Vote";
import "./Discussion.css";

const tabs = [
    { id: "chat", label: "話し合い" },
    { id: "candidate", label: "候補" },
    { id: "poll", label: "投票" },
];

const validTabIds = new Set(tabs.map((tab) => tab.id));

/**
 * Discussion は、このファイルの中心となる処理をまとめた関数です。
 * 画面から渡された値や API の結果を使い、次に表示する内容を決めます。
 */
function Discussion() {
    const { trip } = useContext(TripContext);
    const { groupId: pathGroupId } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    const queryGroupId = new URLSearchParams(location.search).get("groupId");
    const groupId = pathGroupId || queryGroupId || trip.id;
    const tripTitle = String(trip.id) === String(groupId) ? trip.name || "旅行" : "旅行";
    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const queryTab = new URLSearchParams(location.search).get("tab");
    const activeTab = validTabIds.has(queryTab) ? queryTab : "chat";
    // 選んだタブをURLへ残し、戻る操作・再読み込みでも候補を開けるようにします。
    const setActiveTab = (tab) => {
        const params = new URLSearchParams(location.search);
        params.set('tab', tab);
        navigate(`/group/${encodeURIComponent(groupId)}/talk?${params}`);
    };

    // グループ未選択でAPIを呼ぶと別旅行を開くため、Homeで選び直してもらいます。
    if (!groupId) return <main><p>旅行グループを選択してください。</p><Link to="/Home">ホームへ</Link></main>;

    return (
        <main className="discussionShell">
            <section className="phoneFrame" aria-label="旅行グループの話し合い">
                <Header tripName={tripTitle} />

                <nav className="tabBar" aria-label="話し合いメニュー">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            className={activeTab === tab.id ? "active" : ""}
                            type="button"
                            onClick={() => setActiveTab(tab.id)}
                        >
                            {tab.label}
                        </button>
                    ))}
                </nav>

                <div className="contentArea">
                    {activeTab === "chat" && <ChatPage embedded groupId={groupId} />}
                    <TravelOptions groupId={groupId} active={activeTab === "candidate"} />
                    <Vote active={activeTab === "poll"} />
                </div>

                <BottomNav />
            </section>
        </main>
    );
}

export default Discussion;
