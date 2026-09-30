/**
 * 旅程の確認や編集を行う画面です。
 *
 * URL の groupId をもとに、旅行タイトル・旅行期間・参加メンバーを取得し、
 * しおり画面として表示します。
 */
import { useSearchParams, useNavigate } from "react-router-dom";
import { useContext, useState, useEffect } from "react";
import { Timeline } from "@mantine/core";
import { TripContext } from "../../App";
import BtmNav from "../../components/bottomNav/BottomNav";
import Header from "../../components/header/Header";
import Modal from "../../components/Modal/Modal";
import InviteModal from "../../components/Modal/InviteModal";
import styles from "./itinerary.module.css";

function getLoginUserId() {
  try {
    const loginUser = JSON.parse(localStorage.getItem("loginUser") || "null");
    return Number(loginUser?.user_id) || null;
  } catch {
    return null;
  }
}

const yenFormatter = new Intl.NumberFormat("ja-JP");

function formatYen(value) {
  const number = Number(String(value ?? "").replace(/,/g, ""));
  return Number.isFinite(number) ? `${yenFormatter.format(number)}円` : "0円";
}

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
  const loginUserId = getLoginUserId();
  const isTripAdmin = members.some(
    (member) => Number(member.id) === loginUserId && member.role === "admin"
  );

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

  // TODO: 交通手段APIができたら、ここを実データ取得に置き換えます。
  // 現時点ではYahoo乗換検索のURLをもとにした仮データを表示します。
  const appointmentList = [
    {
      id: 1,
      routeName: "ルート1",
      departure: "14:25",
      arrival: "14:46",
      duration: "21分",
      rideTime: "乗車15分",
      transfers: "乗換：1回",
      distance: "7.5km",
      fare: "IC優先：290円",
      link: "https://transit.yahoo.co.jp/search/result?from=%E8%B0%B7%E7%94%BA%E7%B7%9A%E5%A4%A9%E7%8E%8B%E5%AF%BA%E9%A7%85&to=%E9%98%AA%E7%A5%9E%E7%99%BE%E8%B2%A8%E5%BA%97%20%E9%98%AA%E7%A5%9E%E6%A2%85%E7%94%B0%E6%9C%AC%E5%BA%97&fromgid=&togid=giBHAlW82T6&flatlon=&tlatlon=34.7010807%2C135.4986125%2C%E9%98%AA%E7%A5%9E%E7%99%BE%E8%B2%A8%E5%BA%97%20%E9%98%AA%E7%A5%9E%E6%A2%85%E7%94%B0%E6%9C%AC%E5%BA%97&via=&viacode=&y=2026&m=09&d=07&hh=14&m1=1&m2=8&type=1&ticket=ic&expkind=1&userpass=1&ws=3&s=0&al=1&shin=1&ex=1&hb=1&lb=1&sr=1",
      steps: [
        {
          id: "tennoji",
          time: "14:25",
          badge: "発",
          station: "天王寺",
          links: ["時刻表", "出口", "地図"],
          detail: "OsakaMetro御堂筋線 / 新大阪行",
          note: "[発] 2番線 → [着] 4番線",
          lineColor: "red",
        },
        {
          id: "daikokucho",
          time: "14:29着\n14:31発",
          station: "大国町",
          links: ["時刻表", "出口", "地図"],
          detail: "OsakaMetro四つ橋線 / 西梅田行",
          note: "[発] 3番線 → [着] 1番線",
          lineColor: "blue",
        },
        {
          id: "nishiumeda",
          time: "14:42着\n14:44発",
          station: "西梅田",
          links: ["時刻表", "出口", "地図"],
          detail: "同駅内徒歩",
          note: "",
          lineColor: "walk",
        },
        {
          id: "osakaumeda",
          time: "14:46",
          badge: "着",
          station: "大阪梅田(阪神線)",
          links: ["時刻表", "地図"],
          detail: "",
          note: "",
          lineColor: "none",
        },
      ],
    },
  ];

  // 清算Widgetに表示する、この旅行でログイン中のユーザーが立て替えた合計金額です。
  const [myPaidAmount, setMyPaidAmount] = useState({
    groupId: null,
    amount: 0,
  });
  const isMyPaidAmountLoading = Boolean(groupId && loginUserId) && myPaidAmount.groupId !== groupId;

  const closeInviteModal = () => {
    setIsInviteModalOpen(false);
  };

  const handleAppointmentClick = () => {
    navigate("/Appointment");
  };

  const handleLiquidationClick = () => {
    const invoiceLiquidationPath = groupId
      ? `/InvoiceLiquidation?groupId=${encodeURIComponent(groupId)}`
      : "/InvoiceLiquidation";

    navigate(invoiceLiquidationPath);
  };

  // 支払い一覧から、自分が追加した支払いの合計額を取得します。
  useEffect(() => {
    if (!groupId || !loginUserId) {
      return;
    }

    const fetchMyPaidAmount = async () => {
      try {
        const response = await fetch(
          `/TABI/api/Invoice/List.php?group_id=${encodeURIComponent(groupId)}`,
          {
            method: "GET",
            credentials: "include",
          }
        );

        if (response.status === 401) {
          localStorage.removeItem("loginUser");
          navigate("/");
          return;
        }

        const data = await response.json();

        if (data.success && Array.isArray(data.pay)) {
          const amount = data.pay.reduce((sum, payment) => {
            if (Number(payment.paidById) !== loginUserId) {
              return sum;
            }

            return sum + Number(payment.totalAmount || payment.amount || 0);
          }, 0);

          setMyPaidAmount({
            groupId,
            amount,
          });
          return;
        }

        setMyPaidAmount({
          groupId,
          amount: 0,
        });
      } catch (error) {
        console.error(error);
        setMyPaidAmount({
          groupId,
          amount: 0,
        });
      }
    };

    fetchMyPaidAmount();
  }, [groupId, loginUserId, navigate]);

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
      <Header showDate={false} />
      {/* しおりから候補タブへグループIDを渡します。未選択ならHomeで選び直します。 */}
      <button className={styles.candidateLink} type="button" onClick={() => navigate(groupId ? `/group/${encodeURIComponent(groupId)}/talk?tab=candidate` : '/Home')}>候補を見る</button>


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

        {isTripAdmin ? (
          <button
            className={styles.editBtn}
            onClick={() => navigate(itineraryEditPath)}
          >
            旅行情報を編集
          </button>
        ) : null}
      </div>

      {/* 移動手段。現在はダミーデータを表示しています。 */}
      <div className={styles.WidgetFrame}>
        <div className={styles.WidgetTitle}>交通手段</div>

        {appointmentList.length === 0 ? (
          <div
            className={styles.WidgetText}
            onClick={handleAppointmentClick}
          >
            移動手段の予約に進む
          </div>
        ) : (
          <>
            {appointmentList.map((appointment) => (
              <div className={styles.transportItem} key={appointment.id}>
                <div className={styles.transportSummary}>
                  <div className={styles.transportSummaryMain}>
                    <span>{appointment.departure}発</span>
                    <span>→</span>
                    <span>{appointment.arrival}着</span>
                  </div>

                  <div className={styles.transportSummarySub}>
                    <span>{appointment.duration}</span>
                    <span>{appointment.fare}</span>
                  </div>
                </div>

                <Timeline
                  active={appointment.steps.length - 1}
                  bulletSize={12}
                  lineWidth={2}
                  className={styles.transportTimeline}
                >
                  {appointment.steps.map((step) => (
                    <Timeline.Item
                      key={step.id}
                      title={
                        <div className={styles.timelineTitleRow}>
                          <span className={styles.timelineStation}>{step.station}</span>
                          <span className={styles.timelineTime}>
                            {step.time.split("\n").map((line) => (
                              <span key={line}>{line}</span>
                            ))}
                          </span>
                        </div>
                      }
                    >
                      {step.detail ? (
                        <p className={styles.timelineDetail}>{step.detail}</p>
                      ) : null}

                      {step.note ? (
                        <p className={styles.timelineNote}>{step.note}</p>
                      ) : null}
                    </Timeline.Item>
                  ))}
                </Timeline>

                <a
                  className={styles.transportDetailLink}
                  href={appointment.link}
                  target="_blank"
                  rel="noreferrer"
                >
                  ルート詳細を見る
                </a>
              </div>
            ))}
          </>
        )}
      </div>

      {/* 交通手段の下は、清算と天気予報を横並びで表示します。 */}
      <div className={styles.widgetRow}>
        {/* 清算情報。自分がこの旅行で立て替えた金額を表示します。 */}
        <button
          type="button"
          className={`${styles.WidgetFrame} ${styles.halfWidget} ${styles.liquidationWidget}`}
          onClick={handleLiquidationClick}
        >
          <span className={styles.WidgetTitle}>清算</span>
          <span className={styles.widgetLabel}>自分の支払い</span>
          <span className={styles.myPaidAmount}>
            {isMyPaidAmountLoading ? "読み込み中..." : formatYen(myPaidAmount.amount)}
          </span>
        </button>

        {/* 天気予報は、表示内容が決まり次第ここへ追加します。 */}
        <div className={`${styles.WidgetFrame} ${styles.halfWidget} ${styles.weatherWidget}`}>
          <div className={styles.WidgetTitle}>天気予報</div>
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
