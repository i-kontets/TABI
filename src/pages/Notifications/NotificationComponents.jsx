/**
 * 通知画面で使う小さなUI部品(アイコン・タブ・通知1件の行など)をまとめたファイルです。
 *
 * 主な流れ:
 * 1. カテゴリごとのSVGアイコンを定義する
 * 2. 絞り込みタブ・通知1件の行・空状態・読み込み中表示の部品を定義する
 * 3. 一覧画面(NotificationListPage)がこれらを組み合わせて画面を作る
 *
 * 扱うデータ: 通知1件分のオブジェクトと、タブの定義(notificationUtils.js から)。
 */
import styles from './Notifications.module.css';
import { getNotificationCategoryMeta } from './notificationUtils';

// ===== カテゴリ別のSVGアイコン定義 =====
// いずれも装飾目的のため aria-hidden="true" を付け、読み上げ対象から外しています。

/** チャット通知用の吹き出しアイコンです。 */
function ChatIcon({ className }) {
  return <svg className={className} viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5h14v10H8l-3 3V5Z" /><path d="M9 10h6" /></svg>;
}

/** 予定通知用のカレンダーアイコンです。 */
function CalendarIcon({ className }) {
  return <svg className={className} viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5h14v15H5V5Z" /><path d="M8 3v4M16 3v4M5 10h14" /></svg>;
}

/** アンケート通知用の棒グラフアイコンです。 */
function ChartIcon({ className }) {
  return <svg className={className} viewBox="0 0 24 24" aria-hidden="true"><path d="M5 19V9" /><path d="M12 19V5" /><path d="M19 19v-7" /><path d="M3 19h18" /></svg>;
}

/** メンバー通知用の人物アイコンです。 */
function GroupIcon({ className }) {
  return <svg className={className} viewBox="0 0 24 24" aria-hidden="true"><path d="M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" /><path d="M3.5 20a5.5 5.5 0 0 1 11 0" /><path d="M17 11a2.5 2.5 0 1 0 0-5" /><path d="M16 15.5A5 5 0 0 1 20.5 20" /></svg>;
}

/** 割り勘通知用の財布アイコンです。 */
function WalletIcon({ className }) {
  return <svg className={className} viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16v12H4V7Z" /><path d="M16 12h4v4h-4a2 2 0 0 1 0-4Z" /><path d="M6 7V5h10v2" /></svg>;
}

/** システム通知(お知らせ)用のメガホンアイコンです。 */
function MegaphoneIcon({ className }) {
  return <svg className={className} viewBox="0 0 24 24" aria-hidden="true"><path d="M4 13h3l9 4V7l-9 4H4v2Z" /><path d="M7 13l1.5 6" /><path d="M19 10.5v3" /></svg>;
}

/**
 * カテゴリに対応した色付きアイコンを表示する部品です。
 * カテゴリ名からアイコンと色(tone)を自動で選びます。
 */
function CategoryIcon({ category }) {
  // カテゴリの表示メタ情報(色分け用のtoneなど)を取得します。
  const meta = getNotificationCategoryMeta(category);
  const className = styles.categoryIconSvg;
  // カテゴリ名 → アイコン部品 の対応表です。
  const iconMap = {
    chat: ChatIcon,
    schedule: CalendarIcon,
    survey: ChartIcon,
    member: GroupIcon,
    split_bill: WalletIcon,
    system: MegaphoneIcon,
  };
  // 未知のカテゴリはメガホン(システム)アイコンで代用します。
  const Icon = iconMap[category] || MegaphoneIcon;

  return (
    // tone_チャット色 のようなCSSクラスを組み合わせて背景色を変えます。
    <span className={[styles.categoryIcon, styles['tone_' + meta.tone]].join(' ')} aria-hidden="true">
      <Icon className={className} />
    </span>
  );
}

/**
 * 通知一覧の上部に表示する絞り込みタブ(すべて/未読/チャット...)の部品です。
 * タブを押すと onChange(タブID) が呼ばれ、親が絞り込みを切り替えます。
 */
function NotificationTabs({ tabs, activeTab, onChange }) {
  return (
    // role="tablist" はスクリーンリーダーに「タブの集まり」であることを伝えます。
    <div className={styles.tabs} role="tablist" aria-label="通知カテゴリ">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={activeTab === tab.id}
          // 選択中のタブには強調用のCSSクラスを追加します。
          className={[styles.tab, activeTab === tab.id ? styles.tabActive : ''].join(' ')}
          onClick={() => onChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

/**
 * 通知1件分の行を表示する部品です。行全体がボタンになっており、
 * タップすると onOpen(通知) が呼ばれて詳細表示や画面遷移が行われます。
 */
function NotificationItem({ notification, timeLabel, onOpen }) {
  // スクリーンリーダー向けに既読/未読の状態を文字にします。
  const readStateLabel = notification.isRead ? '既読' : '未読';

  return (
    <button
      type="button"
      className={styles.notificationItem}
      onClick={() => onOpen(notification)}
      aria-label={`${notification.title}、${readStateLabel}`}
    >
      {/* 左端: カテゴリアイコン */}
      <CategoryIcon category={notification.category} />
      {/* 中央: タイトルと本文 */}
      <span className={styles.itemBody}>
        <span className={styles.itemTitle}>{notification.title}</span>
        <span className={styles.itemText}>{notification.body}</span>
      </span>
      {/* 右端: 受信時刻と未読マーク */}
      <span className={styles.itemMeta}>
        <span className={styles.itemTime}>{timeLabel}</span>
        {/* 未読の場合だけ青い点を表示します */}
        {!notification.isRead && <span className={styles.unreadDot} aria-label="未読" />}
      </span>
    </button>
  );
}

/**
 * 通知が0件のときや、エラー時に表示する「空状態」の部品です。
 * actionLabel と onAction を渡すと、再試行などのボタンも表示できます。
 */
function NotificationEmptyState({ title, body, actionLabel, onAction }) {
  return (
    <section className={styles.emptyState}>
      <MegaphoneIcon className={styles.emptyIcon} />
      <h2>{title}</h2>
      {/* 本文は指定があるときだけ表示します */}
      {body && <p>{body}</p>}
      {/* ボタンはラベルと処理の両方が揃っているときだけ表示します */}
      {actionLabel && onAction && (
        <button type="button" className={styles.secondaryButton} onClick={onAction}>{actionLabel}</button>
      )}
    </section>
  );
}

/**
 * 読み込み中に表示する仮の行(スケルトン)です。
 * 実データの代わりに灰色の枠を3行表示し、レイアウトのガタつきを防ぎます。
 */
function NotificationSkeleton() {
  return (
    // aria-live="polite" で、読み込み中であることを支援技術へ控えめに伝えます。
    <div className={styles.skeletonList} aria-live="polite" aria-label="通知を読み込み中">
      {[0, 1, 2].map((item) => (
        <div key={item} className={styles.skeletonRow}>
          <span />
          <div><b /><small /></div>
        </div>
      ))}
    </div>
  );
}

// 一覧画面から使う部品をまとめてエクスポートします。
export {
  CategoryIcon,
  NotificationEmptyState,
  NotificationItem,
  NotificationSkeleton,
  NotificationTabs,
};
