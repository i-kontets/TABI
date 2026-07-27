/**
 * 日程候補の確認や決定に使う画面部品です。
 *
 * 主な流れ:
 * 1. 必要な部品や API 関数を読み込む
 * 2. 画面表示やデータ取得に必要な値を準備する
 * 3. ユーザー操作や API の結果に合わせて表示を更新する
 *
 * 扱うデータ: React の state、props、フォーム入力、API から返ったデータを主に扱います。
 */
import React, { useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import BtmNav from '../bottomNav/BottomNav';
import ArrowBack from '../../assets/icons/arrow_back.svg?react';
import styles from '../../pages/Appointment/Appointment.module.css';
import transportData from '../../pages/Appointment/Appointment.json';

/**
 * AppointmentComponent は、このファイルの中心となる処理をまとめた関数です。
 * 画面から渡された値や API の結果を使い、次に表示する内容を決めます。
 */
function AppointmentComponent() {
    const navigate = useNavigate();
    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const [type, setType] = useState('');
    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const [carrier, setCarrier] = useState(''); // 空文字は「すべて」
    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const [from, setFrom] = useState('');
    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const [to, setTo] = useState('');
    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const [date, setDate] = useState('');
    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const [people, setPeople] = useState(1);
    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const [formError, setFormError] = useState('');
    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const [results, setResults] = useState(null);

    const transportsOfType = useMemo(() => {
        // ここで条件を確認し、状況に合う処理だけを実行します。
        if (type) return transportData.transports.find(t => t.type === type) || { carriers: [] };
        const map = new Map();
        transportData.transports.forEach(t => {
            (t.carriers || []).forEach(c => {
                // ここで条件を確認し、状況に合う処理だけを実行します。
                if (!map.has(c.name)) {
                    map.set(c.name, { ...c });
                } else {
                    const existing = map.get(c.name);
                    // 配列のデータを1件ずつ画面表示用の形に変換します。
                    existing.routes = Array.from(new Set([...(existing.routes || []), ...(c.routes || [])].map(r => JSON.stringify(r)))).map(s => JSON.parse(s));
                    map.set(c.name, existing);
                }
            });
        });
        return { carriers: Array.from(map.values()) };
    }, [type]);

    const carriers = useMemo(() => transportsOfType.carriers || [], [transportsOfType]);

    // from/to options derived from routes available for the current type and (optional) carrier
    const routePool = useMemo(() => {
        const pool = [];
        carriers.forEach(c => {
            // ここで条件を確認し、状況に合う処理だけを実行します。
            if (carrier && c.name !== carrier) return;
            (c.routes || []).forEach(r => pool.push({ ...r, carrier: c.name }));
        });
        return pool;
    }, [carriers, carrier]);

    // 配列のデータを1件ずつ画面表示用の形に変換します。
    const fromOptions = useMemo(() => Array.from(new Set(routePool.map(r => r.from))), [routePool]);
    // 配列のデータを1件ずつ画面表示用の形に変換します。
    const toOptions = useMemo(() => Array.from(new Set(routePool.filter(r => (from ? r.from === from : true)).map(r => r.to))), [routePool, from]);

    // reset dependent selects when upstream changes
    React.useEffect(() => setCarrier(''), [type]);
    React.useEffect(() => setFrom(''), [carrier, type]);
    React.useEffect(() => setTo(''), [from, carrier, type]);
    React.useEffect(() => setDate(''), [type]);

    const BackClick = () => navigate(-1);

    /**
     * handleSearch は、このファイルの中心となる処理をまとめた関数です。
     * 画面から渡された値や API の結果を使い、次に表示する内容を決めます。
     */
    function handleSearch(e) {
        e.preventDefault();
        // required validations
        if (!type || !from || !to || !date || !people || Number(people) < 1) {
            setFormError('種類・出発地・到着地・人数・出発日を正しく入力してください。');
            setResults(null);
            return;
        }
        setFormError('');
        // build results from JSON matching filters
        const matches = [];
        transportData.transports.forEach(t => {
            // ここで条件を確認し、状況に合う処理だけを実行します。
            if (t.type !== type) return;
            (t.carriers || []).forEach(c => {
                // ここで条件を確認し、状況に合う処理だけを実行します。
                if (carrier && c.name !== carrier) return;
                (c.routes || []).forEach(r => {
                    // ここで条件を確認し、状況に合う処理だけを実行します。
                    if (from && r.from !== from) return;
                    // ここで条件を確認し、状況に合う処理だけを実行します。
                    if (to && r.to !== to) return;
                    const times = r.times.slice();
                    // ここで条件を確認し、状況に合う処理だけを実行します。
                    if (!times || times.length === 0) return;
                    matches.push({ type: t.type, carrier: c.name, from: r.from, to: r.to, times });
                });
            });
        });

        setResults({ items: matches });
    }

    // proceedBooking は、画面操作や API 結果に合わせて必要な処理をまとめた関数です。
    const proceedBooking = (it) => {
        navigate('/confirmation', { state: { item: it, date, people } });
    }

    const location = useLocation();

    return (
        <>
            <header className={styles.header}>
                <button
                    className={styles.backButton}
                    onClick={BackClick}
                    aria-label="戻る"
                >
                    <ArrowBack className={styles.icon} aria-hidden="true" />
                </button>
                <div className={styles.Htitle} style={{margin:'auto'}}>予約画面</div>
            </header>

            <div className={styles.container}>

                <form className={styles.form} onSubmit={handleSearch}>
                    <label className={styles.label}>
                        事業者
                        <select value={carrier} onChange={e => setCarrier(e.target.value)} className={styles.select}>
                            <option value="">すべて</option>
                            {carriers.map(c => (
                                <option key={c.name} value={c.name}>{c.name}</option>
                            ))}
                        </select>
                    </label>

                    <label className={styles.label}>
                        種類
                        <select value={type} onChange={e => setType(e.target.value)} className={styles.select} required>
                            <option value="">選択してください</option>
                            {Array.from(new Set(transportData.transports.map(t => t.type))).map(tt => (
                                <option key={tt} value={tt}>{tt}</option>
                            ))}
                        </select>
                    </label>

                    <label className={styles.label}>
                        出発地
                        <select value={from} onChange={e => setFrom(e.target.value)} className={styles.select} required>
                            <option value="">選択してください</option>
                            {fromOptions.map(f => (
                                <option key={f} value={f}>{f}</option>
                            ))}
                        </select>
                    </label>

                    <label className={styles.label}>
                        到着地
                        <select value={to} onChange={e => setTo(e.target.value)} className={styles.select} required>
                            <option value="">選択してください</option>
                            {toOptions.map(t => (
                                <option key={t} value={t}>{t}</option>
                            ))}
                        </select>
                    </label>

                    <label className={styles.label}>
                        出発日
                        <input type="date" value={date} onChange={e => setDate(e.target.value)} className={styles.input} required />
                    </label>

                    <label className={styles.label}>
                        人数
                        <input type="number" min="1" step="1" value={people} onChange={e => setPeople(e.target.value === '' ? '' : Number(e.target.value))} className={styles.input} required />
                    </label>

                    <div className={styles.actions}>
                        <button type="submit" className={styles.button}>検索</button>
                    </div>
                </form>

                <div className={styles.note} style={{ marginTop: 12 }}>
                    条件に合う便を一覧表示します。実データはサンプルJSONに基づきます。
                </div>

                {formError && (
                    <div style={{ color: '#b00', marginTop: 8 }}>{formError}</div>
                )}

                {results && (
                    <div className={styles.results} style={{ marginTop: 16 }}>
                        <h3>検索結果（{results.items.length} 件）</h3>
                        {results.items.length === 0 ? (
                            <div>該当する便はありませんでした。</div>
                        ) : (
                            results.items.map((it, idx) => (
                                <div key={`${it.carrier}-${it.from}-${it.to}-${idx}`} className={styles.card}>
                                    <div style={{ fontWeight: 700 }}>{it.carrier} • {it.type}</div>
                                    <div>{it.from} → {it.to}</div>
                                    <div>時刻候補: {it.times.join('、')}</div>
                                    <div style={{ marginTop: 8 }}>
                                        <button className={styles.proceedButton} onClick={() => proceedBooking(it)}>予約に進む</button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>
            <BtmNav />
        </>
    );
}

export default AppointmentComponent;
