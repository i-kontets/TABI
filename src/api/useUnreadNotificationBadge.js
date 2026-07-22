import { useCallback, useEffect, useState } from 'react';
import { fetchUnreadNotificationCount } from './notificationApi';

const NOTIFICATION_BADGE_EVENT = 'tabi:notifications-updated';

function formatBadgeText(data) {
  const count = Number(data?.data?.unreadCount ?? 0);
  const safeCount = Number.isFinite(count) ? count : 0;
  const badgeText = data?.data?.badgeText || (safeCount >= 100 ? '99+' : String(safeCount));

  return {
    unreadCount: safeCount,
    badgeText: safeCount > 0 ? badgeText : null,
  };
}

function notifyUnreadNotificationBadgeChanged() {
  if (typeof window === 'undefined') return;
  // 既読処理が成功した時だけ小さなイベントを出し、表示中のベルに再取得してもらいます。
  window.dispatchEvent(new Event(NOTIFICATION_BADGE_EVENT));
}

function useUnreadNotificationBadge() {
  const [badgeText, setBadgeText] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);

  const refresh = useCallback(async (signal) => {
    try {
      const data = await fetchUnreadNotificationCount({ signal });
      const next = formatBadgeText(data);
      setUnreadCount(next.unreadCount);
      setBadgeText(next.badgeText);
      return next;
    } catch (caughtError) {
      if (caughtError?.name !== 'AbortError') {
        setUnreadCount(0);
        setBadgeText(null);
      }
      return { unreadCount: 0, badgeText: null };
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    Promise.resolve().then(() => refresh(controller.signal));

    const handleBadgeUpdate = () => {
      Promise.resolve().then(() => refresh());
    };

    // ベルがある画面を開いている間だけ、通知画面からの更新合図を受け取ります。
    window.addEventListener(NOTIFICATION_BADGE_EVENT, handleBadgeUpdate);

    return () => {
      controller.abort();
      window.removeEventListener(NOTIFICATION_BADGE_EVENT, handleBadgeUpdate);
    };
  }, [refresh]);

  return { badgeText, unreadCount, refresh };
}

export { notifyUnreadNotificationBadgeChanged, useUnreadNotificationBadge };
