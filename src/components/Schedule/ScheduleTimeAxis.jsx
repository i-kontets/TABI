import { Avatar, Timeline } from '@mantine/core';
import styles from './ScheduleTimeAxis.module.css';

const GROUP_COLORS = {
    '全員': 'var(--sub-color)',
    'グループA': '#FF8A65',
    'グループB': '#5B9BD5',
};

const generateHours = (overrides = {}) =>
    Array.from({ length: 24 }, (_, i) => {
        const time = `${String(i).padStart(2, '0')}:00`;
        return { time, events: overrides[time] ?? [] };
    });

const scheduleData = {
    day1: generateHours({
        '09:00': [
            { group: '全員', title: 'ホテル出発', members: ['田中', '鈴木', '佐藤'], endTime: '10:00' },
        ],
        '10:00': [
            { group: 'グループA', title: 'コテージ到着', members: ['田中', '鈴木'], endTime: '11:00' },
            { group: 'グループB', title: '買い出し', members: ['佐藤'], endTime: '12:00' },
        ],
        '11:00': [
            { group: '全員', title: '昼食・休憩', endTime: '13:00' },
        ],
    }),
    day2: generateHours(),
    day3: generateHours(),
    day4: generateHours(),
    day5: generateHours(),
};

const SLOT_HEIGHT = 104;

function buildShadowedTimes(items) {
    const slotsWithEvents = new Set(
        items.filter((item) => item.events.length > 0).map((item) => item.time)
    );
    const shadowed = new Set();
    items.forEach((item) => {
        item.events.forEach((event) => {
            if (!event.endTime) return;
            const startH = parseInt(item.time);
            const endH = parseInt(event.endTime);
            for (let h = startH + 1; h < endH; h++) {
                const t = `${String(h).padStart(2, '0')}:00`;
                if (!slotsWithEvents.has(t)) shadowed.add(t);
            }
        });
    });
    return shadowed;
}

function getSpan(startTime, endTime, items) {
    if (!endTime) return 1;
    const startH = parseInt(startTime);
    const endH = parseInt(endTime);
    for (let h = startH + 1; h < endH; h++) {
        const t = `${String(h).padStart(2, '0')}:00`;
        if (items.some((item) => item.time === t && item.events.length > 0)) {
            return h - startH;
        }
    }
    return endH - startH;
}

export default function ScheduleTimeAxis({ selectedDay }) {
    const items = scheduleData[selectedDay] ?? [];

    if (items.length === 0) {
        return null;
    }

    const shadowedTimes = buildShadowedTimes(items);

    return (
        <section className={styles.timelineSection} aria-label="スケジュール時間軸">
            <Timeline
                active={items.length - 1}
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
                {items.map((item) => (
                    <Timeline.Item key={item.time} title={item.time} />
                ))}
            </Timeline>

            <div className={styles.cardsColumn}>
                {items.map((item, index) => {
                    if (shadowedTimes.has(item.time)) {
                        return <div key={item.time} style={{ height: 0, minHeight: 0, padding: 0 }} />;
                    }
                    const isLast = index === items.length - 1;
                    return (
                        <div
                            key={item.time}
                            className={isLast ? styles.cardSlotLast : styles.cardSlot}
                        >
                            {item.events.map((event, i) => {
                                const span = getSpan(item.time, event.endTime, items);
                                return (
                                    <div
                                        key={i}
                                        className={styles.scheduleCard}
                                        style={span > 1 ? { height: span * SLOT_HEIGHT - 8 } : undefined}
                                    >
                                        {event.group && (
                                            <span
                                                className={styles.groupBadge}
                                                style={{ background: GROUP_COLORS[event.group] ?? 'var(--sub-color)' }}
                                            >
                                                {event.group}
                                            </span>
                                        )}
                                        {event.group !== '全員' && event.members?.length > 0 && (
                                            <div className={styles.memberRow}>
                                                {event.members.map((name) => (
                                                    <Avatar key={name} size={26} radius="xl" color="var(--sub-color)" title={name}>
                                                        {name[0]}
                                                    </Avatar>
                                                ))}
                                            </div>
                                        )}
                                        <p className={styles.scheduleTitle}>{event.title}</p>
                                        {event.endTime && (
                                            <p className={styles.scheduleDuration}>⏱ {event.endTime}まで</p>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    );
                })}
            </div>
        </section>
    );
}
