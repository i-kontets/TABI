import { useEffect, useState } from 'react';
import { Avatar, Timeline } from '@mantine/core';
import styles from './ScheduleTimeAxis.module.css';

const GROUP_COLORS = {
    '全員': 'var(--sub-color)',
    'グループA': '#FF8A65',
    'グループB': '#5B9BD5',
};
const MY_MEMBER_NAME = '自分';

const generateHours = (overrides = {}) =>
    Array.from({ length: 24 }, (_, i) => {
        const time = `${String(i).padStart(2, '0')}:00`;
        return { time, events: overrides[time] ?? [] };
    });

const scheduleData = {
    day1: generateHours({
        '09:00': [
            { group: '全員', title: 'ホテル出発' },
        ],
        '10:00': [
            { group: 'グループA', title: 'コテージ到着', endTime: '10:20', members: ['自分', '田中', '鈴木'] },
            { group: 'グループB', title: '買い出し', endTime: '10:40', members: ['佐藤', '自分'] },
            { group: 'グループB', title: '買い出し', endTime: '10:50', members: ['佐藤'] },
            { group: 'グループB', title: '買い出し', endTime: '11:00', members: ['佐藤'] },
            { group: 'グループB', title: '買い出し', endTime: '11:20', members: ['佐藤'] },
        ],
        '11:00': [
            { group: '全員', title: '昼食・休憩', endTime: '11:10' },
            { group: '全員', title: '昼食・休憩', endTime: '12:00' },
            { group: '全員', title: '昼食・休憩', endTime: '12:00' },
        ],
        '12:00': [
            { group: '全員', title: '昼食・休憩', endTime: '13:00' },
            { group: '全員', title: '昼食・休憩', endTime: '13:00' },
            { group: '全員', title: '昼食・休憩', endTime: '12:300' },
        ],
        '14:00': [
            { group: '全員', title: '昼食・休憩' },
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
const EVENTS_PER_ROW = 2;
const TIMELINE_PADDING_TOP = 36;
const TIMELINE_BULLET_CENTER = 11;

function isCompactSlot(item) {
    return item.events.length === 0;
}

function getEventRows(item) {
    return Math.max(Math.ceil(item.events.length / EVENTS_PER_ROW), 1);
}

function getSlotVisualHeight(item) {
    if (isCompactSlot(item)) {
        return COMPACT_SLOT_HEIGHT + COMPACT_SLOT_MARGIN_BOTTOM;
    }

    return getEventRows(item) * SLOT_HEIGHT;
}

function getSlotStyle(item) {
    if (isCompactSlot(item)) {
        return { minHeight: COMPACT_SLOT_HEIGHT, marginBottom: COMPACT_SLOT_MARGIN_BOTTOM };
    }

    const slotHeight = getSlotVisualHeight(item);
    return slotHeight > SLOT_HEIGHT ? { minHeight: slotHeight } : undefined;
}

function formatTime(date) {
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function getCurrentTimeTop(items, now) {
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:00`;
    const currentIndex = items.findIndex((item) => item.time === currentTime);

    if (currentIndex === -1) {
        return null;
    }

    const offsetBeforeCurrent = items
        .slice(0, currentIndex)
        .reduce((total, item) => total + getSlotVisualHeight(item), 0);
    const currentItem = items[currentIndex];
    const currentHeight = getSlotVisualHeight(currentItem);
    const minuteOffset = currentHeight * (now.getMinutes() / 60);

    return TIMELINE_PADDING_TOP + TIMELINE_BULLET_CENTER + offsetBeforeCurrent + minuteOffset;
}

function isCurrentTimeOverEvent(items, now) {
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:00`;
    return items.some((item) => item.time === currentTime && item.events.length > 0);
}

function filterItemsByView(items, viewMode) {
    if (viewMode === 'all') {
        return items;
    }

    return items.map((item) => ({
        ...item,
        events: item.events.filter((event) => (
            event.group === '全員' || event.members?.includes(MY_MEMBER_NAME)
        )),
    }));
}

export default function ScheduleTimeAxis({ selectedDay }) {
    const [now, setNow] = useState(() => new Date());
    const [viewMode, setViewMode] = useState('all');
    const baseItems = scheduleData[selectedDay] ?? [];
    const items = filterItemsByView(baseItems, viewMode);

    useEffect(() => {
        const timerId = window.setInterval(() => {
            setNow(new Date());
        }, 60000);

        return () => window.clearInterval(timerId);
    }, []);

    if (items.length === 0) {
        return null;
    }

    const currentTimeTop = getCurrentTimeTop(items, now);
    const currentTimeOverEvent = isCurrentTimeOverEvent(items, now);

    return (
        <section className={styles.timelineSection} aria-label="スケジュール時間軸">
            <div className={styles.viewToggle} aria-label="スケジュール表示切り替え">
                <button
                    type="button"
                    className={`${styles.viewToggleButton} ${viewMode === 'all' ? styles.viewToggleButtonActive : ''}`}
                    onClick={() => setViewMode('all')}
                >
                    全体
                </button>
                <button
                    type="button"
                    className={`${styles.viewToggleButton} ${viewMode === 'mine' ? styles.viewToggleButtonActive : ''}`}
                    onClick={() => setViewMode('mine')}
                >
                    自分
                </button>
            </div>

            <div className={styles.timelineBody}>
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
                        return (
                            <Timeline.Item
                                key={item.time}
                                title={item.time}
                                style={getSlotStyle(item)}
                            />
                        );
                    })}
                </Timeline>

                <div className={styles.cardsColumn}>
                    {items.map((item, index) => {
                        const isLast = index === items.length - 1;
                        return (
                            <div
                                key={item.time}
                                className={isLast ? styles.cardSlotLast : styles.cardSlot}
                                style={getSlotStyle(item)}
                            >
                                {item.events.map((event, i) => (
                                    <div key={i} className={styles.scheduleCard}>
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
                                    </div>
                                ))}
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
