import { useEffect, useState } from 'react';
import { Avatar, Timeline } from '@mantine/core';
import styles from './ScheduleTimeAxis.module.css';

const GROUP_COLORS = {
    '全員': 'var(--sub-color)',
};
const MY_USER_ID = 1;

// これはローカルで作成する際に使用するtestデータです。
// もしDB接続後も残っている場合は一応小野に確認取ってくれると嬉しいです。
const users = [
    { userId: 1, name: '自分' },
    { userId: 2, name: '田中' },
    { userId: 3, name: '鈴木' },
    { userId: 4, name: '山本' },
    { userId: 5, name: '中村' },
    { userId: 6, name: '高橋' },
    { userId: 7, name: '佐藤' },
];

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

const generateHours = (overrides = {}) =>
    Array.from({ length: 24 }, (_, i) => {
        const time = `${String(i).padStart(2, '0')}:00`;
        return { time, events: eventsByHour[time] ?? [] };
    });
};

const scheduleData = {
    day1: generateHours({
        '09:00': [
            { id: 1, group: '全員', title: 'ホテル出発', endTime: '09:30', userIds: null },
        ],
        '10:10': [
            { id: 2, group: '全員', title: 'ホテル出発', endTime: '10:30', userIds: null },
            { id: 3, group: '全員', title: 'ホテル出発', endTime: '10:30', userIds: null },
            { id: 4, group: '全員', title: 'ホテル出発', endTime: '10:30', userIds: null },
        ],
        '10:20': [
            { id: 5, group: '全員', title: 'ホテル出発', endTime: '10:30', userIds: null },
        ],
        '10:00': [
            { id: 6, group: null, title: 'コテージ到着', endTime: '10:20', userIds: [1, 2, 3, 4, 5, 6, 6, 6] },
            { id: 7, group: null, title: '買い出し', endTime: '10:40', userIds: [7, 1] },
            { id: 8, group: null, title: '買い出し', endTime: '10:50', userIds: [7] },
            { id: 9, group: null, title: '買い出し', endTime: '11:00', userIds: [7] },
            { id: 10, group: null, title: '買い出し', endTime: '11:20', userIds: [7] },
        ],
        '11:00': [
            { id: 11, group: '全員', title: '昼食・休憩', endTime: '11:10', userIds: null },
            { id: 12, group: '全員', title: '昼食・休憩', endTime: '12:00', userIds: null },
            { id: 13, group: '全員', title: '昼食・休憩', endTime: '12:00', userIds: null },
        ],
        '12:00': [
            { id: 14, group: '全員', title: '昼食・休憩', endTime: '13:00', userIds: null },
            { id: 15, group: '全員', title: '昼食・休憩', endTime: '13:00', userIds: null },
            { id: 16, group: '全員', title: '昼食・休憩', endTime: '12:30', userIds: null },
        ],
        '14:00': [
            { id: 17, group: '全員', title: '昼食・休憩', endTime: '14:20', userIds: null },
        ],
        '14:20': [
            { id: 18, group: '全員', title: '昼食・休憩', endTime: '15:00', userIds: null },
        ],
        '15:20': [
            { id: 19, group: '全員', title: '昼食・休憩', endTime: '16:00', userIds: null },
        ],
    }),
    day2: generateHours(),
    day3: generateHours(),
    day4: generateHours(),
    day5: generateHours(),
    day6: generateHours(),
};

const SLOT_HEIGHT = 104;
const COMPACT_SLOT_HEIGHT = 22;
const COMPACT_SLOT_MARGIN_BOTTOM = 30;
const EVENTS_PER_ROW = 2;
const SUB_TIME_LABEL_HEIGHT = 22;
const MEMBER_AVATAR_SIZE = 24;
const MEMBER_AVATAR_OVERLAP = 6;
const MEMBER_AVATAR_STEP = MEMBER_AVATAR_SIZE - MEMBER_AVATAR_OVERLAP;

/**
 * isCompactSlot は、このファイルの中心となる処理をまとめた関数です。
 * 画面から渡された値や API の結果を使い、次に表示する内容を決めます。
 */
function isCompactSlot(item) {
    return item.events.length === 0;
}

function getEventRows(item) {
    return Math.max(Math.ceil(item.events.length / EVENTS_PER_ROW), 1);
}

/**
 * getSlotVisualHeight は、このファイルの中心となる処理をまとめた関数です。
 * 画面から渡された値や API の結果を使い、次に表示する内容を決めます。
 */
function getSlotVisualHeight(item) {
    // ここで条件を確認し、状況に合う処理だけを実行します。
    if (isCompactSlot(item)) {
        return COMPACT_SLOT_HEIGHT + COMPACT_SLOT_MARGIN_BOTTOM;
    }

    return groupEventsByStartTime(item.events).reduce((totalHeight, eventGroup) => {
        return totalHeight + getEventGroupVisualHeight(eventGroup);
    }, 0);
}

/**
 * getSlotStyle は、このファイルの中心となる処理をまとめた関数です。
 * 画面から渡された値や API の結果を使い、次に表示する内容を決めます。
 */
function getSlotStyle(item) {
    // ここで条件を確認し、状況に合う処理だけを実行します。
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

/**
 * filterItemsByView は、このファイルの中心となる処理をまとめた関数です。
 * 画面から渡された値や API の結果を使い、次に表示する内容を決めます。
 */
function filterItemsByView(items, viewMode) {
    // ここで条件を確認し、状況に合う処理だけを実行します。
    if (viewMode === 'all') {
        return items;
    }

    // 配列のデータを1件ずつ画面表示用の形に変換します。
    return items.map((item) => ({
        ...item,
        // 条件に合うデータだけを残して、画面に出す内容を絞り込みます。
        events: item.events.filter((event) => (
            event.group === '全員' || event.userIds?.includes(MY_USER_ID)
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

function MemberAvatars({ userIds = [] }) {
    const containerRef = useRef(null);
    const [availableWidth, setAvailableWidth] = useState(null);

    useEffect(() => {
        const target = containerRef.current;

        if (!target) {
            return undefined;
        }

        const updateWidth = () => {
            setAvailableWidth(target.getBoundingClientRect().width);
        };

        updateWidth();

        if (!window.ResizeObserver) {
            return undefined;
        }

        const observer = new ResizeObserver((entries) => {
            const [entry] = entries;
            setAvailableWidth(entry.contentRect.width);
        });

        observer.observe(target);

        return () => observer.disconnect();
    }, []);

    if (userIds.length === 0) {
        return null;
    }

    const visibleCount = getVisibleMemberCount(userIds.length, availableWidth);
    const visibleUserIds = userIds.slice(0, visibleCount);
    const hiddenCount = userIds.length - visibleCount;
    const memberNames = userIds.map(getUserName);

    return (
        <span ref={containerRef} className={styles.memberAvatars} aria-label={`参加メンバー: ${memberNames.join('、')}`}>
            {visibleUserIds.map((userId) => {
                const memberName = getUserName(userId);

                return (
                    <span key={userId} className={styles.memberAvatar} title={memberName}>
                        {getMemberInitial(memberName)}
                    </span>
                );
            })}
            {hiddenCount > 0 && (
                <span className={styles.memberMore}>
                    +{hiddenCount}
                </span>
            )}
        </span>
    );
}

/**
 * ScheduleTimeAxis は、このファイルの中心となる処理をまとめた関数です。
 * 画面から渡された値や API の結果を使い、次に表示する内容を決めます。
 */
export default function ScheduleTimeAxis({ selectedDay }) {
    const [now, setNow] = useState(() => new Date());
    const [viewMode, setViewMode] = useState('all');
    const baseItems = scheduleData[selectedDay] ?? [];
    const items = filterVisibleItems(filterItemsByView(baseItems, viewMode));

    // 画面が表示された直後や監視している値が変わった時に、必要なデータ取得や初期設定を行います。
    useEffect(() => {
        const timerId = window.setInterval(() => {
            setNow(new Date());
        }, 60000);

        return () => window.clearInterval(timerId);
    }, []);

    // ここで条件を確認し、状況に合う処理だけを実行します。
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
                                                <div key={event.id ?? `${event.time}-${i}`} className={styles.scheduleCard}>
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
                                                        {event.group !== '全員' && (
                                                            <MemberAvatars userIds={event.userIds} />
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
