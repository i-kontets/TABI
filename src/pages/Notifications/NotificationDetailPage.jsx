/**
 * 通知1件の詳細を表示する画面です(主にシステム通知・お知らせ用)。
 *
 * 主な流れ:
 * 1. 一覧画面から遷移時に渡された通知データ(location.state)を受け取り検証する
 * 2. タイトル・本文・受信日時・投票結果などの詳細情報をカード形式で表示する
 * 3. 「関連ページを確認する」ボタンで、安全と確認できたページへだけ遷移する
 *
 * 扱うデータ: 通知1件分のオブジェクト(detailData に投票結果や補足情報を含むことがある)。
 */
import { useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { CategoryIcon, NotificationEmptyState } from './NotificationComponents';
import { formatNotificationDateTime, getNotificationAction, normalizeInternalActionPath, normalizeNotification } from './notificationUtils';
import styles from './Notifications.module.css';

// 画面で使う文言をまとめた定数です(変更やレビューをしやすくするため)。
const TEXT = {
  back: '戻る',
  detailTitle: '通知詳細',
  notFoundTitle: '通知が見つかりません',
  notFoundBody: '一覧から通知を選び直してください。',
  backToList: '通知一覧に戻る',
  actionLabel: '関連ページを確認する',
  routeNotice: '関連ページは現在開けません。通知内容を確認してください。',
};

/** ヘッダーの「戻る」ボタン用の矢印アイコンです。 */
function BackIcon({ className }) {
  return <svg className={className} viewBox="0 0 24 24" aria-hidden="true"><path d="m15 5-7 7 7 7" /></svg>;
}

/** 遷移ボタン用の右向き矢印アイコンです。 */
function ArrowIcon({ className }) {
  return <svg className={className} viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></svg>;
}

/**
 * アンケートの投票結果(順位・画像・得票率のバー)を表示するカードです。
 * detailData.results が無い通知では何も表示しません。
 */
function ResultCard({ detailData }) {
  // 結果データが無ければカード自体を表示しません。
  if (!detailData?.results?.length) return null;

  return (
    <section className={styles.detailInfoCard}>
      <h2>{detailData.heading}</h2>
      <div className={styles.resultList}>
        {detailData.results.map((result) => (
          <div key={result.rank} className={styles.resultRow}>
            {/* 順位の数字 */}
            <strong className={styles.resultRank}>{result.rank}</strong>
            {/* 候補の画像(装飾のため alt は空にしています) */}
            <img src={result.image} alt="" className={styles.resultImage} />
            <span className={styles.resultBody}>
              <span className={styles.resultTitle}>{result.title}</span>
              {/* 得票率をバーの横幅(%)で視覚化します */}
              <span className={styles.resultBarWrap}>
                <span className={styles.resultBar} style={{ width: String(result.percent) + '%' }} />
              </span>
            </span>
            {/* 「◯票(◯%)」の表示 */}
            <span className={styles.resultVotes}>{result.votes}{'票（'}{result.percent}{'%）'}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

/**
 * 補足情報(見出しと本文のテキスト)を表示するカードです。
 * infoTitle / infoBody のどちらも無い通知では何も表示しません。
 */
function TextInfoCard({ detailData }) {
  if (!detailData?.infoTitle && !detailData?.infoBody) return null;

  return (
    <section className={styles.detailInfoCard}>
      {detailData.infoTitle && <h2>{detailData.infoTitle}</h2>}
      {detailData.infoBody && <p>{detailData.infoBody}</p>}
    </section>
  );
}

/**
 * 通知詳細画面の本体コンポーネントです。
 */
export default function NotificationDetailPage() {
  // 画面遷移用の関数と、現在のURL情報・URL内の通知IDを取得します。
  const navigate = useNavigate();
  const location = useLocation();
  const { notificationId } = useParams();
  // 「関連ページを開けない」ときに表示するメッセージ用の state です。
  const [notice, setNotice] = useState('');

  // 一覧画面から遷移時に渡された通知データを取り出して検証します。
  // useMemo で、依存値が変わらない限り再計算を省きます。
  const notification = useMemo(() => {
    const stateNotification = location.state?.notification;
    // データが渡されていない場合(URL直打ちやリロード)は null になります。
    if (!stateNotification) return null;
    // キー名の揺れを吸収して統一形式にします。
    const normalized = normalizeNotification(stateNotification);
    // URLのIDと通知データのIDが一致することを確認します(別の通知の誤表示防止)。
    return String(normalized.id) === String(notificationId) ? normalized : null;
  }, [location.state, notificationId]);

  // 通知データが取得できなかった場合は「見つかりません」画面を表示します。
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
          {/* 一覧へ戻るボタン付きの空状態を表示します */}
          <NotificationEmptyState title={TEXT.notFoundTitle} body={TEXT.notFoundBody} actionLabel={TEXT.backToList} onAction={() => navigate('/notifications')} />
        </main>
      </div>
    );
  }

  // 詳細データ(無い場合は空オブジェクト)と、遷移ボタンの文言・遷移先を準備します。
  const detailData = notification.detailData || {};
  const actionLabel = detailData.actionLabel || TEXT.actionLabel;
  // 遷移先は detailData 側を優先し、無ければ通知本体の actionPath を使います。
  const actionPath = detailData.actionPath || notification.actionPath;

  /**
   * 「関連ページを確認する」ボタンを押したときの処理です。
   * 安全と確認できたパスにだけ遷移し、それ以外はメッセージを表示します。
   */
  const handleAction = () => {
    // パスを検証し、安全なアプリ内パスへ変換します(危険なら null)。
    const internalPath = normalizeInternalActionPath(actionPath);
    const action = getNotificationAction({ ...notification, actionPath });

    // 有効なパスがあり、かつ自分自身(この詳細画面)以外なら遷移します。
    if (internalPath && internalPath !== '/notifications/' + notification.id) {
      navigate(internalPath);
      return;
    }

    // getNotificationAction が遷移可能と判断した場合も遷移します。
    if (action.type === 'route') {
      navigate(action.path);
      return;
    }

    // 遷移できない場合は、画面内にメッセージを表示します。
    setNotice(TEXT.routeNotice);
  };

  return (
    <div className={styles.page}>
      {/* ===== ヘッダー(戻るボタン+タイトル) ===== */}
      <header className={styles.header}>
        <button type="button" className={styles.headerIconButton} onClick={() => navigate('/notifications')} aria-label={TEXT.back}>
          <BackIcon className={styles.headerIcon} />
        </button>
        <h1 className={styles.headerTitle}>{TEXT.detailTitle}</h1>
        {/* タイトルを中央に保つための右側の余白要素です */}
        <span className={styles.headerSpacer} />
      </header>

      <main className={styles.content}>
        {/* ===== 通知の概要(アイコン・タイトル・受信日時) ===== */}
        <section className={styles.detailHero}>
          <CategoryIcon category={notification.category} />
          <span className={styles.detailText}>
            {/* detailData にタイトルがあれば優先して表示します */}
            <h2>{detailData.title || notification.title}</h2>
            <time dateTime={notification.createdAt}>{formatNotificationDateTime(notification.createdAt)}</time>
          </span>
        </section>

        {/* ===== 通知の本文 ===== */}
        <section className={styles.detailBodyCard}>
          <p>{detailData.body || notification.body}</p>
        </section>

        {/* ===== 追加情報カード(あるときだけ表示されます) ===== */}
        <ResultCard detailData={detailData} />
        <TextInfoCard detailData={detailData} />

        {/* 遷移先がある通知だけ「関連ページを確認する」ボタンを表示します */}
        {actionPath && (
          <button type="button" className={styles.primaryButton} onClick={handleAction}>
            {actionLabel}
            <ArrowIcon className={styles.buttonIcon} />
          </button>
        )}
        {/* 一覧へ戻るボタン */}
        <button type="button" className={styles.secondaryButton} onClick={() => navigate('/notifications')}>{TEXT.backToList}</button>
        {/* 遷移できなかったときのメッセージ(role="status" で読み上げにも対応) */}
        {notice && <p className={styles.inlineNotice} role="status">{notice}</p>}
      </main>
    </div>
  );
}
