import React from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './MessageBubble.module.css';

function isImageAvatar(value) {
    return typeof value === 'string' && (/^(https?:)?\/\//.test(value) || value.startsWith('/'));
}

const MessageBubble = ({ message, memberCount = 0 }) => {
    const navigate = useNavigate();
    const isUser = Boolean(message.isMine) || message.sender === 'user';
    const senderName = message.senderName || message.sender_name || message.sender || '';
    const avatarText = senderName.slice(0, 1) || String(message.avatar || '').slice(0, 1) || '?';
    const readLabel = memberCount > 2 ? `既読 ${message.readCount}` : '既読';
    const senderUserId = Number(message.sender_user_id || message.user_id || 0);
    const canOpenProfile = senderUserId > 0;

    const openProfile = () => {
        if (canOpenProfile) {
            navigate(`/user/${senderUserId}`);
        }
    };

    return (
        <div className={`${styles.row} ${isUser ? styles.rowUser : styles.rowOwner}`}>
            <button
                type="button"
                className={styles.profileButton}
                onClick={openProfile}
                disabled={!canOpenProfile}
                aria-label={`${senderName || 'ユーザー'}のプロフィールを開く`}
            >
                {isImageAvatar(message.avatar) ? (
                    <img src={message.avatar} alt="" className={styles.msgAvatar} />
                ) : (
                    <div className={styles.msgAvatarFallback} aria-hidden="true">
                        {avatarText}
                    </div>
                )}
            </button>

            <div className={styles.bubbleContent}>
                <button
                    type="button"
                    className={styles.senderName}
                    onClick={openProfile}
                    disabled={!canOpenProfile}
                >
                    {senderName}
                </button>

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
