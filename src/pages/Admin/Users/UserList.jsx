import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import AdminLayout from '../../../components/Admin/AdminLayout';
import { SearchBar, Badge, Avatar, Pagination, EmptyState } from '../../../components/Admin/ui/Ui';
import Modal from '../../../components/Modal/Modal';
import { fetchUsers } from '../../../services/admin';
import styles from './Users.module.css';

const SORT_OPTIONS = [
    { key: 'registeredAt', label: '登録日' },
    { key: 'lastLoginAt', label: '最終ログイン' },
    { key: 'cottageManager', label: 'コテージ管理者' },
    { key: 'nonCottageManager', label: '一般ユーザー' },
];

const DEFAULT_SORT_KEY = 'registeredAt';

const isSortKey = (key) => SORT_OPTIONS.some((option) => option.key === key);

const toTime = (value) => {
    if (!value || value === '-') return 0;
    return new Date(value.replace(/\//g, '-')).getTime() || 0;
};

const isCottageManager = (user) => (
    user.name?.includes('コテージ')
    || user.email?.includes('cottage.manager')
    || user.bio?.includes('コテージ')
);

export default function UserList() {
    const [searchParams, setSearchParams] = useSearchParams();
    const [query, setQuery] = useState('');
    const [page, setPage] = useState(1);
    const [result, setResult] = useState(null);
    const [isSortOpen, setIsSortOpen] = useState(false);
    const sortParam = searchParams.get('sort');
    const sortKey = isSortKey(sortParam) ? sortParam : DEFAULT_SORT_KEY;

    useEffect(() => {
        fetchUsers({ query, page, sort: sortKey }).then(setResult);
    }, [query, page, sortKey]);

    const users = useMemo(() => {
        const items = sortKey === 'cottageManager'
            ? (result?.items || []).filter(isCottageManager)
            : sortKey === 'nonCottageManager'
            ? (result?.items || []).filter((user) => !isCottageManager(user))
            : [...(result?.items || [])];

        return items.sort((a, b) => {
            if (sortKey === 'registeredAt') {
                return toTime(b.registeredAt) - toTime(a.registeredAt);
            }
            if (sortKey === 'lastLoginAt') {
                return toTime(b.lastLoginAt) - toTime(a.lastLoginAt);
            }
            if (sortKey === 'cottageManager' || sortKey === 'nonCottageManager') {
                return a.name.localeCompare(b.name, 'ja');
            }
            return 0;
        });
    }, [result?.items, sortKey]);

    const activeSortLabel = SORT_OPTIONS.find((option) => option.key === sortKey)?.label;

    const selectSort = (key) => {
        const next = new URLSearchParams(searchParams);
        next.set('sort', key);
        setSearchParams(next, { replace: true });
        setPage(1);
        setIsSortOpen(false);
    };

    return (
        <AdminLayout title="ユーザー一覧">
            <SearchBar
                value={query}
                onChange={(v) => { setQuery(v); setPage(1); }}
                placeholder="ユーザー名・メールで検索"
                onFilter={() => setIsSortOpen(true)}
            />
            {result && (
                <p className={styles.total}>
                    {['cottageManager', 'nonCottageManager'].includes(sortKey) ? `表示 ${users.length.toLocaleString()}人` : `全体 ${result.total.toLocaleString()}人`}・{activeSortLabel}
                </p>
            )}
            <div className={styles.list}>
                {users.map((u) => (
                    <Link key={u.id} to={`/admin/users/${u.id}`} className={styles.row}>
                        <Avatar name={u.name} />
                        <div className={styles.rowBody}>
                            <div className={styles.rowName}>{u.name}</div>
                            <div className={styles.rowSub}>{u.email}</div>
                        </div>
                        <Badge label={u.status} />
                    </Link>
                ))}
                {result && users.length === 0 && <EmptyState message="該当するユーザーがいません" />}
            </div>
            {result && <Pagination page={result.page} totalPages={result.totalPages} onChange={setPage} />}
            <Modal isOpen={isSortOpen} onClose={() => setIsSortOpen(false)}>
                <div className={styles.sortModal}>
                    <div className={styles.sortHeader}>
                        <h2>並び替え</h2>
                        <button type="button" className={styles.sortClose} onClick={() => setIsSortOpen(false)} aria-label="閉じる">
                            ×
                        </button>
                    </div>
                    <div className={styles.sortOptions}>
                        {SORT_OPTIONS.map((option) => (
                            <button
                                key={option.key}
                                type="button"
                                className={`${styles.sortOption} ${sortKey === option.key ? styles.sortOptionActive : ''}`}
                                onClick={() => selectSort(option.key)}
                            >
                                <span>{option.label}</span>
                                {sortKey === option.key && <span className={styles.sortCheck}>✓</span>}
                            </button>
                        ))}
                    </div>
                </div>
            </Modal>
        </AdminLayout>
    );
}
