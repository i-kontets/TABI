import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Step, Stepper } from 'react-form-stepper';
import BtmNav from '../../components/bottomNav/BottomNav';
import ArrowBack from '../../assets/icons/arrow_back.svg?react';
import styles from './Appointment.module.css';
import transportData from './appointment.json';
import stops from './confirmation_options.json';

const appointmentSteps = ['検索', '確認', '完了'];

const stepStyleConfig = {
    activeBgColor: '#CDD4E3',
    activeTextColor: '#000',
    completedBgColor: '#CDD4E3',
    completedTextColor: '#000',
    inactiveBgColor: '#f2f2f2',
    inactiveTextColor: '#000',
    size: '44px',
    circleFontSize: '14px',
    labelFontSize: '12px',
    borderRadius: '50%',
    fontWeight: 600,
};

const connectorStyleConfig = {
    activeColor: '#CDD4E3',
    completedColor: '#CDD4E3',
    disabledColor: '#e6e6e6',
    size: 2,
    stepSize: '44px',
    style: 'solid',
};

const initialRoute = transportData.transports?.[0]?.carriers?.[0]?.routes?.[0] || {};
const latestBookingStorageKey = 'tabiLatestBooking';
const savedRoutesStorageKey = 'tabiMyRoutes';

function ProgressTracker({ step, setStep }) {
    return (
        <div className={styles.progressTracker}>
            <Stepper
                activeStep={step}
                className={styles.stepper}
                connectorStateColors
                styleConfig={stepStyleConfig}
                connectorStyleConfig={connectorStyleConfig}
            >
                {appointmentSteps.map((label, index) => (
                    <Step
                        key={label}
                        label={label}
                        onClick={() => {
                            if (index <= step) setStep(index);
                        }}
                        aria-current={step === index ? 'step' : undefined}
                        aria-label={`${label}ステップへ移動`}
                    >
                        {index + 1}
                    </Step>
                ))}
            </Stepper>
        </div>
    );
}

function AppointmentHeader({ title, onBack }) {
    return (
        <header className={styles.header}>
            <button className={styles.backButton} onClick={onBack} aria-label="戻る">
                <ArrowBack className={styles.icon} aria-hidden="true" />
            </button>
            <div className={styles.Htitle} style={{ margin: 'auto' }}>{title}</div>
        </header>
    );
}

// Step 0: Search / list
function AppointmentStep({ onProceed }) {
    const [type, setType] = useState(() => transportData.transports?.[0]?.type || '');
    const [carrier, setCarrier] = useState('');
    const [from, setFrom] = useState(() => initialRoute.from || '');
    const [to, setTo] = useState(() => initialRoute.to || '');
    const [date, setDate] = useState(() => {
        const d = new Date();
        return d.toISOString().slice(0,10);
    });
    const [hour, setHour] = useState('');
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

    // Prefer synchronous updates on user interactions to avoid mobile picker race conditions
    function handleTypeChange(value) {
        setType(value);
        const t = transportData.transports.find(tt => tt.type === value) || { carriers: [] };
        const firstCarrierName = t.carriers?.[0]?.name || '';
        setCarrier(firstCarrierName);
        const firstRoute = t.carriers?.[0]?.routes?.[0] || {};
        setFrom(firstRoute.from || '');
        setTo(firstRoute.to || '');
    }

    function handleCarrierChange(value) {
        setCarrier(value);
        const t = transportData.transports.find(tt => tt.type === type) || { carriers: [] };
        const c = (t.carriers || []).find(cc => cc.name === value) || { routes: [] };
        const firstRoute = c.routes?.[0] || {};
        setFrom(firstRoute.from || '');
        setTo(firstRoute.to || '');
    }

    useEffect(() => {
        // ensure date has a sensible default when type changes if not set
        if (!date) {
            const d = new Date();
            setDate(d.toISOString().slice(0,10));
        }
    }, [type]);

    function handleSearch(e) {
        e && e.preventDefault && e.preventDefault();
        if (!type || !from || !to || !date || hour === '' || !people || Number(people) < 1) {
            setFormError('種類・出発地・到着地・出発日・出発時間・人数を正しく入力してください。');
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
                    const times = r.times?.slice() || [];
                    times.forEach(time => {
                        if (Number(time.split(':')[0]) !== Number(hour)) return;
                        matches.push({
                            type: t.type,
                            carrier: c.name,
                            from: r.from,
                            to: r.to,
                            time,
                            times: [time],
                            price: r.price,
                        });
                    });
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
            <div className={styles.container}>
                <form className={styles.form} onSubmit={handleSearch}>
                    <label className={styles.label}>
                        事業者
                        <select value={carrier} onChange={e => handleCarrierChange(e.target.value)} className={styles.select}>
                            <option value="">すべて</option>
                            {carriers.map(c => (
                                <option key={c.name} value={c.name}>{c.name}</option>
                            ))}
                        </select>
                    </label>

                    <label className={styles.label}>
                        種類
                        <select value={type} onChange={e => handleTypeChange(e.target.value)} className={styles.select} required>
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
                        出発時間（時）
                        <select value={hour} onChange={e => setHour(e.target.value)} className={styles.select} required>
                            <option value="">選択してください</option>
                            {Array.from({ length: 24 }, (_, value) => (
                                <option key={value} value={value}>{value}時</option>
                            ))}
                        </select>
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
                            results.items.map(it => (
                                <div key={`${it.carrier}-${it.from}-${it.to}-${it.time}`} className={styles.card}>
                                    <div style={{ fontWeight: 700 }}>{it.carrier} • {it.type}</div>
                                    <div>{it.from} → {it.to}</div>
                                    <div>出発時刻: {it.time}</div>
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

        </div>
    );
}

// Step 1: Confirmation
function ConfirmationStep({ item, date, people, onConfirm }) {
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

    const fareMap = { '飛行機': 20000, '電車': 0, 'バス': 1500, '新幹線': 8000, 'レンタカー': 10000 };
    const pricePerPerson = item?.price ?? (item?.type ? (fareMap[item.type] || 0) : 0);
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
                    <button className={styles.buttonPrimary} onClick={confirm} disabled={isLoading}>
                        {isLoading ? '読み込み中...' : item?.type === '電車' ? 'ルートを保存' : '支払いに進む'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// Step 2: Decision / summary
function DecisionStep({ booking }) {
    const bookingNumber = booking?.number || ('R' + Date.now().toString(36).toUpperCase());
    const navigate = useNavigate();

    const completeBooking = () => {
        localStorage.setItem(latestBookingStorageKey, JSON.stringify(booking));
        navigate('/Itinerary', { state: { booking } });
    };

    return (
        <>
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
                    <button
                        className={styles.button}
                        onClick={completeBooking}
                    >
                        しおりに戻る
                    </button>
                </div>
            </div>

            <BtmNav />
        </>
    );
}

export default function AppointmentPage() {
    const location = useLocation();
    const navigate = useNavigate();
    const routeDraft = location.state?.bookingDraft || null;
    const [step, setStep] = useState(() => routeDraft ? 1 : 0); // 0: search, 1: confirm, 2: decision
    const [bookingDraft, setBookingDraft] = useState(routeDraft);

    const handleProceedFromSearch = ({ item, date, people }) => {
        setBookingDraft({ item, date, people });
        setStep(1);
    };

    const handleConfirm = (booking) => {
        if (booking.item?.type === '電車') {
            const savedRoutes = JSON.parse(localStorage.getItem(savedRoutesStorageKey) || '[]');
            const savedRoute = {
                ...booking,
                id: `route-${Date.now()}`,
                savedAt: new Date().toISOString(),
            };

            localStorage.setItem(savedRoutesStorageKey, JSON.stringify([...savedRoutes, savedRoute]));
            navigate('/Itinerary', { state: { savedRoute } });
            return;
        }

        // attach a generated booking number
        const bookingWithNum = { ...booking, number: 'R' + Date.now().toString(36).toUpperCase() + '-' + Math.floor(Math.random() * 9000 + 1000) };
        setBookingDraft(bookingWithNum);
        setStep(2);
    };

    const handleJump = (i) => {
        if (i <= step) setStep(i);
    };

    const stepTitles = ['予約画面', '乗降地を選択', '予約内容の確認'];

    const handleBack = () => {
        if (step === 0) {
            window.history.back();
            return;
        }
        setStep(step - 1);
    };

    return (
        <div>
            <AppointmentHeader title={stepTitles[step]} onBack={handleBack} />
            <ProgressTracker step={step} setStep={handleJump} />

            <div style={{ paddingBottom: 24 }}>
                {step === 0 && <AppointmentStep onProceed={handleProceedFromSearch} />}
                {step === 1 && <ConfirmationStep item={bookingDraft?.item} date={bookingDraft?.date} people={bookingDraft?.people} onConfirm={handleConfirm} />}
                {step === 2 && <DecisionStep booking={bookingDraft} />}
            </div>
        </div>
    );
}
