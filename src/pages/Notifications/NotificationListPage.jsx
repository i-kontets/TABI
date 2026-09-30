/**
 * 通知一覧画面です。届いた通知をカテゴリ別・日付別に表示し、既読管理を行います。
 *
 * 主な流れ:
 * 1. 画面表示時とタブ切り替え時に、通知一覧APIと未読件数APIを呼び出す
 * 2. 通知タップで既読化してから、詳細画面や関連画面へ遷移する
 * 3. 「さらに読み込む」でページング、「すべてを既読にする」で一括既読を行う
 *
 * 扱うデータ: 通知の配列、未読件数、選択中タブ、読み込み・エラー状態。
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MainBottomNav from '../../components/mainBottomNav/MainBottomNav';
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

// 1回のAPI呼び出しで取得する通知の件数です。
const PAGE_SIZE = 20;

// 画面で使う文言をまとめた定数です(変更やレビューをしやすくするため)。
const TEXT = {
  title: '通知',
  back: '前のページに戻る',
  settings: '通知設定',
  unreadEmptyTitle: '未読の通知はありません',
  allEmptyTitle: '通知はありません',
  filteredEmptyTitle: '該当する通知はありません',
  unreadEmptyBody: 'すべての通知を確認済みです。',
  allEmptyBody: '新しい通知が届くと、ここに表示されます。',
  filteredEmptyBody: 'このカテゴリの通知はまだありません。',
  loadErrorTitle: '通知を読み込めませんでした',
  loadError: '通信状態を確認して、もう一度お試しください。',
  readError: '通知を既読にできませんでした。時間をおいて再度お試しください。',
  readAllError: '通知を一括既読にできませんでした。時間をおいて再度お試しください。',
  loadMoreError: '追加の通知を読み込めませんでした。時間をおいて再度お試しください。',
  routeNotice: '関連ページは現在開けません。通知内容を確認してください。',
  readAllSuccess: 'すべての通知を既読にしました。',
  readAllNoUpdates: '未読の通知はありません。',
  retry: '再読み込み',
  loadingMore: '読み込み中...',
  loadMore: 'さらに読み込む',
  markAll: 'すべてを既読にする',
};

/** ヘッダーの「戻る」ボタン用の矢印アイコンです。 */
function BackIcon({ className }) {
  return <svg className={className} viewBox="0 0 24 24" aria-hidden="true"><path d="m15 5-7 7 7 7" /></svg>;
}

/** ヘッダーの「通知設定」ボタン用の歯車アイコンです。 */
function GearIcon({ className }) {
  return <svg className={className} viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2 2-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V20h-3.6v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1-2-2 .1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H4v-3.6h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1 2-2 .1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.5V4h3.6v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1 2 2-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.5 1h.1v3.6h-.1a1.7 1.7 0 0 0-1.5 1Z" /></svg>;
}

/** 「すべてを既読にする」ボタン用のチェックアイコンです。 */
function CheckIcon({ className }) {
  return <svg className={className} viewBox="0 0 24 24" aria-hidden="true"><path d="m5 13 4 4L19 7" /></svg>;
}

/** 通知が0件のときの見出し文言を、選択中タブに応じて返します。 */
function getEmptyTitle(activeTab) {
  if (activeTab === 'unread') return TEXT.unreadEmptyTitle;
  if (activeTab === 'all') return TEXT.allEmptyTitle;
  return TEXT.filteredEmptyTitle;
}

/** 通知が0件のときの本文文言を、選択中タブに応じて返します。 */
function getEmptyBody(activeTab) {
  if (activeTab === 'unread') return TEXT.unreadEmptyBody;
  if (activeTab === 'all') return TEXT.allEmptyBody;
  return TEXT.filteredEmptyBody;
}

/**
 * 既存の通知一覧に追加ページの通知を結合します。
 * recipientId で重複を判定し、同じ通知が二重に表示されるのを防ぎます。
 */
function mergeNotifications(currentNotifications, nextNotifications) {
  // 既に表示中の通知のIDを集めます。
  const knownRecipientIds = new Set(currentNotifications.map((item) => String(item.recipientId)));
  // まだ表示していない通知だけを残します。
  const uniqueNext = nextNotifications.filter((item) => {
    const key = String(item.recipientId);
    if (knownRecipientIds.has(key)) return false;
    knownRecipientIds.add(key);
    return true;
  });

  // 既存の一覧の後ろへ新しい分を追加します。
  return [...currentNotifications, ...uniqueNext];
}

/**
 * 通知一覧画面の本体コンポーネントです。
 */
export default function NotificationListPage() {
  const navigate = useNavigate();
  // ===== 画面の状態(state)の定義 =====
  const [notifications, setNotifications] = useState([]);      // 表示中の通知一覧
  const [activeTab, setActiveTab] = useState('all');           // 選択中の絞り込みタブ
  const [notice, setNotice] = useState('');                    // お知らせメッセージ(成功時など)
  const [loading, setLoading] = useState(true);                // 初回読み込み中フラグ
  const [isLoadingMore, setIsLoadingMore] = useState(false);   // 追加読み込み中フラグ
  const [error, setError] = useState('');                      // エラーメッセージ
  const [hasMore, setHasMore] = useState(false);               // 次のページがあるか
  const [offset, setOffset] = useState(0);                     // 何件目まで読み込んだか
  const [unreadCount, setUnreadCount] = useState(0);           // 未読件数
  const [, setReadingRecipientIds] = useState(() => new Set()); // 既読処理中の通知ID(再描画用)
  const [isMarkingAll, setIsMarkingAll] = useState(false);     // 一括既読の処理中フラグ
  // 既読処理中IDの「最新の値」を同期的に参照するための ref です(連打による二重送信防止)。
  const readingRecipientIdsRef = useRef(new Set());
  // 一覧の再取得と追加ページが競合した場合、古い追加ページを破棄する世代番号です。
  const listGenerationRef = useRef(0);
  const countGenerationRef = useRef(0);

  // 通知一覧を「今日/昨日/それ以前」のグループへ分類します(一覧が変わったときだけ再計算)。
  const groupedNotifications = useMemo(() => groupNotificationsByDate(notifications), [notifications]);

  // 未読件数APIを呼び、画面の未読件数を更新します。
  const refreshUnreadCount = useCallback(async (signal) => {
    const generation = ++countGenerationRef.current;
    const countData = await fetchUnreadNotificationCount({ signal });
    if (signal?.aborted || generation !== countGenerationRef.current) return;
    const count = Number(countData?.data?.unreadCount ?? 0);
    // 数値でない値が来た場合は0件として扱います。
    setUnreadCount(Number.isFinite(count) ? count : 0);
  }, []);

  // 1ページ目の通知を読み込みます(初回表示時・タブ切り替え時・再試行時に使用)。
  const loadFirstPage = useCallback(async (category, signal) => {
    const generation = ++listGenerationRef.current;
    // タブとAPIのcategoryを同じ値にして、選択中カテゴリだけをDBから取り直します。
    // まず読み込み中の表示に切り替え、以前の状態をリセットします。
    setLoading(true);
    // 古い追加ページの待機状態を解除し、結果は世代番号で破棄します。
    setIsLoadingMore(false);
    setError('');
    setNotice('');
    setNotifications([]);
    setOffset(0);
    setHasMore(false);

    try {
      // 通知一覧と未読件数を同時に取得します(並列実行で待ち時間を短縮)。
      const [listData] = await Promise.all([
        fetchNotifications({ category, limit: PAGE_SIZE, offset: 0, signal }),
        refreshUnreadCount(signal),
      ]);
      const nextNotifications = listData?.data?.notifications ?? [];
      if (signal?.aborted || generation !== listGenerationRef.current) return;
      // APIが0件なら0件のまま表示し、確認用に残しているモック通知へは戻しません。
      setNotifications(nextNotifications.map(normalizeNotification));
      setOffset(nextNotifications.length);
      setHasMore(Boolean(listData?.data?.pagination?.hasMore));
      // 他画面のベルバッジにも最新の件数を反映してもらいます。
      notifyUnreadNotificationBadgeChanged();
    } catch (caughtError) {
      // 画面遷移によるキャンセル(AbortError)はエラー表示しません。
      if (caughtError?.name !== 'AbortError' && generation === listGenerationRef.current) {
        // 未ログイン(401)ならログイン画面へ戻します。
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
      // キャンセルされていなければ読み込み中表示を解除します。
      if (!signal?.aborted && generation === listGenerationRef.current) setLoading(false);
    }
  }, [navigate, refreshUnreadCount]);

  // タブが切り替わるたびに1ページ目を読み込み直します。
  useEffect(() => {
    let controller;
    // 新規通知・再接続でDBの先頭ページに置き換え、切断中の取りこぼしと重複を防ぎます。
    const reload = () => {
      controller?.abort();
      controller = new AbortController();
      loadFirstPage(activeTab, controller.signal);
    };
    // タブをすばやく切り替えた時、古いAPI通信の結果で新しいタブの表示を上書きしないよう中断します。
    let disposed = false;
    Promise.resolve().then(() => { if (!disposed) reload(); });
    const events = ['user:notification_created', 'user:reconnected', 'focus'];
    events.forEach((event) => window.addEventListener(event, reload));
    const timer = window.setInterval(() => { if (document.visibilityState === 'visible') reload(); }, 60000);
    return () => {
      disposed = true;
      controller?.abort();
      window.clearInterval(timer);
      events.forEach((event) => window.removeEventListener(event, reload));
    };
  }, [activeTab, loadFirstPage]);

  // 「戻る」ボタンの処理: ブラウザ履歴があれば1つ戻り、なければマイページへ移動します。
  const handleBack = () => {
    // React Router の履歴インデックスを見て「戻れる履歴があるか」を判定します。
    const canGoBack = typeof window !== 'undefined'
      && window.history.state
      && typeof window.history.state.idx === 'number'
      && window.history.state.idx > 0;

    if (canGoBack) {
      navigate(-1);
      return;
    }

    // 直接このページを開いた場合など、履歴が無いときの行き先です。
    navigate('/MyPage');
  };

  // 通知の種類に応じて、詳細画面または関連画面へ遷移します。
  const navigateByNotification = (notification) => {
    const action = getNotificationAction(notification);

    // システム通知: 通知データを渡しながら詳細画面へ遷移します。
    if (action.type === 'detail') {
      navigate(action.path, { state: { notification } });
      return;
    }

    // 関連画面あり: その画面へ遷移します。
    if (action.type === 'route') {
      navigate(action.path);
      return;
    }

    // 遷移先なし: メッセージだけ表示します。
    setNotice(action.message || TEXT.routeNotice);
  };

  // 通知をタップしたときの処理: 未読なら既読化してから遷移します。
  const openNotification = async (notification) => {
    setNotice('');
    setError('');

    // 既読済みなら既読処理をスキップしてそのまま遷移します。
    if (notification.isRead) {
      navigateByNotification(notification);
      return;
    }

    // 同じ通知の既読処理が進行中なら何もしません(連打対策)。
    if (readingRecipientIdsRef.current.has(notification.recipientId)) return;

    // 失敗時に元へ戻せるよう、現在の状態を控えておきます。
    const previousNotifications = notifications;
    const previousUnreadCount = unreadCount;
    readingRecipientIdsRef.current.add(notification.recipientId);
    setReadingRecipientIds((current) => new Set(current).add(notification.recipientId));
    // 楽観的更新は、API完了を待たずに画面だけ先に既読表示へ変えることです。
    setNotifications((current) => current.map((item) => (item.id === notification.id ? { ...item, isRead: true } : item)));
    setUnreadCount((current) => Math.max(0, current - 1));

    try {
      // サーバー側で既読にします。
      await markNotificationAsRead(notification.recipientId);
      const readNotification = { ...notification, isRead: true };

      // 「未読」タブ表示中なら、既読になった通知を一覧から取り除きます。
      if (activeTab === 'unread') {
        setNotifications((current) => current.filter((item) => item.id !== notification.id));
      }

      // ベルバッジを更新してから遷移します。
      notifyUnreadNotificationBadgeChanged();
      navigateByNotification(readNotification);
    } catch (caughtError) {
      // 未ログイン(401)ならログイン画面へ戻します。
      if (caughtError?.status === 401) {
        navigate('/');
        return;
      }
      // APIが失敗した時は、DBでは未読のままなので画面と件数も元へ戻します。
      setNotifications(previousNotifications);
      setUnreadCount(previousUnreadCount);
      setError(TEXT.readError);
    } finally {
      // 処理中フラグを解除します(成功・失敗どちらでも)。
      setReadingRecipientIds((current) => {
        const next = new Set(current);
        next.delete(notification.recipientId);
        return next;
      });
      readingRecipientIdsRef.current.delete(notification.recipientId);
    }
  };

  // 「すべてを既読にする」ボタンの処理です。
  const markAllAsRead = async () => {
    // 未読が無ければAPIを呼ばずにメッセージだけ表示します。
    if (unreadCount <= 0) {
      setNotice(TEXT.readAllNoUpdates);
      return;
    }

    // 他の読み込み・既読処理の最中は実行しません(状態の食い違い防止)。
    if (loading || isLoadingMore || isMarkingAll) return;

    // 失敗時に元へ戻せるよう、現在の状態を控えておきます。
    const previousNotifications = notifications;
    const previousUnreadCount = unreadCount;
    setError('');
    setNotice('');
    setIsMarkingAll(true);
    // 楽観的更新: 先に画面をすべて既読の表示へ変えます。
    setUnreadCount(0);
    setNotifications((current) => (activeTab === 'unread' ? [] : current.map((item) => ({ ...item, isRead: true }))));

    try {
      // サーバー側で一括既読にし、結果の件数を画面へ反映します。
      const data = await markAllNotificationsAsRead();
      const nextUnreadCount = Number(data?.data?.unreadCount ?? 0);
      setUnreadCount(Number.isFinite(nextUnreadCount) ? nextUnreadCount : 0);
      // 実際に更新された件数に応じてメッセージを変えます。
      setNotice(Number(data?.data?.updatedCount ?? 0) > 0 ? TEXT.readAllSuccess : TEXT.readAllNoUpdates);
      notifyUnreadNotificationBadgeChanged();
    } catch (caughtError) {
      if (caughtError?.status === 401) {
        navigate('/');
        return;
      }
      // 失敗時は画面を元へ戻し、さらに一覧を取り直してDBと確実に揃えます。
      setNotifications(previousNotifications);
      setUnreadCount(previousUnreadCount);
      setError(TEXT.readAllError);
      await loadFirstPage(activeTab);
    } finally {
      setIsMarkingAll(false);
    }
  };

  // 「さらに読み込む」ボタンの処理: 次のページの通知を取得して一覧へ追加します。
  const loadMore = async () => {
    // 次ページが無い、または他の読み込み中は実行しません。
    if (!hasMore || isLoadingMore || loading) return;

    setIsLoadingMore(true);
    setError('');
    const generation = listGenerationRef.current;

    try {
      // 現在の offset から次の PAGE_SIZE 件を取得します。
      const listData = await fetchNotifications({ category: activeTab, limit: PAGE_SIZE, offset });
      const nextNotifications = (listData?.data?.notifications ?? []).map(normalizeNotification);
      if (generation !== listGenerationRef.current) return;
      // 重複を除きながら既存の一覧へ追加します。
      setNotifications((current) => mergeNotifications(current, nextNotifications));
      setOffset((current) => current + nextNotifications.length);
      setHasMore(Boolean(listData?.data?.pagination?.hasMore));
      // 未読件数とベルバッジも最新化します。
      await refreshUnreadCount();
      notifyUnreadNotificationBadgeChanged();
    } catch (caughtError) {
      if (generation !== listGenerationRef.current) return;
      if (caughtError?.status === 401) {
        navigate('/');
        return;
      }
      setError(TEXT.loadMoreError);
    } finally {
      if (generation === listGenerationRef.current) setIsLoadingMore(false);
    }
  };

  // エラー時の「再読み込み」ボタンの処理です。
  const retry = () => {
    const controller = new AbortController();
    loadFirstPage(activeTab, controller.signal);
  };

  return (
    <div className={styles.page}>
      {/* ===== ヘッダー(戻る・タイトル・通知設定) ===== */}
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
        {/* カテゴリ絞り込みタブ */}
        <NotificationTabs tabs={notificationTabs} activeTab={activeTab} onChange={setActiveTab} />

        {/* 状態に応じた表示の切り替え: 読み込み中 → エラー → 0件 → 一覧 */}
        {loading && <NotificationSkeleton />}
        {error && !loading && <NotificationEmptyState title={TEXT.loadErrorTitle} body={error} actionLabel={TEXT.retry} onAction={retry} />}
        {!loading && !error && notifications.length === 0 && <NotificationEmptyState title={getEmptyTitle(activeTab)} body={getEmptyBody(activeTab)} />}

        {/* 日付グループ(今日/昨日/それ以前)ごとに通知を表示します */}
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

        {/* 次ページがあるときだけ「さらに読み込む」ボタンを表示します */}
        {hasMore && !loading && !error && (
          <button type="button" className={styles.loadMoreButton} onClick={loadMore} disabled={isLoadingMore}>
            {isLoadingMore ? TEXT.loadingMore : TEXT.loadMore}
          </button>
        )}

        {/* お知らせメッセージ(role="status" で読み上げにも対応) */}
        {notice && <p className={styles.inlineNotice} role="status">{notice}</p>}

        {/* 未読があるときだけ「すべてを既読にする」ボタンを表示します */}
        {unreadCount > 0 && !loading && !error && (
          <button type="button" className={styles.markAllButton} onClick={markAllAsRead} disabled={isLoadingMore || isMarkingAll}>
            <CheckIcon className={styles.buttonIcon} />
            {isMarkingAll ? '既読にしています...' : TEXT.markAll}
          </button>
        )}
      </main>

      {/* 通知画面は専用タブを持たないため、Homeを勝手にアクティブにせず共通フッターだけ表示します。 */}
      <MainBottomNav activeItemId="" />
    </div>
  );
}
