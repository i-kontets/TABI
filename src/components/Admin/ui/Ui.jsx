/**
 * 管理画面で共通して使うヘッダー、レイアウト、カードなどの部品です。
 *
 * 主な流れ:
 * 1. 必要な部品や API 関数を読み込む
 * 2. 画面表示やデータ取得に必要な値を準備する
 * 3. ユーザー操作や API の結果に合わせて表示を更新する
 *
 * 扱うデータ: React の state、props、フォーム入力、API から返ったデータを主に扱います。
 */
import { useEffect, useRef, useState } from 'react';
import styles from './Ui.module.css';

/* ============ ステータスバッジ ============ */

// tone名 → CSSクラス の対応表です(バッジの色を決めます)。
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

/**
 * 状態を色付きで表示するバッジ部品です(例:「対応済み」を緑で表示)。
 * tone を指定しなければ、ラベルの文言から自動で色を選びます。
 */
export function Badge({ label, tone }) {
    // 優先順位: 明示指定のtone → ラベルからの自動判定 → 既定のグレー
    const cls = BADGE_TONES[tone || LABEL_TONE[label] || 'gray'];
    return <span className={`${styles.badge} ${cls}`}>{label}</span>;
}

/* ============ 検索バー + フィルターアイコン ============ */

/**
 * 検索入力欄とフィルターボタンをセットにした部品です。
 * 入力のたびに onChange(入力値) が呼ばれ、フィルターボタンで onFilter が呼ばれます。
 */
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

/**
 * 切り替えタブの部品です。
 * tabs には文字列の配列("すべて" 等)か、{ key, label } の配列を渡せます。
 */
export function Tabs({ tabs, active, onChange }) {
    return (
        <div className={styles.tabs}>
            {tabs.map((t) => {
                // 文字列とオブジェクトの両形式に対応するため、ここでkeyとlabelを取り出します。
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

/**
 * ページ切り替え(< 1 2 3 4 5 … 最終ページ >)の部品です。
 * 6ページ以上ある場合は、先頭5ページ+「…」+最終ページの形で省略表示します。
 */
export function Pagination({ page, totalPages, onChange }) {
    // 1ページしかない場合はページ切り替え自体を表示しません。
    if (totalPages <= 1) return null;
    // 表示するページ番号(最大5つ)を作ります。
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

// アバターの背景色の候補です。名前から決まるので、同じ人はいつも同じ色になります。
const AVATAR_COLORS = ['#5b8def', '#e88a4a', '#5bb98c', '#b06ad4', '#e05c7a', '#4aa8c9'];

/**
 * 名前の1文字目を丸い色付きアイコンで表示するアバター部品です。
 * 画像が無いユーザーの代替表示に使います。
 */
export function Avatar({ name = '', size = 40 }) {
    // 名前の全文字の文字コードを合計し、色の候補数で割った余りで色を決めます。
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

/**
 * ダッシュボードの統計カード部品です(例: 「登録ユーザー数 1,234人 +12」)。
 * diff(増減値)の正負や diffTone に応じて、増減表示の色が変わります。
 */
export function StatCard({ label, value, unit, diff, diffLabel, diffTone, warn }) {
    // 増減表示の色: warn指定 → 警告色 / 増加 → 上昇色 / 減少 → 下降色
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

/**
 * 白背景のセクションカード部品です。タイトルと右上のアクション(ボタン等)を置けます。
 */
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

/**
 * 詳細画面の「ラベル: 値」形式の1行を表示する部品です。
 */
export function DetailRow({ label, children }) {
    return (
        <div className={styles.detailRow}>
            <span className={styles.detailLabel}>{label}</span>
            <span className={styles.detailValue}>{children}</span>
        </div>
    );
}

/* ============ ボタン ============ */

/**
 * 共通ボタン部品です。variant で見た目を切り替えます。
 * primary=青 / danger=赤 / outline=枠線のみ / dangerOutline=赤い枠線のみ
 */
export function Button({ children, variant = 'primary', onClick, type = 'button', disabled, full }) {
    // variant名からCSSクラスを選びます。
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

/**
 * SVGで描く折れ線グラフ部品です(管理画面の推移グラフ用)。
 * 点をタップ/ホバーすると、その値のツールチップが表示されます。
 * コンテナの幅に合わせて自動でサイズが変わります(レスポンシブ対応)。
 */
export function LineChart({ data, labels = [], height = 120, padding }) {
    // 選択中(ツールチップ表示中)の点の番号です。null なら非表示です。
    const [activeIndex, setActiveIndex] = useState(null);
    // グラフを包むdiv要素への参照です(幅の測定に使います)。
    const wrapRef = useRef(null);
    // 実際に描画に使うグラフの幅(px)です。
    const [chartWidth, setChartWidth] = useState(320);

    // コンテナの幅を監視し、幅が変わったらグラフの幅も追従させます。
    useEffect(() => {
        const node = wrapRef.current;
        // まだDOMが用意できていなければ何もしません。
        if (!node) return undefined;

        // 現在のコンテナ幅を測ってstateへ反映する関数です。
        const updateWidth = () => {
            const nextWidth = Math.round(node.getBoundingClientRect().width);
            // 0以下(非表示中など)の値では更新しません。
            if (nextWidth > 0) {
                setChartWidth(nextWidth);
            }
        };

        // 初回に1度測定します。
        updateWidth();

        // ResizeObserver非対応の古いブラウザでは、ウィンドウのresizeイベントで代用します。
        if (typeof ResizeObserver === 'undefined') {
            window.addEventListener('resize', updateWidth);
            return () => window.removeEventListener('resize', updateWidth);
        }

        // コンテナ要素自体のサイズ変化を監視します(サイドバー開閉などにも追従)。
        const observer = new ResizeObserver((entries) => {
            const nextWidth = Math.round(entries[0]?.contentRect.width ?? 0);
            if (nextWidth > 0) {
                setChartWidth(nextWidth);
            }
        });
        observer.observe(node);

        // 後片付け: 監視を停止します。
        return () => observer.disconnect();
    }, []);

    // ===== グラフの座標計算 =====
    // グラフの幅(最低260px)と高さ(幅の24%を基準に、指定height〜220pxの範囲)を決めます。
    const w = Math.max(260, chartWidth);
    const h = Math.max(height, Math.min(220, Math.round(w * 0.24)));
    // グラフ周囲の余白です(軸ラベルやツールチップがはみ出さないよう最低値を保証)。
    const pad = {
        top: padding?.top ?? 8,
        right: Math.max(padding?.right ?? 28, 28),
        bottom: Math.max(padding?.bottom ?? 22, 22),
        left: Math.max(padding?.left ?? 32, 32),
    };
    // データの最大値・最小値からY軸の範囲を決めます(0除算を防ぐため range は最低1)。
    const max = Math.max(...data, 1);
    const min = Math.min(...data, 0);
    const range = max - min || 1;
    // X方向: データ点同士の間隔を、描画可能な幅から均等に割り出します。
    const availableWidth = Math.max(0, w - pad.left - pad.right);
    const step = data.length > 1 ? availableWidth / (data.length - 1) : 0;
    // 各データ値を SVG 上の (x, y) 座標へ変換します(yは値が大きいほど上=小さい値になる)。
    const points = data.map((v, i) => ({
        x: pad.left + i * step,
        y: pad.top + (h - pad.top - pad.bottom) * (1 - (v - min) / range),
    }));
    // 座標の並びから折れ線のSVGパス文字列("M x,y L x,y ...")を組み立てます。
    const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
    // ===== ツールチップ(選択中の点の値表示)の計算 =====
    const activePoint = activeIndex == null ? null : points[activeIndex];
    const activeValue = activeIndex == null ? null : data[activeIndex];
    const activeLabel = activeValue == null ? '' : `${activeValue.toLocaleString()}人`;
    const tooltipWidth = 40;
    // ツールチップがグラフの左右からはみ出さないよう位置を調整します。
    const tooltipX = activePoint ? Math.min(Math.max(activePoint.x, tooltipWidth / 2 + 4), w - tooltipWidth / 2 - 4) : 0;
    // ツールチップは点の少し上に表示します(上端にかかる場合は下げます)。
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

// ドーナツグラフの各区分に使う色です(先頭から順に濃い青→薄い青)。
const DONUT_COLORS = ['#2f6ceb', '#5b8def', '#8fb3f5', '#c3d5fa', '#e8f0fe'];

/**
 * SVGで描くドーナツグラフ部品です(割合の内訳表示用)。
 * 円弧の描画には stroke-dasharray(破線の長さ指定)を使ったテクニックを用いています。
 * 区分をタップ/ホバーすると、その区分の値がツールチップで表示されます。
 */
export function DonutChart({ items, centerLabel, centerValue }) {
    // 選択中(ツールチップ表示中)の区分の番号です。null なら非表示です。
    const [activeIndex, setActiveIndex] = useState(null);
    // 全区分の合計値です(0除算を防ぐため最低1)。
    const total = items.reduce((a, it) => a + it.value, 0) || 1;
    // 円の半径と円周の長さです(円弧の長さ計算に使います)。
    const r = 40;
    const c = 2 * Math.PI * r;
    // 各区分の開始位置(円周上のどこから描くか)を累積していく変数です。
    let offset = 0;
    // ===== ツールチップ(選択中区分の値表示)の計算 =====
    const activeItem = activeIndex == null ? null : items[activeIndex];
    // 選択区分より前の区分の割合の合計 = 選択区分の開始位置(0〜1)です。
    const activeStart = activeIndex == null ? 0 : items.slice(0, activeIndex).reduce((sum, item) => sum + item.value / total, 0);
    const activeFrac = activeItem ? activeItem.value / total : 0;
    // 選択区分の中央の角度を求めます(-π/2 は12時の位置から始めるための補正)。
    const activeAngle = -Math.PI / 2 + (activeStart + activeFrac / 2) * Math.PI * 2;
    // 区分の中央付近にツールチップを配置します(グラフ外へはみ出さないよう制限)。
    const tooltipX = activeItem ? Math.min(Math.max(60 + Math.cos(activeAngle) * 44, 22), 98) : 60;
    const tooltipY = activeItem ? Math.min(Math.max(60 + Math.sin(activeAngle) * 44, 24), 96) : 24;
    const activeLabel = activeItem ? `${activeItem.value.toLocaleString()}人` : "";
    const activePercent = activeItem ? Math.round((activeItem.value / total) * 100) : null;
    // 中央の表示: 選択中はその区分の内容、未選択時は全体の値を表示します。
    const displayLabel = activeItem ? activeItem.label : centerLabel;
    const displayValue = activeItem ? `${activeItem.value.toLocaleString()}人 / ${activePercent}%` : centerValue;

    return (
        <div className={styles.donutRow}>
            <svg viewBox="0 0 120 120" className={styles.donut}>
                {items.map((it, i) => {
                    // この区分が全体に占める割合(0〜1)です。
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
                    // 次の区分の開始位置を、この区分の分だけ進めます。
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

/**
 * データが0件のときに表示するシンプルな空状態の部品です。
 */
export function EmptyState({ message = 'データがありません' }) {
    return <div className={styles.empty}>{message}</div>;
}
