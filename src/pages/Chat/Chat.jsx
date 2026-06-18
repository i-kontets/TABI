import React, { useState } from 'react';
import styles from './Chat.module.css';
import GlobalNav from '../../components/GlobalNav/GlobalNav';
import ChatSidebar from '../../components/ChatSidebar/ChatSidebar';
import ChatHeader from '../../components/ChatHeader/ChatHeader';
import MessageList from '../../components/MessageList/MessageList';
import MessageInput from '../../components/MessageInput/MessageInput';

// ダミーデータ：サイドバー用
const DUMMY_CONTACTS = [
    { id: 1, name: 'TABI HOTEL OSAKA', category: 'hotel', avatar: 'https://i.pravatar.cc/150?img=32', lastMessage: 'お待ちしております', time: '10:30', unread: 2 },
    { id: 2, name: 'Yuta (大学の友達)', category: 'friend', avatar: 'https://i.pravatar.cc/150?img=11', lastMessage: '明日の待ち合わせ時間って何時だっけ？', time: '10:15', unread: 1 },
    { id: 3, name: '北海道旅行グループ', category: 'group', avatar: 'https://i.pravatar.cc/150?img=24', lastMessage: 'レンタカー予約完了！', time: '昨日', unread: 0, memberCount: 4 },
    { id: 4, name: 'Kyoto Machiya Inn', category: 'hotel', avatar: 'https://i.pravatar.cc/150?img=12', lastMessage: 'チェックイン方法について', time: '昨日', unread: 0 },
    { id: 5, name: 'Okinawa Beach Villa', category: 'hotel', avatar: 'https://i.pravatar.cc/150?img=20', lastMessage: 'ご予約ありがとうございます。', time: '3月15日', unread: 0 },
    { id: 6, name: '家族旅行チャット', category: 'group', avatar: 'https://i.pravatar.cc/150?img=5', lastMessage: 'お土産買いました', time: '2月10日', unread: 0, memberCount: 3 }
];

// メッセージデータ：【修正】各チャットに紐づくよう `contactId` を追加し、相手ごとのメッセージを用意
const DUMMY_MESSAGES = [
    // 1: TABI HOTEL OSAKA のチャット履歴
    { id: 1, contactId: 1, sender: 'owner', senderName: 'TABI HOTEL', avatar: 'https://i.pravatar.cc/150?img=32', text: 'ご予約ありがとうございます。TABI HOTEL OSAKAです。', time: '10:00', isRead: true },
    { id: 2, contactId: 1, sender: 'owner', senderName: 'TABI HOTEL', avatar: 'https://i.pravatar.cc/150?img=32', text: 'チェックイン時間の確認ですが、15:00でよろしいでしょうか？', time: '10:01', isRead: true },
    { id: 3, contactId: 1, sender: 'user', senderName: '自分', avatar: 'https://i.pravatar.cc/150?img=68', text: 'はい、15:00の予定です。', time: '10:05', isRead: true },
    { id: 4, contactId: 1, sender: 'user', senderName: '自分', avatar: 'https://i.pravatar.cc/150?img=68', text: '少し早めに到着した場合、荷物を預かっていただくことは可能ですか？', time: '10:06', isRead: true },
    { id: 5, contactId: 1, sender: 'owner', senderName: 'TABI HOTEL', avatar: 'https://i.pravatar.cc/150?img=32', text: 'はい、フロントにてお預かりいたします。', time: '10:15', isRead: true },
    { id: 6, contactId: 1, sender: 'owner', senderName: 'TABI HOTEL', avatar: 'https://i.pravatar.cc/150?img=32', text: 'お待ちしております。お気をつけてお越しください。', time: '10:30', isRead: false },

    // 2: Yuta (大学の友達) のチャット履歴
    { id: 7, contactId: 2, sender: 'owner', senderName: 'Yuta', avatar: 'https://i.pravatar.cc/150?img=11', text: 'お疲れ！旅行の準備進んでる？', time: '10:00', isRead: true },
    { id: 8, contactId: 2, sender: 'user', senderName: '自分', avatar: 'https://i.pravatar.cc/150?img=68', text: '進んでるよー！チケットも買った！', time: '10:10', isRead: true },
    { id: 9, contactId: 2, sender: 'owner', senderName: 'Yuta', avatar: 'https://i.pravatar.cc/150?img=11', text: '明日の待ち合わせ時間って何時だっけ？', time: '10:15', isRead: false },

    // 3: 北海道旅行グループ のチャット履歴
    { id: 10, contactId: 3, sender: 'owner', senderName: 'Takuya', avatar: 'https://i.pravatar.cc/150?img=15', text: 'みんな、しおり作ったから見てね！', time: '昨日', isRead: true },
    { id: 11, contactId: 3, sender: 'user', senderName: '自分', avatar: 'https://i.pravatar.cc/150?img=68', text: 'ありがとう！めちゃくちゃ助かる', time: '昨日', isRead: true },
    { id: 12, contactId: 3, sender: 'owner', senderName: 'Mei', avatar: 'https://i.pravatar.cc/150?img=40', text: 'レンタカー予約完了！', time: '昨日', isRead: true },

    // 4: Kyoto Machiya Inn のチャット履歴
    { id: 13, contactId: 4, sender: 'owner', senderName: 'Kyoto Machiya Inn', avatar: 'https://i.pravatar.cc/150?img=12', text: 'ご予約ありがとうございます。当日のチェックイン方法についてのご案内です。', time: '昨日', isRead: true },

    // 5: Okinawa Beach Villa のチャット履歴
    { id: 14, contactId: 5, sender: 'owner', senderName: 'Okinawa Beach Villa', avatar: 'https://i.pravatar.cc/150?img=20', text: 'ご予約ありがとうございます。沖縄でお待ちしております！', time: '3月15日', isRead: true },

    // 6: 家族旅行チャット のチャット履歴
    { id: 15, contactId: 6, sender: 'owner', senderName: 'お母さん', avatar: 'https://i.pravatar.cc/150?img=5', text: 'お土産買いました', time: '2月10日', isRead: true }
];

// 予約情報データ：【修正】ホテルごとに異なる予約内容を表示できるようにオブジェクト化
const DUMMY_RESERVATIONS = {
    1: {
        hotelName: 'TABI HOTEL OSAKA',
        period: '2026/05/14〜2026/05/16',
        checkIn: '15:00',
        checkOut: '10:00',
        guests: '4名利用'
    },
    4: {
        hotelName: 'Kyoto Machiya Inn',
        period: '2026/06/10〜2026/06/12',
        checkIn: '16:00',
        checkOut: '11:00',
        guests: '2名利用'
    },
    5: {
        hotelName: 'Okinawa Beach Villa',
        period: '2026/07/20〜2026/07/25',
        checkIn: '14:00',
        checkOut: '11:00',
        guests: '5名利用'
    }
};

const Chat = () => {
    const [activeCategory, setActiveCategory] = useState('all');
    const [activeContactId, setActiveContactId] = useState(1);
    const [isMobileChatView, setIsMobileChatView] = useState(false);

    // 現在選択されているチャット相手を取得
    const activeContact = DUMMY_CONTACTS.find(c => c.id === activeContactId);

    // 左側サイドバーに表示するリスト（カテゴリーフィルター対応）
    const filteredContacts = activeCategory === 'all'
        ? DUMMY_CONTACTS
        : DUMMY_CONTACTS.filter(c => c.category === activeCategory);

    // 【修正】現在選択されているチャット相手（contactId）のメッセージだけを絞り込む
    const filteredMessages = DUMMY_MESSAGES.filter(m => m.contactId === activeContactId);

    // 【修正】現在選択されているホテルの予約情報を取得（ホテル以外なら null）
    const currentReservation = DUMMY_RESERVATIONS[activeContactId] || null;

    const handleContactSelect = (id) => {
        setActiveContactId(id);
        setIsMobileChatView(true);
    };

    const handleBackToApp = () => {
        alert("アプリの前のページ（ホーム等）に戻ります");
    };

    return (
        <div className={`${styles.appContainer} ${isMobileChatView ? styles.mobileChatActive : ''}`}>
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

            <div className={styles.mainArea}>
                <ChatHeader
                    contact={activeContact}
                    // ホテルカテゴリーの時だけ、そのホテルに対応する予約情報を渡す
                    reservation={activeContact?.category === 'hotel' ? currentReservation : null}
                    onMobileBack={() => setIsMobileChatView(false)}
                />
                {/* 【修正】全メッセージではなく、絞り込んだメッセージ履歴を渡す */}
                <MessageList messages={filteredMessages} />
                <MessageInput />
            </div>
        </div>
    );
};

export default Chat;