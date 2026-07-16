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
    '解決済み': 'green',
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

export function StatCard({ label, value, unit, diff, diffLabel, diffTone, warn }) {
    const diffClass = diffTone === 'warn'
        ? styles.diffWarn
        : diff >= 0
            ? styles.diffUp
            : styles.diffDown;

    return (
        <div className={styles.statCard}>
            <div className={styles.statLabel}>{label}</div>
            <div className={styles.statValueRow}>
                <span className={`${styles.statValue} ${warn ? styles.statWarn : ''}`}>{value}</span>
                {unit && <span className={styles.statUnit}>{unit}</span>}
                {(diff != null || diffLabel) && (
                    <span className={`${styles.statDiff} ${diffClass}`}>
                        {diffLabel || (diff >= 0 ? `+${diff}` : diff)}
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

export function LineChart({ data, labels = [], height = 120, padding }) {
    const [activeIndex, setActiveIndex] = useState(null);
    const wrapRef = useRef(null);
    const [chartWidth, setChartWidth] = useState(320);

    useEffect(() => {
        const node = wrapRef.current;
        if (!node) return undefined;

        const updateWidth = () => {
            const nextWidth = Math.round(node.getBoundingClientRect().width);
            if (nextWidth > 0) {
                setChartWidth(nextWidth);
            }
        };

        updateWidth();

        if (typeof ResizeObserver === 'undefined') {
            window.addEventListener('resize', updateWidth);
            return () => window.removeEventListener('resize', updateWidth);
        }

        const observer = new ResizeObserver((entries) => {
            const nextWidth = Math.round(entries[0]?.contentRect.width ?? 0);
            if (nextWidth > 0) {
                setChartWidth(nextWidth);
            }
        });
        observer.observe(node);

        return () => observer.disconnect();
    }, []);

    const w = Math.max(260, chartWidth);
    const h = Math.max(height, Math.min(220, Math.round(w * 0.24)));
    const pad = {
        top: padding?.top ?? 8,
        right: Math.max(padding?.right ?? 28, 28),
        bottom: Math.max(padding?.bottom ?? 22, 22),
        left: Math.max(padding?.left ?? 32, 32),
    };
    const max = Math.max(...data, 1);
    const min = Math.min(...data, 0);
    const range = max - min || 1;
    const availableWidth = Math.max(0, w - pad.left - pad.right);
    const step = data.length > 1 ? availableWidth / (data.length - 1) : 0;
    const points = data.map((v, i) => ({
        x: pad.left + i * step,
        y: pad.top + (h - pad.top - pad.bottom) * (1 - (v - min) / range),
    }));
    const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
    const activePoint = activeIndex == null ? null : points[activeIndex];
    const activeValue = activeIndex == null ? null : data[activeIndex];
    const activeLabel = activeValue == null ? '' : `${activeValue.toLocaleString()}人`;
    const tooltipWidth = 40;
    const tooltipX = activePoint ? Math.min(Math.max(activePoint.x, tooltipWidth / 2 + 4), w - tooltipWidth / 2 - 4) : 0;
    const tooltipTextY = activePoint ? Math.max(18, activePoint.y - 14) : 0;

    return (
        <div className={styles.chartWrap} ref={wrapRef}>
            <svg viewBox={`0 0 ${w} ${h + 22}`} className={styles.chart} preserveAspectRatio="none">
                <path d={path} fill="none" stroke="#2f6ceb" strokeWidth="2" strokeLinejoin="round" />
                {points.map((p, i) => (
                    <g key={i}>
                        <circle cx={p.x} cy={p.y} r={activeIndex === i ? 4 : 3} fill="#2f6ceb" />
                        <circle
                            cx={p.x}
                            cy={p.y}
                            r="12"
                            fill="transparent"
                            className={styles.chartPointHit}
                            role="button"
                            tabIndex="0"
                            aria-label={`${labels[i] ?? ''} ${data[i]}人`}
                            onClick={() => setActiveIndex(i)}
                            onPointerEnter={() => setActiveIndex(i)}
                            onFocus={() => setActiveIndex(i)}
                            onKeyDown={(event) => {
                                if (event.key === 'Enter' || event.key === ' ') {
                                    event.preventDefault();
                                    setActiveIndex(i);
                                }
                            }}
                        />
                    </g>
                ))}
                {activePoint && (
                    <g pointerEvents="none">
                        <rect
                            x={tooltipX - tooltipWidth / 2}
                            y={tooltipTextY - 16}
                            width={tooltipWidth}
                            height="18"
                            rx="5"
                            fill="#1f2937"
                        />
                        <text
                            x={tooltipX}
                            y={tooltipTextY - 3}
                            textAnchor="middle"
                            fontSize="10"
                            fontWeight="700"
                            fill="#fff"
                        >
                            {activeLabel}
                        </text>
                    </g>
                )}
                {labels.map((l, i) => (
                    <text key={i} x={pad.left + i * step} y={h + 15} textAnchor="middle" fontSize="10" fill="#8a94a6">
                        {l}
                    </text>
                ))}
            </svg>
        </div>
    );
}

/* ============ ドーナツグラフ (SVG) ============ */

const DONUT_COLORS = ['#2f6ceb', '#5b8def', '#8fb3f5', '#c3d5fa', '#e8f0fe'];

export function DonutChart({ items, centerLabel, centerValue }) {
    const [activeIndex, setActiveIndex] = useState(null);
    const total = items.reduce((a, it) => a + it.value, 0) || 1;
    const r = 40;
    const c = 2 * Math.PI * r;
    let offset = 0;
    const activeItem = activeIndex == null ? null : items[activeIndex];
    const activeStart = activeIndex == null ? 0 : items.slice(0, activeIndex).reduce((sum, item) => sum + item.value / total, 0);
    const activeFrac = activeItem ? activeItem.value / total : 0;
    const activeAngle = -Math.PI / 2 + (activeStart + activeFrac / 2) * Math.PI * 2;
    const tooltipX = activeItem ? Math.min(Math.max(60 + Math.cos(activeAngle) * 44, 22), 98) : 60;
    const tooltipY = activeItem ? Math.min(Math.max(60 + Math.sin(activeAngle) * 44, 24), 96) : 24;
    const activeLabel = activeItem ? `${activeItem.value.toLocaleString()}人` : "";
    const activePercent = activeItem ? Math.round((activeItem.value / total) * 100) : null;
    const displayLabel = activeItem ? activeItem.label : centerLabel;
    const displayValue = activeItem ? `${activeItem.value.toLocaleString()}人 / ${activePercent}%` : centerValue;

    return (
        <div className={styles.donutRow}>
            <svg viewBox="0 0 120 120" className={styles.donut}>
                {items.map((it, i) => {
                    const frac = it.value / total;
                    const el = (
                        <circle
                            key={it.label}
                            cx="60" cy="60" r={r}
                            fill="none"
                            stroke={DONUT_COLORS[i % DONUT_COLORS.length]}
                            strokeWidth={activeIndex === i ? 18 : 16}
                            strokeDasharray={`${frac * c} ${c}`}
                            strokeDashoffset={-offset * c}
                            transform="rotate(-90 60 60)"
                            className={styles.donutSegment}
                            role="button"
                            tabIndex="0"
                            aria-label={`${it.label} ${it.value}人 ${Math.round(frac * 100)}%`}
                            onClick={() => setActiveIndex(i)}
                            onPointerEnter={() => setActiveIndex(i)}
                            onFocus={() => setActiveIndex(i)}
                            onKeyDown={(event) => {
                                if (event.key === 'Enter' || event.key === ' ') {
                                    event.preventDefault();
                                    setActiveIndex(i);
                                }
                            }}
                        />
                    );
                    offset += frac;
                    return el;
                })}
                {activeItem && (
                    <g pointerEvents="none">
                        <rect x={tooltipX - 18} y={tooltipY - 16} width="36" height="18" rx="5" fill="#1f2937" />
                        <text x={tooltipX} y={tooltipY - 3} textAnchor="middle" fontSize="10" fontWeight="700" fill="#fff">
                            {activeLabel}
                        </text>
                    </g>
                )}
                <text x="60" y="56" textAnchor="middle" fontSize="9" fill="#8a94a6">{centerLabel}</text>
                <text x="60" y="72" textAnchor="middle" fontSize="13" fontWeight="700" fill="#1f2937">{centerValue}</text>
            </svg>
            <ul className={styles.donutLegend}>
                {items.map((it, i) => (
                    <li
                        key={it.label}
                        className={styles.donutLegendItem}
                        onClick={() => setActiveIndex(i)}
                        onPointerEnter={() => setActiveIndex(i)}
                    >
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
