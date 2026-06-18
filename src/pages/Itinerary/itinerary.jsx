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
  const tripName = location.state?.tripName;
  // 招待モーダルの管理状態
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  
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

  // アルバム画像URL
  const albumImages = [
    'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=100&q=80',
    'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=100&q=80',
    'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=100&q=80',
    'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=100&q=80',
    'https://images.unsplash.com/photo-1475924156734-496f6cac6ec1?auto=format&fit=crop&w=100&q=80',
    'https://images.unsplash.com/photo-1472396961693-142e6e269027?auto=format&fit=crop&w=100&q=80',
  ];

  return (
    <div className={styles.initiraryShell}>
        <Header />
      {/* 3カラム構成（左・中央・右） */}
      <div>
        {/* 【中央メインコンテンツ】 */}
        <div className={styles.centerContent}>
          
          {/* カバー画像ヘッダー */}
          <div className={styles.coverHeader}>
            <div className={styles.coverOverlay}></div>
            <div className={styles.coverMainInfo}>
              <div className={styles.titleRow}>
                <h1 className={styles.mainTitle}>{tripName}</h1>
                <span className={styles.daysBadge}>あと 24 日</span>
              </div>
              <p className={styles.subDate}>2026/05/14 (木) - 05/16 (土)</p>
              
              <div className={styles.memberRow}>
                <div className={styles.avatarGroup}>
                  {members.map((member, index) => (
                    <span 
                      key={index} 
                      className={styles.avatar} 
                      style={{ backgroundColor: member.color }}
                      title={member.name}
                    >
                      {member.initial}
                    </span>
                  ))}
                  {/* 招待モーダルトリガー */}
                  <button className={styles.inviteBtn} onClick={() => setIsInviteModalOpen(true)}>+</button>
                </div>
              </div>
            </div>
            {/* 旅行編集画面 itineraryEdit.jsx への遷移 */}
            <button className={styles.editBtn} onClick={() => navigate('/itinerary/edit')}>
              旅行情報を編集
            </button>
          </div>


          
        </div>
      </div>

      {/* 固定ボトムナビ */}
      <div className={styles.btmNavWrapper}>
        <BtmNav />
      </div>

      {/* 招待モーダルを連携 */}
      {isInviteModalOpen && (
        <InviteModal isOpen={isInviteModalOpen} onClose={() => setIsInviteModalOpen(false)} />
      )}
    </div>
  );
}