import { useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TripContext } from "../../App";
import TravelGroupCard from '../../components/TravelGroupCard/TravelGroupCard';
import Modal from '../../components/Modal/Modal';
import styles from './Home.module.css';

const assetPath = (fileName) => `${import.meta.env.BASE_URL}assets/login/${fileName}`;

// グループにはDB上の画像がないため、カード画像はローカルアセットを順番に割り当てる
const cardImages = [
    "login_umi.jpg",
    "river.jpg",
    "night_sky.jpg",
    "login_road.jpg",
    "sunset.jpg",
    "login_train.jpg",
    "cloudy_ocean.jpeg",
];

const imageForIndex = (index) => assetPath(cardImages[index % cardImages.length]);

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

function Home() {
    const navigate = useNavigate();
    const { setTrip } = useContext(TripContext);

    const [travelGroups, setTravelGroups] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [newName, setNewName] = useState("");
    const [newStartDate, setNewStartDate] = useState("");
    const [newEndDate, setNewEndDate] = useState("");

    // ログイン中ユーザーが参加している旅行グループをDBから取得する
    useEffect(() => {
        let isMounted = true;

        const fetchGroups = async () => {
            try {
                const response = await fetch(
                    "/TABI/api/Groups/List.php",
                    {
                        method: "GET",
                        credentials: "include"
                    }
                );

                // 未ログインならログインフォームへ強制移動する
                if (response.status === 401) {
                    localStorage.removeItem("loginUser");
                    navigate("/");
                    return;
                }

                const data = await response.json();

                if (!isMounted) {
                    return;
                }

                if (data.success && Array.isArray(data.groups)) {
                    setTravelGroups(
                        data.groups.map((group, index) => ({
                            ...group,
                            image: imageForIndex(index),
                        }))
                    );
                } else {
                    setTravelGroups([]);
                }
            } catch {
                if (isMounted) {
                    setTravelGroups([]);
                }
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        };

        fetchGroups();

        return () => {
            isMounted = false;
        };
    }, [navigate]);

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

    // 新しい旅行グループをDBに登録し、成功したら一覧の先頭に追加する
    const handleCreateGroup = async (event) => {
        event.preventDefault();

        const name = newName.trim();
        if (!name) {
            return;
        }

        try {
            const response = await fetch(
                "/TABI/api/Groups/Create.php",
                {
                    method: "POST",
                    credentials: "include",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        group_name: name,
                        start_date: newStartDate || null,
                        end_date: newEndDate || null
                    })
                }
            );

            // 未ログインならログインフォームへ強制移動する
            if (response.status === 401) {
                localStorage.removeItem("loginUser");
                navigate("/");
                return;
            }

            const data = await response.json();

            if (data.success && data.group) {
                setTravelGroups((prev) => [
                    { ...data.group, image: imageForIndex(prev.length) },
                    ...prev
                ]);
                closeCreateModal();
                return;
            }

            alert(data.message ?? "旅行グループの作成に失敗しました。");
        } catch {
            alert("旅行グループの作成に失敗しました。通信環境を確認してください。");
        }
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
                {isLoading ? (
                    <p className={styles.stateMessage}>読み込み中...</p>
                ) : travelGroups.length === 0 ? (
                    <p className={styles.stateMessage}>
                        参加中の旅行グループはありません。<br />
                        右下の＋ボタンから作成できます。
                    </p>
                ) : (
                    travelGroups.map((group) => (
                        <TravelGroupCard
                            key={group.id}
                            group={group}
                            onClick={handleGroupClick}
                        />
                    ))
                )}
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
