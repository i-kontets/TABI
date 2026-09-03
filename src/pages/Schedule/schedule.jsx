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
import { useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { TripContext } from '../../App';
import ScheduleTimeAxis from '../../components/Schedule/ScheduleTimeAxis';
import BottomNav from '../../components/bottomNav/BottomNav';
import Header from '../../components/header/Header';
import Modal from '../../components/Modal/Modal';
import addIcon from '../../assets/icons/add.svg';
import styles from './Schedulepage.module.css';

const fallbackDays = [
    { id: 'day1', date: '6/28(日)' },
    { id: 'day2', date: '6/29(月)' },
    { id: 'day3', date: '6/30(火)' },
    { id: 'day4', date: '7/1(水)' },
    { id: 'day5', date: '7/2(木)' },
];
const weekLabels = ['日', '月', '火', '水', '木', '金', '土'];

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
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const headerTitle = trip?.name || 'スケジュール';
    const scheduleDays = useMemo(() => buildScheduleDays(tripPeriod), [tripPeriod]);
    const activeSelectedDay = scheduleDays.some((day) => day.id === selectedDay)
        ? selectedDay
        : scheduleDays[0]?.id || 'day1';
    const activeSelectedDate = scheduleDays.find((day) => day.id === activeSelectedDay)?.dateValue;

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
                </section>

                <ScheduleTimeAxis selectedDay={activeSelectedDay} selectedDateValue={activeSelectedDate} />
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
