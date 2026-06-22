import { useContext, useMemo, useState } from 'react';
import { Stepper } from 'react-form-stepper';
import { TripContext } from '../../App';
import BottomNav from '../../components/bottomNav/BottomNav';
import Header from '../../components/header/Header';
import MemberFilter from '../../components/Schedule/MemberFilter';
import ScheduleDetailSheet from '../../components/Schedule/ScheduleDetailSheet';
import TimelineCard from '../../components/Schedule/TimelineCard';
import styles from './Schedulepage.module.css';

const members = [
  { id: 'all', name: '全員', shortName: '全', color: '#44558D' },
  { id: 'taro', name: '太郎', shortName: '太', color: '#2F80ED' },
  { id: 'hanako', name: '花子', shortName: '花', color: '#EB5757' },
  { id: 'jiro', name: '次郎', shortName: '次', color: '#219653' },
  { id: 'misaki', name: '美咲', shortName: '美', color: '#F2994A' },
];

const days = [
  { id: 'day1', label: '1日目', date: '6/17(火)' },
  { id: 'day2', label: '2日目', date: '6/18(水)' },
  { id: 'day3', label: '3日目', date: '6/19(木)' },
];

const schedules = [
  {
    id: 1,
    dayId: 'day1',
    time: '08:30',
    endTime: '09:15',
    title: 'ホテル朝食',
    place: 'ホテルレストラン',
    memberIds: ['taro', 'hanako', 'jiro', 'misaki'],
    type: 'meal',
    status: 'confirmed',
    memo: '出発前に全員で集合。チェックアウト準備も済ませる。',
  },
  {
    id: 2,
    dayId: 'day1',
    time: '09:30',
    endTime: '10:00',
    title: '大阪城公園へ移動',
    place: '地下鉄',
    memberIds: ['taro', 'hanako', 'jiro', 'misaki'],
    type: 'move',
    status: 'confirmed',
    memo: '改札前で集合してから移動。',
  },
  {
    id: 3,
    dayId: 'day1',
    time: '10:00',
    endTime: '12:00',
    title: '大阪城を観光',
    place: '大阪城公園',
    memberIds: ['taro', 'jiro', 'misaki'],
    type: 'spot',
    status: 'confirmed',
    memo: '天守閣と周辺散策。花子は別行動。',
  },
  {
    id: 4,
    dayId: 'day1',
    time: '10:15',
    endTime: '11:30',
    title: 'カフェで休憩',
    place: '谷町四丁目周辺',
    memberIds: ['hanako'],
    type: 'free',
    status: 'candidate',
    memo: '午前はゆっくり行動。12:00に合流予定。',
  },
  {
    id: 5,
    dayId: 'day1',
    time: '12:15',
    endTime: '13:15',
    title: 'ランチ',
    place: '道頓堀',
    memberIds: ['taro', 'hanako', 'jiro', 'misaki'],
    type: 'meal',
    status: 'confirmed',
    memo: '候補はたこ焼き、串カツ、お好み焼き。',
  },
  {
    id: 6,
    dayId: 'day1',
    time: '14:00',
    endTime: '16:00',
    title: '心斎橋でショッピング',
    place: '心斎橋筋商店街',
    memberIds: ['hanako', 'misaki'],
    groupLabel: '買い物チーム',
    type: 'shopping',
    status: 'confirmed',
    memo: '雑貨とお土産を見る。',
  },
  {
    id: 7,
    dayId: 'day1',
    time: '14:00',
    endTime: '16:00',
    title: '通天閣エリア散策',
    place: '新世界',
    memberIds: ['taro', 'jiro'],
    groupLabel: '観光チーム',
    type: 'spot',
    status: 'confirmed',
    memo: '通天閣周辺を散策。16:30にホテルで合流。',
  },
  {
    id: 8,
    dayId: 'day1',
    time: '17:00',
    endTime: '18:00',
    title: 'ホテルチェックイン',
    place: '宿泊ホテル',
    memberIds: ['taro', 'hanako', 'jiro', 'misaki'],
    type: 'hotel',
    status: 'confirmed',
    memo: '部屋割りと翌日の集合時間を確認。',
  },
  {
    id: 9,
    dayId: 'day1',
    time: '19:00',
    endTime: '21:00',
    title: '夕食',
    place: 'なんば周辺',
    memberIds: ['taro', 'hanako', 'jiro', 'misaki'],
    type: 'meal',
    status: 'candidate',
    memo: '予約候補を相談中。',
  },
  {
    id: 10,
    dayId: 'day2',
    time: '09:00',
    endTime: '11:00',
    title: '海遊館',
    place: '大阪港',
    memberIds: ['taro', 'hanako', 'jiro', 'misaki'],
    type: 'spot',
    status: 'confirmed',
    memo: 'チケット購入済み。',
  },
];

function isAllMemberEvent(schedule) {
  return schedule.memberIds.length === members.length - 1;
}

function groupByTime(items) {
  return items.reduce((groups, item) => {
    const key = item.time;
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(item);
    return groups;
  }, {});
}

export default function SchedulePage() {
  const { tripName } = useContext(TripContext);
  const [selectedDay, setSelectedDay] = useState('day1');
  const [selectedMember, setSelectedMember] = useState('all');
  const [selectedSchedule, setSelectedSchedule] = useState(null);

  const filteredSchedules = useMemo(() => {
    return schedules
      .filter((schedule) => schedule.dayId === selectedDay)
      .filter((schedule) => (
        selectedMember === 'all' || schedule.memberIds.includes(selectedMember)
      ))
      .sort((a, b) => a.time.localeCompare(b.time));
  }, [selectedDay, selectedMember]);

  const groupedSchedules = groupByTime(filteredSchedules);
  const selectedDayInfo = days.find((day) => day.id === selectedDay);
  const selectedDayIndex = days.findIndex((day) => day.id === selectedDay);
  const separateCount = filteredSchedules.filter((schedule) => !isAllMemberEvent(schedule)).length;

  return (
    <div className={styles.container}>
      <Header tripName={tripName || '大阪旅行'} />

      <main className={styles.content}>
        <section className={styles.dayPanel} aria-label="日付選択">
          <Stepper
            steps={days.map((day) => ({ label: day.label }))}
            activeStep={selectedDayIndex}
            connectorStateColors
            className={styles.dayStepper}
            styleConfig={{
              activeBgColor: '#44558D',
              activeTextColor: '#ffffff',
              completedBgColor: '#44558D',
              completedTextColor: '#ffffff',
              inactiveBgColor: '#DDE3EF',
              inactiveTextColor: '#44558D',
              size: '30px',
              circleFontSize: '13px',
              labelFontSize: '13px',
              borderRadius: '999px',
              fontWeight: 700,
            }}
            connectorStyleConfig={{
              activeColor: '#44558D',
              completedColor: '#44558D',
              disabledColor: '#DDE3EF',
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
                aria-label={`${day.label}の予定を表示`}
              />
            ))}
          </div>
        </section>

        <MemberFilter
          members={members}
          selectedMember={selectedMember}
          onChange={setSelectedMember}
        />

        <section className={styles.summaryGrid} aria-label="予定の概要">
          <div>
            <span>{filteredSchedules.length}</span>
            <p>表示中の予定</p>
          </div>
          <div>
            <span>{filteredSchedules.filter(isAllMemberEvent).length}</span>
            <p>全員予定</p>
          </div>
          <div>
            <span>{separateCount}</span>
            <p>別行動</p>
          </div>
        </section>

        <section className={styles.timeline} aria-label="予定一覧">
          <div className={styles.timelineHeader}>
            <div>
              <p className={styles.panelLabel}>SCHEDULE</p>
              <h2>{selectedDayInfo.label}の予定</h2>
            </div>
            <button type="button">＋ 予定</button>
          </div>

          {Object.entries(groupedSchedules).map(([time, items]) => (
            <div
              className={`${styles.timeBlock} ${items.length > 1 ? styles.splitTimeBlock : ''}`}
              key={time}
            >
              <div className={styles.timeColumn}>
                <span>{time}</span>
                <small>{items[0].endTime}</small>
                {items.length > 1 && (
                  <em>{items.length}グループ</em>
                )}
              </div>

              <div className={`${styles.eventColumn} ${items.length > 1 ? styles.splitEventColumn : ''}`}>
                {items.length > 1 && (
                  <p className={styles.splitLabel}>同時刻の別行動</p>
                )}
                {items.map((schedule) => (
                  <TimelineCard
                    key={schedule.id}
                    schedule={schedule}
                    members={members}
                    isAllMemberEvent={isAllMemberEvent(schedule)}
                    onClick={() => setSelectedSchedule(schedule)}
                  />
                ))}
              </div>
            </div>
          ))}

          {filteredSchedules.length === 0 && (
            <p className={styles.emptyMessage}>この条件に一致する予定はありません。</p>
          )}
        </section>
      </main>

      <ScheduleDetailSheet
        schedule={selectedSchedule}
        members={members}
        isAllMemberEvent={selectedSchedule ? isAllMemberEvent(selectedSchedule) : false}
        onClose={() => setSelectedSchedule(null)}
      />

      <BottomNav />
    </div>
  );
}
