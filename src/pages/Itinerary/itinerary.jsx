/**
 * 旅程の確認や編集を行う画面です。
 *
 * URL の groupId をもとに、旅行タイトル・旅行期間・参加メンバーを取得し、
 * しおり画面として表示します。
 */
import { useSearchParams, useNavigate } from "react-router-dom";
import { useContext, useState, useEffect } from "react";
import { TripContext } from "../../App";
import BtmNav from "../../components/bottomNav/BottomNav";
import Header from "../../components/header/Header";
import Modal from "../../components/Modal/Modal";
import InviteModal from "../../components/Modal/InviteModal";
import styles from "./itinerary.module.css";

export default function Itinerary() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // TripContext で、選択中の旅行情報・メンバー一覧・旅行期間を全ページで共有します。
  const {
    trip,
    setTrip,
    members,
    fetchMembers,
    tripPeriod,
    setTripPeriod,
  } = useContext(TripContext);

  // Home などから /Itinerary?groupId=1 の形で渡された旅行グループIDです。
  const groupId = searchParams.get("groupId");
  const itineraryEditPath = groupId
    ? `/ItineraryEdit?groupId=${encodeURIComponent(groupId)}`
    : "/ItineraryEdit";

  // 招待モーダルの開閉状態です。
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);

  // groupId が変わるたびに、共通化された fetchMembers で参加メンバーを取得します。
  useEffect(() => {
    const loadMembers = async () => {
      const result = await fetchMembers(groupId);

      // セッション切れの場合はログイン情報を消してログイン画面へ戻します。
      if (result.status === "login-required") {
        localStorage.removeItem("loginUser");
        navigate("/");
      }
    };

    loadMembers();
  }, [fetchMembers, groupId, navigate]);

  // groupId から旅行タイトルと旅行期間を取得します。
  useEffect(() => {
    if (!groupId) {
      setTrip({});
      setTripPeriod(null);
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

        // ログインセッションが無効な場合はログイン画面へ戻します。
        if (response.status === 401) {
          localStorage.removeItem("loginUser");
          navigate("/");
          return;
        }

        const data = await response.json();

        if (data.success && data.trip) {
          // trips.title は画面側では trip.name として扱います。
          setTrip({
            id: data.trip.id,
            name: data.trip.name,
            image: data.trip.image_url,
          });

          setTripPeriod({
            startDate: data.trip.start_date,
            endDate: data.trip.end_date,
          });
        } else {
          setTrip({});
          setTripPeriod(null);
        }
      } catch (error) {
        console.error(error);
        setTrip({});
        setTripPeriod(null);
      }
    };

    fetchTripInfo();
  }, [groupId, navigate, setTrip, setTripPeriod]);

  // TODO: 予約APIができたら、ここを実データ取得に置き換えます。
  const appointmentList = [
    {
      id: 1,
      type: "新幹線",
      from: "東京",
      to: "大阪",
      departure: "09:00",
      arrival: "11:30",
    },
    {
      id: 2,
      type: "レンタカー",
      from: "大阪駅",
      to: "USJ",
      departure: "13:00",
      arrival: "13:30",
    },
  ];

  // TODO: 清算APIができたら、ここを実データ取得に置き換えます。
  const liquidationList = [];

  const closeInviteModal = () => {
    setIsInviteModalOpen(false);
  };

  const handleAppointmentClick = () => {
    navigate("/Appointment");
  };

  const coverHeaderStyle = trip?.image
    ? { backgroundImage: `url("${trip.image}")` }
    : undefined;

  // API から返る YYYY-MM-DD 形式の日付を、画面表示用に変換します。
  const formatDate = (dateString) => {
    if (!dateString) return "";

    const date = new Date(dateString);
    const weekDays = ["日", "月", "火", "水", "木", "金", "土"];

    return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()} (${weekDays[date.getDay()]})`;
  };

  // 旅行期間に応じて、バッジに表示する文言を切り替えます。
  const getTripStatusLabel = (startDate, endDate) => {
    if (!startDate || !endDate) return "日付未設定";

    const today = new Date();
    const start = new Date(startDate);
    const end = new Date(endDate);

    today.setHours(0, 0, 0, 0);
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);

    if (today < start) {
      const diffTime = start - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      return `あと ${diffDays} 日`;
    }

    if (today <= end) {
      return "旅行中";
    }

    return "終了";
  };

  const getTripStatusClassName = (startDate, endDate) => {
    if (!startDate || !endDate) {
      return `${styles.daysBadge} ${styles.daysBadgeUnset}`;
    }

    const today = new Date();
    const start = new Date(startDate);
    const end = new Date(endDate);

    today.setHours(0, 0, 0, 0);
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);

    if (today >= start && today <= end) {
      return `${styles.daysBadge} ${styles.daysBadgeActive}`;
    }

    return styles.daysBadge;
  };

  return (
    <div>
      <Header />

      {/* 旅行タイトル・日付・メンバーをまとめて表示するカバー部分 */}
      <div className={styles.coverHeader} style={coverHeaderStyle}>
        <div className={styles.coverOverlay}></div>

        <div className={styles.coverMainInfo}>
          <div className={styles.titleRow}>
            <h1 className={styles.mainTitle}>{trip.name}</h1>

            <span className={getTripStatusClassName(tripPeriod?.startDate, tripPeriod?.endDate)}>
              {getTripStatusLabel(tripPeriod?.startDate, tripPeriod?.endDate)}
            </span>
          </div>

          <p className={styles.subDate}>
            出発：{formatDate(tripPeriod?.startDate)}<br />
            帰宅：{formatDate(tripPeriod?.endDate)}
          </p>

          {/* 参加メンバーの頭文字アイコンと、招待モーダルを開くボタン */}
          <div className={styles.memberRow}>
            <div className={styles.avatarGroup}>
              {members.map((member) => (
                <span
                  key={member.id}
                  className={styles.avatar}
                  style={{ backgroundColor: member.color }}
                  title={member.name}
                >
                  {member.initial}
                </span>
              ))}

              <button
                className={styles.inviteBtn}
                onClick={() => setIsInviteModalOpen(true)}
              >
                +
              </button>
            </div>
          </div>
        </div>

        <button
          className={styles.editBtn}
          onClick={() => navigate(itineraryEditPath)}
        >
          旅行情報を編集
        </button>
      </div>

      {/* しおりタイトル */}
      <div className={styles.WidgetFrame}>
        <div className={styles.WidgetTitle}>しおりタイトル</div>
        <div className={styles.WidgetText}>{trip.name}</div>
      </div>

      {/* 旅行期間 */}
      <div className={styles.WidgetFrame}>
        <div className={styles.WidgetTitle}>旅行期間</div>
        <div className={styles.WidgetText}>
          {tripPeriod?.startDate && tripPeriod?.endDate
            ? `${formatDate(tripPeriod.startDate)} - ${formatDate(tripPeriod.endDate)}`
            : "旅行期間未設定"}
        </div>
      </div>

      {/* メンバー数 */}
      <div className={styles.WidgetFrame}>
        <div className={styles.WidgetTitle}>メンバー数</div>
        <div className={styles.WidgetText}>{members.length}人</div>
      </div>

      {/* 移動手段。現在はダミーデータを表示しています。 */}
      <div className={styles.WidgetFrame}>
        {appointmentList.length === 0 ? (
          <div
            className={styles.WidgetText}
            onClick={handleAppointmentClick}
          >
            移動手段の予約に進む
          </div>
        ) : (
          <div className={styles.WidgetTitle}>
            <div className={styles.WidgetText}>
              {appointmentList[0].type}
            </div>
            <div>
              ここにマップ表示
            </div>
          </div>
        )}
      </div>

      {/* 清算・天気などのサブ情報 */}
      <div className={styles.subWidget}>
        <div className={styles.liquidationWidget}>
          <div className={styles.WidgetTitle}>清算</div>

          {liquidationList.length === 0 ? (
            <div className={styles.WidgetText}>
              請求はありません
            </div>
          ) : (
            <>
              <div className={styles.WidgetText}>
                合計：￥
                {liquidationList
                  .reduce((sum, item) => sum + item.amount, 0)
                  .toLocaleString()}
              </div>

              {liquidationList.map((item, index) => (
                <div
                  key={index}
                  className={styles.WidgetText}
                >
                  {item.from}さんへ：￥
                  {item.amount.toLocaleString()}
                </div>
              ))}
            </>
          )}
        </div>

        <div className={styles.weatherWidget}>
          <div className={styles.WidgetTitle}>天気予報</div>
          <div className={styles.WidgetText}></div>
        </div>
      </div>

      {/* 画面下部に固定表示するナビゲーション */}
      <div className={styles.btmNavWrapper}>
        <BtmNav />
      </div>

      {/* メンバー招待用モーダル */}
      <Modal
        isOpen={isInviteModalOpen}
        onClose={closeInviteModal}
      >
        <InviteModal groupId={groupId} onClose={closeInviteModal} />
      </Modal>
    </div>
  );
}
