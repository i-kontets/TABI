import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import BottomNav from '../../components/bottomNav/BottomNav';
import notificationMockData from '../../data/notificationMockData';
import { NotificationEmptyState, NotificationItem, NotificationSkeleton, NotificationTabs } from './NotificationComponents';
import {
  filterNotifications,
  formatNotificationTime,
  getNotificationAction,
  groupNotificationsByDate,
  notificationTabs,
} from './notificationUtils';
import styles from './Notifications.module.css';

function BellIcon({ className }) {
  return <svg className={className} viewBox="0 0 24 24" aria-hidden="true"><path d="M18 16v-5a6 6 0 0 0-12 0v5l-2 2h16l-2-2Z" /><path d="M10 20h4" /></svg>;
}

function BackIcon({ className }) {
  return <svg className={className} viewBox="0 0 24 24" aria-hidden="true"><path d="m15 5-7 7 7 7" /></svg>;
}

function GearIcon({ className }) {
  return <svg className={className} viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2 2-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V20h-3.6v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1-2-2 .1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H4v-3.6h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1 2-2 .1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.5V4h3.6v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1 2 2-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.5 1h.1v3.6h-.1a1.7 1.7 0 0 0-1.5 1Z" /></svg>;
}

function CheckIcon({ className }) {
  return <svg className={className} viewBox="0 0 24 24" aria-hidden="true"><path d="m5 13 4 4L19 7" /></svg>;
}

export default function NotificationListPage() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState(() => [...notificationMockData].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
  const [activeTab, setActiveTab] = useState('all');
  const [notice, setNotice] = useState('');
  const [loading] = useState(false);
  const [error, setError] = useState('');

  const filteredNotifications = useMemo(() => filterNotifications(notifications, activeTab), [notifications, activeTab]);
  const groupedNotifications = useMemo(() => groupNotificationsByDate(filteredNotifications), [filteredNotifications]);
  const unreadCount = notifications.filter((item) => !item.isRead).length;

  const handleBack = () => {
    const canGoBack = typeof window !== 'undefined'
      && window.history.state
      && typeof window.history.state.idx === 'number'
      && window.history.state.idx > 0;

    if (canGoBack) {
      navigate(-1);
      return;
    }

    navigate('/MyPage');
  };

  const markAsRead = (notificationId) => {
    // 今回はDB接続前のモックUIなので、タップした通知の既読状態はフロントのstateだけで更新します。
    setNotifications((current) => current.map((item) => (item.id === notificationId ? { ...item, isRead: true } : item)));
  };

  const openNotification = (notification) => {
    markAsRead(notification.id);
    setNotice('');
    const action = getNotificationAction(notification);

    if (action.type === 'detail' || action.type === 'route') {
      navigate(action.path);
      return;
    }

    setNotice(action.message || '関連ページは今後接続予定です。');
  };

  const markAllAsRead = () => {
    // 一括既読もモックデータ上の表示だけを更新し、DBやAPIは呼び出しません。
    setNotifications((current) => current.map((item) => ({ ...item, isRead: true })));
    setNotice('すべての通知を既読にしました。');
  };

  const retry = () => {
    setError('');
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <button type="button" className={styles.headerIconButton} onClick={handleBack} aria-label="前のページに戻る">
          <BackIcon className={styles.headerIcon} />
        </button>
        <h1 className={styles.headerTitle}>通知</h1>
        <button type="button" className={styles.headerIconButton} onClick={() => navigate('/mypage/notification-settings')} aria-label="通知設定">
          <GearIcon className={styles.headerIcon} />
        </button>
      </header>

      <main className={styles.content}>
        <NotificationTabs tabs={notificationTabs} activeTab={activeTab} onChange={setActiveTab} />

        {loading && <NotificationSkeleton />}
        {error && <NotificationEmptyState title="通知を読み込めませんでした" body="時間をおいて再度お試しください。" actionLabel="再読み込み" onAction={retry} />}
        {!loading && !error && notifications.length === 0 && <NotificationEmptyState title="通知はありません" body="新しい通知が届くと、ここに表示されます。" />}
        {!loading && !error && notifications.length > 0 && filteredNotifications.length === 0 && (
          <NotificationEmptyState
            title={activeTab === 'unread' ? '未読の通知はありません' : '該当する通知はありません'}
            body={activeTab === 'unread' ? 'すべての通知を確認済みです。' : '別のカテゴリを選択してください。'}
          />
        )}

        {!loading && !error && groupedNotifications.map((group) => (
          <section key={group.label} className={styles.dateGroup} aria-labelledby={`notification-${group.label}`}>
            <h2 id={`notification-${group.label}`} className={styles.dateHeading}>{group.label}</h2>
            <div className={styles.listCard}>
              {group.items.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  timeLabel={formatNotificationTime(notification.createdAt)}
                  onOpen={openNotification}
                />
              ))}
            </div>
          </section>
        ))}

        {notice && <p className={styles.inlineNotice} role="status">{notice}</p>}

        {unreadCount > 0 && !loading && !error && (
          <button type="button" className={styles.markAllButton} onClick={markAllAsRead}>
            <CheckIcon className={styles.buttonIcon} />
            すべてを既読にする
          </button>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
