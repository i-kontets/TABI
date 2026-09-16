import { useEffect, useMemo, useRef, useState } from 'react';
import { Timeline } from '@mantine/core';
import Modal from '../Modal/Modal';
import styles from './ScheduleTimeAxis.module.css';

const GROUP_COLORS = {
    '全員': 'var(--sub-color)',
};

function getHourSlot(time) {
    return `${time.slice(0, 2)}:00`;
}

function getMinutesFromTime(time) {
    return Number(time.slice(3, 5));
}

function isHourStartTime(time) {
    return getMinutesFromTime(time) === 0;
}

function getLoginUserId() {
    try {
        const loginUser = JSON.parse(localStorage.getItem('loginUser') || 'null');
        return Number(loginUser?.user_id) || null;
    } catch {
        return null;
    }
}

function getMemberId(member) {
    return Number(member?.id ?? member?.userId ?? member?.user_id);
}

function findMember(members, userId) {
    return members.find((member) => getMemberId(member) === Number(userId));
}

function getMemberIdByTestId(testUserId, members) {
    if (members.length === 0) {
        return testUserId;
    }

    const memberIndex = (Number(testUserId) - 1) % members.length;
    return getMemberId(members[memberIndex]);
}

function getUniqueIds(userIds) {
    return [...new Set(userIds.filter((userId) => Number.isFinite(Number(userId))))];
}

function applyGroupMembersToTestItems(items, members) {
    if (members.length === 0) {
        return items;
    }

    return items.map((item) => ({
        ...item,
        events: item.events.map((event) => ({
            ...event,
            userIds: event.userIds
                ? getUniqueIds(event.userIds.map((userId) => getMemberIdByTestId(userId, members)))
                : null,
            createdByUserId: event.createdByUserId
                ? getMemberIdByTestId(event.createdByUserId, members)
                : event.createdByUserId,
        })),
    }));
}

function buildDateTime(dateValue, time) {
    const [year, month, day] = dateValue.split('-').map(Number);
    const [hours, minutes] = time.split(':').map(Number);

    if (!year || !month || !day || Number.isNaN(hours) || Number.isNaN(minutes)) {
        return null;
    }

    return new Date(year, month - 1, day, hours, minutes);
}

function isEventRunning(event, now, selectedDateValue) {
    if (!event.endTime || !selectedDateValue) {
        return false;
    }

    const startDateTime = buildDateTime(selectedDateValue, event.time);
    const endDateTime = buildDateTime(selectedDateValue, event.endTime);

    if (!startDateTime || !endDateTime) {
        return false;
    }

    if (endDateTime <= startDateTime) {
        endDateTime.setDate(endDateTime.getDate() + 1);
    }

    return now >= startDateTime && now < endDateTime;
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
{
    const eventsByHour = groupEventsByHour(overrides);

    return Array.from({ length: 24 }, (_, i) => {
        const time = `${String(i).padStart(2, '0')}:00`;
        return { time, events: eventsByHour[time] ?? [] };
    });
};

const scheduleData = {
    day1: generateHours({
        '09:00': [
            {
                id: 1,
                group: '全員',
                title: 'ホテル出発',
                endTime: '09:30',
                userIds: null,
                createdByUserId: 1,
                detail: 'ロビーに集合してから、バス乗り場へ移動します。',
                location: 'ホテルロビー',
            },
            {
                id: 70,
                group: '全員',
                title: 'test',
                endTime: '09:00',
                userIds: null,
                createdByUserId: 1,
                detail: 'ロビーに集合してから、バス乗り場へ移動します。',
                location: 'ホテルロビー',
            },
        ],
        '10:10': [
            {
                id: 2,
                group: null,
                title: '買い出し',
                endTime: '10:50',
                userIds: [1, 2, 7],
                createdByUserId: 2,
                detail: '昼食と夜の飲み物を中心に購入します。',
                location: '駅前スーパー',
            },
        ],
        '12:00': [
            {
                id: 3,
                group: '全員',
                title: '昼食',
                endTime: '13:00',
                userIds: null,
                createdByUserId: 3,
                detail: '近くで昼食を取ります。混雑していれば候補を変更します。',
                location: null,
            },
        ],
        '14:20': [
            {
                id: 4,
                group: '全員',
                title: '自由時間',
                endTime: '15:30',
                userIds: null,
                createdByUserId: 1,
                detail: '各自で周辺散策をします。集合時間だけ忘れないようにします。',
                location: null,
            },
        ],
    }),
    day2: generateHours({
        '09:30': [
            {
                id: 5,
                group: '全員',
                title: '朝食',
                endTime: '10:10',
                userIds: null,
                createdByUserId: 4,
                detail: '出発前に朝食を済ませます。',
                location: 'コテージ共有スペース',
            },
        ],
        '10:40': [
            {
                id: 6,
                group: '全員',
                title: '観光地へ移動',
                endTime: '11:20',
                userIds: null,
                createdByUserId: 1,
                detail: '電車で移動します。交通系ICカードを準備しておきます。',
                location: '最寄り駅',
            },
        ],
        '13:00': [
            {
                id: 7,
                group: null,
                title: '写真撮影',
                endTime: '13:40',
                userIds: [1, 3, 5, 6],
                createdByUserId: 5,
                detail: '景色の良い場所で写真を撮ります。',
                location: null,
            },
        ],
        '16:10': [
            {
                id: 8,
                group: '全員',
                title: '宿へ戻る',
                endTime: '16:50',
                userIds: null,
                createdByUserId: 2,
                detail: '夕食前に一度荷物を置きに戻ります。',
                location: null,
            },
        ],
    }),
    day3: generateHours({
        '08:50': [
            {
                id: 9,
                group: '全員',
                title: 'チェックアウト準備',
                endTime: '09:30',
                userIds: null,
                createdByUserId: 1,
                detail: '忘れ物確認と荷物整理をします。',
                location: '宿泊先',
            },
        ],
        '10:00': [
            {
                id: 10,
                group: null,
                title: 'お土産購入',
                endTime: '10:40',
                userIds: [2, 4, 7],
                createdByUserId: 7,
                detail: '駅周辺でお土産を購入します。',
                location: '駅前商店街',
            },
        ],
        '12:20': [
            {
                id: 11,
                group: '全員',
                title: '昼食',
                endTime: '13:10',
                userIds: null,
                createdByUserId: 3,
                detail: '帰る前に全員で昼食を取ります。',
                location: null,
            },
        ],
        '15:00': [
            {
                id: 12,
                group: '全員',
                title: '帰宅',
                endTime: '16:30',
                userIds: null,
                createdByUserId: 1,
                detail: '駅で解散します。忘れ物があれば共有します。',
                location: '伊豆駅',
            },
        ],
    }),
    day4: generateHours({
        '09:00': [
            {
                id: 13,
                group: '全員',
                title: '予備日集合',
                endTime: '09:20',
                userIds: null,
                createdByUserId: 6,
                detail: '天候次第で行き先を相談します。',
                location: null,
            },
        ],
        '10:10': [
            {
                id: 14,
                group: null,
                title: 'カフェ休憩',
                endTime: '10:50',
                userIds: [1, 2, 3],
                createdByUserId: 2,
                detail: '近くのカフェで予定を調整します。',
                location: '海沿いカフェ',
            },
        ],
        '13:30': [
            {
                id: 15,
                group: '全員',
                title: '温泉',
                endTime: '15:00',
                userIds: null,
                createdByUserId: 4,
                detail: '希望者で温泉に向かいます。全員予定として入れています。',
                location: null,
            },
        ],
        '17:00': [
            {
                id: 16,
                group: '全員',
                title: '夕食',
                endTime: '18:30',
                userIds: null,
                createdByUserId: 1,
                detail: '最終日の夕食候補を確認します。',
                location: '予約店舗',
            },
        ],
    }),
    day5: generateHours({
        '08:30': [
            {
                id: 17,
                group: '全員',
                title: '荷物確認',
                endTime: '09:00',
                userIds: null,
                createdByUserId: 1,
                detail: '配送する荷物と手持ちの荷物を分けます。',
                location: null,
            },
        ],
        '09:40': [
            {
                id: 18,
                group: null,
                title: 'レンタカー返却',
                endTime: '10:10',
                userIds: [1, 6],
                createdByUserId: 6,
                detail: '返却前にガソリンを入れておきます。',
                location: 'レンタカー店舗',
            },
        ],
        '11:20': [
            {
                id: 19,
                group: '全員',
                title: '駅集合',
                endTime: '11:40',
                userIds: null,
                createdByUserId: 2,
                detail: '帰りのチケットを確認して集合します。',
                location: '改札前',
            },
        ],
        '12:00': [
            {
                id: 20,
                group: '全員',
                title: '解散',
                endTime: '12:10',
                userIds: null,
                createdByUserId: 1,
                detail: '全員の帰路を確認して解散します。',
                location: null,
            },
        ],
    }),
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

function getUserName(userId, members) {
    return findMember(members, userId)?.name ?? `ユーザー${userId}`;
}

function getMemberInitial(userId, members) {
    const member = findMember(members, userId);
    return member?.initial ?? member?.name?.slice(0, 1) ?? '?';
}

function formatEventTimeRange(event) {
    return event.endTime ? `${event.time} - ${event.endTime}` : event.time;
}

function getEventGroupVisualHeight(eventGroup) {
    const labelHeight = isHourStartTime(eventGroup.time) ? 0 : SUB_TIME_LABEL_HEIGHT;
    const rowCount = Math.max(Math.ceil(eventGroup.events.length / EVENTS_PER_ROW), 1);

    return labelHeight + (rowCount * SLOT_HEIGHT);
}

/**
 * isCompactSlot は、このファイルの中心となる処理をまとめた関数です。
 * 画面から渡された値や API の結果を使い、次に表示する内容を決めます。
 */
function isCompactSlot(item) {
    return item.events.length === 0;
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

function getEventMemberNames(event, members) {
    return event.userIds?.map((userId) => getUserName(userId, members)) ?? [];
}

function getEventTargetText(event, members) {
    if (event.group === '全員') {
        return '全員';
    }

    const memberNames = getEventMemberNames(event, members);
    return memberNames.length > 0 ? memberNames.join('、') : '未設定';
}

function getEventCreatorName(event, members) {
    return event.createdByUserId ? getUserName(event.createdByUserId, members) : '未設定';
}

function getMemberAvatarsWidth(visibleCount, hasMore) {
    if (visibleCount === 0) {
        return hasMore ? MEMBER_AVATAR_SIZE : 0;
    }

    const visibleWidth = MEMBER_AVATAR_SIZE + ((visibleCount - 1) * MEMBER_AVATAR_STEP);
    return hasMore ? visibleWidth + MEMBER_AVATAR_STEP : visibleWidth;
}

function getVisibleMemberCount(memberCount, availableWidth) {
    if (memberCount === 0 || availableWidth === null) {
        return memberCount;
    }

    if (getMemberAvatarsWidth(memberCount, false) <= availableWidth) {
        return memberCount;
    }

    for (let count = memberCount - 1; count >= 1; count -= 1) {
        if (getMemberAvatarsWidth(count, true) <= availableWidth) {
            return count;
        }
    }

    return 0;
}

/**
 * filterItemsByView は、このファイルの中心となる処理をまとめた関数です。
 * 画面から渡された値や API の結果を使い、次に表示する内容を決めます。
 */
function filterItemsByView(items, viewMode, loginUserId) {
    // ここで条件を確認し、状況に合う処理だけを実行します。
    if (viewMode === 'all') {
        return items;
    }

    // 配列のデータを1件ずつ画面表示用の形に変換します。
    return items.map((item) => ({
        ...item,
        // 条件に合うデータだけを残して、画面に出す内容を絞り込みます。
        events: item.events.filter((event) => (
            event.group === '全員' || event.userIds?.some((userId) => Number(userId) === loginUserId)
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

function addDraftEvents(items, draftEvents, selectedDay) {
    return items.map((item) => ({
        ...item,
        events: [
            ...item.events,
            ...draftEvents.filter((event) => (
                event.day === selectedDay && getHourSlot(event.time) === item.time
            )),
        ].sort((first, second) => first.time.localeCompare(second.time)),
    }));
}

function MemberAvatars({ userIds = [], members = [] }) {
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
    const memberNames = userIds.map((userId) => getUserName(userId, members));

    return (
        <span ref={containerRef} className={styles.memberAvatars} aria-label={`参加メンバー: ${memberNames.join('、')}`}>
            {visibleUserIds.map((userId, index) => {
                const memberName = getUserName(userId, members);

                return (
                    <span key={`${userId}-${index}`} className={styles.memberAvatar} title={memberName}>
                        {getMemberInitial(userId, members)}
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
export default function ScheduleTimeAxis({ selectedDay, selectedDateValue, viewMode, members = [], draftEvents = [] }) {
    const [now, setNow] = useState(() => new Date());
    const [selectedEvent, setSelectedEvent] = useState(null);
    const loginUserId = getLoginUserId();
    const memberAppliedItems = useMemo(
        () => addDraftEvents(
            applyGroupMembersToTestItems(scheduleData[selectedDay] ?? [], members),
            draftEvents,
            selectedDay,
        ),
        [draftEvents, members, selectedDay],
    );
    const items = filterVisibleItems(filterItemsByView(memberAppliedItems, viewMode, loginUserId));

    // 画面が表示された直後や監視している値が変わった時に、必要なデータ取得や初期設定を行います。
    useEffect(() => {
        const timerId = window.setInterval(() => {
            setNow(new Date());
        }, 60000);

        return () => window.clearInterval(timerId);
    }, []);

    // ここで条件を確認し、状況に合う処理だけを実行します。
    const closeDetailSheet = () => {
        setSelectedEvent(null);
    };

    if (items.length === 0) {
        return null;
    }

    return (
        <section className={styles.timelineSection} aria-label="スケジュール時間軸">
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
                                            const eventRunning = isEventRunning(event, now, selectedDateValue);

                                            return (
                                                <button
                                                    key={event.id ?? `${event.time}-${i}`}
                                                    className={styles.scheduleCard}
                                                    type="button"
                                                    onClick={() => setSelectedEvent(event)}
                                                    aria-label={`${event.title}の詳細を表示`}
                                                >
                                                    <span className={styles.cardMeta}>
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
                                                            <MemberAvatars userIds={event.userIds} members={members} />
                                                        )}
                                                    </span>
                                                    <span className={styles.timeRange}>{formatEventTimeRange(event)}</span>
                                                    <span className={styles.scheduleTitle}>{event.title}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                ))}
                            </div>
                        );
                    })}
                </div>
            </div>

            <Modal isOpen={selectedEvent !== null} onClose={closeDetailSheet}>
                {selectedEvent && (
                    <div className={styles.detailContent}>
                        <div className={styles.detailHeader}>
                            <div>
                                <p className={styles.detailEyebrow}>予定詳細</p>
                                <h2>{selectedEvent.title}</h2>
                            </div>
                        </div>

                        <dl className={styles.detailList}>
                            <div>
                                <dt>時間</dt>
                                <dd>{formatEventTimeRange(selectedEvent)}</dd>
                            </div>
                            <div>
                                <dt>メンバー</dt>
                                <dd>{getEventTargetText(selectedEvent, members)}</dd>
                            </div>
                            <div>
                                <dt>作成者</dt>
                                <dd>{getEventCreatorName(selectedEvent, members)}</dd>
                            </div>
                            {selectedEvent.location && (
                                <div>
                                    <dt>場所</dt>
                                    <dd>{selectedEvent.location}</dd>
                                </div>
                            )}
                            <div className={styles.detailDescription}>
                                <dt>詳細</dt>
                                <dd>{selectedEvent.detail || '詳細は未設定です。'}</dd>
                            </div>
                        </dl>
                    </div>
                )}
            </Modal>
        </section>
    );
}
