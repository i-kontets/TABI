import React from 'react';
import styles from './MessageList.module.css';
import MessageBubble from '../MessageBubble/MessageBubble';

const MessageList = ({ messages, memberCount = 0 }) => {
  let currentDate = '';

  return (
    <div className={styles.listContainer}>
      {messages.map((msg) => {
        const isNewDate = msg.date !== currentDate;
        if (isNewDate) {
          currentDate = msg.date;
        }

        return (
          <React.Fragment key={msg.id}>
            {isNewDate && (
              <div className={styles.dateDivider}>
                <span className={styles.dateBadge}>{msg.date}</span>
              </div>
            )}
            <MessageBubble message={msg} memberCount={memberCount} />
          </React.Fragment>
        );
      })}
    </div>
  );
};

export default MessageList;
