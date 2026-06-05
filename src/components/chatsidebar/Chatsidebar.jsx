import React from 'react';
import styles from './ChatSidebar.module.css';

const ChatSidebar = ({ contacts, activeId, onSelect }) => {
  return (
    <div className={styles.sidebarContainer}>
      <div className={styles.searchContainer}>
        <input type="text" placeholder="チャットを検索..." className={styles.searchInput} />
      </div>
      <div className={styles.contactList}>
        {contacts.length === 0 && (
          <div style={{ textAlign: 'center', color: '#999', marginTop: '20px' }}>
            チャットがありません
          </div>
        )}
        {contacts.map(contact => (
          <div 
            key={contact.id} 
            className={`${styles.contactItem} ${activeId === contact.id ? styles.activeItem : ''}`}
            onClick={() => onSelect(contact.id)}
          >
            <div className={styles.avatarWrapper}>
              <img src={contact.avatar} alt={contact.name} className={styles.avatar} />
              {contact.online && <div className={styles.onlineDot}></div>}
            </div>
            <div className={styles.info}>
              <div className={styles.headerRow}>
                <span className={styles.name}>{contact.name}</span>
                <span className={styles.time}>{contact.time}</span>
              </div>
              <div className={styles.messageRow}>
                <span className={styles.lastMessage}>{contact.lastMessage}</span>
                {contact.unread > 0 && (
                  <span className={styles.unreadBadge}>{contact.unread}</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ChatSidebar;