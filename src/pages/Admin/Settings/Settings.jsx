import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AdminLayout from '../../../components/Admin/AdminLayout';
import { fetchSystemErrors } from '../../../services/admin';
import { useAdminRealtimeRefresh } from '../Realtime/useAdminRealtimeRefresh';
import styles from './Settings.module.css';

const MENU = [
    { to: '/admin/notices', label: 'お知らせ管理', desc: '運営からのお知らせ作成・配信管理' },
    { to: '/admin/spots', label: 'スポット管理', desc: 'スポット・カテゴリ等のマスターデータ' },
    { to: '/admin/analytics', label: '分析・利用状況', desc: 'ユーザー数やアクティブ数の統計' },
    { to: '/admin/managers', label: '管理者・権限管理', desc: '管理者アカウントと権限ロール' },
    { to: '/admin/logs', label: '操作ログ(監査ログ)', desc: '管理画面の操作履歴を確認' },
];

export default function Settings() {
    const [systemErrors, setSystemErrors] = useState([]);
    const [isLoadingErrors, setIsLoadingErrors] = useState(true);
    const [errorMessage, setErrorMessage] = useState('');

    const loadSystemErrors = useCallback(() => {
        setIsLoadingErrors(true);
        setErrorMessage('');

        // 設定タブで最近の未対応エラーを確認できるように、管理APIから最新10件を取得します。
        fetchSystemErrors()
            .then(setSystemErrors)
            .catch(() => setErrorMessage('システムエラーの取得に失敗しました。'))
            .finally(() => setIsLoadingErrors(false));
    }, []);

    useEffect(() => {
        loadSystemErrors();
    }, [loadSystemErrors]);

    useAdminRealtimeRefresh(['admin:system_error_created'], loadSystemErrors);

    return (
        <AdminLayout title="設定">
            <div className={styles.list}>
                {MENU.map((m) => (
                    <Link key={m.to} to={m.to} className={styles.row}>
                        <div className={styles.rowBody}>
                            <div className={styles.rowTitle}>{m.label}</div>
                            <div className={styles.rowSub}>{m.desc}</div>
                        </div>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                            <path d="m9 6 6 6-6 6" stroke="#8a94a6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </Link>
                ))}
            </div>

            <section className={styles.errorPanel}>
                <div className={styles.panelHeader}>
                    <div>
                        <h2 className={styles.panelTitle}>最近のシステムエラー</h2>
                        <p className={styles.panelLead}>未対応の最新10件を表示しています。</p>
                    </div>
                    <button type="button" className={styles.reloadButton} onClick={loadSystemErrors}>
                        更新
                    </button>
                </div>

                {isLoadingErrors && <p className={styles.emptyText}>読み込み中です。</p>}
                {!isLoadingErrors && errorMessage && <p className={styles.errorText}>{errorMessage}</p>}
                {!isLoadingErrors && !errorMessage && systemErrors.length === 0 && (
                    <p className={styles.emptyText}>未対応のシステムエラーはありません。</p>
                )}

                {!isLoadingErrors && !errorMessage && systemErrors.length > 0 && (
                    <div className={styles.errorList}>
                        {systemErrors.map((item) => (
                            <article key={item.id} className={styles.errorItem}>
                                <div className={styles.errorMeta}>
                                    <span className={styles.levelBadge}>{item.level}</span>
                                    <span>{item.source}</span>
                                    <span>{item.occurredAt}</span>
                                    {item.occurrenceCount > 1 && <span>{item.occurrenceCount}回</span>}
                                </div>
                                <h3 className={styles.errorTitle}>{item.message}</h3>
                                <div className={styles.errorGrid}>
                                    {item.errorCode && (
                                        <p><span>コード</span>{item.errorCode}</p>
                                    )}
                                    {item.errorType && (
                                        <p><span>種類</span>{item.errorType}</p>
                                    )}
                                    {item.httpStatus !== null && (
                                        <p><span>HTTP</span>{item.httpStatus}</p>
                                    )}
                                    {(item.pagePath || item.url) && (
                                        <p><span>場所</span>{item.pagePath || item.url}</p>
                                    )}
                                </div>
                                {item.detail && (
                                    <pre className={styles.detailBox}>{item.detail}</pre>
                                )}
                            </article>
                        ))}
                    </div>
                )}
            </section>
        </AdminLayout>
    );
}
