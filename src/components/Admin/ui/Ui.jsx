import { useEffect, useRef, useState } from 'react';
import styles from './Ui.module.css';

/* ============ ステータスバッジ ============ */

const BADGE_TONES = {
    blue: styles.badgeBlue,
    red: styles.badgeRed,
    green: styles.badgeGreen,
    orange: styles.badgeOrange,
    gray: styles.badgeGray,
};

// ラベル → 色 の既定マッピング
const LABEL_TONE = {
    '通常': 'blue',
    '停止中': 'red',
    '退会済み': 'gray',
    '公開中': 'green',
    '非公開': 'gray',
    '準備中': 'orange',
    '未対応': 'red',
    '確認中': 'orange',
    '対応中': 'orange',
    '対応済み': 'green',
    '下書き': 'gray',
    '終了': 'gray',
    'オーナー': 'blue',
    '管理者': 'blue',
    'サポート': 'orange',
    '閲覧のみ': 'gray',
    'リーダー': 'blue',
    'メンバー': 'gray',
};

export function Badge({ label, tone }) {
    const cls = BADGE_TONES[tone || LABEL_TONE[label] || 'gray'];
    return <span className={`${styles.badge} ${cls}`}>{label}</span>;
}

/* ============ 検索バー + フィルターアイコン ============ */

export function SearchBar({ value, onChange, placeholder = '検索', onFilter }) {
    return (
        <div className={styles.searchRow}>
            <div className={styles.searchBox}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <circle cx="11" cy="11" r="6.5" stroke="#8a94a6" strokeWidth="2" />
                    <path d="m16.5 16.5 4 4" stroke="#8a94a6" strokeWidth="2" strokeLinecap="round" />
                </svg>
                <input
                    type="text"
                    value={value}
                    placeholder={placeholder}
                    onChange={(e) => onChange(e.target.value)}
                />
            </div>
            <button type="button" className={styles.filterBtn} onClick={onFilter} aria-label="フィルター">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path d="M4 6h16M7 12h10M10 18h4" stroke="#5b6472" strokeWidth="2" strokeLinecap="round" />
                </svg>
            </button>
        </div>
    );
}

/* ============ タブ ============ */

export function Tabs({ tabs, active, onChange }) {
    return (
        <div className={styles.tabs}>
            {tabs.map((t) => {
                const key = typeof t === 'string' ? t : t.key;
                const label = typeof t === 'string' ? t : t.label;
                return (
                    <button
                        key={key}
                        type="button"
                        className={`${styles.tab} ${active === key ? styles.tabActive : ''}`}
                        onClick={() => onChange(key)}
                    >
                        {label}
                    </button>
                );
            })}
        </div>
    );
}

/* ============ ページネーション ============ */

export function Pagination({ page, totalPages, onChange }) {
    if (totalPages <= 1) return null;
    const pages = [];
    for (let i = 1; i <= Math.min(totalPages, 5); i++) pages.push(i);

    return (
        <div className={styles.pagination}>
            <button type="button" disabled={page <= 1} onClick={() => onChange(page - 1)}>&lt;</button>
            {pages.map((p) => (
                <button
                    key={p}
                    type="button"
                    className={p === page ? styles.pageActive : ''}
                    onClick={() => onChange(p)}
                >
                    {p}
                </button>
            ))}
            {totalPages > 5 && <span className={styles.pageDots}>…</span>}
            {totalPages > 5 && (
                <button
                    type="button"
                    className={page === totalPages ? styles.pageActive : ''}
                    onClick={() => onChange(totalPages)}
                >
                    {totalPages}
                </button>
            )}
            <button type="button" disabled={page >= totalPages} onClick={() => onChange(page + 1)}>&gt;</button>
        </div>
    );
}

/* ============ アバター(イニシャル) ============ */

const AVATAR_COLORS = ['#5b8def', '#e88a4a', '#5bb98c', '#b06ad4', '#e05c7a', '#4aa8c9'];

export function Avatar({ name = '', size = 40 }) {
    const idx = [...name].reduce((a, c) => a + c.codePointAt(0), 0) % AVATAR_COLORS.length;
    return (
        <div
            className={styles.avatar}
            style={{ width: size, height: size, fontSize: size * 0.4, background: AVATAR_COLORS[idx] }}
        >
            {name.slice(0, 1)}
        </div>
    );
}

/* ============ 統計カード ============ */

export function StatCard({ label, value, unit, diff, warn }) {
    return (
        <div className={styles.statCard}>
            <div className={styles.statLabel}>{label}</div>
            <div className={styles.statValueRow}>
                <span className={`${styles.statValue} ${warn ? styles.statWarn : ''}`}>{value}</span>
                {unit && <span className={styles.statUnit}>{unit}</span>}
                {diff != null && (
                    <span className={`${styles.statDiff} ${diff >= 0 ? styles.diffUp : styles.diffDown}`}>
                        {diff >= 0 ? `+${diff}` : diff}
                    </span>
                )}
            </div>
        </div>
    );
}

/* ============ セクションカード ============ */

export function Card({ title, action, children, className = '' }) {
    return (
        <section className={`${styles.card} ${className}`}>
            {(title || action) && (
                <div className={styles.cardHead}>
                    {title && <h2 className={styles.cardTitle}>{title}</h2>}
                    {action}
                </div>
            )}
            {children}
        </section>
    );
}

/* ============ 詳細画面の行(ラベル + 値) ============ */

export function DetailRow({ label, children }) {
    return (
        <div className={styles.detailRow}>
            <span className={styles.detailLabel}>{label}</span>
            <span className={styles.detailValue}>{children}</span>
        </div>
    );
}

/* ============ ボタン ============ */

export function Button({ children, variant = 'primary', onClick, type = 'button', disabled, full }) {
    const cls = {
        primary: styles.btnPrimary,
        danger: styles.btnDanger,
        outline: styles.btnOutline,
        dangerOutline: styles.btnDangerOutline,
    }[variant];
    return (
        <button
            type={type}
            disabled={disabled}
            onClick={onClick}
            className={`${styles.btn} ${cls} ${full ? styles.btnFull : ''}`}
        >
            {children}
        </button>
    );
}

/* ============ 折れ線グラフ (SVG) ============ */

export function LineChart({ data, labels = [], height = 120, unit = '人' }) {
    const [activeIndex, setActiveIndex] = useState(null);
    const hideTimerRef = useRef(null);
    const w = 320;
    const h = height;
    const pad = 8;
    const values = data.length > 0 ? data : [0];
    const max = Math.max(...values, 1);
    const min = Math.min(...values, 0);
    const range = max - min || 1;
    const step = (w - pad * 2) / (values.length - 1 || 1);
    const points = values.map((v, i) => ({
        x: pad + i * step,
        y: pad + (h - pad * 2) * (1 - (v - min) / range),
        value: v,
        label: labels[i] || '',
    }));
    const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
    const activePoint = activeIndex == null ? null : points[activeIndex];

    useEffect(() => () => {
        if (hideTimerRef.current) {
            clearTimeout(hideTimerRef.current);
        }
    }, []);

    const showNearestPoint = (event, keepVisible = false) => {
        const svg = event.currentTarget;
        const rect = svg.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / rect.width) * w;
        const nearest = points.reduce((best, point, index) => {
            const distance = Math.abs(point.x - x);
            return distance < best.distance ? { index, distance } : best;
        }, { index: 0, distance: Infinity });

        setActiveIndex(nearest.index);

        if (hideTimerRef.current) {
            clearTimeout(hideTimerRef.current);
            hideTimerRef.current = null;
        }

        if (keepVisible) {
            hideTimerRef.current = setTimeout(() => {
                setActiveIndex(null);
                hideTimerRef.current = null;
            }, 10000);
        }
    };

    const handlePointerMove = (event) => {
        if (event.pointerType === 'mouse') {
            showNearestPoint(event);
        }
    };

    const handlePointerDown = (event) => {
        showNearestPoint(event, event.pointerType !== 'mouse');
    };

    const handlePointerLeave = (event) => {
        if (event.pointerType === 'mouse') {
            setActiveIndex(null);
        }
    };

    return (
        <div className={styles.chartWrap}>
            <svg
                viewBox={`0 0 ${w} ${h + 24}`}
                className={styles.chart}
                onPointerMove={handlePointerMove}
                onPointerDown={handlePointerDown}
                onPointerLeave={handlePointerLeave}
            >
                <path d={path} fill="none" stroke="#2f6ceb" strokeWidth="2" strokeLinejoin="round" />
                {points.map((p, i) => (
                    <circle key={i} cx={p.x} cy={p.y} r="3" fill="#2f6ceb" />
                ))}
                {activePoint && (
                    <g pointerEvents="none">
                        <line
                            x1={activePoint.x}
                            y1={pad}
                            x2={activePoint.x}
                            y2={h - pad}
                            stroke="#c8d2e2"
                            strokeWidth="1"
                            strokeDasharray="3 3"
                        />
                        <circle cx={activePoint.x} cy={activePoint.y} r="5" fill="#fff" stroke="#2f6ceb" strokeWidth="2" />
                        <g transform={`translate(${Math.min(Math.max(activePoint.x - 28, 4), w - 60)}, ${Math.max(activePoint.y - 44, 4)})`}>
                            <rect width="56" height="34" rx="5" fill="#1f2937" opacity="0.96" />
                            <text x="8" y="13" fontSize="9" fontWeight="700" fill="#ffffff">
                                {activePoint.label || '人数'}
                            </text>
                            <text x="8" y="27" fontSize="11" fontWeight="700" fill="#ffffff">
                                {activePoint.value}{unit}
                            </text>
                        </g>
                    </g>
                )}
                {labels.map((l, i) => (
                    <text key={i} x={pad + i * step} y={h + 16} textAnchor="middle" fontSize="9" fill="#8a94a6">
                        {l}
                    </text>
                ))}
            </svg>
        </div>
    );
}

/* ============ ドーナツグラフ (SVG) ============ */

const DONUT_COLORS = ['#2f6ceb', '#5b8def', '#8fb3f5', '#c3d5fa', '#e8f0fe'];

export function DonutChart({ items, centerLabel, centerValue, unit = '人' }) {
    const [activeIndex, setActiveIndex] = useState(null);
    const hideTimerRef = useRef(null);
    const total = items.reduce((a, it) => a + it.value, 0) || 1;
    const r = 40;
    const c = 2 * Math.PI * r;
    const segments = items.reduce((acc, item, index) => {
        const previousOffset = acc[index - 1]?.nextOffset || 0;
        const frac = item.value / total;
        acc.push({
            item,
            frac,
            offset: previousOffset,
            nextOffset: previousOffset + frac,
        });
        return acc;
    }, []);
    const activeSegment = activeIndex == null ? null : segments[activeIndex];

    useEffect(() => () => {
        if (hideTimerRef.current) {
            clearTimeout(hideTimerRef.current);
        }
    }, []);

    const showSegment = (index, keepVisible = false) => {
        setActiveIndex(index);

        if (hideTimerRef.current) {
            clearTimeout(hideTimerRef.current);
            hideTimerRef.current = null;
        }

        if (keepVisible) {
            hideTimerRef.current = setTimeout(() => {
                setActiveIndex(null);
                hideTimerRef.current = null;
            }, 10000);
        }
    };

    const handleSegmentMove = (event, index) => {
        if (event.pointerType === 'mouse') {
            showSegment(index);
        }
    };

    const handleSegmentDown = (event, index) => {
        showSegment(index, event.pointerType !== 'mouse');
    };

    const handleSegmentLeave = (event) => {
        if (event.pointerType === 'mouse') {
            setActiveIndex(null);
        }
    };

    const tooltipPosition = activeSegment
        ? (() => {
            const angle = (activeSegment.offset + activeSegment.frac / 2) * 2 * Math.PI - Math.PI / 2;
            const anchorX = 60 + Math.cos(angle) * 34;
            const anchorY = 60 + Math.sin(angle) * 34;
            return {
                x: Math.min(Math.max(anchorX - 28, 4), 60),
                y: Math.min(Math.max(anchorY - 42, 4), 82),
            };
        })()
        : null;

    return (
        <div className={styles.donutRow}>
            <svg viewBox="0 0 120 120" className={styles.donut}>
                {segments.map(({ item, frac, offset }, i) => (
                    <circle
                        key={item.label}
                        cx="60" cy="60" r={r}
                        fill="none"
                        stroke={DONUT_COLORS[i % DONUT_COLORS.length]}
                        strokeWidth="16"
                        strokeDasharray={`${frac * c} ${c}`}
                        strokeDashoffset={-offset * c}
                        transform="rotate(-90 60 60)"
                        onPointerMove={(event) => handleSegmentMove(event, i)}
                        onPointerDown={(event) => handleSegmentDown(event, i)}
                        onPointerLeave={handleSegmentLeave}
                        style={{ cursor: 'pointer' }}
                    />
                ))}
                <text x="60" y="56" textAnchor="middle" fontSize="9" fill="#8a94a6">{centerLabel}</text>
                <text x="60" y="72" textAnchor="middle" fontSize="13" fontWeight="700" fill="#1f2937">{centerValue}</text>
                {activeSegment && tooltipPosition && (
                    <g pointerEvents="none" transform={`translate(${tooltipPosition.x}, ${tooltipPosition.y})`}>
                        <rect width="56" height="34" rx="5" fill="#1f2937" opacity="0.96" />
                        <text x="8" y="13" fontSize="9" fontWeight="700" fill="#ffffff">
                            {activeSegment.item.label}
                        </text>
                        <text x="8" y="27" fontSize="11" fontWeight="700" fill="#ffffff">
                            {activeSegment.item.value}{unit}
                        </text>
                    </g>
                )}
            </svg>
            <ul className={styles.donutLegend}>
                {items.map((it, i) => (
                    <li key={it.label}>
                        <span className={styles.legendDot} style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }} />
                        {it.label}
                        <span className={styles.legendVal}>{Math.round((it.value / total) * 100)}%</span>
                    </li>
                ))}
            </ul>
        </div>
    );
}

/* ============ 空状態 ============ */

export function EmptyState({ message = 'データがありません' }) {
    return <div className={styles.empty}>{message}</div>;
}
