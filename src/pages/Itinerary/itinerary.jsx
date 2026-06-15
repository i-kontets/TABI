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
    <div className={styles.appContainer}>
      {/* 共通Header */}
      <div className={styles.headerWrapper}>
        <Header />
      </div>

      {/* 3カラム構成（左・中央・右） */}
      <div className={styles.mainLayout}>
        

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
            <button className={styles.editBtn} onClick={() => navigate('/itineraryEdit')}>
              旅行情報を編集
            </button>
          </div>

          {/* 補助情報エリア（進捗・予定） */}
          <div className={styles.subInfoGrid}>
            <div className={styles.cardSmall}>
              <h4 className={styles.sectionSubTitle}>旅行の進捗</h4>
              <div className={styles.progressHeader}>
                <span className={styles.progressText}>みんなで計画を進めて、最高の旅行にしよう！</span>
                <span className={styles.progressPercent}>60%</span>
              </div>
              <div className={styles.progressBarBg}>
                <div className={styles.progressBarFill} style={{ width: '60%' }}></div>
              </div>
              <div className={styles.progressStats}>
                <div className={styles.statBox}><span className={styles.statLabel}>決定済み</span><span className={styles.statValGreen}>6/10</span></div>
                <div className={styles.statBox}><span className={styles.statLabel}>未決定</span><span className={styles.statValPurple}>4/10</span></div>
                <div className={styles.statBox}><span className={styles.statLabel}>参加メンバー</span><span className={styles.statValBlue}>5人</span></div>
              </div>
            </div>

            <div className={styles.cardSmall}>
              <div className={styles.nextScheduleHeader}>
                <h4 className={styles.sectionSubTitle}>次の予定</h4>
                <span className={styles.scheduleDay}>1日目 5/14 (木)</span>
              </div>
              <div className={styles.scheduleList}>
                {nextSchedules.map((schedule, idx) => (
                  <div key={idx} className={styles.timelineItem}>
                    <span className={styles.timelineTime}>{schedule.time}</span>
                    <span className={styles.timelineContent}>{schedule.content}</span>
                    <span className={styles.timelineTag}>{schedule.tag}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* リアルタイム広場（話し合い・やること・精算を3カラム構成で均等配置） */}
          <div className={styles.midContentGrid}>
            
            {/* 最近の話し合い */}
            <div className={styles.cardMedium}>
              <div className={styles.cardHeaderRow}>
                <h3 className={styles.cardTitle}>最近の話し合い</h3>
                <span className={styles.moreLink}>すべて見る</span>
              </div>
              <div className={styles.chatList}>
                {chats.map((chat, idx) => (
                  <div key={idx} className={styles.chatItem}>
                    <span className={styles.chatAvatar} style={{ backgroundColor: chat.color }}>
                      {chat.initial}
                    </span>
                    <div className={styles.chatContentWrapper}>
                      <div className={styles.chatMeta}>
                        <span className={styles.chatUser}>{chat.user}</span>
                        <span className={styles.chatTime}>{chat.time}</span>
                      </div>
                      <p className={styles.chatText}>{chat.text}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className={styles.chatInputWrapper}>
                <input type="text" placeholder="メッセージを入力..." className={styles.chatInput} />
              </div>
            </div>

            {/* やることリスト */}
            <div className={styles.cardMedium}>
              <div className={styles.cardHeaderRow}>
                <h3 className={styles.cardTitle}>やることリスト</h3>
                <span className={styles.moreLink}>すべて見る</span>
              </div>
              <div className={styles.todoList}>
                {todos.map((todo) => (
                  <label key={todo.id} className={styles.todoItem}>
                    <input type="checkbox" defaultChecked={todo.checked} className={styles.todoCheckbox} />
                    <div className={styles.todoTextWrapper}>
                      <span className={todo.checked ? styles.todoTextChecked : styles.todoText}>
                        {todo.text}
                      </span>
                      <span className={styles.todoMeta}>{todo.meta}</span>
                    </div>
                  </label>
                ))}
              </div>
              <button className={styles.addTodoBtn}>+ タスクを追加</button>
            </div>

            {/* 精算の状況 */}
            <div className={styles.cardMedium}>
              <div className={styles.cardHeaderRow}>
                <h3 className={styles.cardTitle}>精算の状況</h3>
                <span className={styles.moreLink}>詳細を見る</span>
              </div>
              <div className={styles.settlementSummary}>
                <div>
                  <span className={styles.summaryLabel}>未精算の合計</span>
                  <div className={styles.summaryAmount}>¥12,450</div>
                </div>
                <div className={styles.summaryRight}>
                  <span className={styles.summaryLabel}>1人あたりの未精算額</span>
                  <div className={styles.summarySubAmount}>¥2,490</div>
                </div>
              </div>
              <div className={styles.expenseList}>
                {expenses.map((expense, idx) => (
                  <div key={idx} className={styles.expenseItem}>
                    <div className={styles.expenseLeft}>
                      <span className={styles.expenseAvatar}></span>
                      <div>
                        <div className={styles.expenseName}>{expense.title}</div>
                        <div className={styles.expenseMeta}>{expense.meta}</div>
                      </div>
                    </div>
                    <span className={styles.expenseAmount}>{expense.amount}</span>
                  </div>
                ))}
              </div>
              <button className={styles.addExpenseBtn}>+ 支出を追加</button>
            </div>
          </div>

          {/* しおり・スポットの候補 */}
          <div className={styles.cardLarge}>
            <div className={styles.cardHeaderRow}>
              <h3 className={styles.cardTitleLarge}>しおり・スポットの候補</h3>
              <span className={styles.moreLinkBlue}>すべて見る</span>
            </div>
            <div className={styles.spotGrid}>
              <div className={styles.spotCard}>
                <div className={styles.spotImgWrapper}>
                  <img src="https://images.unsplash.com/photo-1627575191507-6a4a0619a909?auto=format&fit=crop&w=400&q=80" alt="伊勢神宮" className={styles.spotImg} />
                  <span className={styles.spotTag}>観光</span>
                </div>
                <h4 className={styles.spotName}>伊勢神宮 (内宮)</h4>
                <p className={styles.spotDesc}>日本を代表する神社の内宮。荘厳な雰囲...</p>
              </div>
              <div className={styles.spotCard}>
                <div className={styles.spotImgWrapper}>
                  <img src="https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=400&q=80" alt="鳥羽水族館" className={styles.spotImg} />
                  <span className={styles.spotTag}>観光</span>
                </div>
                <h4 className={styles.spotName}>鳥羽水族館</h4>
                <p className={styles.spotDesc}>ジュゴンやラッコで有名な水族館。見どこ...</p>
              </div>
              <div className={styles.spotCard}>
                <div className={styles.spotImgWrapper}>
                  <img src="https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=400&q=80" alt="おかげ横丁" className={styles.spotImg} />
                  <span className={styles.spotTag}>グルメ・観光</span>
                </div>
                <h4 className={styles.spotName}>おかげ横丁</h4>
                <p className={styles.spotDesc}>伊勢の名物グルメやお土産が揃うレトロな...</p>
              </div>
              <div className={styles.spotCard}>
                <div className={styles.spotImgWrapper}>
                  <img src="https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=400&q=80" alt="松阪牛 まるよし" className={styles.spotImg} />
                  <span className={styles.spotTag}>グルメ</span>
                </div>
                <h4 className={styles.spotName}>松阪牛 まるよし</h4>
                <p className={styles.spotDesc}>松阪牛の老舗。極上の松阪牛を味わえる！</p>
              </div>
            </div>
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