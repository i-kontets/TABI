/**
 * ベルアイコンの未読バッジ(赤い数字)を管理するReactカスタムフックです。
 *
 * 主な流れ:
 * 1. 画面表示時に未読件数APIを呼び、バッジの数字を取得する
 * 2. 通知画面で既読処理が行われたら、独自イベント経由で合図を受け取り再取得する
 * 3. 画面側には { badgeText, unreadCount, refresh } を返す
 *
 * 扱うデータ: 未読通知の件数と、バッジ表示用の文字列("3" や "99+" など)。
 */
import { useCallback, useEffect, useState } from 'react';
import { fetchUnreadNotificationCount } from './notificationApi';

// 「未読件数が変わったよ」と画面間で知らせ合うための独自イベント名です。
const NOTIFICATION_BADGE_EVENT = 'tabi:notifications-updated';

/**
 * APIのレスポンスから、バッジ表示に必要な値だけを安全に取り出します。
 * 想定外の値(数値でない等)が来ても 0 件として扱い、画面が壊れないようにします。
 */
function formatBadgeText(data) {
  // レスポンスから件数を取り出します。無ければ 0 とみなします。
  const count = Number(data?.data?.unreadCount ?? 0);
  // NaN や Infinity は 0 に置き換えます。
  const safeCount = Number.isFinite(count) ? count : 0;
  // API側のバッジ文字列を優先し、無ければ自分で組み立てます(100件以上は "99+")。
  const badgeText = data?.data?.badgeText || (safeCount >= 100 ? '99+' : String(safeCount));

  return {
    unreadCount: safeCount,
    // 0件のときは null にしてバッジ自体を非表示にします。
    badgeText: safeCount > 0 ? badgeText : null,
  };
}

/**
 * 「未読件数が変わった」ことを他の画面(ベルを表示中の画面)へ知らせます。
 * 通知の既読処理が成功したときに呼び出されます。
 */
function notifyUnreadNotificationBadgeChanged() {
  // サーバーサイドレンダリング等で window が無い環境では何もしません。
  if (typeof window === 'undefined') return;
  // 既読処理が成功した時だけ小さなイベントを出し、表示中のベルに再取得してもらいます。
  window.dispatchEvent(new Event(NOTIFICATION_BADGE_EVENT));
}

/**
 * ベルアイコンを持つ画面で使うカスタムフックです。
 * 未読件数の取得・自動更新を行い、表示用の値を返します。
 */
function useUnreadNotificationBadge() {
  // バッジに表示する文字列(null なら非表示)。
  const [badgeText, setBadgeText] = useState(null);
  // 未読件数の数値。
  const [unreadCount, setUnreadCount] = useState(0);

  // 未読件数をAPIから取り直す関数です。useCallback で同じ関数を使い回します。
  const refresh = useCallback(async (signal) => {
    try {
      // APIから最新の未読件数を取得し、state を更新します。
      const data = await fetchUnreadNotificationCount({ signal });
      const next = formatBadgeText(data);
      setUnreadCount(next.unreadCount);
      setBadgeText(next.badgeText);
      return next;
    } catch (caughtError) {
      // 画面遷移によるキャンセル(AbortError)は正常な動作なので無視します。
      // それ以外のエラー時はバッジを非表示にします(誤った数字を見せないため)。
      if (caughtError?.name !== 'AbortError') {
        setUnreadCount(0);
        setBadgeText(null);
      }
      return { unreadCount: 0, badgeText: null };
    }
  }, []);

  // 画面の表示開始時に1回実行され、後片付け関数を返します。
  useEffect(() => {
    // 画面を離れたときにAPIリクエストを中断できるようにします。
    const controller = new AbortController();
    // 表示直後に未読件数を取得します。
    Promise.resolve().then(() => refresh(controller.signal));

    // 「未読件数が変わった」イベントを受け取ったら再取得します。
    const handleBadgeUpdate = () => {
      Promise.resolve().then(() => refresh());
    };

    // ベルがある画面を開いている間だけ、通知画面からの更新合図を受け取ります。
    window.addEventListener(NOTIFICATION_BADGE_EVENT, handleBadgeUpdate);

    // 後片付け: 画面を離れるときにリクエストを中断し、イベント購読も解除します。
    return () => {
      controller.abort();
      window.removeEventListener(NOTIFICATION_BADGE_EVENT, handleBadgeUpdate);
    };
  }, [refresh]);

  // 画面側で使う値と、手動更新用の refresh 関数を返します。
  return { badgeText, unreadCount, refresh };
}

export { notifyUnreadNotificationBadgeChanged, useUnreadNotificationBadge };
