import React from 'react';
import styles from './ChatHeader.module.css';

const ChatHeader = ({ contact, reservation, onMobileBack }) => {
  if (!contact) return null;

  const formatMonthDay = (dateString) => {
    if (!dateString) return '';
    const parts = dateString.split('/');
    if (parts.length >= 3) {
      return `${parseInt(parts[1], 10)}月${parseInt(parts[2], 10)}日`;
    }
    return dateString;
  };

  const periodParts = reservation?.period?.split('〜') || [];
  const checkInDate = formatMonthDay(periodParts[0]);
  const checkOutDate = formatMonthDay(periodParts[1]);

  return (
    <div className={styles.headerContainer}>
      <div className={styles.contactInfoArea}>
        <button className={styles.mobileBackBtn} onClick={onMobileBack} title="リストに戻る">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
          戻る
        </button>

        <img src={contact.avatar} alt={contact.name} className={styles.avatar} />
        <div className={styles.infoTexts}>
          <span className={styles.name}>
            {contact.name}
            {/* ヘッダーのグループ名横にも人数を表示 */}
            {contact.category === 'group' && contact.memberCount && (
              <span className={styles.memberCount}>({contact.memberCount}人)</span>
            )}
          </span>
          {/* オンライン表示テキストは削除しました */}
        </div>
      </div>
      
      {reservation && (
        <div className={styles.reservationCard}>
          <div className={styles.cardHeader}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 21h18"></path><path d="M5 21V7l8-4v18"></path><path d="M13 3l8 4v14"></path>
            </svg>
            <span className={styles.cardTitle}>{reservation.hotelName}</span>
          </div>

          <div className={styles.cardBody}>
            <div className={styles.dateSection}>
              <div className={styles.dateBox}>
                <span className={styles.dateLabel}>チェックイン</span>
                <span className={styles.dateValue}>{checkInDate || '未定'}</span>
                <span className={styles.timeValue}>{reservation.checkIn}</span>
              </div>
              
              <div className={styles.dateArrow}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                  <polyline points="12 5 19 12 12 19"></polyline>
                </svg>
              </div>

              <div className={styles.dateBox}>
                <span className={styles.dateLabel}>チェックアウト</span>
                <span className={styles.dateValue}>{checkOutDate || '未定'}</span>
                <span className={styles.timeValue}>{reservation.checkOut}</span>
              </div>
            </div>

            <div className={styles.guestSection}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
              </svg>
              <span>{reservation.guests}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatHeader;