import { useEffect, useState } from 'react';
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
        '14:00': [
            { group: '全員', title: '昼食・休憩', endTime: '16:00' },
        ],
    }),
    day2: generateHours(),
    day3: generateHours(),
    day4: generateHours(),
    day5: generateHours(),
};

const SLOT_HEIGHT = 104;
const COMPACT_SLOT_HEIGHT = 22;
const COMPACT_SLOT_MARGIN_BOTTOM = 30;
const TIMELINE_PADDING_TOP = 36;
const TIMELINE_BULLET_CENTER = 11;

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

function isCompactSlot(item) {
    return item.events.length === 0;
}

function getSlotVisualHeight(item, shadowedTimes, isLast) {
    if (isCompactSlot(item) && !shadowedTimes.has(item.time)) {
        return COMPACT_SLOT_HEIGHT + COMPACT_SLOT_MARGIN_BOTTOM;
    }

    return isLast ? COMPACT_SLOT_HEIGHT : SLOT_HEIGHT;
}

function formatTime(date) {
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function getCurrentTimeTop(items, shadowedTimes, now) {
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:00`;
    const currentIndex = items.findIndex((item) => item.time === currentTime);

    if (currentIndex === -1) {
        return null;
    }

    const offsetBeforeCurrent = items
        .slice(0, currentIndex)
        .reduce((total, item, index) => (
            total + getSlotVisualHeight(item, shadowedTimes, index === items.length - 1)
        ), 0);
    const currentItem = items[currentIndex];
    const currentHeight = getSlotVisualHeight(currentItem, shadowedTimes, currentIndex === items.length - 1);
    const minuteOffset = currentHeight * (now.getMinutes() / 60);

    return TIMELINE_PADDING_TOP + TIMELINE_BULLET_CENTER + offsetBeforeCurrent + minuteOffset;
}

function isCurrentTimeOverEvent(items, now) {
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    return items.some((item) => {
        const startHour = parseInt(item.time);
        const startMinutes = startHour * 60;

        return item.events.some((event) => {
            const endHour = parseInt(event.endTime ?? item.time) || startHour + 1;
            const endMinutes = endHour * 60;
            return currentMinutes >= startMinutes && currentMinutes < endMinutes;
        });
    });
}

export default function ScheduleTimeAxis({ selectedDay }) {
    const [now, setNow] = useState(() => new Date());
    const items = scheduleData[selectedDay] ?? [];

    useEffect(() => {
        const timerId = window.setInterval(() => {
            setNow(new Date());
        }, 60000);

        return () => window.clearInterval(timerId);
    }, []);

    if (items.length === 0) {
        return null;
    }

    const shadowedTimes = buildShadowedTimes(items);
    const currentTimeTop = getCurrentTimeTop(items, shadowedTimes, now);
    const currentTimeOverEvent = isCurrentTimeOverEvent(items, now);

    return (
        <section className={styles.timelineSection} aria-label="スケジュール時間軸">
            {currentTimeTop !== null && (
                <div
                    className={`${styles.currentTimeLine} ${currentTimeOverEvent ? styles.currentTimeLineShort : ''}`}
                    style={{ top: currentTimeTop }}
                    aria-label={`現在時刻 ${formatTime(now)}`}
                >
                    <span className={styles.currentTimeLabel}>{formatTime(now)}</span>
                </div>
            )}

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
                {items.map((item) => {
                    const isCompact = isCompactSlot(item) && !shadowedTimes.has(item.time);
                    return (
                        <Timeline.Item
                            key={item.time}
                            title={item.time}
                            style={isCompact ? { minHeight: COMPACT_SLOT_HEIGHT, marginBottom: COMPACT_SLOT_MARGIN_BOTTOM } : undefined}
                        />
                    );
                })}
            </Timeline>

            <div className={styles.cardsColumn}>
                {items.map((item, index) => {
                    const isCompact = isCompactSlot(item);
                    if (shadowedTimes.has(item.time)) {
                        return <div key={item.time} style={{ height: 0, minHeight: 0, padding: 0 }} />;
                    }
                    const isLast = index === items.length - 1;
                    return (
                        <div
                            key={item.time}
                            className={isLast ? styles.cardSlotLast : styles.cardSlot}
                            style={isCompact ? { minHeight: COMPACT_SLOT_HEIGHT, marginBottom: COMPACT_SLOT_MARGIN_BOTTOM } : undefined}
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
