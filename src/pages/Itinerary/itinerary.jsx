/**
 * 旅程の確認や編集を行う画面です。
 *
 * 主な流れ:
 * 1. 必要な部品や API 関数を読み込む
 * 2. 画面表示やデータ取得に必要な値を準備する
 * 3. ユーザー操作や API の結果に合わせて表示を更新する
 *
 * 扱うデータ: React の state、props、フォーム入力、API から返ったデータを主に扱います。
 */
import { useSearchParams, useNavigate } from "react-router-dom";
import { useContext, useState, useEffect } from "react";
import { TripContext } from "../../App";
import BtmNav from "../../components/bottomNav/BottomNav";
import Header from "../../components/header/Header";
import Modal from "../../components/Modal/Modal";
import InviteModal from "../../components/Modal/InviteModal";
import styles from "./itinerary.module.css";

/**
 * Itinerary は、このファイルの中心となる処理をまとめた関数です。
 * 画面から渡された値や API の結果を使い、次に表示する内容を決めます。
 */
export default function Itinerary() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const {
    trip,
    members,
    setMembers,
    tripPeriod,
    setTripPeriod,
  } = useContext(TripContext);

  const groupId = searchParams.get("groupId");

  // 招待モーダルの管理状態
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);

  // 旅行グループにはいっているメンバーの取得
  useEffect(() => {
    if (!groupId) return;

    const fetchMembers = async () => {
      try {
        const response = await fetch("/TABI/api/Groups/Members.php", {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            group_id: groupId,
          }),
        });

        const data = await response.json();

        if (data.success && Array.isArray(data.members)) {
          setMembers(
            data.members.map((member) => ({
              ...member,
              name: member.name,
              initial: member.name?.charAt(0) ?? "?",
              color: member.color ?? "#b5ead7",
            }))
          );
        } else {
          setMembers([]);
        }
      } catch (error) {
        console.error(error);
        setMembers([]);
      }
    };

    fetchMembers();
  }, [groupId, setMembers]);

  useEffect(() => {
    if (!groupId) return;

    const fetchTripPeriod = async () => {
      try {
        const response = await fetch("/TABI/api/Auth/TripPeriod.php", {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            group_id: groupId,
          }),
        });

        const data = await response.json();

        if (data.success) {
          setTripPeriod({
            startDate: data.start_date,
            endDate: data.end_date,
          });
        }
      } catch (error) {
        console.error(error);
      }
    };

    fetchTripPeriod();
  }, [groupId, setTripPeriod]);

  // 移動手段のデータ
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

  // 未清算のデータ
  const liquidationList = [];

  const closeInviteModal = () => {
    setIsInviteModalOpen(false);
  };

  const handleAppointmentClick = () => {
    // データがない → Appointment.jsxへ
    navigate("/Appointment");
  };

  // 日付表示用の関数
  const formatDate = (dateString) => {
    if (!dateString) return "";

    const date = new Date(dateString);
    const weekDays = ["日", "月", "火", "水", "木", "金", "土"];

    return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()} (${weekDays[date.getDay()]})`;
  };

  const getRemainingDays = (startDate) => {
    if (!startDate) return "";

    const today = new Date();
    const start = new Date(startDate);

    today.setHours(0, 0, 0, 0);
    start.setHours(0, 0, 0, 0);

    const diffTime = start - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays;
  };

  return (
    <div>
      <Header />

      {/* カバー画像ヘッダー */}
      <div className={styles.coverHeader}>
        <div className={styles.coverOverlay}></div>

        <div className={styles.coverMainInfo}>
          <div className={styles.titleRow}>
            <h1 className={styles.mainTitle}>{trip.name}</h1>

            <span className={styles.daysBadge}>
              {tripPeriod?.startDate
                ? `あと ${getRemainingDays(tripPeriod.startDate)} 日`
                : "日付未設定"}
            </span>
          </div>

          <p className={styles.subDate}>
            出発：{formatDate(tripPeriod?.startDate)}<br />
            帰宅：{formatDate(tripPeriod?.endDate)}
          </p>

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

        {/* 編集ボタン */}
        <button
          className={styles.editBtn}
          onClick={() => navigate("/ItineraryEdit")}
        >
          旅行情報を編集
        </button>
      </div>

      {/* タイトルウィジェット */}
      <div className={styles.WidgetFrame}>
        <div className={styles.WidgetTitle}>しおりタイトル</div>
        <div className={styles.WidgetText}>{trip.name}</div>
      </div>

      {/* 旅行期間ウィジェット */}
      <div className={styles.WidgetFrame}>
        <div className={styles.WidgetTitle}>
          旅行期間
        </div>
        <div className={styles.WidgetText}>
          {tripPeriod?.startDate && tripPeriod?.endDate
            ? `${formatDate(tripPeriod.startDate)} - ${formatDate(tripPeriod.endDate)}`
            : "旅行期間未設定"}
        </div>
      </div>

      {/* メンバー数ウィジェット */}
      <div className={styles.WidgetFrame}>
        <div className={styles.WidgetTitle}>メンバー数</div>
        <div className={styles.WidgetText}>{members.length}人</div>
      </div>

      {/* 移動手段ウィジェット */}
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

      {/* サブウィジェット */}
      <div className={styles.subWidget}>
        {/* 清算ウィジェット */}
        <div className={styles.liquidationWidget}>
          <div className={styles.WidgetTitle}>清算</div>

          {liquidationList.length === 0 ? (
            <div className={styles.WidgetText}>
              請求はありません
            </div>
          ) : (
            <>
              {/* 合計金額 */}
              <div className={styles.WidgetText}>
                合計：￥
                {liquidationList
                  .reduce((sum, item) => sum + item.amount, 0)
                  .toLocaleString()}
              </div>

              {/* 各請求 */}
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

        {/* 天気予報ウィジェット */}
        <div className={styles.weatherWidget}>
          <div className={styles.WidgetTitle}>天気予報</div>
          <div className={styles.WidgetText}></div>
        </div>
      </div>

      {/* 固定ボトムナビ */}
      <div className={styles.btmNavWrapper}>
        <BtmNav />
      </div>

      {/* 招待モーダル */}
      <Modal
        isOpen={isInviteModalOpen}
        onClose={closeInviteModal}
      >
        <InviteModal onClose={closeInviteModal} />
      </Modal>
    </div>
  );
}
