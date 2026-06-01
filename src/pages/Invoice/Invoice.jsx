import { useState } from "react";
import styles from "./Invoice.module.css";
import Header from "../../components/header/Header";
import BtmNav from "../../components/bottomNav/BottomNav";

const payItems = [
    { id: 1, name: "名前", amount: "1,200円", status: "未払い" },
    { id: 2, name: "名前", amount: "800円", status: "支払い済み" },
    { id: 3, name: "名前", amount: "2,000円", status: "未払い" },
];

const collectItems = [
    { id: 1, name: "名前", amount: "1,500円", status: "未徴収" },
    { id: 2, name: "名前", amount: "1,500円", status: "徴収済み" },
    { id: 3, name: "名前", amount: "1,500円", status: "未徴収" },
    { id: 4, name: "名前", amount: "1,500円", status: "徴収済み" },
];

export default function Invoice() {
    const [activeTab, setActiveTab] = useState("collect");

    // activeTabが"pay"なら支払いリスト、"collect"なら徴収分リストを表示する
    const displayItems = activeTab === "pay" ? payItems : collectItems;

    return (
        <>
            <Header subtitle="割り勘" />

            <main className={styles.page}>
                <section className={styles.titleArea}>
                    <h2>{activeTab === "pay" ? "支払い" : "徴収側"}</h2>
                    <button className={styles.menuButton} aria-label="メニュー"></button>
                </section>

                <div className={styles.tabs}>
                    <button
                        type="button"
                        className={activeTab === "pay" ? styles.activeTab : ""}
                        onClick={() => setActiveTab("pay")}
                    >
                        支払
                    </button>
                    <button
                        type="button"
                        className={activeTab === "collect" ? styles.activeTab : ""}
                        onClick={() => setActiveTab("collect")}
                    >
                        徴収分
                    </button>
                </div>

                <div className={styles.list}>
                    {displayItems.map((item) => (
                        <div className={styles.listItem} key={item.id}>
                            <div>
                                <p className={styles.name}>{item.name}</p>
                                <p className={styles.status}>{item.status}</p>
                            </div>
                            <div className={styles.rightArea}>
                                <span className={styles.amount}>{item.amount}</span>
                                <span className={styles.check}>✓</span>
                            </div>
                        </div>
                    ))}
                </div>

                <button className={styles.addButton} type="button" aria-label="追加">
                    +
                </button>
            </main>

            <BtmNav />
        </>
    );
}