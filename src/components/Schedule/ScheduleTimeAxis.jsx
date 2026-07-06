import { useEffect, useState } from 'react';
import { Tabs, Timeline } from '@mantine/core';
import groupIcon from '../../assets/icons/groups.svg';
import personIcon from '../../assets/icons/person.svg';
import styles from './ScheduleTimeAxis.module.css';

const GROUP_COLORS = {
    '全員': 'var(--sub-color)',
    'グループA': '#FF8A65',
    'グループB': '#5B9BD5',
};
const MY_MEMBER_NAME = '自分';

function getHourSlot(time) {
    return `${time.slice(0, 2)}:00`;
}

function getMinutesFromTime(time) {
    return Number(time.slice(3, 5));
}

function getTotalMinutesFromTime(time) {
    const [hours, minutes] = time.split(':').map(Number);
    return (hours * 60) + minutes;
}

function getTotalMinutesFromDate(date) {
    return (date.getHours() * 60) + date.getMinutes();
}

function isHourStartTime(time) {
    return getMinutesFromTime(time) === 0;
}

function isEventRunning(event, now) {
    if (!event.endTime) {
        return false;
    }

    const currentMinutes = getTotalMinutesFromDate(now);
    const startMinutes = getTotalMinutesFromTime(event.time);
    const endMinutes = getTotalMinutesFromTime(event.endTime);

    if (endMinutes < startMinutes) {
        return currentMinutes >= startMinutes || currentMinutes < endMinutes;
    }

    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
}

function groupEventsByHour(overrides) {
    return Object.entries(overrides).reduce((eventsByHour, [time, events]) => {
        const hourSlot = getHourSlot(time);
        const timedEvents = events.map((event) => ({ ...event, time }));

        eventsByHour[hourSlot] = [...(eventsByHour[hourSlot] ?? []), ...timedEvents]
            .sort((a, b) => getMinutesFromTime(a.time) - getMinutesFromTime(b.time));

        return eventsByHour;
    }, {});
}

function groupEventsByStartTime(events) {
    return events.reduce((eventGroups, event) => {
        const existingGroup = eventGroups.find((group) => group.time === event.time);

        if (existingGroup) {
            existingGroup.events.push(event);
            return eventGroups;
        }

        return [...eventGroups, { time: event.time, events: [event] }];
    }, []);
}

const generateHours = (overrides = {}) => {
    const eventsByHour = groupEventsByHour(overrides);

    return Array.from({ length: 24 }, (_, i) => {
        const time = `${String(i).padStart(2, '0')}:00`;
        return { time, events: eventsByHour[time] ?? [] };
    });
};

const scheduleData = {
    day1: generateHours({
        '09:00': [
            { group: '全員', title: 'ホテル出発', endTime: '09:30' },
        ],
        '10:10': [
            { group: '全員', title: 'ホテル出発', endTime: '10:30' },
            { group: '全員', title: 'ホテル出発', endTime: '10:30' },
            { group: '全員', title: 'ホテル出発', endTime: '10:30' },
        ],
        '10:20': [
            { group: '全員', title: 'ホテル出発', endTime: '10:30' },
        ],
        '10:00': [
            { group: 'グループA', title: 'コテージ到着', endTime: '10:20', members: ['自分', '田中', '鈴木'] },
            { group: 'グループB', title: '買い出し', endTime: '10:40', members: ['佐藤', '自分'] },
            { group: 'グループB', title: '買い出し', endTime: '10:50', members: ['佐藤'] },
            { group: 'グループB', title: '買い出し', endTime: '11:00', members: ['佐藤'] },
            { group: 'グループB', title: '買い出し', endTime: '11:10', members: ['佐藤'] },
        ],
        '11:00': [
            { group: '全員', title: '昼食・休憩', endTime: '12:00' },
            { group: '全員', title: '昼食・休憩', endTime: '12:00' },
            { group: '全員', title: '昼食・休憩', endTime: '12:00' },
        ],
        '12:00': [
            { group: '全員', title: '昼食・休憩', endTime: '13:00' },
            { group: '全員', title: '昼食・休憩', endTime: '13:00' },
            { group: '全員', title: '昼食・休憩', endTime: '13:00' },
        ],
        '14:00': [
            { group: '全員', title: '昼食・休憩', endTime: '14:20' },
        ],
        '14:20': [
            { group: '全員', title: '昼食・休憩', endTime: '15:00' },
        ],
        '15:20': [
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
const EVENTS_PER_ROW = 2;
const SUB_TIME_LABEL_HEIGHT = 22;

function isCompactSlot(item) {
    return item.events.length === 0;
}

function getEventGroupVisualHeight(eventGroup) {
    const rowsHeight = Math.max(Math.ceil(eventGroup.events.length / EVENTS_PER_ROW), 1) * SLOT_HEIGHT;
    return isHourStartTime(eventGroup.time) ? rowsHeight : rowsHeight + SUB_TIME_LABEL_HEIGHT;
}

function getSlotVisualHeight(item) {
    if (isCompactSlot(item)) {
        return COMPACT_SLOT_HEIGHT + COMPACT_SLOT_MARGIN_BOTTOM;
    }

    return groupEventsByStartTime(item.events).reduce((totalHeight, eventGroup) => {
        return totalHeight + getEventGroupVisualHeight(eventGroup);
    }, 0);
}

function getSlotStyle(item) {
    if (isCompactSlot(item)) {
        return { minHeight: COMPACT_SLOT_HEIGHT, marginBottom: COMPACT_SLOT_MARGIN_BOTTOM };
    }

    const slotHeight = getSlotVisualHeight(item);
    return slotHeight > SLOT_HEIGHT ? { minHeight: slotHeight } : undefined;
}

function formatEventTimeRange(event) {
    return event.endTime ? `${event.time} - ${event.endTime}` : `${event.time} - 未定`;
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

function filterVisibleItems(items) {
    const lastEventIndex = items.findLastIndex((item) => item.events.length > 0);

    if (lastEventIndex === -1) {
        return [];
    }

    return items.filter((item, index) => (
        item.events.length > 0 || index === lastEventIndex + 1
    ));
}

export default function ScheduleTimeAxis({ selectedDay }) {
    const [viewMode, setViewMode] = useState('all');
    const [now, setNow] = useState(() => new Date());
    const baseItems = scheduleData[selectedDay] ?? [];
    const items = filterVisibleItems(filterItemsByView(baseItems, viewMode));

    useEffect(() => {
        const timerId = window.setInterval(() => {
            setNow(new Date());
        }, 60000);

        return () => window.clearInterval(timerId);
    }, []);

    if (items.length === 0) {
        return null;
    }

    return (
        <section className={styles.timelineSection} aria-label="スケジュール時間軸">
            <Tabs
                value={viewMode}
                onChange={setViewMode}
                data-view-mode={viewMode}
                className={styles.viewToggle}
                classNames={{
                    list: styles.viewToggleList,
                    tab: styles.viewToggleTab,
                }}
                aria-label="スケジュール表示切り替え"
            >
                <Tabs.List grow>
                    <Tabs.Tab value="all">
                        <span className={styles.viewToggleTabLabel}>
                            <img className={styles.viewToggleIcon} src={groupIcon} alt="" aria-hidden="true" />
                            全体
                        </span>
                    </Tabs.Tab>
                    <Tabs.Tab value="mine">
                        <span className={styles.viewToggleTabLabel}>
                            <img className={styles.viewToggleIcon} src={personIcon} alt="" aria-hidden="true" />
                            自分
                        </span>
                    </Tabs.Tab>
                </Tabs.List>
            </Tabs>

            <div key={viewMode} className={styles.timelineBody}>
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
                                {groupEventsByStartTime(item.events).map((eventGroup) => (
                                    <div key={eventGroup.time} className={styles.timeGroup}>
                                        {!isHourStartTime(eventGroup.time) && (
                                            <p className={styles.subTimeLabel}>{eventGroup.time}</p>
                                        )}
                                        {eventGroup.events.map((event, i) => {
                                            const eventRunning = isEventRunning(event, now);

                                            return (
                                                <div key={`${event.time}-${i}`} className={styles.scheduleCard}>
                                                    <div className={styles.cardMeta}>
                                                        {eventRunning && (
                                                            <span className={styles.runningStatus} aria-label="実行中">
                                                                <span className={styles.runningDot} />
                                                                <span className={styles.runningText}>実行中</span>
                                                            </span>
                                                        )}
                                                        {event.group && (
                                                            <span
                                                                className={styles.groupBadge}
                                                                style={{ background: GROUP_COLORS[event.group] ?? 'var(--sub-color)' }}
                                                            >
                                                                {event.group}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className={styles.timeRange}>{formatEventTimeRange(event)}</p>
                                                    <p className={styles.scheduleTitle}>{event.title}</p>
                                                </div>
                                            );
                                        })}
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
