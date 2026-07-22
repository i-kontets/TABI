import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import notificationMockData from '../../data/notificationMockData';
import { CategoryIcon, NotificationEmptyState } from './NotificationComponents';
import { formatNotificationDateTime, getNotificationAction } from './notificationUtils';
import styles from './Notifications.module.css';

function BackIcon({ className }) {
  return <svg className={className} viewBox="0 0 24 24" aria-hidden="true"><path d="m15 5-7 7 7 7" /></svg>;
}

function ArrowIcon({ className }) {
  return <svg className={className} viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></svg>;
}

function ResultCard({ detailData }) {
  if (!detailData?.results?.length) return null;

  return (
    <section className={styles.detailInfoCard}>
      <h2>{detailData.heading}</h2>
      <div className={styles.resultList}>
        {detailData.results.map((result) => (
          <div key={result.rank} className={styles.resultRow}>
            <strong className={styles.resultRank}>{result.rank}</strong>
            <img src={result.image} alt="" className={styles.resultImage} />
            <span className={styles.resultBody}>
              <span className={styles.resultTitle}>{result.title}</span>
              <span className={styles.resultBarWrap}>
                <span className={styles.resultBar} style={{ width: `${result.percent}%` }} />
              </span>
            </span>
            <span className={styles.resultVotes}>{result.votes}票（{result.percent}%）</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function TextInfoCard({ detailData }) {
  if (!detailData?.infoTitle && !detailData?.infoBody) return null;

  return (
    <section className={styles.detailInfoCard}>
      {detailData.infoTitle && <h2>{detailData.infoTitle}</h2>}
      {detailData.infoBody && <p>{detailData.infoBody}</p>}
    </section>
  );
}

export default function NotificationDetailPage() {
  const navigate = useNavigate();
  const { notificationId } = useParams();
  const [notice, setNotice] = useState('');
  const notification = useMemo(
    () => notificationMockData.find((item) => String(item.id) === String(notificationId)),
    [notificationId],
  );

  if (!notification) {
    return (
      <div className={styles.page}>
        <header className={styles.header}>
          <button type="button" className={styles.headerIconButton} onClick={() => navigate('/notifications')} aria-label="戻る">
            <BackIcon className={styles.headerIcon} />
          </button>
          <h1 className={styles.headerTitle}>通知詳細</h1>
          <span className={styles.headerSpacer} />
        </header>
        <main className={styles.content}>
          <NotificationEmptyState title="通知が見つかりません" body="一覧から通知を選び直してください。" actionLabel="通知一覧に戻る" onAction={() => navigate('/notifications')} />
        </main>
      </div>
    );
  }

  const detailData = notification.detailData || {};
  const actionLabel = detailData.actionLabel || '関連ページを確認する';
  const actionPath = detailData.actionPath || notification.actionPath;

  const handleAction = () => {
    const action = getNotificationAction({ ...notification, actionPath });

    if (actionPath && actionPath !== `/notifications/${notification.id}`) {
      navigate(actionPath);
      return;
    }

    if (action.type === 'route') {
      navigate(action.path);
      return;
    }

    setNotice('関連ページは今後接続予定です。');
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <button type="button" className={styles.headerIconButton} onClick={() => navigate('/notifications')} aria-label="戻る">
          <BackIcon className={styles.headerIcon} />
        </button>
        <h1 className={styles.headerTitle}>通知詳細</h1>
        <span className={styles.headerSpacer} />
      </header>

      <main className={styles.content}>
        <section className={styles.detailHero}>
          <CategoryIcon category={notification.category} />
          <span className={styles.detailText}>
            <h2>{detailData.title || notification.title}</h2>
            <time dateTime={notification.createdAt}>{formatNotificationDateTime(notification.createdAt)}</time>
          </span>
        </section>

        <section className={styles.detailBodyCard}>
          <p>{detailData.body || notification.body}</p>
        </section>

        <ResultCard detailData={detailData} />
        <TextInfoCard detailData={detailData} />

        <button type="button" className={styles.primaryButton} onClick={handleAction}>
          {actionLabel}
          <ArrowIcon className={styles.buttonIcon} />
        </button>
        <button type="button" className={styles.secondaryButton} onClick={() => navigate('/notifications')}>通知一覧に戻る</button>
        {notice && <p className={styles.inlineNotice} role="status">{notice}</p>}
      </main>
    </div>
  );
}
