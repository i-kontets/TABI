/**
 * チャットメッセージの表示や入力に使う共通部品です。
 *
 * 主な流れ:
 * 1. 必要な部品や API 関数を読み込む
 * 2. 画面表示やデータ取得に必要な値を準備する
 * 3. ユーザー操作や API の結果に合わせて表示を更新する
 *
 * 扱うデータ: React の state、props、フォーム入力、API から返ったデータを主に扱います。
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './MessageBubble.module.css';
import UserAvatar from '../UserAvatar';

const MessageBubble = ({ message, memberCount = 0 }) => {
    const navigate = useNavigate();
    const isUser = Boolean(message.isMine) || message.sender === 'user';
    const senderName = message.senderName || message.sender_name || message.sender || '';
    const avatarText = senderName.slice(0, 1) || String(message.avatar || '').slice(0, 1) || '?';
    const readLabel = memberCount > 2 ? `既読 ${message.readCount}` : '既読';
    const senderUserId = Number(message.sender_user_id || message.user_id || 0);
    const canOpenProfile = senderUserId > 0;

    // openProfile は、画面操作や API 結果に合わせて必要な処理をまとめた関数です。
    const openProfile = () => {
        // ここで条件を確認し、状況に合う処理だけを実行します。
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
                <UserAvatar
                    src={message.avatar}
                    name={senderName || avatarText}
                    alt=""
                    className={styles.msgAvatar}
                    fallbackClassName={styles.msgAvatarFallback}
                    source="Chat message user icon"
                />
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
