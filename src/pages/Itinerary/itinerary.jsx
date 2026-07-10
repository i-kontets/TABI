import { useSearchParams, useNavigate } from "react-router-dom";
import { useContext, useState, useEffect } from "react";
import { TripContext } from "../../App";
import BottomNav from '../../components/BottomNav/BottomNav';
import BtmNav from '../../components/bottomNav/BottomNav';
import Header from '../../components/header/Header';
import Modal from '../../components/Modal/Modal';
import InviteModal from '../../components/Modal/InviteModal';
import styles from './itinerary.module.css';
import Edit from '../../assets/icons/edit.svg?react';
import Group from '../../assets/icons/group.svg?react';

export default function Itinerary() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const {trip} = useContext(TripContext);

  const groupId = searchParams.get("groupId")

  // 招待モーダルの管理状態
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isLiquidationOpen, setIsLiquidationOpen] = useState(false);  

  // メンバー情報
  const [members, setMembers] = useState([]);

  // User取得処理
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

const text = await response.text();
console.log(text);

const data = JSON.parse(text);

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
  }, [groupId]);

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
  const liquidationList = [

  ];

  const closeInviteModal = () => {
  setIsInviteModalOpen(false);
  };

  const handleAppointmentClick = () => {
    // データがない　→　Appointment.jsxへ
     navigate('/Appointment')
  }
  
  return (
    <div>
      <Header />

      {/* カバー画像ヘッダー */}
      <div className={styles.coverHeader}>

        <div className={styles.coverOverlay}></div>

        <div className={styles.coverMainInfo}>

          <div className={styles.titleRow}>

            <h1 className={styles.mainTitle}>
              {trip.name}
            </h1>

            <span className={styles.daysBadge}>
              あと 24 日
            </span>

          </div>

          <p className={styles.subDate}>
            出発：2026/05/14 (木)<br/>
            帰宅：2026/05/16 (土)
          </p>

          <div className={styles.memberRow}>

            <div className={styles.avatarGroup}>

              {members.map((member)=>(
                <span
                  key={member.id}
                  className={styles.avatar}
                  style={{backgroundColor:member.color}}
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
        <div className={styles.WidgetTitle}>旅行期間</div>
        <div className={styles.WidgetText}>2026年5/14(木) - 2026年5月16日(土)</div>
      </div>

      {/* メンバー数ウィジェット */}
      <div className={styles.WidgetFrame}>
        <div className={styles.WidgetTitle}>メンバー数</div>
        <div className={styles.WidgetText}>4人</div>
      </div>

      <div className={styles.WidgetFrame} >
        {appointmentList.length == 0 ? (
          <div className={styles.WidgetText} onClick={handleAppointmentClick}>
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
          {liquidationList.length == 0 ? (
            <div className={styles.WidgetText}>
              請求はありません
            </div>
          ) : (
             <>
              {/* 合計金額 */}
              <div className={styles.WidgetText}>
                合計：￥
                {liquidationList.reduce((sum, item) => sum + item.amount, 0).toLocaleString()}
              </div>

              {/* 各請求 */}
              {liquidationList.map((item, index) => (
                <div key={index} className={styles.WidgetText}>
                  {item.from}さんへ：￥{item.amount.toLocaleString()}
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

        <InviteModal onClose={closeInviteModal}/>
      </Modal>
    </div>
  );
}