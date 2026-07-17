import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { WheelPicker, WheelPickerWrapper } from '@ncdai/react-wheel-picker';
import '@ncdai/react-wheel-picker/style.css';
import BtmNav from '../../components/bottomNav/BottomNav';
import ArrowBack from '../../assets/icons/arrow_back.svg?react';
import TrainIcon from '../../assets/icons/train.svg?react';
import AirplaneIcon from '../../assets/icons/airplane.svg?react';
import CarIcon from '../../assets/icons/car.svg?react';
import styles from './Appointment.module.css';
import transportData from './Appointment.json';
import stops from './Confirmation_options.json';

const latestBookingStorageKey = 'tabiLatestBooking';
const savedRoutesStorageKey = 'tabiMyRoutes';
const typeIcons = {
    '新幹線': TrainIcon,
    '飛行機': AirplaneIcon,
    'レンタカー': CarIcon,
};

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

function TimeWheelPicker({ hour, minute, hourOptions, minuteOptions, onHourChange, onMinuteChange }) {
    const pickerClassNames = {
        optionItem: styles.timeWheelOption,
        highlightWrapper: styles.timeWheelHighlight,
        highlightItem: styles.timeWheelHighlightItem,
    };

    return (
        <div className={styles.timeWheelField}>
            <WheelPickerWrapper className={styles.timeWheelWrapper}>
                <div className={styles.timeWheelColumn} aria-label="時間">
                    <WheelPicker
                        value={hour}
                        onValueChange={onHourChange}
                        options={hourOptions}
                        infinite
                        visibleCount={7}
                        optionItemHeight={36}
                        classNames={pickerClassNames}
                    />
                    <span className={styles.timeWheelUnit}>時</span>
                </div>
                <div className={styles.timeWheelColumn} aria-label="分">
                    <WheelPicker
                        value={minute}
                        onValueChange={onMinuteChange}
                        options={minuteOptions}
                        infinite
                        visibleCount={7}
                        optionItemHeight={36}
                        classNames={pickerClassNames}
                    />
                    <span className={styles.timeWheelUnit}>分</span>
                </div>
            </WheelPickerWrapper>
            <div className={styles.timeWheelValue} aria-live="polite">
                {hour}:{minute}
            </div>
        </div>
    );
}

function TimePickerField({ label, hour, minute, hourOptions, minuteOptions, onHourChange, onMinuteChange }) {
    const [isOpen, setIsOpen] = useState(false);
    const selectedTime = `${hour}:${minute}`;

    return (
        <div className={styles.timePickerField}>
            <button
                type="button"
                className={styles.timeInputButton}
                onClick={() => setIsOpen(true)}
                aria-haspopup="dialog"
                aria-expanded={isOpen}
            >
                <span>{selectedTime}</span>
            </button>

            {isOpen && (
                <div className={styles.timePickerOverlay} onClick={() => setIsOpen(false)}>
                    <div
                        className={styles.timePickerSheet}
                        role="dialog"
                        aria-modal="true"
                        aria-label={`${label}を選択`}
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className={styles.timePickerHeader}>
                            <div className={styles.timePickerTitle}>{label}</div>
                            <button
                                type="button"
                                className={styles.timePickerDone}
                                onClick={() => setIsOpen(false)}
                            >
                                決定
                            </button>
                        </div>
                        <TimeWheelPicker
                            hour={hour}
                            minute={minute}
                            hourOptions={hourOptions}
                            minuteOptions={minuteOptions}
                            onHourChange={onHourChange}
                            onMinuteChange={onMinuteChange}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}

function PeopleStepper({ value, onChange }) {
    const currentValue = Number(value) || 1;

    const updateValue = (nextValue) => {
        onChange(Math.max(1, nextValue));
    };

    return (
        <div className={styles.peopleStepper}>
            <button
                type="button"
                className={styles.stepperButton}
                onClick={() => updateValue(currentValue - 1)}
                disabled={currentValue <= 1}
                aria-label="人数を減らす"
            >
                -
            </button>
            <div className={styles.peopleValue} aria-live="polite">
                <span className={styles.peopleNumber}>{currentValue}</span>
                <span className={styles.peopleUnit}>名</span>
            </div>
            <button
                type="button"
                className={styles.stepperButton}
                onClick={() => updateValue(currentValue + 1)}
                aria-label="人数を増やす"
            >
                +
            </button>
        </div>
    );
}

// Step 0: Search / list
function AppointmentStep({ onProceed }) {
    const [type, setType] = useState(() => transportData.transports?.[0]?.type || '');
    const [carrier, setCarrier] = useState('');
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');
    const [date, setDate] = useState(() => {
        const d = new Date();
        return d.toISOString().slice(0,10);
    });
    const [returnDate, setReturnDate] = useState(() => {
        const d = new Date();
        return d.toISOString().slice(0,10);
    });
    const [hour, setHour] = useState('09');
    const [minute, setMinute] = useState('00');
    const [returnHour, setReturnHour] = useState('');
    const [people, setPeople] = useState(1);
    const [formError, setFormError] = useState('');
    const [results, setResults] = useState(null);
    const transportTypes = useMemo(() => (
        Array.from(new Set(transportData.transports.map(t => t.type)))
    ), []);
    const isRentalCar = type === 'レンタカー';
    const labels = isRentalCar
        ? {
            date: '利用開始日',
            hour: '利用開始時間',
            people: '乗車人数',
        }
        : type === '飛行機'
            ? {
                from: '出発地（空港）',
                to: '到着地（空港）',
                date: '出発日',
                hour: '出発時間',
                people: '人数',
                fromPlaceholder: '例: 羽田',
                toPlaceholder: '例: 福岡',
            }
            : {
                from: '出発地（駅）',
                to: '到着地（駅）',
                date: '出発日',
                hour: '出発時間',
                people: '人数',
                fromPlaceholder: '例: 東京',
                toPlaceholder: '例: 新大阪',
            };
    const hourValues = useMemo(() => (
        Array.from({ length: 24 }, (_, index) => String(index).padStart(2, '0'))
    ), []);
    const minuteValues = useMemo(() => (
        Array.from({ length: 60 }, (_, index) => String(index).padStart(2, '0'))
    ), []);
    const hourOptions = useMemo(() => (
        hourValues.map(value => ({ value, label: value }))
    ), [hourValues]);
    const minuteOptions = useMemo(() => (
        minuteValues.map(value => ({ value, label: value }))
    ), [minuteValues]);

    const transportsOfType = useMemo(() => {
        return transportData.transports.find(t => t.type === type) || { carriers: [] };
    }, [type]);

    const carriers = useMemo(() => transportsOfType.carriers || [], [transportsOfType]);

    const routePool = useMemo(() => {
        const pool = [];
        carriers.forEach(c => {
            (c.routes || []).forEach(r => pool.push({ ...r, carrier: c.name }));
        });
        return pool;
    }, [carriers]);

    const fromOptions = useMemo(() => Array.from(new Set(routePool.map(r => r.from))), [routePool]);
    const toOptions = useMemo(() => Array.from(new Set(routePool.map(r => r.to))), [routePool]);

    // Prefer synchronous updates on user interactions to avoid mobile picker race conditions
    function handleTypeChange(value) {
        setType(value);
        setCarrier('');
        setFrom('');
        setTo('');
        setHour('09');
        setMinute('00');
        setReturnHour('');
        setResults(null);
    }

    useEffect(() => {
        // ensure date has a sensible default when type changes if not set
        if (!date) {
            const d = new Date();
            setDate(d.toISOString().slice(0,10));
        }
        if (!returnDate) {
            const d = new Date();
            setReturnDate(d.toISOString().slice(0,10));
        }
    }, [type, date, returnDate]);

    function handleSearch(e) {
        e && e.preventDefault && e.preventDefault();
        if (!type || !date || !hour || !people || Number(people) < 1 || (isRentalCar && (!returnDate || !returnHour))) {
            setFormError(isRentalCar
                ? '種類・利用開始日・返却日・利用開始時間・返却時間・乗車人数を正しく入力してください。'
                : '種類・出発日・出発時間・人数を正しく入力してください。'
            );
            setResults(null);
            return;
        }
        setFormError('');
        const matches = [];
        const fromQuery = isRentalCar ? '' : from.trim();
        const toQuery = isRentalCar ? '' : to.trim();
        const timeQuery = isRentalCar ? hour.trim().replace('時', '') : `${hour}:${minute}`;

        transportData.transports.forEach(t => {
            if (t.type !== type) return;
            (t.carriers || []).forEach(c => {
                if (isRentalCar && carrier && c.name !== carrier) return;
                (c.routes || []).forEach(r => {
                    if (fromQuery && !r.from.includes(fromQuery)) return;
                    if (toQuery && !r.to.includes(toQuery)) return;
                    const times = r.times?.slice() || [];
                    times.forEach(time => {
                        const paddedHour = time.split(':')[0];
                        if (isRentalCar && timeQuery && paddedHour !== timeQuery.padStart(2, '0')) return;
                        if (!isRentalCar && timeQuery && time !== timeQuery) return;
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
                <div className={styles.typeField}>
                    <div className={styles.typeLabel}>種類</div>
                    <div className={styles.typeTabs} role="tablist" aria-label="交通手段の種類">
                        {transportTypes.map(tt => {
                            const TypeIcon = typeIcons[tt];

                            return (
                                <button
                                    key={tt}
                                    type="button"
                                    role="tab"
                                    aria-selected={type === tt}
                                    className={`${styles.typeTab} ${type === tt ? styles.typeTabActive : ''}`}
                                    onClick={() => handleTypeChange(tt)}
                                >
                                    {TypeIcon && <TypeIcon className={styles.typeTabIcon} aria-hidden="true" />}
                                    <span>{tt}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                <form className={styles.form} onSubmit={handleSearch}>
                    {isRentalCar && (
                        <label className={styles.label}>
                            事業者
                            <select value={carrier} onChange={e => setCarrier(e.target.value)} className={styles.select}>
                                <option value="">すべて</option>
                                {carriers.map(c => (
                                    <option key={c.name} value={c.name}>{c.name}</option>
                                ))}
                            </select>
                        </label>
                    )}

                    {!isRentalCar && (
                        <>
                            <label className={styles.label}>
                                {labels.from}
                                <input
                                    type="search"
                                    value={from}
                                    onChange={e => setFrom(e.target.value)}
                                    className={styles.input}
                                    list="appointment-from-options"
                                    placeholder={labels.fromPlaceholder}
                                />
                                <datalist id="appointment-from-options">
                                    {fromOptions.map(f => (
                                        <option key={f} value={f} />
                                    ))}
                                </datalist>
                            </label>

                            <label className={styles.label}>
                                {labels.to}
                                <input
                                    type="search"
                                    value={to}
                                    onChange={e => setTo(e.target.value)}
                                    className={styles.input}
                                    list="appointment-to-options"
                                    placeholder={labels.toPlaceholder}
                                />
                                <datalist id="appointment-to-options">
                                    {toOptions.map(option => (
                                        <option key={option} value={option} />
                                    ))}
                                </datalist>
                            </label>
                        </>
                    )}

                    {isRentalCar ? (
                        <div className={styles.dateTimeTable}>
                            <label className={styles.dateTimeCell}>
                                利用開始日
                                <input type="date" value={date} onChange={e => setDate(e.target.value)} className={styles.input} required />
                            </label>
                            <label className={styles.dateTimeCell}>
                                利用開始時間
                                <select value={hour} onChange={e => setHour(e.target.value)} className={styles.select} required>
                                    <option value="">選択してください</option>
                                    {hourValues.map(value => (
                                        <option key={value} value={value}>{Number(value)}時</option>
                                    ))}
                                </select>
                            </label>
                            <label className={styles.dateTimeCell}>
                                返却日
                                <input type="date" value={returnDate} onChange={e => setReturnDate(e.target.value)} className={styles.input} required />
                            </label>
                            <label className={styles.dateTimeCell}>
                                返却時間
                                <select value={returnHour} onChange={e => setReturnHour(e.target.value)} className={styles.select} required>
                                    <option value="">選択してください</option>
                                    {hourValues.map(value => (
                                        <option key={value} value={value}>{Number(value)}時</option>
                                    ))}
                                </select>
                            </label>
                        </div>
                    ) : (
                        <>
                            <label className={styles.label}>
                                {labels.date}
                                <input type="date" value={date} onChange={e => setDate(e.target.value)} className={styles.input} required />
                            </label>

                            <label className={styles.label}>
                                {labels.hour}
                                <TimePickerField
                                    label={labels.hour}
                                    hour={hour}
                                    minute={minute}
                                    hourOptions={hourOptions}
                                    minuteOptions={minuteOptions}
                                    onHourChange={setHour}
                                    onMinuteChange={setMinute}
                                />
                            </label>
                        </>
                    )}

                    <label className={styles.label}>
                        {labels.people}
                        <PeopleStepper value={people} onChange={setPeople} />
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
                                        <button className={styles.proceedButton} onClick={() => proceedBooking(it)}>
                                            {it.type === '電車' ? '保存に進む' : '予約に進む'}
                                        </button>
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
    const usesStationStops = item?.type === '電車' || item?.type === '新幹線';
    const peopleLabel = item?.type === 'レンタカー' ? '乗車人数' : '人数';
    const boardingOptions = usesStationStops ? [item.from] : stops.boarding;
    const alightingOptions = usesStationStops ? [item.to] : stops.alighting;

    useEffect(() => {
        if (item?.times && item.times.length > 0) setSelectedTime(item.times[0]);
        if (usesStationStops) {
            setBoarding(item.from);
            setAlighting(item.to);
        } else {
            setBoarding(stops.boarding?.[0] || '');
            setAlighting(stops.alighting?.[0] || '');
        }
    }, [item, usesStationStops]);

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
                            <div>{peopleLabel}: {people || 1} 名</div>
                            <div style={{ marginTop: 6, fontWeight: 700 }}>合計: {totalPrice.toLocaleString()} 円</div>
                        </div>
                    </>
                )}

                <label className={styles.label}>
                    {usesStationStops ? '乗車駅' : '乗車地'}
                    <select value={boarding} onChange={e => setBoarding(e.target.value)} className={styles.select}>
                        {boardingOptions.map(s => (
                            <option key={s} value={s}>{s}</option>
                        ))}
                    </select>
                </label>

                <label className={styles.label}>
                    {usesStationStops ? '降車駅' : '降車地'}
                    <select value={alighting} onChange={e => setAlighting(e.target.value)} className={styles.select}>
                        {alightingOptions.map(s => (
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
    const peopleLabel = booking?.item?.type === 'レンタカー' ? '乗車人数' : '人数';

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
                    <div>{peopleLabel}: {booking.people} 名</div>
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

            <div style={{ paddingBottom: 24 }}>
                {step === 0 && <AppointmentStep onProceed={handleProceedFromSearch} />}
                {step === 1 && <ConfirmationStep item={bookingDraft?.item} date={bookingDraft?.date} people={bookingDraft?.people} onConfirm={handleConfirm} />}
                {step === 2 && <DecisionStep booking={bookingDraft} />}
            </div>
        </div>
    );
}
