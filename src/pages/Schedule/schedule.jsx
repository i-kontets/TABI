import { useContext, useState } from 'react';
import { TripContext } from '../../App';
import ScheduleTimeAxis from '../../components/Schedule/ScheduleTimeAxis';
import BottomNav from '../../components/bottomNav/BottomNav';
import Header from '../../components/header/Header';
import Modal from '../../components/Modal/Modal';
import addIcon from '../../assets/icons/add.svg';
import styles from './Schedulepage.module.css';

const days = [
    { id: 'day1', date: '6/28(日)' },
    { id: 'day2', date: '6/29(月)' },
    { id: 'day3', date: '6/30(火)' },
    { id: 'day4', date: '7/1(水)' },
    { id: 'day5', date: '7/2(木)' },
];

export default function SchedulePage() {
    const { tripName } = useContext(TripContext);
    const [selectedDay, setSelectedDay] = useState('day1');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    return (
        <div className={styles.container}>
            <Header tripName={tripName || '伊豆・海辺の週末'} />

            <main className={styles.content}>
                <section className={styles.dayPanel} aria-label="日付選択">
                    <div className={styles.dayStepper} style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` }}>
                        {days.map((day, index) => {
                            const isActive = selectedDay === day.id;
                            const isCompleted = days.findIndex((item) => item.id === selectedDay) > index;

                            return (
                                <button
                                    key={day.id}
                                    className={`${styles.dayStep} ${isActive ? styles.dayStepActive : ''} ${isCompleted ? styles.dayStepCompleted : ''}`}
                                    type="button"
                                    onClick={() => setSelectedDay(day.id)}
                                    aria-label={`${day.date}の予定を表示`}
                                    aria-current={isActive ? 'step' : undefined}
                                >
                                    {index > 0 && <span className={styles.dayStepConnector} aria-hidden="true" />}
                                    <span className={styles.dayStepCircle}>
                                        <span className={styles.dayStepPrefix}>day</span>
                                        <span className={styles.dayStepNumber}>{index + 1}</span>
                                    </span>
                                    <span className={styles.dayStepDate}>{day.date}</span>
                                </button>
                            );
                        })}
                    </div>
                </section>

                <ScheduleTimeAxis selectedDay={selectedDay} />
            </main>

            <BottomNav />

            <button
                type="button"
                className={styles.createButton}
                onClick={() => setIsAddModalOpen(true)}
                aria-label="予定を追加"
            >
                <img src={addIcon} alt="" className={styles.plusIcon} />
            </button>

            <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} />
        </div>
    );
}
