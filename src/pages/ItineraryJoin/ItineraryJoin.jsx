/**
 * QRコードや招待リンクから旅行グループへ参加するための画面です。
 *
 * 主な流れ:
 * 1. URL の groupId から参加対象の旅行グループを判断する
 * 2. 未ログインの場合は、ログイン後にこの画面へ戻れるようにしてログイン画面へ移動する
 * 3. ログイン済みの場合は旅行名を取得し、参加ボタンからグループ加入APIを呼び出す
 */
import { useCallback, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { buildAuthPath, saveAuthReturnPath } from "../../utils/authReturnPath";
import styles from "./itineraryJoin.module.css";

export default function ItineraryJoin() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    // QRコードのURLに含まれる groupId を取得します。
    // この値で「どの旅行グループに参加するか」を決めます。
    const groupId = searchParams.get("groupId");
    const joinPath = groupId
        ? `/ItineraryJoin?groupId=${encodeURIComponent(groupId)}`
        : "/ItineraryJoin";

    // 画面表示に使う旅行名・メッセージ・処理中フラグを管理します。
    const [tripName, setTripName] = useState("");
    const [statusMessage, setStatusMessage] = useState(
        groupId ? "" : "招待リンクに旅行グループIDが含まれていません。"
    );
    const [isLoading, setIsLoading] = useState(Boolean(groupId));
    const [isJoining, setIsJoining] = useState(false);

    // 未ログインの場合に、ログイン後もう一度この加入画面へ戻れるようにします。
    const redirectToLogin = useCallback(() => {
        saveAuthReturnPath(joinPath);
        navigate(buildAuthPath("/", joinPath), { replace: true });
    }, [joinPath, navigate]);

    useEffect(() => {
        if (!groupId) {
            return;
        }

        // スマートフォンのカメラから直接開いた場合など、未ログインなら先にログインへ送ります。
        if (!localStorage.getItem("loginUser")) {
            redirectToLogin();
            return;
        }

        // 参加前に旅行名を取得し、ユーザーが参加対象を確認できるようにします。
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

                // PHPセッションが切れている場合も、ログイン後に同じ加入画面へ戻します。
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

    // 「参加する」ボタンを押した時に、ログイン中のユーザーを対象グループへ加入させます。
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
