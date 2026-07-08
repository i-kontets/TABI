import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import AdminLayout from '../../../components/Admin/AdminLayout';
import { SearchBar, Badge, Pagination, EmptyState, Button } from '../../../components/Admin/ui/Ui';
import Modal from '../../../components/Modal/Modal';
import { fetchSpots, prefectures } from '../../../services/admin';
import styles from './Spots.module.css';

const THUMB_COLORS = ['#8fb3f5', '#7fc9a8', '#e8c97f', '#b79fe0'];
const ALL_PREFECTURES = 'すべて';

export default function SpotList() {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const [query, setQuery] = useState('');
    const [page, setPage] = useState(1);
    const [result, setResult] = useState(null);
    const [isPrefectureOpen, setIsPrefectureOpen] = useState(false);
    const prefectureParam = searchParams.get('prefecture') || ALL_PREFECTURES;
    const activePrefecture = prefectures.includes(prefectureParam) ? prefectureParam : ALL_PREFECTURES;

    useEffect(() => {
        fetchSpots({
            query,
            page,
            prefecture: activePrefecture === ALL_PREFECTURES ? '' : activePrefecture,
        }).then(setResult);
    }, [activePrefecture, query, page]);

    const selectPrefecture = (prefecture) => {
        const next = new URLSearchParams(searchParams);
        if (prefecture === ALL_PREFECTURES) {
            next.delete('prefecture');
        } else {
            next.set('prefecture', prefecture);
        }
        setSearchParams(next, { replace: true });
        setPage(1);
        setIsPrefectureOpen(false);
    };

    return (
        <AdminLayout
            title="スポット一覧"
            back
            headerRight={<Button variant="primary" onClick={() => navigate('/admin/spots/new')}>+ 追加</Button>}
        >
            <SearchBar
                value={query}
                onChange={(v) => { setQuery(v); setPage(1); }}
                placeholder="スポット名で検索"
                onFilter={() => setIsPrefectureOpen(true)}
            />
            {result && (
                <p className={styles.total}>
                    全体 {result.total.toLocaleString()}件・{activePrefecture}
                </p>
            )}
            <div className={styles.list}>
                {result?.items.map((s, i) => (
                    <Link key={s.id} to={`/admin/spots/${s.id}/edit`} className={styles.row}>
                        <div className={styles.thumb} style={{ background: THUMB_COLORS[i % THUMB_COLORS.length] }}>
                            {s.name.slice(0, 1)}
                        </div>
                        <div className={styles.rowBody}>
                            <div className={styles.rowTitle}>{s.name}({s.prefecture})</div>
                            <div className={styles.rowSub}>{s.category}</div>
                        </div>
                        <Badge label={s.status} />
                    </Link>
                ))}
                {result && result.items.length === 0 && <EmptyState message="該当するスポットがありません" />}
            </div>
            {result && <Pagination page={result.page} totalPages={result.totalPages} onChange={setPage} />}
            <Modal isOpen={isPrefectureOpen} onClose={() => setIsPrefectureOpen(false)}>
                <div className={styles.filterModal}>
                    <div className={styles.filterHeader}>
                        <h2>都道府県で絞り込み</h2>
                        <button type="button" className={styles.filterClose} onClick={() => setIsPrefectureOpen(false)} aria-label="閉じる">
                            ×
                        </button>
                    </div>
                    <div className={styles.prefectureGrid}>
                        {[ALL_PREFECTURES, ...prefectures].map((prefecture) => (
                            <button
                                key={prefecture}
                                type="button"
                                className={`${styles.prefectureOption} ${activePrefecture === prefecture ? styles.prefectureOptionActive : ''}`}
                                onClick={() => selectPrefecture(prefecture)}
                            >
                                {prefecture}
                            </button>
                        ))}
                    </div>
                </div>
            </Modal>
        </AdminLayout>
    );
}
