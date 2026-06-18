import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import BtmNav from '../../components/bottomNav/BottomNav';
import ArrowBack from '../../assets/icons/arrow_back.svg?react';
import styles from './appointment.module.css';
import transportData from './appointment.json';
import stops from './confirmation_options.json';

// Step 0: Search / list
function AppointmentStep({ onProceed, onBack }) {
    const [type, setType] = useState('');
    const [carrier, setCarrier] = useState('');
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');
    const [date, setDate] = useState('');
    const [people, setPeople] = useState(1);
    const [formError, setFormError] = useState('');
    const [results, setResults] = useState(null);

    const transportsOfType = useMemo(() => {
        if (type) return transportData.transports.find(t => t.type === type) || { carriers: [] };
        const map = new Map();
        transportData.transports.forEach(t => {
            (t.carriers || []).forEach(c => {
                if (!map.has(c.name)) {
                    map.set(c.name, { ...c });
                } else {
                    const existing = map.get(c.name);
                    existing.routes = Array.from(new Set([...(existing.routes || []), ...(c.routes || [])].map(r => JSON.stringify(r)))).map(s => JSON.parse(s));
                    map.set(c.name, existing);
                }
            });
        });
        return { carriers: Array.from(map.values()) };
    }, [type]);

    const carriers = useMemo(() => transportsOfType.carriers || [], [transportsOfType]);

    const routePool = useMemo(() => {
        const pool = [];
        carriers.forEach(c => {
            if (carrier && c.name !== carrier) return;
            (c.routes || []).forEach(r => pool.push({ ...r, carrier: c.name }));
        });
        return pool;
    }, [carriers, carrier]);

    const fromOptions = useMemo(() => Array.from(new Set(routePool.map(r => r.from))), [routePool]);
    const toOptions = useMemo(() => Array.from(new Set(routePool.filter(r => (from ? r.from === from : true)).map(r => r.to))), [routePool, from]);

    useEffect(() => setCarrier(''), [type]);
    useEffect(() => setFrom(''), [carrier, type]);
    useEffect(() => setTo(''), [from, carrier, type]);
    useEffect(() => setDate(''), [type]);

    function handleSearch(e) {
        e && e.preventDefault && e.preventDefault();
        if (!type || !from || !to || !date || !people || Number(people) < 1) {
            setFormError('種類・出発地・到着地・人数・出発日を正しく入力してください。');
            setResults(null);
            return;
        }
        setFormError('');
        const matches = [];
        transportData.transports.forEach(t => {
            if (t.type !== type) return;
            (t.carriers || []).forEach(c => {
                if (carrier && c.name !== carrier) return;
                (c.routes || []).forEach(r => {
                    if (from && r.from !== from) return;
                    if (to && r.to !== to) return;
                    const times = r.times.slice();
                    if (!times || times.length === 0) return;
                    matches.push({ type: t.type, carrier: c.name, from: r.from, to: r.to, times });
                });
            });
        });
        setResults({ items: matches });
    }

    const proceedBooking = (it) => {
        onProceed && onProceed({ item: it, date, people });
    }

    return (
        <div>
            <header className={styles.header}>
                <button className={styles.backButton} onClick={() => (onBack ? onBack() : window.history.back())} aria-label="戻る">
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
        </div>
    );
}

// Step 1: Confirmation
function ConfirmationStep({ item, date, people, onConfirm, onBack }) {
    const [boarding, setBoarding] = useState(stops.boarding?.[0] || '');
    const [alighting, setAlighting] = useState(stops.alighting?.[0] || '');
    const [selectedTime, setSelectedTime] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const timeoutRef = useRef(null);

    useEffect(() => {
        if (item?.times && item.times.length > 0) setSelectedTime(item.times[0]);
    }, [item]);

    useEffect(() => {
        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, []);

    const fareMap = { 'バス': 1500, '新幹線': 8000, 'レンタカー': 10000 };
    const pricePerPerson = item?.type ? (fareMap[item.type] || 0) : 0;
    const totalPrice = pricePerPerson * (people || 1);

    const confirm = () => {
        if (isLoading) return;
        const booking = { item, people: people || 1, date, time: selectedTime, boarding, alighting, pricePerPerson, totalPrice };
        setIsLoading(true);
        timeoutRef.current = setTimeout(() => {
            onConfirm && onConfirm(booking);
        }, 500);
    }

    return (
        <div>
            <header className={styles.header}>
                <button className={styles.backButton} onClick={() => (onBack ? onBack() : window.history.back())} aria-label="戻る">
                    <ArrowBack className={styles.icon} aria-hidden="true" />
                </button>
                <div className={styles.Htitle} style={{margin:'auto'}}>乗降地を選択</div>
            </header>

            <div className={styles.container}>
                {item && (
                    <>
                        <div className={styles.card}>
                            <div style={{ fontWeight: 700 }}>{item.carrier} • {item.type}</div>
                            <div>{item.from} → {item.to}</div>
                            <div>出発日: {date}</div>
                        </div>

                        <div className={styles.card} style={{ marginTop: 8 }}>
                            <div style={{ fontWeight: 700 }}>料金</div>
                            <div>{pricePerPerson.toLocaleString()} 円 / 人</div>
                            <div>人数: {people || 1} 名</div>
                            <div style={{ marginTop: 6, fontWeight: 700 }}>合計: {totalPrice.toLocaleString()} 円</div>
                        </div>
                    </>
                )}

                <label className={styles.label}>
                    乗車地
                    <select value={boarding} onChange={e => setBoarding(e.target.value)} className={styles.select}>
                        {stops.boarding.map(s => (
                            <option key={s} value={s}>{s}</option>
                        ))}
                    </select>
                </label>

                <label className={styles.label}>
                    降車地
                    <select value={alighting} onChange={e => setAlighting(e.target.value)} className={styles.select}>
                        {stops.alighting.map(s => (
                            <option key={s} value={s}>{s}</option>
                        ))}
                    </select>
                </label>

                <label className={styles.label}>
                    時刻
                    <select value={selectedTime} onChange={e => setSelectedTime(e.target.value)} className={styles.select}>
                        <option value="">選択してください</option>
                        {item?.times?.map(t => (
                            <option key={t} value={t}>{t}</option>
                        ))}
                    </select>
                </label>

                <div className={styles.actions}>
                    <button className={styles.buttonPrimary} onClick={confirm} disabled={isLoading}>{isLoading ? '読み込み中...' : '支払いに進む'}</button>
                </div>
            </div>
        </div>
    );
}

// Step 2: Decision / summary
function DecisionStep({ booking, onBack }) {
    const bookingNumber = booking?.number || ('R' + Date.now().toString(36).toUpperCase());
    const navigate = useNavigate();

    return (
        <>
            <header className={styles.header}>
                <button className={styles.backButton} onClick={() => (onBack ? onBack() : window.history.back())} aria-label="戻る">
                    <ArrowBack className={styles.icon} aria-hidden="true" />
                </button>
                <div className={styles.Htitle} style={{ margin: 'auto' }}>予約内容の確認</div>
            </header>

            <div className={styles.container}>
                <div className={styles.card}>
                    <div style={{ fontWeight: 700 }}>予約番号</div>
                    <div style={{ marginTop: 6 }}>{bookingNumber}</div>
                </div>

                <div className={styles.card} style={{ marginTop: 8 }}>
                    <div style={{ fontWeight: 700 }}>{booking.item?.carrier} • {booking.item?.type}</div>
                    <div>{booking.item?.from} → {booking.item?.to}</div>
                    <div>出発日: {booking.date}</div>
                    <div>選択時刻: {booking.time}</div>
                </div>

                <div className={styles.card} style={{ marginTop: 8 }}>
                    <div style={{ fontWeight: 700 }}>乗降地</div>
                    <div>乗車: {booking.boarding}</div>
                    <div>降車: {booking.alighting}</div>
                </div>

                <div className={styles.card} style={{ marginTop: 8 }}>
                    <div style={{ fontWeight: 700 }}>人数・料金</div>
                    <div>人数: {booking.people} 名</div>
                    <div>{(booking.pricePerPerson || 0).toLocaleString()} 円 / 人</div>
                    <div style={{ marginTop: 6, fontWeight: 700 }}>合計: {(booking.totalPrice || 0).toLocaleString()} 円</div>
                </div>

                <div className={styles.actions} style={{ marginTop: 12 }}>
                    <button className={styles.button} onClick={() => navigate('/Itinerary')}>しおりに戻る</button>
                </div>
            </div>

            <BtmNav />
        </>
    );
}

export default function AppointmentPage() {
    const [step, setStep] = useState(0); // 0: search, 1: confirm, 2: decision
    const [bookingDraft, setBookingDraft] = useState(null);

    const handleProceedFromSearch = ({ item, date, people }) => {
        setBookingDraft({ item, date, people });
        setStep(1);
    };

    const handleConfirm = (booking) => {
        // attach a generated booking number
        const bookingWithNum = { ...booking, number: 'R' + Date.now().toString(36).toUpperCase() + '-' + Math.floor(Math.random() * 9000 + 1000) };
        setBookingDraft(bookingWithNum);
        setStep(2);
    };

    return (
        <div style={{ paddingBottom: 68 }}>
            {step === 0 && <AppointmentStep onProceed={handleProceedFromSearch} onBack={() => window.history.back()} />}
            {step === 1 && <ConfirmationStep item={bookingDraft?.item} date={bookingDraft?.date} people={bookingDraft?.people} onBack={() => setStep(0)} onConfirm={handleConfirm} />}
            {step === 2 && <DecisionStep booking={bookingDraft} onBack={() => setStep(1)} />}

            {/* 固定フッターの次へボタン */}
            <div style={{ position: 'fixed', left: 0, right: 0, bottom: 0, padding: 8, background: 'rgba(255,255,255,0.95)', borderTop: '1px solid #eee', display: 'flex', justifyContent: 'center' }}>
                <button className={styles.button} onClick={() => setStep(s => (s + 1) % 3)}>次へ</button>
            </div>
        </div>
    );
}
