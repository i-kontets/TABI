import React from 'react';
import styles from './MessageBubble.module.css';

function isImageAvatar(value) {
    return typeof value === 'string' && (/^(https?:)?\/\//.test(value) || value.startsWith('/'));
}

const MessageBubble = ({ message }) => {
    const isUser = Boolean(message.isMine) || message.sender === 'user';
    const senderName = message.senderName || message.sender_name || message.sender || '';
    const avatarText = senderName.slice(0, 1) || String(message.avatar || '').slice(0, 1) || '?';

    return (
        <div className={`${styles.row} ${isUser ? styles.rowUser : styles.rowOwner}`}>
            {isImageAvatar(message.avatar) ? (
                <img src={message.avatar} alt={senderName} className={styles.msgAvatar} />
            ) : (
                <div className={styles.msgAvatarFallback} aria-hidden="true">
                    {avatarText}
                </div>
            )}

            <div className={styles.bubbleContent}>
                <span className={styles.senderName}>{senderName}</span>

                <div className={styles.bubbleAndMeta}>
                    <div className={`${styles.bubble} ${isUser ? styles.bubbleUser : styles.bubbleOwner}`}>
                        {message.text || message.body}
                    </div>

                    <div className={styles.metaInfo}>
                        {isUser && message.readCount > 0 && (
                            <span className={styles.readStatus}>既読 {message.readCount}</span>
                        )}
                        <span className={styles.time}>{message.time}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MessageBubble;