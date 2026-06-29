import { useContext, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import { TripContext } from "../../App";
import Header from "../../components/header/Header";
import BottomNav from "../../components/bottomNav/BottomNav";
import Chat from "../../components/Discussion/Chat";
import TravelOptions from "../../components/Discussion/TravelOptions";
import Vote from "../../components/Discussion/Vote";
import "./Discussion.css";

const tripNames = {
    1: "三重",
    2: "北海道",
    3: "和歌山",
    4: "奈良",
    5: "青森",
};

const tabs = [
    { id: "chat", label: "話し合い" },
    { id: "candidate", label: "候補" },
    { id: "poll", label: "投票" },
];

function Discussion() {
    const { trip } = useContext(TripContext);
    const { groupId: pathGroupId } = useParams();
    const location = useLocation();
    const queryGroupId = new URLSearchParams(location.search).get("groupId");
    const groupId = pathGroupId || queryGroupId || trip.id || "1";
    const tripTitle = trip.name || tripNames[groupId] || "旅行";
    const [activeTab, setActiveTab] = useState("chat");

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
                    <Chat active={activeTab === "chat"} />
                    <TravelOptions active={activeTab === "candidate"} />
                    <Vote active={activeTab === "poll"} />
                </div>

                <BottomNav />
            </section>
        </main>
    );
}

export default Discussion;
