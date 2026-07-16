/**
 * 複数の画面から使われる共通の表示部品です。
 *
 * 主な流れ:
 * 1. 必要な部品や API 関数を読み込む
 * 2. 画面表示やデータ取得に必要な値を準備する
 * 3. ユーザー操作や API の結果に合わせて表示を更新する
 *
 * 扱うデータ: React の state、props、フォーム入力、API から返ったデータを主に扱います。
 */
import React from 'react';
import styles from './ChatSidebar.module.css';
import UserAvatar from '../UserAvatar';

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
        {contacts.map(contact => {
          // ホテルチャットでは一覧名はコテージ名、丸アイコンは管理人です。
          // 画像がない時も管理人名を使うことで、コテージ名の先頭文字だけが出る状態を防ぎます。
          const avatarFallbackName = contact.category === 'hotel'
            ? (contact.manager_name || contact.name)
            : (contact.avatar || contact.name);

          return (
            <div
              key={contact.id}
              className={`${styles.contactItem} ${activeId === contact.id ? styles.activeItem : ''}`}
              onClick={() => onSelect(contact.id)}
            >
              <div className={styles.avatarWrapper}>
                <UserAvatar
                  src={contact.avatar}
                  name={avatarFallbackName}
                  alt={contact.name}
                  className={styles.avatar}
                  fallbackClassName={styles.avatarFallback}
                  source="Chat sidebar user icon"
                />
              </div>
              <div className={styles.info}>
                <div className={styles.headerRow}>
                  <span className={styles.name}>
                    {contact.name}
                    {/* グループの場合は横に人数を表示 */}
                    {contact.category === 'group' && contact.memberCount && (
                      <span className={styles.memberCount}>({contact.memberCount})</span>
                    )}
                  </span>
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
          );
        })}
      </div>
    </div>
  );
};

export default ChatSidebar;
