import { useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { CategoryIcon, NotificationEmptyState } from './NotificationComponents';
import { formatNotificationDateTime, getNotificationAction, normalizeInternalActionPath, normalizeNotification } from './notificationUtils';
import styles from './Notifications.module.css';

const TEXT = {
  back: '\u623b\u308b',
  detailTitle: '\u901a\u77e5\u8a73\u7d30',
  notFoundTitle: '\u901a\u77e5\u304c\u898b\u3064\u304b\u308a\u307e\u305b\u3093',
  notFoundBody: '\u4e00\u89a7\u304b\u3089\u901a\u77e5\u3092\u9078\u3073\u76f4\u3057\u3066\u304f\u3060\u3055\u3044\u3002',
  backToList: '\u901a\u77e5\u4e00\u89a7\u306b\u623b\u308b',
  actionLabel: '\u95a2\u9023\u30da\u30fc\u30b8\u3092\u78ba\u8a8d\u3059\u308b',
  routeNotice: '\u95a2\u9023\u30da\u30fc\u30b8\u306f\u73fe\u5728\u958b\u3051\u307e\u305b\u3093\u3002\u901a\u77e5\u5185\u5bb9\u3092\u78ba\u8a8d\u3057\u3066\u304f\u3060\u3055\u3044\u3002',
};

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
                <span className={styles.resultBar} style={{ width: String(result.percent) + '%' }} />
              </span>
            </span>
            <span className={styles.resultVotes}>{result.votes}{'\u7968\uff08'}{result.percent}{'%\uff09'}</span>
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
  const location = useLocation();
  const { notificationId } = useParams();
  const [notice, setNotice] = useState('');
  const notification = useMemo(() => {
    const stateNotification = location.state?.notification;
    if (!stateNotification) return null;
    const normalized = normalizeNotification(stateNotification);
    return String(normalized.id) === String(notificationId) ? normalized : null;
  }, [location.state, notificationId]);

  if (!notification) {
    return (
      <div className={styles.page}>
        <header className={styles.header}>
          <button type="button" className={styles.headerIconButton} onClick={() => navigate('/notifications')} aria-label={TEXT.back}>
            <BackIcon className={styles.headerIcon} />
          </button>
          <h1 className={styles.headerTitle}>{TEXT.detailTitle}</h1>
          <span className={styles.headerSpacer} />
        </header>
        <main className={styles.content}>
          <NotificationEmptyState title={TEXT.notFoundTitle} body={TEXT.notFoundBody} actionLabel={TEXT.backToList} onAction={() => navigate('/notifications')} />
        </main>
      </div>
    );
  }

  const detailData = notification.detailData || {};
  const actionLabel = detailData.actionLabel || TEXT.actionLabel;
  const actionPath = detailData.actionPath || notification.actionPath;

  const handleAction = () => {
    const internalPath = normalizeInternalActionPath(actionPath);
    const action = getNotificationAction({ ...notification, actionPath });

    if (internalPath && internalPath !== '/notifications/' + notification.id) {
      navigate(internalPath);
      return;
    }

    if (action.type === 'route') {
      navigate(action.path);
      return;
    }

    setNotice(TEXT.routeNotice);
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <button type="button" className={styles.headerIconButton} onClick={() => navigate('/notifications')} aria-label={TEXT.back}>
          <BackIcon className={styles.headerIcon} />
        </button>
        <h1 className={styles.headerTitle}>{TEXT.detailTitle}</h1>
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

        {actionPath && (
          <button type="button" className={styles.primaryButton} onClick={handleAction}>
            {actionLabel}
            <ArrowIcon className={styles.buttonIcon} />
          </button>
        )}
        <button type="button" className={styles.secondaryButton} onClick={() => navigate('/notifications')}>{TEXT.backToList}</button>
        {notice && <p className={styles.inlineNotice} role="status">{notice}</p>}
      </main>
    </div>
  );
}