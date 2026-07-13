import { useContext, useState } from 'react';
import { Stepper } from 'react-form-stepper';
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
    const selectedDayIndex = days.findIndex((day) => day.id === selectedDay);
    const rootStyles = getComputedStyle(document.documentElement);
    const subColor = rootStyles.getPropertyValue('--sub-color').trim();
    const otherColor = rootStyles.getPropertyValue('--other-color').trim();

    return (
        <div className={styles.container}>
            <Header tripName={tripName || '伊豆・海辺の週末'} />

            <main className={styles.content}>
                <section className={styles.dayPanel} aria-label="日付選択">
                    <Stepper
                        steps={days.map((day) => ({ label: day.date }))}
                        activeStep={selectedDayIndex}
                        connectorStateColors
                        className={styles.dayStepper}
                        styleConfig={{
                            activeBgColor: subColor,
                            activeTextColor: '#ffffff',
                            completedBgColor: subColor,
                            completedTextColor: '#ffffff',
                            inactiveBgColor: otherColor,
                            inactiveTextColor: subColor,
                            size: '38px',
                            circleFontSize: '0',
                            labelFontSize: '12px',
                            borderRadius: '999px',
                            fontWeight: 700,
                        }}
                        connectorStyleConfig={{
                            activeColor: subColor,
                            completedColor: subColor,
                            disabledColor: otherColor,
                            size: 2,
                            stepSize: '38px',
                        }}
                    />

                    <div className={styles.stepperDayLayer} style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` }} aria-hidden="true">
                        {days.map((day, index) => {
                            const isActive = selectedDay === day.id;

                            return (
                                <span
                                    key={day.id}
                                    className={`${styles.stepperDayText} ${isActive ? styles.stepperDayTextActive : ''}`}
                                >
                                    <span className={styles.stepperDayLabel}>day</span>
                                    <span className={styles.stepperDayNumber}>{index + 1}</span>
                                </span>
                            );
                        })}
                    </div>

                    <div className={styles.stepperClickLayer} style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` }} aria-label="日付を切り替え">
                        {days.map((day) => (
                            <button
                                key={day.id}
                                className={styles.stepperClickTarget}
                                type="button"
                                onClick={() => setSelectedDay(day.id)}
                                aria-label={`${day.date}の予定を表示`}
                            />
                        ))}
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
