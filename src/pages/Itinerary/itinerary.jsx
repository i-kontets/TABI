import { useLocation, useNavigate } from "react-router-dom";
import { useContext, useState } from "react";
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
  const location = useLocation();
  const {trip} = useContext(TripContext);
  // 招待モーダルの管理状態
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isLiquidationOpen, setIsLiquidationOpen] = useState(false);  

  // 参加中の旅行データ
  const travelGroups = [
    { id: 1, name: '三重旅行', date: '2026/05/14 - 05/16', active: true, image: 'https://images.unsplash.com/photo-1549693578-d683be217e58?auto=format&fit=crop&w=150&q=80' },
    { id: 2, name: '沖縄旅行', date: '2026/06/10 - 06/13', active: false, image: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=150&q=80' },
    { id: 3, name: '北海道旅行', date: '2026/07/20 - 07/23', active: false, image: 'https://images.unsplash.com/photo-1498654077810-12c21d4d6dc3?auto=format&fit=crop&w=150&q=80' },
    { id: 4, name: '京都旅行', date: '2026/08/15 - 08/17', active: false, image: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=150&q=80' },
  ];

  // メンバー情報
  const members = [
    { name: 'さくら', initial: 'さ', color: '#ffb7b2' },
    { name: 'たくや', initial: 'た', color: '#b5ead7' },
    { name: 'みほ', initial: 'み', color: '#ffdac1' },
    { name: 'ゆうき', initial: 'ゆ', color: '#e2f0cb' },
  ];

  // 次の予定リスト (複数化)
  const nextSchedules = [
    { time: '09:30', content: '名古屋駅集合', tag: '確認' },
    { time: '11:30', content: '伊勢神宮 参拝・散策', tag: '移動' },
    { time: '14:00', content: 'おかげ横丁 昼食・食べ歩き', tag: 'グルメ' },
  ];

  // 話し合いタイムライン (複数化)
  const chats = [
    { user: 'さくら', initial: 'さ', color: '#ffb7b2', time: '10:30', text: 'おかげ横丁で食べ歩きしたいね！' },
    { user: 'たくや', initial: 'た', color: '#b5ead7', time: '10:32', text: '赤福氷は絶対に食べたい！ノ' },
    { user: 'みほ', initial: 'み', color: '#ffdac1', time: '10:35', text: 'いいね！お昼は伊勢うどんにする？' },
    { user: 'ゆうき', initial: 'ゆ', color: '#e2f0cb', time: '10:41', text: 'てこね寿司も捨てがたいな〜迷う！' },
  ];

  // やることリスト (複数化)
  const todos = [
    { id: 1, text: '宿泊先を決める', meta: '5/1 さくら', checked: true },
    { id: 2, text: 'レンタカーの予約', meta: '5/5 たくや', checked: false },
    { id: 3, text: 'しおりの作成', meta: '5/10 みほ', checked: false },
  ];

  // 精算の履歴 (複数化)
  const expenses = [
    { title: '伊勢うどん（昼食）', meta: '5/14 さくら', amount: '¥3,450' },
    { title: '高速道路料金', meta: '5/14 たくや', amount: '¥4,200' },
    { title: 'レンタカー代', meta: '5/14 ゆうき', amount: '¥4,800' },
  ];

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
    {
      amount: 3000,
      from: "石垣大斗"
    },
    {
      amount: 4000,
      from: "小野紘輝"
    }
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

              {members.map((member,index)=>(
                <span
                  key={index}
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
          {liquidationList.length == 0 ? (
            <div className={WidgetText}>
              請求はありません
            </div>
          ) : (
            <>
              {/* アコーディオンメニュー */}
              <div
                className={styles.WidgetTitle}
                onClick={() => setIsLiquidationOpen(!isLiquidationOpen)}
              >
                <div className={styles.WidgetTitle}>清算</div>
                <div className={styles.WidgetText}>
                  請求合計：￥
                  {liquidationList
                    .reduce((sum, item) => sum + item.amount, 0)
                    .toLocaleString()}
                  {isLiquidationOpen ? "▲" : "▼"}
                </div>
              </div>

              {/* 詳細 */}
              <div className={`${styles.WidgetText} ${
                isLiquidationOpen ? styles.open : ""
              }`}
              >
                {liquidationList.map((item,index) => (
                  <div className={styles.WidgetText}>
                    <span>{item.from}へ:</span>
                    <span>￥{item.amount}</span>
                  </div>
                ))}

              </div>
            

            </>
          )}
        </div>








        {/* 天気予報ウィジェット */}
        <div className={styles.weatherWidget}>
          <div className={styles.WidgetTitle}>天気予報</div>
          <div className={styles.WidgetText}>東京　晴れ<br />大阪　雨天</div>
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