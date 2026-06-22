import { useState } from "react";
import Header from "../../components/header/Header";
import BottomNav from "../../components/bottomNav/BottomNav";
import Chat from "../../components/Discussion/Chat";
import TravelOptions from "../../components/Discussion/TravelOptions";
import Vote from "../../components/Discussion/Vote";
import "./Discussion.css";

const trip = {
    title: "三重旅行",
    members: ["さくら", "たくや", "みほ", "ゆうき"],
};

const tabs = [
    { id: "chat", label: "話し合い" },
    { id: "candidate", label: "候補" },
    { id: "poll", label: "投票" },
];

function Discussion() {
    const [activeTab, setActiveTab] = useState("chat");

    return (
        <main className="discussionShell">
            <section className="phoneFrame" aria-label="旅行グループの話し合い">
                <Header tripName={trip.title} />

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
                    <Chat members={trip.members} active={activeTab === "chat"} />
                    <TravelOptions active={activeTab === "candidate"} />
                    <Vote active={activeTab === "poll"} />
                </div>

                <BottomNav />
            </section>
        </main>
    );
}

export default Discussion;
