/**
 * 旅行のしおり情報を編集する画面です。
 *
 * 編集できる内容:
 * - しおりタイトル
 * - 旅行期間
 * - 参加メンバーの確認・削除
 *
 * URL の groupId をもとに対象グループを判断し、DBから現在の情報を取得して表示します。
 */
import { useContext, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { DayPicker } from "react-day-picker";
import { ja } from "react-day-picker/locale";
import "react-day-picker/style.css";
import styles from "./itineraryEdit.module.css";
import BtmNav from "../../components/bottomNav/BottomNav";
import { TripContext } from "../../App";
import ArrowBack from "../../assets/icons/arrow_back.svg?react";
import Check from "../../assets/icons/check.svg?react";
import Close from "../../assets/icons/close.svg?react";

// APIから返る YYYY-MM-DD を、カレンダーで扱いやすい Date に変換します。
const parseLocalDate = (dateString) => {
    if (!dateString) return undefined;
    return new Date(`${dateString}T00:00:00`);
};

// DayPicker の Date を、APIへ送る YYYY-MM-DD 形式に変換します。
const formatApiDate = (date) => {
    if (!date) return null;

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
};

// 画面上の旅行期間サマリー用に、日本語の日付表記へ変換します。
const formatJapaneseDate = (date) =>
    date.toLocaleDateString("ja-JP", {
        year: "numeric",
        month: "long",
        day: "numeric",
        weekday: "short",
    });

// localStorage に保存されているログインユーザーIDを取得します。
// 自分自身をメンバー削除できないようにする判定で使います。
function getLoginUserId() {
    try {
        const loginUser = JSON.parse(localStorage.getItem("loginUser") || "null");
        return Number(loginUser?.user_id) || null;
    } catch {
        return null;
    }
}

export default function ItineraryEdit() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { setTrip, setTripPeriod, fetchMembers } = useContext(TripContext);

    // URLから編集対象の旅行グループIDを取得します。
    const groupId = searchParams.get("groupId");
    const itineraryPath = groupId
        ? `/Itinerary?groupId=${encodeURIComponent(groupId)}`
        : "/Itinerary";
    const loginUserId = getLoginUserId();

    // 編集フォーム、メンバー一覧、通信状態をそれぞれstateで管理します。
    const [selectedRange, setSelectedRange] = useState(undefined);
    const [formValues, setFormValues] = useState({
        title: "",
    });
    const [members, setMembers] = useState([]);
    const [message, setMessage] = useState(
        groupId ? "" : "旅行グループIDが見つかりません。"
    );
    const [isLoading, setIsLoading] = useState(Boolean(groupId));
    const [isSaving, setIsSaving] = useState(false);
    const [removingMemberId, setRemovingMemberId] = useState(null);

    useEffect(() => {
        if (!groupId) {
            return;
        }

        // 編集画面の初期表示に必要な「旅行情報」と「メンバー一覧」をまとめて取得します。
        const loadEditData = async () => {
            setMessage("");

            try {
                const [tripResponse, memberResult] = await Promise.all([
                    fetch("/TABI/api/Itinerary/TripInfo.php", {
                        method: "POST",
                        credentials: "include",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                            group_id: groupId,
                        }),
                    }),
                    fetchMembers(groupId),
                ]);

                // PHPセッションが切れていた場合は、ログイン情報を消してログイン画面へ戻します。
                if (tripResponse.status === 401 || memberResult.status === "login-required") {
                    localStorage.removeItem("loginUser");
                    navigate("/");
                    return;
                }

                const tripData = await tripResponse.json();

                const currentMember = (memberResult.members || []).find(
                    (member) => Number(member.id) === loginUserId
                );

                if (currentMember?.role !== "admin") {
                    navigate(itineraryPath, { replace: true });
                    return;
                }

                // DBから取得した旅行タイトル・期間をフォームの初期値に入れます。
                if (tripData.success && tripData.trip) {
                    setFormValues({
                        title: tripData.trip.title || tripData.trip.name || "",
                    });

                    setSelectedRange({
                        from: parseLocalDate(tripData.trip.start_date),
                        to: parseLocalDate(tripData.trip.end_date),
                    });
                }

                setMembers(memberResult.members || []);
            } catch (error) {
                console.error(error);
                setMessage("編集情報の取得に失敗しました。");
            } finally {
                setIsLoading(false);
            }
        };

        loadEditData();
    }, [fetchMembers, groupId, itineraryPath, loginUserId, navigate]);

    // 戻るボタンでは、groupId を保持したまま Itinerary へ戻ります。
    const BackClick = () => {
        navigate(itineraryPath);
    };

    // しおりタイトル入力の変更を state に反映します。
    const handleChange = (event) => {
        const { name, value } = event.target;
        setFormValues((current) => ({
            ...current,
            [name]: value,
        }));
    };

    // メンバー削除ボタンを押した時、確認後にDBから対象メンバーを外します。
    const handleRemoveMember = async (member) => {
        if (!groupId || !member?.id || removingMemberId) return;

        const confirmed = window.confirm(`${member.name}さんをこの旅行グループから外しますか？`);

        if (!confirmed) {
            return;
        }

        setRemovingMemberId(member.id);
        setMessage("");

        try {
            const response = await fetch("/TABI/api/Itinerary/RemoveMember.php", {
                method: "POST",
                credentials: "include",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    group_id: groupId,
                    member_id: member.id,
                }),
            });

            if (response.status === 401) {
                localStorage.removeItem("loginUser");
                navigate("/");
                return;
            }

            const data = await response.json();

            if (!response.ok || !data.success) {
                setMessage(data.message || "メンバーの変更に失敗しました。");
                return;
            }

            // 削除後は共通の fetchMembers で一覧を取り直し、画面表示を最新にします。
            const result = await fetchMembers(groupId);
            setMembers(result.members || []);
            setMessage(`${member.name}さんをメンバーから外しました。`);
        } catch (error) {
            console.error(error);
            setMessage("通信エラーが発生しました。");
        } finally {
            setRemovingMemberId(null);
        }
    };

    // 変更ボタンを押した時、タイトルと旅行期間をDBへ保存します。
    const handleSubmit = async (event) => {
        event.preventDefault();

        if (!groupId || isSaving) return;

        setIsSaving(true);
        setMessage("");

        try {
            const response = await fetch("/TABI/api/Itinerary/UpdateTripInfo.php", {
                method: "POST",
                credentials: "include",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    group_id: groupId,
                    title: formValues.title,
                    start_date: formatApiDate(selectedRange?.from),
                    end_date: formatApiDate(selectedRange?.to ?? selectedRange?.from),
                }),
            });

            if (response.status === 401) {
                localStorage.removeItem("loginUser");
                navigate("/");
                return;
            }

            const data = await response.json();

            if (!response.ok || !data.success) {
                setMessage(data.message || "旅行情報の変更に失敗しました。");
                return;
            }

            // DB更新後の最新情報をContextにも反映し、戻った先のItinerary表示をすぐ最新にします。
            if (data.trip) {
                setTrip((currentTrip) => ({
                    ...currentTrip,
                    id: data.trip.id,
                    name: data.trip.name || data.trip.title,
                }));

                setTripPeriod({
                    startDate: data.trip.start_date,
                    endDate: data.trip.end_date,
                });
            }

            navigate(itineraryPath);
        } catch (error) {
            console.error(error);
            setMessage("通信エラーが発生しました。");
        } finally {
            setIsSaving(false);
        }
    };

    // カレンダーで選択中の旅行期間を、ユーザーに見やすい文章として表示します。
    const periodSummary = selectedRange?.from
        ? `${formatJapaneseDate(selectedRange.from)} - ${formatJapaneseDate(selectedRange.to ?? selectedRange.from)}`
        : "期間未設定";

    return (
        <>
            <header className={styles.header}>
                <button
                    className={styles.backButton}
                    onClick={BackClick}
                    aria-label="戻る"
                    type="button"
                >
                    <ArrowBack className={styles.icon} aria-hidden="true" />
                </button>
                <div className={styles.Htitle} style={{ margin: "auto" }}>編集画面</div>
            </header>

            <form onSubmit={handleSubmit}>
                <div className={styles.container}>
                    {message ? <p className={styles.message}>{message}</p> : null}

                    <div className={styles.box}>
                        <h3 className={styles.title}>しおりタイトル</h3>
                        <input
                            className={styles.input}
                            type="text"
                            name="title"
                            value={formValues.title}
                            onChange={handleChange}
                            disabled={isLoading}
                        />
                    </div>

                    <div className={styles.box}>
                        <h3 className={styles.title}>旅行期間</h3>
                        <p className={styles.rangeSummary}>{periodSummary}</p>
                        <div className={styles.calendar}>
                            <DayPicker
                                mode="range"
                                selected={selectedRange}
                                onSelect={setSelectedRange}
                                defaultMonth={selectedRange?.from}
                                resetOnSelect
                                locale={ja}
                                weekStartsOn={0}
                                disabled={isLoading}
                            />
                        </div>
                    </div>

                    <div className={styles.box}>
                        <h3 className={styles.title}>メンバー</h3>
                        <p className={styles.memberHelp}>
                            現在の参加メンバーを確認できます。外したいメンバーは右側のボタンから変更できます。
                        </p>

                        <div className={styles.memberList}>
                            {members.length === 0 ? (
                                <p className={styles.emptyText}>メンバーが見つかりません。</p>
                            ) : (
                                members.map((member) => {
                                    const isCurrentUser = Number(member.id) === loginUserId;

                                    return (
                                        <div className={styles.memberItem} key={member.id}>
                                            <span
                                                className={styles.memberAvatar}
                                                style={{ backgroundColor: member.color }}
                                                aria-hidden="true"
                                            >
                                                {member.initial}
                                            </span>

                                            <div className={styles.memberMeta}>
                                                <span className={styles.memberName}>{member.name}</span>
                                                <span className={styles.memberId}>ID: {member.id}</span>
                                            </div>

                                            <button
                                                className={styles.removeMemberButton}
                                                type="button"
                                                onClick={() => handleRemoveMember(member)}
                                                disabled={isCurrentUser || removingMemberId === member.id}
                                                aria-label={`${member.name}さんをメンバーから外す`}
                                            >
                                                <Close className={styles.removeIcon} aria-hidden="true" />
                                            </button>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    <button className={styles.submitButton} type="submit" disabled={isLoading || isSaving}>
                        <Check className={styles.submitIcon} aria-hidden="true" />
                        {isSaving ? "変更中..." : "変更"}
                    </button>
                </div>
            </form>

            <BtmNav />
        </>
    );
}
