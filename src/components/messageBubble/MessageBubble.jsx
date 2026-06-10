import React from 'react';
import styles from './MessageBubble.module.css';

const MessageBubble = ({ message }) => {
  const isUser = message.sender === 'user';

  return (
    <div className={`${styles.row} ${isUser ? styles.rowUser : styles.rowOwner}`}>
      {/* チャットバブルの横に発言者のユーザーアイコンを表示 */}
      <img src={message.avatar} alt={message.senderName} className={styles.msgAvatar} />
      
      <div className={styles.bubbleContent}>
        {/* 誰の発言かひと目でわかる名前テキスト */}
        <span className={styles.senderName}>{message.senderName}</span>
        
        <div className={styles.bubbleAndMeta}>
          <div className={`${styles.bubble} ${isUser ? styles.bubbleUser : styles.bubbleOwner}`}>
            {message.text}
          </div>
          
          <div className={styles.metaInfo}>
            {/* 自分が送信したメッセージで既読の場合にのみ「既読」を表示 */}
            {isUser && message.isRead && <span className={styles.readStatus}>既読</span>}
            <span className={styles.time}>{message.time}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;