import React from 'react';
import styles from './MessageBubble.module.css';

const MessageBubble = ({ message }) => {
  const isUser = message.sender === 'user';

  return (
    <div className={`${styles.row} ${isUser ? styles.rowUser : styles.rowOwner}`}>
      <div className={styles.bubbleContainer}>
        <div className={`${styles.bubble} ${isUser ? styles.bubbleUser : styles.bubbleOwner}`}>
          {message.text}
        </div>
        <span className={styles.time}>{message.time}</span>
      </div>
    </div>
  );
};

export default MessageBubble;