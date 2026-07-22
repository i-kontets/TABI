/**
 * 管理者向け画面の表示と、管理 API から取得したデータの操作を担当します。
 *
 * 主な流れ:
 * 1. 必要な部品や API 関数を読み込む
 * 2. 画面表示やデータ取得に必要な値を準備する
 * 3. ユーザー操作や API の結果に合わせて表示を更新する
 *
 * 扱うデータ: 管理 API から取得した一覧や詳細データ、画面上の検索条件や入力値を主に扱います。
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import AdminLayout from '../../../components/Admin/AdminLayout';
import { Badge, EmptyState } from '../../../components/Admin/ui/Ui';
import { fetchSystemErrors } from '../../../services/admin';
import { useAdminRealtimeRefresh } from '../Realtime/useAdminRealtimeRefresh';
import styles from './SystemErrors.module.css';

const STATUS_OPTIONS = [
    { value: '', label: 'すべて' },
    { value: 'unresolved', label: '未対応' },
    { value: 'working', label: '対応中' },
    { value: 'resolved', label: '解決済み' },
];

const SEVERITY_OPTIONS = ['', 'critical', 'error', 'warning', 'info'];
const SOURCE_OPTIONS = ['', 'frontend', 'backend', 'auth', 'database', 'API', 'other'];
const PER_PAGE = 25;

/**
 * readPositiveInt は、このファイルの中心となる処理をまとめた関数です。
 * 画面から渡された値や API の結果を使い、次に表示する内容を決めます。
 */
function readPositiveInt(value, fallback) {
    const parsed = Number.parseInt(value, 10);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

/**
 * buildQueryParams は、このファイルの中心となる処理をまとめた関数です。
 * 画面から渡された値や API の結果を使い、次に表示する内容を決めます。
 */
function buildQueryParams(searchParams, overrides = {}) {
    const next = new URLSearchParams(searchParams);
    Object.entries(overrides).forEach(([key, value]) => {
        // ここで条件を確認し、状況に合う処理だけを実行します。
        if (value === undefined || value === null || value === '') {
            next.delete(key);
        } else {
            next.set(key, String(value));
        }
    });
    return next;
}

/**
 * visiblePages は、このファイルの中心となる処理をまとめた関数です。
 * 画面から渡された値や API の結果を使い、次に表示する内容を決めます。
 */
function visiblePages(currentPage, totalPages) {
    const pages = new Set([1, totalPages, currentPage - 1, currentPage, currentPage + 1]);
    // 条件に合うデータだけを残して、画面に出す内容を絞り込みます。
    return [...pages].filter((page) => page >= 1 && page <= totalPages).sort((a, b) => a - b);
}

/**
 * SystemErrors は、このファイルの中心となる処理をまとめた関数です。
 * 画面から渡された値や API の結果を使い、次に表示する内容を決めます。
 */
export default function SystemErrors() {
    const [searchParams, setSearchParams] = useSearchParams();
    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const [result, setResult] = useState(null);
    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const [isLoading, setIsLoading] = useState(true);
    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const [errorMessage, setErrorMessage] = useState('');
    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const [openedId, setOpenedId] = useState('');
    const queryString = searchParams.toString();

    const filters = useMemo(() => {
        const params = new URLSearchParams(queryString);
        return {
            page: readPositiveInt(params.get('page'), 1),
            status: params.get('status') || '',
            severity: params.get('severity') || '',
            source: params.get('source') || '',
            keyword: params.get('keyword') || '',
            start_date: params.get('start_date') || '',
            end_date: params.get('end_date') || '',
        };
    }, [queryString]);

    const loadErrors = useCallback(() => {
        setIsLoading(true);
        setErrorMessage('');

        // 一覧は件数が増えるため、Reactで全件を持たずAPIへページ番号と検索条件を渡します。
        fetchSystemErrors({ ...filters, limit: PER_PAGE })
            // API などの非同期処理が終わった後に、受け取った結果を次の処理へ渡します。
            .then((nextResult) => {
                setResult(nextResult);
                // ここで条件を確認し、状況に合う処理だけを実行します。
                if (nextResult.page !== filters.page) {
                    setSearchParams(buildQueryParams(new URLSearchParams(queryString), { page: nextResult.page }), { replace: true });
                }
            })
            .catch(() => setErrorMessage('システムエラーの取得に失敗しました。'))
            .finally(() => setIsLoading(false));
    }, [filters, queryString, setSearchParams]);

    // 画面が表示された直後や監視している値が変わった時に、必要なデータ取得や初期設定を行います。
    useEffect(() => {
        loadErrors();
    }, [loadErrors]);

    useAdminRealtimeRefresh(['admin:system_error_created', 'admin:system_error_resolved'], loadErrors);

    // updateFilter は、画面操作や API 結果に合わせて必要な処理をまとめた関数です。
    const updateFilter = (key, value) => {
        // 検索条件を変えたときは、古いページ番号だと0件になりやすいので1ページ目へ戻します。
        setSearchParams(buildQueryParams(new URLSearchParams(queryString), { [key]: value, page: 1 }));
    };

    // changePage は、画面操作や API 結果に合わせて必要な処理をまとめた関数です。
    const changePage = (page) => {
        setSearchParams(buildQueryParams(new URLSearchParams(queryString), { page }));
    };

    const totalPages = result?.totalPages || 1;
    const currentPage = result?.page || filters.page;
    const pages = visiblePages(currentPage, totalPages);

    return (
        <AdminLayout title="システムエラー管理" back backTo="/admin/settings">
            <div className={styles.headerRow}>
                <div>
                    <p className={styles.lead}>システムエラーを検索・絞り込みしながら確認できます。</p>
                    <p className={styles.countText}>
                        総件数 {result?.total ?? 0} 件 / {currentPage} / {totalPages}ページ / 1ページ {result?.limit ?? PER_PAGE} 件
                    </p>
                </div>
                <div className={styles.headerActions}>
                    <Link to="/admin/settings" className={styles.outlineLink}>設定へ戻る</Link>
                    <button type="button" className={styles.reloadButton} onClick={loadErrors} disabled={isLoading}>
                        更新
                    </button>
                </div>
            </div>

            <section className={styles.filterPanel}>
                <label className={styles.searchField}>
                    <span>キーワード</span>
                    <input
                        type="search"
                        value={filters.keyword}
                        placeholder="コード・タイトル・場所で検索"
                        onChange={(event) => updateFilter('keyword', event.target.value)}
                    />
                </label>
                <label>
                    <span>対応状態</span>
                    <select value={filters.status} onChange={(event) => updateFilter('status', event.target.value)}>
                        {STATUS_OPTIONS.map((option) => (
                            <option key={option.value || 'all'} value={option.value}>{option.label}</option>
                        ))}
                    </select>
                </label>
                <label>
                    <span>重要度</span>
                    <select value={filters.severity} onChange={(event) => updateFilter('severity', event.target.value)}>
                        {SEVERITY_OPTIONS.map((value) => (
                            <option key={value || 'all'} value={value}>{value || 'すべて'}</option>
                        ))}
                    </select>
                </label>
                <label>
                    <span>発生元</span>
                    <select value={filters.source} onChange={(event) => updateFilter('source', event.target.value)}>
                        {SOURCE_OPTIONS.map((value) => (
                            <option key={value || 'all'} value={value}>{value === '' ? 'すべて' : value === 'other' ? 'その他' : value}</option>
                        ))}
                    </select>
                </label>
                <label>
                    <span>開始日</span>
                    <input type="date" value={filters.start_date} onChange={(event) => updateFilter('start_date', event.target.value)} />
                </label>
                <label>
                    <span>終了日</span>
                    <input type="date" value={filters.end_date} onChange={(event) => updateFilter('end_date', event.target.value)} />
                </label>
            </section>

            {isLoading && <p className={styles.stateText}>読み込み中です。</p>}
            {!isLoading && errorMessage && <p className={styles.errorText}>{errorMessage}</p>}
            {!isLoading && !errorMessage && result?.items.length === 0 && <EmptyState message="条件に一致するシステムエラーはありません" />}

            {!isLoading && !errorMessage && result?.items.length > 0 && (
                <div className={styles.list}>
                    {result.items.map((item) => {
                        const isOpen = openedId === item.id;
                        return (
                            <article key={item.id} className={styles.item}>
                                <div className={styles.itemHead}>
                                    <div className={styles.meta}>
                                        <Badge label={item.status} />
                                        <span className={styles.level}>{item.level}</span>
                                        <span>{item.source}</span>
                                        <span>最終 {item.lastOccurredAt || item.occurredAt}</span>
                                        {item.occurrenceCount > 1 && <span>{item.occurrenceCount}回</span>}
                                    </div>
                                    <button type="button" className={styles.detailButton} onClick={() => setOpenedId(isOpen ? '' : item.id)}>
                                        {isOpen ? '閉じる' : '詳細'}
                                    </button>
                                </div>
                                <h2 className={styles.title}>{item.message}</h2>
                                <dl className={styles.summaryGrid}>
                                    <div><dt>コード</dt><dd>{item.errorCode || '-'}</dd></div>
                                    <div><dt>種類</dt><dd>{item.errorType || '-'}</dd></div>
                                    <div><dt>初回発生</dt><dd>{item.firstOccurredAt || '-'}</dd></div>
                                    <div><dt>最終検出</dt><dd>{item.lastOccurredAt || item.occurredAt || '-'}</dd></div>
                                    <div><dt>解消日時</dt><dd>{item.resolvedAt || '-'}</dd></div>
                                    <div><dt>場所</dt><dd>{item.pagePath || item.url || '-'}</dd></div>
                                </dl>
                                {isOpen && (
                                    <div className={styles.detailPanel}>
                                        <dl className={styles.detailGrid}>
                                            <div><dt>HTTP</dt><dd>{item.httpStatus ?? '-'}</dd></div>
                                            <div><dt>API / URL</dt><dd>{item.url || '-'}</dd></div>
                                        </dl>
                                        {item.detail ? <pre>{item.detail}</pre> : <p className={styles.noDetail}>詳細情報はありません。</p>}
                                    </div>
                                )}
                            </article>
                        );
                    })}
                </div>
            )}

            {result && totalPages > 1 && (
                <nav className={styles.pagination} aria-label="システムエラーページ">
                    <button type="button" disabled={currentPage <= 1 || isLoading} onClick={() => changePage(currentPage - 1)}>
                        前へ
                    </button>
                    <div className={styles.pageButtons}>
                        {pages.map((page, index) => (
                            <span key={page} className={styles.pageButtonGroup}>
                                {index > 0 && page - pages[index - 1] > 1 && <span className={styles.dots}>…</span>}
                                <button
                                    type="button"
                                    className={page === currentPage ? styles.activePage : ''}
                                    disabled={isLoading}
                                    onClick={() => changePage(page)}
                                >
                                    {page}
                                </button>
                            </span>
                        ))}
                    </div>
                    <span className={styles.mobilePage}>{currentPage} / {totalPages}ページ</span>
                    <button type="button" disabled={currentPage >= totalPages || isLoading} onClick={() => changePage(currentPage + 1)}>
                        次へ
                    </button>
                </nav>
            )}
        </AdminLayout>
    );
}
