import { useContext, useState } from 'react';
import { Stepper } from 'react-form-stepper';
import { TripContext } from '../../App';
import ScheduleTimeAxis from '../../components/Schedule/ScheduleTimeAxis';
import BottomNav from '../../components/bottomNav/BottomNav';
import Header from '../../components/header/Header';
import styles from './Schedulepage.module.css';

const days = [
    { id: 'day1', date: '6/28(日)' },
    { id: 'day2', date: '6/29(月)' },
    { id: 'day3', date: '6/30(火)' },
];

export default function SchedulePage() {
    const { tripName } = useContext(TripContext);
    const [selectedDay, setSelectedDay] = useState('day1');
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
                            size: '30px',
                            circleFontSize: '13px',
                            labelFontSize: '12px',
                            borderRadius: '999px',
                            fontWeight: 700,
                        }}
                        connectorStyleConfig={{
                            activeColor: subColor,
                            completedColor: subColor,
                            disabledColor: otherColor,
                            size: 2,
                            stepSize: '30px',
                        }}
                    />

                    <div className={styles.stepperClickLayer} aria-label="日付を切り替え">
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
        </div>
    );
}
