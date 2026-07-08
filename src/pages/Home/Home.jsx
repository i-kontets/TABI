import { useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TripContext } from "../../App";
import TravelGroupCard from '../../components/TravelGroupCard/TravelGroupCard';
import Modal from '../../components/Modal/Modal';
import styles from './Home.module.css';

const assetPath = (fileName) => `${import.meta.env.BASE_URL}assets/login/${fileName}`;

const initialTravelGroups = [
    {
        id: "1",
        name: "沖縄旅行 🌺",
        date: "2025/07/20 - 2025/07/23",
        members: 5,
        status: "進行中",
        image: assetPath("login_umi.jpg"),
    },
    {
        id: "2",
        name: "北海道ドライブ旅 🚙",
        date: "2025/08/10 - 2025/08/14",
        members: 4,
        status: "計画中",
        image: assetPath("river.jpg"),
    },
    {
        id: "3",
        name: "東京観光＆グルメ旅 🍣",
        date: "2025/09/05 - 2025/09/07",
        members: 3,
        status: "計画中",
        image: assetPath("night_sky.jpg"),
    },
    {
        id: "4",
        name: "軽井沢のんびり旅 ☕",
        date: "2025/05/01 - 2025/05/03",
        members: 4,
        status: "終了",
        image: assetPath("login_road.jpg"),
    },
];

function PlusIcon({ className }) {
    return (
        <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 5v14M5 12h14" />
        </svg>
    );
}

function BellIcon({ className }) {
    return (
        <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
            <path d="M18 16v-5a6 6 0 0 0-12 0v5l-2 2v1h16v-1l-2-2Z" />
            <path d="M9.5 21a2.5 2.5 0 0 0 5 0" />
        </svg>
    );
}

function LogoutIcon({ className }) {
    return (
        <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
            <path d="M10 5H5v14h5" />
            <path d="M14 8l4 4-4 4" />
            <path d="M8 12h10" />
        </svg>
    );
}

function HomeIcon({ className }) {
    return (
        <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
            <path d="M3 11.5 12 4l9 7.5" />
            <path d="M5.5 10.5V20h13v-9.5" />
            <path d="M9.5 20v-5h5v5" />
        </svg>
    );
}

function UserIcon({ className }) {
    return (
        <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
            <path d="M4.5 20a7.5 7.5 0 0 1 15 0" />
        </svg>
    );
}

const toDisplayDate = (value) => value.replaceAll("-", "/");

function Home() {
    const navigate = useNavigate();
    const { setTrip } = useContext(TripContext);

    const [travelGroups, setTravelGroups] = useState(initialTravelGroups);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [newName, setNewName] = useState("");
    const [newStartDate, setNewStartDate] = useState("");
    const [newEndDate, setNewEndDate] = useState("");

    const handleGroupClick = (trip) => {
        setTrip({
            id: trip.id,
            name: trip.name
        });

        navigate(`/Itinerary?groupId=${trip.id}`);
    };

    const handleLogout = async () => {
        const response = await fetch(
            "/TABI/api/auth/logout.php",
            {
                method: "POST",
                credentials: "include"
            }
        );

        const data = await response.json();

        if (data.success) {
            localStorage.removeItem("loginUser");
            navigate("/");
        }
    };

    const closeCreateModal = () => {
        setIsCreateOpen(false);
        setNewName("");
        setNewStartDate("");
        setNewEndDate("");
    };

    const handleCreateGroup = (event) => {
        event.preventDefault();

        const name = newName.trim();
        if (!name) {
            return;
        }

        const date = newStartDate && newEndDate
            ? `${toDisplayDate(newStartDate)} - ${toDisplayDate(newEndDate)}`
            : "日程未定";

        const newGroup = {
            id: String(Date.now()),
            name,
            date,
            members: 1,
            status: "計画中",
            image: assetPath("cloudy_ocean.jpeg"),
        };

        setTravelGroups((prev) => [newGroup, ...prev]);
        closeCreateModal();
    };

    return (
        <div className={styles.page}>
            <header className={styles.header}>
                <button
                    type="button"
                    className={styles.logoutButton}
                    onClick={handleLogout}
                    aria-label="ログアウト"
                >
                    <LogoutIcon className={styles.headerIcon} />
                    <span>ログアウト</span>
                </button>

                <h1 className={styles.headerTitle}>TABI</h1>

                <button
                    type="button"
                    className={styles.noticeButton}
                    aria-label="通知"
                >
                    <BellIcon className={styles.headerIcon} />
                </button>
            </header>

            <main className={styles.content}>
                {travelGroups.map((group) => (
                    <TravelGroupCard
                        key={group.id}
                        group={group}
                        onClick={handleGroupClick}
                    />
                ))}
            </main>

            <button
                type="button"
                className={styles.createButton}
                onClick={() => setIsCreateOpen(true)}
                aria-label="新しい旅行グループを作成"
            >
                <PlusIcon className={styles.plusIcon} />
            </button>

            <Modal isOpen={isCreateOpen} onClose={closeCreateModal}>
                <form className={styles.createForm} onSubmit={handleCreateGroup}>
                    <h2 className={styles.createTitle}>新しい旅行グループ</h2>

                    <label className={styles.createLabel}>
                        グループ名
                        <input
                            type="text"
                            className={styles.createInput}
                            value={newName}
                            onChange={(event) => setNewName(event.target.value)}
                            placeholder="例）沖縄旅行 🌺"
                            required
                        />
                    </label>

                    <div className={styles.createDates}>
                        <label className={styles.createLabel}>
                            開始日
                            <input
                                type="date"
                                className={styles.createInput}
                                value={newStartDate}
                                onChange={(event) => setNewStartDate(event.target.value)}
                            />
                        </label>

                        <label className={styles.createLabel}>
                            終了日
                            <input
                                type="date"
                                className={styles.createInput}
                                value={newEndDate}
                                onChange={(event) => setNewEndDate(event.target.value)}
                                min={newStartDate || undefined}
                            />
                        </label>
                    </div>

                    <div className={styles.createActions}>
                        <button
                            type="button"
                            className={styles.cancelButton}
                            onClick={closeCreateModal}
                        >
                            キャンセル
                        </button>
                        <button type="submit" className={styles.submitButton}>
                            作成する
                        </button>
                    </div>
                </form>
            </Modal>

            <footer className={styles.footer}>
                <button
                    type="button"
                    className={`${styles.footerItem} ${styles.footerItemActive}`}
                    onClick={() => navigate('/Home')}
                    aria-label="ホーム"
                >
                    <HomeIcon className={styles.footerIcon} />
                    <span>ホーム</span>
                </button>

                <button
                    type="button"
                    className={styles.footerItem}
                    onClick={() => navigate('/mypage')}
                    aria-label="マイページ"
                >
                    <UserIcon className={styles.footerIcon} />
                    <span>マイページ</span>
                </button>
            </footer>
        </div>
    );
}

export default Home