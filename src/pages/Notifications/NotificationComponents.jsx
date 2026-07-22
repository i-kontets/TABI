import styles from './Notifications.module.css';
import { getNotificationCategoryMeta } from './notificationUtils';

function ChatIcon({ className }) {
  return <svg className={className} viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5h14v10H8l-3 3V5Z" /><path d="M9 10h6" /></svg>;
}

function CalendarIcon({ className }) {
  return <svg className={className} viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5h14v15H5V5Z" /><path d="M8 3v4M16 3v4M5 10h14" /></svg>;
}

function ChartIcon({ className }) {
  return <svg className={className} viewBox="0 0 24 24" aria-hidden="true"><path d="M5 19V9" /><path d="M12 19V5" /><path d="M19 19v-7" /><path d="M3 19h18" /></svg>;
}

function GroupIcon({ className }) {
  return <svg className={className} viewBox="0 0 24 24" aria-hidden="true"><path d="M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" /><path d="M3.5 20a5.5 5.5 0 0 1 11 0" /><path d="M17 11a2.5 2.5 0 1 0 0-5" /><path d="M16 15.5A5 5 0 0 1 20.5 20" /></svg>;
}

function WalletIcon({ className }) {
  return <svg className={className} viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16v12H4V7Z" /><path d="M16 12h4v4h-4a2 2 0 0 1 0-4Z" /><path d="M6 7V5h10v2" /></svg>;
}

function MegaphoneIcon({ className }) {
  return <svg className={className} viewBox="0 0 24 24" aria-hidden="true"><path d="M4 13h3l9 4V7l-9 4H4v2Z" /><path d="M7 13l1.5 6" /><path d="M19 10.5v3" /></svg>;
}

function CategoryIcon({ category }) {
  const meta = getNotificationCategoryMeta(category);
  const className = styles.categoryIconSvg;
  const iconMap = {
    chat: ChatIcon,
    schedule: CalendarIcon,
    survey: ChartIcon,
    member: GroupIcon,
    split_bill: WalletIcon,
    system: MegaphoneIcon,
  };
  const Icon = iconMap[category] || MegaphoneIcon;

  return (
    <span className={[styles.categoryIcon, styles['tone_' + meta.tone]].join(' ')} aria-hidden="true">
      <Icon className={className} />
    </span>
  );
}

function NotificationTabs({ tabs, activeTab, onChange }) {
  return (
    <div className={styles.tabs} role="tablist" aria-label="\u901a\u77e5\u30ab\u30c6\u30b4\u30ea">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={activeTab === tab.id}
          className={[styles.tab, activeTab === tab.id ? styles.tabActive : ''].join(' ')}
          onClick={() => onChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

function NotificationItem({ notification, timeLabel, onOpen }) {
  return (
    <button type="button" className={styles.notificationItem} onClick={() => onOpen(notification)}>
      <CategoryIcon category={notification.category} />
      <span className={styles.itemBody}>
        <span className={styles.itemTitle}>{notification.title}</span>
        <span className={styles.itemText}>{notification.body}</span>
      </span>
      <span className={styles.itemMeta}>
        <span className={styles.itemTime}>{timeLabel}</span>
        {!notification.isRead && <span className={styles.unreadDot} aria-label="\u672a\u8aad" />}
      </span>
    </button>
  );
}

function NotificationEmptyState({ title, body, actionLabel, onAction }) {
  return (
    <section className={styles.emptyState}>
      <MegaphoneIcon className={styles.emptyIcon} />
      <h2>{title}</h2>
      {body && <p>{body}</p>}
      {actionLabel && onAction && (
        <button type="button" className={styles.secondaryButton} onClick={onAction}>{actionLabel}</button>
      )}
    </section>
  );
}

function NotificationSkeleton() {
  return (
    <div className={styles.skeletonList} aria-label="\u901a\u77e5\u3092\u8aad\u307f\u8fbc\u307f\u4e2d">
      {[0, 1, 2].map((item) => (
        <div key={item} className={styles.skeletonRow}>
          <span />
          <div><b /><small /></div>
        </div>
      ))}
    </div>
  );
}

export {
  CategoryIcon,
  NotificationEmptyState,
  NotificationItem,
  NotificationSkeleton,
  NotificationTabs,
};