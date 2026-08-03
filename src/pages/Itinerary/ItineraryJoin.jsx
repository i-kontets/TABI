import { useCallback, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { buildAuthPath, saveAuthReturnPath } from "../../utils/authReturnPath";
import styles from "./itineraryJoin.module.css";

export default function ItineraryJoin() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const groupId = searchParams.get("groupId");
    const joinPath = groupId
        ? `/ItineraryJoin?groupId=${encodeURIComponent(groupId)}`
        : "/ItineraryJoin";

    const [tripName, setTripName] = useState("");
    const [statusMessage, setStatusMessage] = useState(
        groupId ? "" : "招待リンクに旅行グループIDが含まれていません。"
    );
    const [isLoading, setIsLoading] = useState(Boolean(groupId));
    const [isJoining, setIsJoining] = useState(false);

    const redirectToLogin = useCallback(() => {
        saveAuthReturnPath(joinPath);
        navigate(buildAuthPath("/", joinPath), { replace: true });
    }, [joinPath, navigate]);

    useEffect(() => {
        if (!groupId) {
            return;
        }

        if (!localStorage.getItem("loginUser")) {
            redirectToLogin();
            return;
        }

        const fetchTripInfo = async () => {
            try {
                const response = await fetch("/TABI/api/Itinerary/TripInfo.php", {
                    method: "POST",
                    credentials: "include",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        group_id: groupId,
                    }),
                });

                if (response.status === 401) {
                    redirectToLogin();
                    return;
                }

                const data = await response.json();

                if (data.success && data.trip) {
                    setTripName(data.trip.name);
                    setStatusMessage("");
                } else {
                    setStatusMessage("対象の旅行グループが見つかりません。");
                }
            } catch {
                setStatusMessage("旅行グループ情報の取得に失敗しました。");
            } finally {
                setIsLoading(false);
            }
        };

        fetchTripInfo();
    }, [groupId, redirectToLogin]);

    const handleJoin = async () => {
        if (!groupId) return;

        setIsJoining(true);
        setStatusMessage("");

        try {
            const response = await fetch("/TABI/api/Itinerary/JoinGroup.php", {
                method: "POST",
                credentials: "include",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    group_id: groupId,
                }),
            });

            if (response.status === 401) {
                redirectToLogin();
                return;
            }

            const data = await response.json();

            if (data.success) {
                navigate(`/Itinerary?groupId=${encodeURIComponent(groupId)}`);
            } else {
                setStatusMessage(data.message || "旅行グループへの参加に失敗しました。");
            }
        } catch {
            setStatusMessage("通信エラーが発生しました。時間をおいてもう一度お試しください。");
        } finally {
            setIsJoining(false);
        }
    };

    return (
        <main className={styles.page}>
            <section className={styles.card}>
                <p className={styles.label}>旅行グループへの招待</p>
                <h1 className={styles.title}>
                    {tripName || "旅行グループ"}
                </h1>

                {isLoading ? (
                    <p className={styles.message}>招待情報を確認しています...</p>
                ) : (
                    <>
                        <p className={styles.description}>
                            この旅行グループに参加しますか？
                        </p>

                        {statusMessage ? (
                            <p className={styles.error}>{statusMessage}</p>
                        ) : null}

                        <div className={styles.actions}>
                            <button
                                className={styles.primaryButton}
                                type="button"
                                onClick={handleJoin}
                                disabled={!groupId || isJoining}
                            >
                                {isJoining ? "参加中..." : "参加する"}
                            </button>
                            <button
                                className={styles.secondaryButton}
                                type="button"
                                onClick={() => navigate("/Home")}
                            >
                                ホームへ戻る
                            </button>
                        </div>
                    </>
                )}
            </section>
        </main>
    );
}
