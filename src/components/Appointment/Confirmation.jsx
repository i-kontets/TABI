import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import BtmNav from '../bottomNav/BottomNav';
import ArrowBack from '../../assets/icons/arrow_back.svg?react';
import styles from '../../pages/Appointment/Appointment.module.css';
import stops from '../../pages/Appointment/confirmation_options.json';

function ConfirmationComponent() {
    const navigate = useNavigate();
    const location = useLocation();
    const { item, date, people } = location.state || {};
    const [boarding, setBoarding] = useState(stops.boarding?.[0] || '');
    const [alighting, setAlighting] = useState(stops.alighting?.[0] || '');
    const [selectedTime, setSelectedTime] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const timeoutRef = useRef(null);

    useEffect(() => {
        if (item?.times && item.times.length > 0) setSelectedTime(item.times[0]);
    }, [item]);

    React.useEffect(() => {
        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, []);

    // simple fare map (per person)
    const fareMap = {
        'バス': 1500,
        '新幹線': 8000,
        'レンタカー': 10000
    };

    const pricePerPerson = item?.type ? (fareMap[item.type] || 0) : 0;
    const totalPrice = pricePerPerson * (people || 1);

    const BackClick = () => navigate(-1);

    const confirm = () => {
                if (isLoading) return;
                const booking = { item, people: people || 1, date, time: selectedTime, boarding, alighting, pricePerPerson, totalPrice };
                const bookingNumber = 'R' + Date.now().toString(36).toUpperCase() + '-' + Math.floor(Math.random() * 9000 + 1000);
                setIsLoading(true);
                timeoutRef.current = setTimeout(() => {
                    navigate('/decision', { state: { booking, bookingNumber } });
                }, 3000);
            }

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
            <BtmNav />
        </>
    );
}

export default ConfirmationComponent;
