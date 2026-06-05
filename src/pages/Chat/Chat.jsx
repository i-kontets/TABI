import React, { useState } from 'react';
import styles from './Chat.module.css';
import GlobalNav from '../../components/GlobalNav/GlobalNav';
import ChatSidebar from '../../components/ChatSidebar/ChatSidebar';
import ChatHeader from '../../components/ChatHeader/ChatHeader';
import MessageList from '../../components/messageList/MessageList';
import MessageInput from '../../components/messageInput/MessageInput';

// カテゴリー属性（category）を追加したダミーデータ
const DUMMY_CONTACTS = [
  { id: 1, name: 'TABI HOTEL OSAKA', category: 'hotel', avatar: 'https://i.pravatar.cc/150?img=32', lastMessage: 'お待ちしております', time: '10:30', unread: 2, online: true },
  { id: 2, name: 'Yuta (大学の友達)', category: 'friend', avatar: 'https://i.pravatar.cc/150?img=11', lastMessage: '明日の待ち合わせ時間って何時だっけ？', time: '10:15', unread: 1, online: true },
  { id: 3, name: '北海道旅行グループ', category: 'group', avatar: 'https://i.pravatar.cc/150?img=24', lastMessage: 'レンタカー予約完了！', time: '昨日', unread: 0, online: false },
  { id: 4, name: 'Kyoto Machiya Inn', category: 'hotel', avatar: 'https://i.pravatar.cc/150?img=12', lastMessage: 'チェックイン方法について', time: '昨日', unread: 0, online: false },
  { id: 5, name: 'Okinawa Beach Villa', category: 'hotel', avatar: 'https://i.pravatar.cc/150?img=20', lastMessage: 'ご予約ありがとうございます。', time: '3月15日', unread: 0, online: true },
  { id: 6, name: '家族旅行チャット', category: 'group', avatar: 'https://i.pravatar.cc/150?img=5', lastMessage: 'お土産買いました', time: '2月10日', unread: 0, online: false }
];

const DUMMY_MESSAGES = [
  { id: 1, sender: 'owner', text: 'ご予約ありがとうございます。TABI HOTEL OSAKAです。', time: '10:00', date: '2026/05/14' },
  { id: 2, sender: 'owner', text: 'チェックイン時間の確認ですが、15:00でよろしいでしょうか？', time: '10:01', date: '2026/05/14' },
  { id: 3, sender: 'user', text: 'はい、15:00の予定です。', time: '10:05', date: '2026/05/14' },
  { id: 4, sender: 'user', text: '少し早めに到着した場合、荷物を預かっていただくことは可能ですか？', time: '10:06', date: '2026/05/14' },
  { id: 5, sender: 'owner', text: 'はい、フロントにてお預かりいたします。', time: '10:15', date: '2026/05/14' },
  { id: 6, sender: 'owner', text: 'お待ちしております。お気をつけてお越しください。', time: '10:30', date: '2026/05/14' }
];

const DUMMY_RESERVATION = {
  hotelName: 'TABI HOTEL OSAKA',
  period: '2026/05/14〜2026/05/16',
  checkIn: '15:00',
  checkOut: '10:00',
  guests: '4名利用'
};

const Chat = () => {
  const [activeCategory, setActiveCategory] = useState('all'); // all, hotel, friend, group
  const [activeContactId, setActiveContactId] = useState(1);
  const [isMobileChatView, setIsMobileChatView] = useState(false); // スマホでの画面遷移用

  const activeContact = DUMMY_CONTACTS.find(c => c.id === activeContactId);
  const filteredContacts = activeCategory === 'all' 
    ? DUMMY_CONTACTS 
    : DUMMY_CONTACTS.filter(c => c.category === activeCategory);

  const handleContactSelect = (id) => {
    setActiveContactId(id);
    setIsMobileChatView(true); // スマホの場合はチャット画面へ遷移
  };

  const handleBackToApp = () => {
    alert("アプリの前のページ（ホーム等）に戻ります"); // 実際のルーティング処理に置き換えてください
  };

  return (
    <div className={`${styles.appContainer} ${isMobileChatView ? styles.mobileChatActive : ''}`}>
      {/* 左サイド（グローバルナビ ＋ リスト） */}
      <div className={styles.sidebarWrapper}>
        <GlobalNav 
          activeCategory={activeCategory} 
          onSelectCategory={setActiveCategory} 
          onBack={handleBackToApp} 
        />
        <ChatSidebar 
          contacts={filteredContacts} 
          activeId={activeContactId} 
          onSelect={handleContactSelect} 
        />
      </div>

      {/* メインチャットエリア */}
      <div className={styles.mainArea}>
        <ChatHeader 
          contact={activeContact} 
          reservation={activeContact?.category === 'hotel' ? DUMMY_RESERVATION : null} 
          onMobileBack={() => setIsMobileChatView(false)} 
        />
        <MessageList messages={DUMMY_MESSAGES} />
        <MessageInput />
      </div>
    </div>
  );
};

export default Chat;