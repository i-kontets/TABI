import React from 'react';
import styles from './MessageBubble.module.css';

function isImageAvatar(value) {
    return typeof value === 'string' && (/^(https?:)?\/\//.test(value) || value.startsWith('/'));
}

const MessageBubble = ({ message, memberCount = 0 }) => {
    const isUser = Boolean(message.isMine) || message.sender === 'user';
    const senderName = message.senderName || message.sender_name || message.sender || '';
    const avatarText = senderName.slice(0, 1) || String(message.avatar || '').slice(0, 1) || '?';
    const readLabel = memberCount > 2 ? `既読 ${message.readCount}` : '既読';

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
                        {message.image_url ? (
                            <img
                                src={message.image_url}
                                alt="送信画像"
                                className={styles.chatImage}
                                loading="lazy"
                                onClick={() => window.open(message.image_url, '_blank')}
                            />
                        ) : (
                            message.text || message.body
                        )}
                    </div>

                    <div className={styles.metaInfo}>
                        {isUser && message.readCount > 0 && (
                            <span className={styles.readStatus}>{readLabel}</span>
                        )}
                        <span className={styles.time}>{message.time}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MessageBubble;
