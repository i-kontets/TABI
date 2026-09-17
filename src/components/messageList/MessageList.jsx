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
import React, { useLayoutEffect, useRef } from 'react';
import styles from './MessageList.module.css';
import MessageBubble from '../MessageBubble/MessageBubble';

const MessageList = ({ messages, memberCount = 0, groupId = null }) => {
  let currentDate = '';
  const bottomRef = useRef(null);

  // メッセージが追加されるたびに最新へスクロール
  useLayoutEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [messages.length]);

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
            <MessageBubble message={msg} memberCount={memberCount} groupId={groupId} />
          </React.Fragment>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
};

export default MessageList;
