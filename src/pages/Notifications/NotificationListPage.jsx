import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import BottomNav from '../../components/bottomNav/BottomNav';
import { fetchNotifications, fetchUnreadNotificationCount, markAllNotificationsAsRead, markNotificationAsRead } from '../../api/notificationApi';
import { notifyUnreadNotificationBadgeChanged } from '../../api/useUnreadNotificationBadge';
import { NotificationEmptyState, NotificationItem, NotificationSkeleton, NotificationTabs } from './NotificationComponents';
import {
  formatNotificationTime,
  getNotificationAction,
  groupNotificationsByDate,
  normalizeNotification,
  notificationTabs,
} from './notificationUtils';
import styles from './Notifications.module.css';

const PAGE_SIZE = 20;
const TEXT = {
  title: '\u901a\u77e5',
  back: '\u524d\u306e\u30da\u30fc\u30b8\u306b\u623b\u308b',
  settings: '\u901a\u77e5\u8a2d\u5b9a',
  unreadEmptyTitle: '\u672a\u8aad\u306e\u901a\u77e5\u306f\u3042\u308a\u307e\u305b\u3093',
  allEmptyTitle: '\u901a\u77e5\u306f\u3042\u308a\u307e\u305b\u3093',
  filteredEmptyTitle: '\u8a72\u5f53\u3059\u308b\u901a\u77e5\u306f\u3042\u308a\u307e\u305b\u3093',
  unreadEmptyBody: '\u3059\u3079\u3066\u306e\u901a\u77e5\u3092\u78ba\u8a8d\u6e08\u307f\u3067\u3059\u3002',
  allEmptyBody: '\u65b0\u3057\u3044\u901a\u77e5\u304c\u5c4a\u304f\u3068\u3001\u3053\u3053\u306b\u8868\u793a\u3055\u308c\u307e\u3059\u3002',
  filteredEmptyBody: '\u3053\u306e\u30ab\u30c6\u30b4\u30ea\u306e\u901a\u77e5\u306f\u307e\u3060\u3042\u308a\u307e\u305b\u3093\u3002',
  loadErrorTitle: '\u901a\u77e5\u3092\u8aad\u307f\u8fbc\u3081\u307e\u305b\u3093\u3067\u3057\u305f',
  loadError: '\u901a\u4fe1\u72b6\u614b\u3092\u78ba\u8a8d\u3057\u3066\u3001\u3082\u3046\u4e00\u5ea6\u304a\u8a66\u3057\u304f\u3060\u3055\u3044\u3002',
  readError: '\u901a\u77e5\u3092\u65e2\u8aad\u306b\u3067\u304d\u307e\u305b\u3093\u3067\u3057\u305f\u3002\u6642\u9593\u3092\u304a\u3044\u3066\u518d\u5ea6\u304a\u8a66\u3057\u304f\u3060\u3055\u3044\u3002',
  readAllError: '\u901a\u77e5\u3092\u4e00\u62ec\u65e2\u8aad\u306b\u3067\u304d\u307e\u305b\u3093\u3067\u3057\u305f\u3002\u6642\u9593\u3092\u304a\u3044\u3066\u518d\u5ea6\u304a\u8a66\u3057\u304f\u3060\u3055\u3044\u3002',
  loadMoreError: '\u8ffd\u52a0\u306e\u901a\u77e5\u3092\u8aad\u307f\u8fbc\u3081\u307e\u305b\u3093\u3067\u3057\u305f\u3002\u6642\u9593\u3092\u304a\u3044\u3066\u518d\u5ea6\u304a\u8a66\u3057\u304f\u3060\u3055\u3044\u3002',
  routeNotice: '\u95a2\u9023\u30da\u30fc\u30b8\u306f\u73fe\u5728\u958b\u3051\u307e\u305b\u3093\u3002\u901a\u77e5\u5185\u5bb9\u3092\u78ba\u8a8d\u3057\u3066\u304f\u3060\u3055\u3044\u3002',
  readAllSuccess: '\u3059\u3079\u3066\u306e\u901a\u77e5\u3092\u65e2\u8aad\u306b\u3057\u307e\u3057\u305f\u3002',
  readAllNoUpdates: '\u672a\u8aad\u306e\u901a\u77e5\u306f\u3042\u308a\u307e\u305b\u3093\u3002',
  retry: '\u518d\u8aad\u307f\u8fbc\u307f',
  loadingMore: '\u8aad\u307f\u8fbc\u307f\u4e2d...',
  loadMore: '\u3055\u3089\u306b\u8aad\u307f\u8fbc\u3080',
  markAll: '\u3059\u3079\u3066\u3092\u65e2\u8aad\u306b\u3059\u308b',
};

function BackIcon({ className }) {
  return <svg className={className} viewBox="0 0 24 24" aria-hidden="true"><path d="m15 5-7 7 7 7" /></svg>;
}

function GearIcon({ className }) {
  return <svg className={className} viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2 2-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V20h-3.6v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1-2-2 .1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H4v-3.6h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1 2-2 .1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.5V4h3.6v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1 2 2-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.5 1h.1v3.6h-.1a1.7 1.7 0 0 0-1.5 1Z" /></svg>;
}

function CheckIcon({ className }) {
  return <svg className={className} viewBox="0 0 24 24" aria-hidden="true"><path d="m5 13 4 4L19 7" /></svg>;
}

function getEmptyTitle(activeTab) {
  if (activeTab === 'unread') return TEXT.unreadEmptyTitle;
  if (activeTab === 'all') return TEXT.allEmptyTitle;
  return TEXT.filteredEmptyTitle;
}

function getEmptyBody(activeTab) {
  if (activeTab === 'unread') return TEXT.unreadEmptyBody;
  if (activeTab === 'all') return TEXT.allEmptyBody;
  return TEXT.filteredEmptyBody;
}

function mergeNotifications(currentNotifications, nextNotifications) {
  const knownRecipientIds = new Set(currentNotifications.map((item) => String(item.recipientId)));
  const uniqueNext = nextNotifications.filter((item) => {
    const key = String(item.recipientId);
    if (knownRecipientIds.has(key)) return false;
    knownRecipientIds.add(key);
    return true;
  });

  return [...currentNotifications, ...uniqueNext];
}

export default function NotificationListPage() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [activeTab, setActiveTab] = useState('all');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [, setReadingRecipientIds] = useState(() => new Set());
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const readingRecipientIdsRef = useRef(new Set());

  const groupedNotifications = useMemo(() => groupNotificationsByDate(notifications), [notifications]);

  const refreshUnreadCount = useCallback(async (signal) => {
    const countData = await fetchUnreadNotificationCount({ signal });
    const count = Number(countData?.data?.unreadCount ?? 0);
    setUnreadCount(Number.isFinite(count) ? count : 0);
  }, []);

  const loadFirstPage = useCallback(async (category, signal) => {
    // タブとAPIのcategoryを同じ値にして、選択中カテゴリだけをDBから取り直します。
    setLoading(true);
    setError('');
    setNotice('');
    setNotifications([]);
    setOffset(0);
    setHasMore(false);

    try {
      const [listData] = await Promise.all([
        fetchNotifications({ category, limit: PAGE_SIZE, offset: 0, signal }),
        refreshUnreadCount(signal),
      ]);
      const nextNotifications = listData?.data?.notifications ?? [];
      // APIが0件なら0件のまま表示し、確認用に残しているモック通知へは戻しません。
      setNotifications(nextNotifications.map(normalizeNotification));
      setOffset(nextNotifications.length);
      setHasMore(Boolean(listData?.data?.pagination?.hasMore));
      notifyUnreadNotificationBadgeChanged();
    } catch (caughtError) {
      if (caughtError?.name !== 'AbortError') {
        if (caughtError?.status === 401) {
          navigate('/');
          return;
        }
        // APIが失敗した時にモックへ戻すとDBの状態と食い違うため、空のままエラーを表示します。
        setNotifications([]);
        setHasMore(false);
        setOffset(0);
        setError(TEXT.loadError);
      }
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [navigate, refreshUnreadCount]);

  useEffect(() => {
    const controller = new AbortController();
    // タブをすばやく切り替えた時、古いAPI通信の結果で新しいタブの表示を上書きしないよう中断します。
    Promise.resolve().then(() => loadFirstPage(activeTab, controller.signal));
    return () => controller.abort();
  }, [activeTab, loadFirstPage]);

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

  const navigateByNotification = (notification) => {
    const action = getNotificationAction(notification);

    if (action.type === 'detail') {
      navigate(action.path, { state: { notification } });
      return;
    }

    if (action.type === 'route') {
      navigate(action.path);
      return;
    }

    setNotice(action.message || TEXT.routeNotice);
  };

  const openNotification = async (notification) => {
    setNotice('');
    setError('');

    if (notification.isRead) {
      navigateByNotification(notification);
      return;
    }

    if (readingRecipientIdsRef.current.has(notification.recipientId)) return;

    const previousNotifications = notifications;
    const previousUnreadCount = unreadCount;
    readingRecipientIdsRef.current.add(notification.recipientId);
    setReadingRecipientIds((current) => new Set(current).add(notification.recipientId));
    // 楽観的更新は、API完了を待たずに画面だけ先に既読表示へ変えることです。
    setNotifications((current) => current.map((item) => (item.id === notification.id ? { ...item, isRead: true } : item)));
    setUnreadCount((current) => Math.max(0, current - 1));

    try {
      await markNotificationAsRead(notification.recipientId);
      const readNotification = { ...notification, isRead: true };

      if (activeTab === 'unread') {
        setNotifications((current) => current.filter((item) => item.id !== notification.id));
      }

      notifyUnreadNotificationBadgeChanged();
      navigateByNotification(readNotification);
    } catch (caughtError) {
      if (caughtError?.status === 401) {
        navigate('/');
        return;
      }
      // APIが失敗した時は、DBでは未読のままなので画面と件数も元へ戻します。
      setNotifications(previousNotifications);
      setUnreadCount(previousUnreadCount);
      setError(TEXT.readError);
    } finally {
      setReadingRecipientIds((current) => {
        const next = new Set(current);
        next.delete(notification.recipientId);
        return next;
      });
      readingRecipientIdsRef.current.delete(notification.recipientId);
    }
  };

  const markAllAsRead = async () => {
    if (unreadCount <= 0) {
      setNotice(TEXT.readAllNoUpdates);
      return;
    }

    if (loading || isLoadingMore || isMarkingAll) return;

    const previousNotifications = notifications;
    const previousUnreadCount = unreadCount;
    setError('');
    setNotice('');
    setIsMarkingAll(true);
    setUnreadCount(0);
    setNotifications((current) => (activeTab === 'unread' ? [] : current.map((item) => ({ ...item, isRead: true }))));

    try {
      const data = await markAllNotificationsAsRead();
      const nextUnreadCount = Number(data?.data?.unreadCount ?? 0);
      setUnreadCount(Number.isFinite(nextUnreadCount) ? nextUnreadCount : 0);
      setNotice(Number(data?.data?.updatedCount ?? 0) > 0 ? TEXT.readAllSuccess : TEXT.readAllNoUpdates);
      notifyUnreadNotificationBadgeChanged();
    } catch (caughtError) {
      if (caughtError?.status === 401) {
        navigate('/');
        return;
      }
      setNotifications(previousNotifications);
      setUnreadCount(previousUnreadCount);
      setError(TEXT.readAllError);
      await loadFirstPage(activeTab);
    } finally {
      setIsMarkingAll(false);
    }
  };

  const loadMore = async () => {
    if (!hasMore || isLoadingMore || loading) return;

    setIsLoadingMore(true);
    setError('');

    try {
      const listData = await fetchNotifications({ category: activeTab, limit: PAGE_SIZE, offset });
      const nextNotifications = (listData?.data?.notifications ?? []).map(normalizeNotification);
      setNotifications((current) => mergeNotifications(current, nextNotifications));
      setOffset((current) => current + nextNotifications.length);
      setHasMore(Boolean(listData?.data?.pagination?.hasMore));
      await refreshUnreadCount();
      notifyUnreadNotificationBadgeChanged();
    } catch (caughtError) {
      if (caughtError?.status === 401) {
        navigate('/');
        return;
      }
      setError(TEXT.loadMoreError);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const retry = () => {
    const controller = new AbortController();
    loadFirstPage(activeTab, controller.signal);
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <button type="button" className={styles.headerIconButton} onClick={handleBack} aria-label={TEXT.back}>
          <BackIcon className={styles.headerIcon} />
        </button>
        <h1 className={styles.headerTitle}>{TEXT.title}</h1>
        <button type="button" className={styles.headerIconButton} onClick={() => navigate('/mypage/notification-settings')} aria-label={TEXT.settings}>
          <GearIcon className={styles.headerIcon} />
        </button>
      </header>

      <main className={styles.content}>
        <NotificationTabs tabs={notificationTabs} activeTab={activeTab} onChange={setActiveTab} />

        {loading && <NotificationSkeleton />}
        {error && !loading && <NotificationEmptyState title={TEXT.loadErrorTitle} body={error} actionLabel={TEXT.retry} onAction={retry} />}
        {!loading && !error && notifications.length === 0 && <NotificationEmptyState title={getEmptyTitle(activeTab)} body={getEmptyBody(activeTab)} />}

        {!loading && !error && groupedNotifications.map((group) => (
          <section key={group.label} className={styles.dateGroup} aria-labelledby={'notification-' + group.label}>
            <h2 id={'notification-' + group.label} className={styles.dateHeading}>{group.label}</h2>
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

        {hasMore && !loading && !error && (
          <button type="button" className={styles.loadMoreButton} onClick={loadMore} disabled={isLoadingMore}>
            {isLoadingMore ? TEXT.loadingMore : TEXT.loadMore}
          </button>
        )}

        {notice && <p className={styles.inlineNotice} role="status">{notice}</p>}

        {unreadCount > 0 && !loading && !error && (
          <button type="button" className={styles.markAllButton} onClick={markAllAsRead} disabled={isLoadingMore || isMarkingAll}>
            <CheckIcon className={styles.buttonIcon} />
            {isMarkingAll ? '\u65e2\u8aad\u306b\u3057\u3066\u3044\u307e\u3059...' : TEXT.markAll}
          </button>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
