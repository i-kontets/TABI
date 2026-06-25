import { Timeline } from '@mantine/core';
import styles from './ScheduleTimeAxis.module.css';

const scheduleTimes = {
    day1: ['09:00', '10:30', '12:00', '13:15', '15:00'],
    day2: ['09:30', '11:00', '13:30', '16:00'],
    day3: ['10:00', '12:00', '14:30'],
};

export default function ScheduleTimeAxis({ selectedDay }) {
    const times = scheduleTimes[selectedDay] ?? [];

    if (times.length === 0) {
        return null;
    }

    return (
        <section className={styles.timelineSection} aria-label="スケジュール時間軸">
            <Timeline
                active={times.length - 1}
                align="right"
                bulletSize={22}
                color="var(--sub-color)"
                lineWidth={4}
                classNames={{
                    root: styles.timeAxis,
                    item: styles.timeItem,
                    itemTitle: styles.timeLabel,
                    itemBullet: styles.timeBullet,
                }}
            >
                {times.map((time) => (
                    <Timeline.Item key={time} title={time} />
                ))}
            </Timeline>
        </section>
    );
}
