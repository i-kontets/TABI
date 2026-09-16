/**
 * 旅行スケジュールを時間軸に沿って表示する画面部品です。
 *
 * 主な流れ:
 * 1. 必要な部品や API 関数を読み込む
 * 2. 画面表示やデータ取得に必要な値を準備する
 * 3. ユーザー操作や API の結果に合わせて表示を更新する
 *
 * 扱うデータ: React の state、props、フォーム入力、API から返ったデータを主に扱います。
 */
import { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Picker from 'react-mobile-picker';
import { DayPicker } from 'react-day-picker';
import { ja } from 'react-day-picker/locale';
import 'react-day-picker/style.css';
import { TripContext } from '../../App';
import ScheduleTimeAxis from '../../components/Schedule/ScheduleTimeAxis';
import BottomNav from '../../components/bottomNav/BottomNav';
import Header from '../../components/header/Header';
import Modal from '../../components/Modal/Modal';
import addIcon from '../../assets/icons/add.svg';
import groupIcon from '../../assets/icons/groups.svg';
import personIcon from '../../assets/icons/person.svg';
import styles from './Schedulepage.module.css';

const fallbackDays = [
    { id: 'day1', date: '6/28(日)' },
    { id: 'day2', date: '6/29(月)' },
    { id: 'day3', date: '6/30(火)' },
    { id: 'day4', date: '7/1(水)' },
    { id: 'day5', date: '7/2(木)' },
];
const weekLabels = ['日', '月', '火', '水', '木', '金', '土'];
const hourOptions = Array.from({ length: 24 }, (_, hour) => ({
    label: String(hour).padStart(2, '0'),
    value: String(hour).padStart(2, '0'),
}));
const minuteOptions = ['00', '10', '20', '30', '40', '50'].map((minute) => ({
    label: minute,
    value: minute,
}));

function parseLocalDate(dateText) {
    if (!dateText) {
        return null;
    }

    const [year, month, day] = dateText.split('-').map(Number);

    if (!year || !month || !day) {
        return null;
    }

    return new Date(year, month - 1, day);
}

function formatScheduleDate(date) {
    return `${date.getMonth() + 1}/${date.getDate()}(${weekLabels[date.getDay()]})`;
}

function formatPickerDate(dateValue) {
    const date = parseLocalDate(dateValue);
    return date ? formatScheduleDate(date) : '日付を選択';
}

function buildScheduleDays(tripPeriod) {
    const startDate = parseLocalDate(tripPeriod?.startDate);
    const endDate = parseLocalDate(tripPeriod?.endDate);

    if (!startDate || !endDate || startDate > endDate) {
        return fallbackDays;
    }

    const days = [];
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
        days.push({
            id: `day${days.length + 1}`,
            date: formatScheduleDate(currentDate),
            dateValue: [
                currentDate.getFullYear(),
                String(currentDate.getMonth() + 1).padStart(2, '0'),
                String(currentDate.getDate()).padStart(2, '0'),
            ].join('-'),
        });

        currentDate.setDate(currentDate.getDate() + 1);
    }

    return days;
}

function getLoginUser() {
    try {
        return JSON.parse(localStorage.getItem('loginUser') || 'null');
    } catch {
        return null;
    }
}

function splitTime(value) {
    const [hour = '09', minute = '00'] = value.split(':');
    return { hour, minute };
}

function ScheduleTimeWheel({ label, value, onChange }) {
    const { hour, minute } = splitTime(value);
    const lastWheelAt = useRef({ hour: 0, minute: 0 });

    const handleDesktopWheel = (event) => {
        const column = event.target.closest('[data-time-part]');
        const part = column?.dataset.timePart;

        if (!part || event.deltaY === 0) {
            return;
        }

        event.preventDefault();
        const now = Date.now();
        if (now - lastWheelAt.current[part] < 180) {
            return;
        }
        lastWheelAt.current[part] = now;

        const options = part === 'hour' ? hourOptions : minuteOptions;
        const currentValue = part === 'hour' ? hour : minute;
        const currentIndex = options.findIndex((option) => option.value === currentValue);
        const direction = event.deltaY > 0 ? 1 : -1;
        const nextIndex = Math.max(0, Math.min(options.length - 1, currentIndex + direction));
        const nextValue = options[nextIndex].value;

        onChange(part === 'hour' ? `${nextValue}:${minute}` : `${hour}:${nextValue}`);
    };

    return (
        <div className={styles.timeWheelField}>
            <span className={styles.timeWheelLabel}>{label}</span>
            <Picker
                value={{ hour, minute }}
                onChange={(nextValue) => onChange(`${nextValue.hour}:${nextValue.minute}`)}
                height={96}
                itemHeight={32}
                wheelMode="off"
                onWheelCapture={handleDesktopWheel}
                className={styles.timeWheelWrapper}
            >
                <Picker.Column name="hour" data-time-part="hour">
                    {hourOptions.map((option) => (
                        <Picker.Item key={option.value} value={option.value}>
                            {({ selected }) => (
                                <span className={`${styles.timePickerItem} ${selected ? styles.timePickerItemSelected : ''}`}>
                                    {option.label}時
                                </span>
                            )}
                        </Picker.Item>
                    ))}
                </Picker.Column>
                <Picker.Column name="minute" data-time-part="minute">
                    {minuteOptions.map((option) => (
                        <Picker.Item key={option.value} value={option.value}>
                            {({ selected }) => (
                                <span className={`${styles.timePickerItem} ${selected ? styles.timePickerItemSelected : ''}`}>
                                    {option.label}分
                                </span>
                            )}
                        </Picker.Item>
                    ))}
                </Picker.Column>
            </Picker>
        </div>
    );
}

/**
 * SchedulePage は、このファイルの中心となる処理をまとめた関数です。
 * 画面から渡された値や API の結果を使い、次に表示する内容を決めます。
 */
export default function SchedulePage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const {
        trip,
        setTrip,
        members,
        fetchMembers,
        tripPeriod,
        setTripPeriod,
    } = useContext(TripContext);
    const groupId = searchParams.get('groupId');
    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const [selectedDay, setSelectedDay] = useState('day1');
    const [viewMode, setViewMode] = useState('all');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [draftEvents, setDraftEvents] = useState([]);
    const [eventFormError, setEventFormError] = useState('');
    const [activeDateTimePicker, setActiveDateTimePicker] = useState(null);
    const [eventForm, setEventForm] = useState({
        day: 'day1',
        endDay: 'day1',
        startDate: '',
        endDate: '',
        title: '',
        startTime: '09:00',
        endTime: '10:00',
        audience: 'all',
        memberIds: [],
        location: '',
        detail: '',
    });
    const headerTitle = trip?.name || 'スケジュール';
    const scheduleDays = useMemo(() => buildScheduleDays(tripPeriod), [tripPeriod]);
    const activeSelectedDay = scheduleDays.some((day) => day.id === selectedDay)
        ? selectedDay
        : scheduleDays[0]?.id || 'day1';
    const activeSelectedDate = scheduleDays.find((day) => day.id === activeSelectedDay)?.dateValue;

    const getDayId = (dateValue) => scheduleDays.find((day) => day.dateValue === dateValue)?.id || `date-${dateValue}`;

    const openAddModal = () => {
        setEventForm((current) => ({
            ...current,
            day: activeSelectedDay,
            endDay: activeSelectedDay,
            startDate: activeSelectedDate || current.startDate,
            endDate: activeSelectedDate || current.endDate,
            memberIds: current.memberIds.filter((memberId) => members.some((member) => Number(member.id) === memberId)),
        }));
        setEventFormError('');
        setActiveDateTimePicker(null);
        setIsAddModalOpen(true);
    };

    const closeAddModal = () => {
        setIsAddModalOpen(false);
    };

    const closeDateTimePickerOnOtherFocus = (event) => {
        if (!event.target.closest('[data-date-time-control]')) {
            setActiveDateTimePicker(null);
        }
    };

    const updateEventForm = (field, value) => {
        setEventFormError('');
        setEventForm((current) => {
            const nextForm = { ...current, [field]: value };

            if (field === 'startTime' && current.startDate === current.endDate && value > current.endTime) {
                nextForm.endTime = value;
            }

            if (field === 'endTime' && current.startDate === current.endDate && value < current.startTime) {
                nextForm.endTime = current.startTime;
            }

            return nextForm;
        });
    };

    const selectEventDate = (field, date) => {
        if (!date) {
            return;
        }

        const dateValue = [
            date.getFullYear(),
            String(date.getMonth() + 1).padStart(2, '0'),
            String(date.getDate()).padStart(2, '0'),
        ].join('-');
        const dayField = field === 'startDate' ? 'day' : 'endDay';

        setEventFormError('');
        setEventForm((current) => {
            const nextForm = {
                ...current,
                [field]: dateValue,
                [dayField]: getDayId(dateValue),
            };

            if (nextForm.endDate < nextForm.startDate) {
                nextForm.endDate = nextForm.startDate;
                nextForm.endDay = getDayId(nextForm.startDate);
            }

            if (nextForm.startDate === nextForm.endDate && nextForm.endTime < nextForm.startTime) {
                nextForm.endTime = nextForm.startTime;
            }

            return nextForm;
        });
        setActiveDateTimePicker(null);
    };

    const toggleMember = (memberId) => {
        setEventForm((current) => ({
            ...current,
            memberIds: current.memberIds.includes(memberId)
                ? current.memberIds.filter((id) => id !== memberId)
                : [...current.memberIds, memberId],
        }));
    };

    const addScheduleEvent = (event) => {
        event.preventDefault();

        const title = eventForm.title.trim();
        const isEndBeforeStart = eventForm.endDate < eventForm.startDate ||
            (eventForm.endDate === eventForm.startDate && eventForm.endTime < eventForm.startTime);

        if (!title) {
            setEventFormError('予定名を入力してください。');
            return;
        }

        if (isEndBeforeStart) {
            setEventFormError('終了日時は開始日時と同時刻以降にしてください。');
            return;
        }

        const creatorId = Number(getLoginUser()?.user_id) || Number(members[0]?.id) || null;
        setDraftEvents((current) => [...current, {
            id: `draft-${Date.now()}`,
            day: eventForm.day,
            endDay: eventForm.endDay,
            startDate: eventForm.startDate,
            endDate: eventForm.endDate,
            time: eventForm.startTime,
            endTime: eventForm.endTime,
            title,
            group: eventForm.audience === 'all' ? '全員' : null,
            userIds: eventForm.audience === 'all' ? null : eventForm.memberIds,
            createdByUserId: creatorId,
            location: eventForm.location.trim() || null,
            detail: eventForm.detail.trim(),
        }]);
        setSelectedDay(eventForm.day);
        setEventForm({
            day: eventForm.day,
            endDay: eventForm.endDay,
            startDate: eventForm.startDate,
            endDate: eventForm.endDate,
            title: '',
            startTime: eventForm.startTime,
            endTime: eventForm.endTime,
            audience: 'all',
            memberIds: [],
            location: '',
            detail: '',
        });
        closeAddModal();
    };

    useEffect(() => {
        if (!groupId) {
            return;
        }

        const fetchTripInfo = async () => {
            try {
                const response = await fetch('/TABI/api/Itinerary/TripInfo.php', {
                    method: 'POST',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        group_id: groupId,
                    }),
                });

                if (response.status === 401) {
                    localStorage.removeItem('loginUser');
                    navigate('/');
                    return;
                }

                const data = await response.json();

                if (data.success && data.trip) {
                    setTrip({
                        id: data.trip.id,
                        name: data.trip.name,
                        image: data.trip.image_url,
                    });

                    setTripPeriod({
                        startDate: data.trip.start_date,
                        endDate: data.trip.end_date,
                    });
                }
            } catch (error) {
                console.error(error);
            }
        };

        fetchTripInfo();
    }, [groupId, navigate, setTrip, setTripPeriod]);

    useEffect(() => {
        if (!groupId || typeof fetchMembers !== 'function') {
            return;
        }

        const loadMembers = async () => {
            const result = await fetchMembers(groupId);

            if (result.status === 'login-required') {
                localStorage.removeItem('loginUser');
                navigate('/');
            }
        };

        loadMembers();
    }, [fetchMembers, groupId, navigate]);

    useEffect(() => {
        console.log('スケジュール旅行グループ情報', {
            groupId,
            trip,
            tripPeriod,
            loginUser: getLoginUser(),
            days: {
                count: scheduleDays.length,
                items: scheduleDays,
            },
            members: {
                count: members.length,
                items: members,
            },
        });
    }, [groupId, members, scheduleDays, trip, tripPeriod]);

    return (
        <div className={styles.container}>
            <Header tripName={headerTitle} />

            <main className={styles.content}>
                <section className={styles.dayPanel} aria-label="日付選択">
                    <div className={styles.dayStepperScroller}>
                        <div className={styles.dayStepper} style={{ gridTemplateColumns: `repeat(${scheduleDays.length}, minmax(74px, 1fr))` }}>
                            {scheduleDays.map((day, index) => {
                                const isActive = activeSelectedDay === day.id;
                                const isCompleted = scheduleDays.findIndex((item) => item.id === activeSelectedDay) > index;

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
                    </div>

                    <div className={styles.viewModeTabs} role="tablist" aria-label="スケジュール表示切り替え">
                        <button
                            type="button"
                            role="tab"
                            aria-selected={viewMode === 'all'}
                            className={`${styles.viewModeTab} ${viewMode === 'all' ? styles.viewModeTabActive : ''}`}
                            onClick={() => setViewMode('all')}
                        >
                            <span className={styles.viewModeTabContent}>
                                <img src={groupIcon} alt="" aria-hidden="true" />
                                全員の予定
                            </span>
                        </button>
                        <button
                            type="button"
                            role="tab"
                            aria-selected={viewMode === 'mine'}
                            className={`${styles.viewModeTab} ${viewMode === 'mine' ? styles.viewModeTabActive : ''}`}
                            onClick={() => setViewMode('mine')}
                        >
                            <span className={styles.viewModeTabContent}>
                                <img src={personIcon} alt="" aria-hidden="true" />
                                自分の予定
                            </span>
                        </button>
                    </div>
                </section>

                <ScheduleTimeAxis
                    selectedDay={activeSelectedDay}
                    selectedDateValue={activeSelectedDate}
                    viewMode={viewMode}
                    members={members}
                    draftEvents={draftEvents}
                />
            </main>

            <BottomNav />

            <button
                type="button"
                className={styles.createButton}
                onClick={openAddModal}
                aria-label="予定を追加"
            >
                <img src={addIcon} alt="" className={styles.plusIcon} />
            </button>

            <Modal isOpen={isAddModalOpen} onClose={closeAddModal}>
                <form className={styles.addForm} onSubmit={addScheduleEvent} onFocusCapture={closeDateTimePickerOnOtherFocus}>
                    <div className={styles.addFormHeader}>
                        <p>新しい予定</p>
                        <h2>予定を追加</h2>
                    </div>

                    <label className={styles.formField}>
                        <span>予定名 <b>必須</b></span>
                        <input
                            type="text"
                            value={eventForm.title}
                            onChange={(event) => updateEventForm('title', event.target.value)}
                            placeholder="例：ランチ"
                            required
                        />
                    </label>

                    <section className={styles.dateTimeFields} aria-label="開始と終了の日時" data-date-time-control>
                        <div className={styles.dateTimeColumn}>
                            <h3>開始</h3>
                            <button
                                type="button"
                                className={styles.dateTimeTrigger}
                                aria-expanded={activeDateTimePicker === 'startDate'}
                                onClick={() => setActiveDateTimePicker((current) => current === 'startDate' ? null : 'startDate')}
                            >
                                <span>開始日</span>
                                <strong>{formatPickerDate(eventForm.startDate)}</strong>
                            </button>
                            <button
                                type="button"
                                className={styles.dateTimeTrigger}
                                aria-expanded={activeDateTimePicker === 'startTime'}
                                onClick={() => setActiveDateTimePicker((current) => current === 'startTime' ? null : 'startTime')}
                            >
                                <span>開始時間</span>
                                <strong>{eventForm.startTime}</strong>
                            </button>
                        </div>

                        <div className={styles.dateTimeColumn}>
                            <h3>終了</h3>
                            <button
                                type="button"
                                className={styles.dateTimeTrigger}
                                aria-expanded={activeDateTimePicker === 'endDate'}
                                onClick={() => setActiveDateTimePicker((current) => current === 'endDate' ? null : 'endDate')}
                            >
                                <span>終了日</span>
                                <strong>{formatPickerDate(eventForm.endDate)}</strong>
                            </button>
                            <button
                                type="button"
                                className={styles.dateTimeTrigger}
                                aria-expanded={activeDateTimePicker === 'endTime'}
                                onClick={() => setActiveDateTimePicker((current) => current === 'endTime' ? null : 'endTime')}
                            >
                                <span>終了時間</span>
                                <strong>{eventForm.endTime}</strong>
                            </button>
                        </div>
                    </section>

                    {activeDateTimePicker?.endsWith('Date') && (
                        <section className={styles.dateTimePickerPanel} aria-label="日付を選択" data-date-time-control>
                            <p>{activeDateTimePicker === 'startDate' ? '開始日を選択' : '終了日を選択'}</p>
                            <DayPicker
                                mode="single"
                                selected={parseLocalDate(activeDateTimePicker === 'startDate' ? eventForm.startDate : eventForm.endDate)}
                                onSelect={(date) => selectEventDate(activeDateTimePicker, date)}
                                defaultMonth={parseLocalDate(activeDateTimePicker === 'startDate' ? eventForm.startDate : eventForm.endDate)}
                                locale={ja}
                                weekStartsOn={0}
                                modifiers={{
                                    trip: {
                                        from: parseLocalDate(tripPeriod?.startDate),
                                        to: parseLocalDate(tripPeriod?.endDate),
                                    },
                                }}
                                modifiersClassNames={{ trip: styles.tripCalendarDay }}
                            />
                        </section>
                    )}

                    {activeDateTimePicker?.endsWith('Time') && (
                        <section className={styles.dateTimePickerPanel} aria-label="時間を選択" data-date-time-control>
                            <ScheduleTimeWheel
                                label={activeDateTimePicker === 'startTime' ? '開始時間を選択' : '終了時間を選択'}
                                value={activeDateTimePicker === 'startTime' ? eventForm.startTime : eventForm.endTime}
                                onChange={(value) => updateEventForm(activeDateTimePicker === 'startTime' ? 'startTime' : 'endTime', value)}
                            />
                        </section>
                    )}
                    {eventFormError && <p className={styles.formError} role="alert">{eventFormError}</p>}

                    <fieldset className={styles.audienceField}>
                        <legend>参加メンバー</legend>
                        <div className={styles.audienceOptions}>
                            <label><input type="radio" name="audience" checked={eventForm.audience === 'all'} onChange={() => updateEventForm('audience', 'all')} /> 全員</label>
                            <label><input type="radio" name="audience" checked={eventForm.audience === 'selected'} onChange={() => updateEventForm('audience', 'selected')} /> 指定する</label>
                        </div>
                        {eventForm.audience === 'selected' && (
                            <div className={styles.memberChoices}>
                                {members.map((member) => {
                                    const memberId = Number(member.id);
                                    return <label key={memberId}><input type="checkbox" checked={eventForm.memberIds.includes(memberId)} onChange={() => toggleMember(memberId)} /> {member.name}</label>;
                                })}
                            </div>
                        )}
                    </fieldset>

                    <label className={styles.formField}>
                        <span>場所</span>
                        <input type="text" value={eventForm.location} onChange={(event) => updateEventForm('location', event.target.value)} placeholder="例：駅前カフェ" />
                    </label>
                    <label className={styles.formField}>
                        <span>詳細</span>
                        <textarea value={eventForm.detail} onChange={(event) => updateEventForm('detail', event.target.value)} placeholder="補足があれば入力" rows="3" />
                    </label>
                    <button className={styles.submitButton} type="submit">予定を追加</button>
                </form>
            </Modal>

        </div>
    );
}
