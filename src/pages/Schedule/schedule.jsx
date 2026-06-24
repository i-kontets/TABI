import { useContext, useMemo, useState } from 'react';
import {
  Handle,
  Position,
  ReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Stepper } from 'react-form-stepper';
import { TripContext } from '../../App';
import BottomNav from '../../components/bottomNav/BottomNav';
import Header from '../../components/header/Header';
import ScheduleDetailSheet from '../../components/Schedule/ScheduleDetailSheet';
import styles from './Schedulepage.module.css';

const members = [
  { id: 'all', name: '全員', shortName: '全', color: 'var(--sub-color)' },
  { id: 'aoi', name: '葵', shortName: '葵', color: 'var(--sub-color)' },
  { id: 'ren', name: '蓮', shortName: '蓮', color: 'color-mix(in srgb, var(--sub-color) 78%, var(--other-color))' },
  { id: 'mio', name: '美緒', shortName: '美', color: 'color-mix(in srgb, var(--sub-color) 64%, var(--other-color))' },
  { id: 'sora', name: '空', shortName: '空', color: 'color-mix(in srgb, var(--sub-color) 52%, var(--other-color))' },
  { id: 'yui', name: '結', shortName: '結', color: 'color-mix(in srgb, var(--sub-color) 40%, var(--other-color))' },
  { id: 'kei', name: '慧', shortName: '慧', color: 'color-mix(in srgb, var(--sub-color) 86%, var(--other-color))' },
];

const days = [
  { id: 'day1', label: '1日目', date: '6/28(日)', fullDate: '6月28日（日）' },
  { id: 'day2', label: '2日目', date: '6/29(月)', fullDate: '6月29日（月）' },
  { id: 'day3', label: '3日目', date: '6/30(火)', fullDate: '6月30日（火）' },
];

const themeColors = {
  sub: '#44558D',
  other: '#CDD4E3',
};

const currentUserId = 'aoi';

const flowColors = {
  main: '#F8F8FB',
  sub: '#44558D',
  other: '#CDD4E3',
  warm: '#e97152',
  cool: '#3f7fc6',
};

const schedules = [
  {
    id: 1,
    dayId: 'day1',
    time: '09:00',
    endTime: '09:30',
    title: 'ホテル出発',
    place: '伊豆高原ホテル',
    memberIds: ['aoi', 'ren', 'mio', 'sora', 'yui', 'kei'],
    type: 'move',
    status: 'confirmed',
    memo: '荷物をまとめてロビーに集合。レンタカー2台で出発する。',
  },
  {
    id: 2,
    dayId: 'day1',
    time: '10:30',
    endTime: '11:45',
    title: '城ヶ崎海岸を散策',
    place: '城ヶ崎海岸',
    memberIds: ['aoi', 'ren', 'mio', 'sora', 'yui', 'kei'],
    type: 'spot',
    status: 'confirmed',
    memo: '吊り橋と海沿いの遊歩道を歩く。写真撮影の時間も確保。',
  },
  {
    id: 3,
    dayId: 'day1',
    time: '12:00',
    endTime: '13:00',
    title: 'スーパーで買い出し',
    place: '伊豆高原スーパー',
    memberIds: ['aoi', 'ren', 'mio'],
    groupLabel: 'グループA',
    groupTone: 'warm',
    type: 'shopping',
    status: 'confirmed',
    memo: 'BBQ用の肉、野菜、飲み物を購入する。',
  },
  {
    id: 4,
    dayId: 'day1',
    time: '12:00',
    endTime: '13:00',
    title: '漁港で買い出し',
    place: '伊東港',
    memberIds: ['sora', 'yui', 'kei'],
    groupLabel: 'グループB',
    groupTone: 'cool',
    type: 'shopping',
    status: 'confirmed',
    memo: '魚介類と氷を購入する。集合時間に遅れないように戻る。',
  },
  {
    id: 5,
    dayId: 'day1',
    time: '13:15',
    endTime: '13:30',
    title: '貸別荘に集合',
    place: '海辺の貸別荘',
    memberIds: ['aoi', 'ren', 'mio', 'sora', 'yui', 'kei'],
    type: 'hotel',
    status: 'confirmed',
    memo: '買い出し荷物を降ろして、部屋割りを確認する。',
  },
  {
    id: 6,
    dayId: 'day1',
    time: '15:00',
    endTime: '16:00',
    title: 'BBQ準備',
    place: '貸別荘テラス',
    memberIds: ['aoi', 'ren', 'mio', 'sora', 'yui', 'kei'],
    type: 'meal',
    status: 'confirmed',
    memo: '火起こし、食材の下準備、テーブル設営を分担する。',
  },
  {
    id: 7,
    dayId: 'day2',
    time: '09:30',
    endTime: '11:00',
    title: '朝の海岸散歩',
    place: '伊豆海岸',
    memberIds: ['aoi', 'ren', 'mio', 'sora', 'yui', 'kei'],
    type: 'spot',
    status: 'confirmed',
    memo: 'チェックアウト前に海沿いを散歩する。',
  },
  {
    id: 8,
    dayId: 'day3',
    time: '10:00',
    endTime: '11:00',
    title: 'お土産購入',
    place: '道の駅 伊東マリンタウン',
    memberIds: ['aoi', 'ren', 'mio', 'sora', 'yui', 'kei'],
    type: 'shopping',
    status: 'candidate',
    memo: '帰路の前にお土産を購入する。',
  },
];

function getParticipants(schedule) {
  return schedule.memberIds
    .map((id) => members.find((member) => member.id === id))
    .filter(Boolean);
}

function getDurationMinutes(startTime, endTime) {
  const [startHour, startMinute] = startTime.split(':').map(Number);
  const [endHour, endMinute] = endTime.split(':').map(Number);

  return (endHour * 60 + endMinute) - (startHour * 60 + startMinute);
}

function HiddenHandle({ id, position, type }) {
  return (
    <Handle
      id={id}
      type={type}
      position={position}
      className={styles.hiddenHandle}
      isConnectable={false}
    />
  );
}

function TimeNode({ data }) {
  return <div className={`${styles.flowTimeNode} ${data.isSplit ? styles.splitTimeNode : ''}`}>{data.time}</div>;
}

function PointNode({ data }) {
  return (
    <div className={styles.flowPointNode}>
      <HiddenHandle id="top" type="target" position={Position.Top} />
      <HiddenHandle id="bottom" type="source" position={Position.Bottom} />
      <HiddenHandle id="right" type="source" position={Position.Right} />
      <HiddenHandle id="left" type="target" position={Position.Left} />
      <div className={`${styles.flowPointDot} ${data.isSplit ? styles.splitPointDot : ''}`} />
    </div>
  );
}

function ScheduleNode({ data }) {
  return (
    <button
      className={styles.flowScheduleCard}
      type="button"
      onClick={() => data.onSelect(data.schedule)}
    >
      <HiddenHandle id="left" type="target" position={Position.Left} />
      <span className={styles.badge}>全員</span>
      <strong>{data.schedule.title}</strong>
    </button>
  );
}

function BranchNode({ data }) {
  const participants = getParticipants(data.schedule);

  return (
    <button
      className={`${styles.flowBranchCard} ${data.schedule.groupTone ? styles[data.schedule.groupTone] : ''}`}
      type="button"
      onClick={() => data.onSelect(data.schedule)}
    >
      <HiddenHandle id="top" type="target" position={Position.Top} />
      <HiddenHandle id="bottom" type="source" position={Position.Bottom} />
      <span className={styles.badge}>{data.schedule.groupLabel}</span>
      <strong>{data.schedule.title}</strong>
      <div className={styles.avatarRow}>
        {participants.map((member) => (
          <span
            key={member.id}
            className={styles.avatar}
            style={{ backgroundColor: member.color }}
            title={member.name}
          >
            {member.shortName}
          </span>
        ))}
      </div>
      <div className={styles.duration}>
        <span>{getDurationMinutes(data.schedule.time, data.schedule.endTime)}分</span>
      </div>
    </button>
  );
}

const nodeTypes = {
  time: TimeNode,
  point: PointNode,
  schedule: ScheduleNode,
  branch: BranchNode,
};

function createFlowElements(items, onSelect) {
  const byId = Object.fromEntries(items.map((schedule) => [schedule.id, schedule]));
  const visible = (id) => Boolean(byId[id]);
  const nodes = [];
  const edges = [];

  const addNode = (node) => nodes.push(node);
  const addEdge = (edge) => edges.push({
    type: 'smoothstep',
    animated: false,
    selectable: false,
    ...edge,
  });

  const pointPositions = [
    { id: 'p-1', scheduleId: 1, time: '09:00', y: 16 },
    { id: 'p-2', scheduleId: 2, time: '10:30', y: 184 },
    { id: 'p-3', scheduleId: 3, time: '12:00', y: 352, isSplit: true },
    { id: 'p-5', scheduleId: 5, time: '13:15', y: 720 },
    { id: 'p-6', scheduleId: 6, time: '15:00', y: 888 },
  ].filter((point) => visible(point.scheduleId));

  pointPositions.forEach((point) => {
    addNode({
      id: `time-${point.id}`,
      type: 'time',
      position: { x: 0, y: point.y - 4 },
      data: { time: point.time, isSplit: point.isSplit },
      draggable: false,
      selectable: false,
    });
    addNode({
      id: point.id,
      type: 'point',
      position: { x: 126, y: point.y },
      data: { isSplit: point.isSplit },
      draggable: false,
      selectable: false,
    });
  });

  [
    { scheduleId: 1, pointId: 'p-1', x: 210, y: 0 },
    { scheduleId: 2, pointId: 'p-2', x: 210, y: 168 },
    { scheduleId: 5, pointId: 'p-5', x: 210, y: 704 },
    { scheduleId: 6, pointId: 'p-6', x: 210, y: 872 },
  ].filter((item) => visible(item.scheduleId)).forEach((item) => {
    addNode({
      id: `schedule-${item.scheduleId}`,
      type: 'schedule',
      position: { x: item.x, y: item.y },
      data: { schedule: byId[item.scheduleId], onSelect },
      draggable: false,
      selectable: false,
    });
    addEdge({
      id: `edge-${item.pointId}-${item.scheduleId}`,
      source: item.pointId,
      sourceHandle: 'right',
      target: `schedule-${item.scheduleId}`,
      targetHandle: 'left',
      style: { stroke: flowColors.sub, strokeWidth: 2.5 },
    });
  });

  [
    { scheduleId: 3, x: 185, y: 450 },
    { scheduleId: 4, x: 525, y: 450 },
  ].filter((item) => visible(item.scheduleId)).forEach((item) => {
    addNode({
      id: `branch-${item.scheduleId}`,
      type: 'branch',
      position: { x: item.x, y: item.y },
      data: { schedule: byId[item.scheduleId], onSelect },
      draggable: false,
      selectable: false,
    });
  });

  for (let index = 0; index < pointPositions.length - 1; index += 1) {
    addEdge({
      id: `rail-${pointPositions[index].id}-${pointPositions[index + 1].id}`,
      source: pointPositions[index].id,
      sourceHandle: 'bottom',
      target: pointPositions[index + 1].id,
      targetHandle: 'top',
      style: { stroke: flowColors.sub, strokeWidth: 6 },
    });
  }

  if (visible(3)) {
    addEdge({
      id: 'branch-3-start',
      source: 'p-3',
      sourceHandle: 'right',
      target: 'branch-3',
      targetHandle: 'top',
      style: { stroke: flowColors.warm, strokeWidth: 3 },
    });
  }

  if (visible(4)) {
    addEdge({
      id: 'branch-4-start',
      source: 'p-3',
      sourceHandle: 'right',
      target: 'branch-4',
      targetHandle: 'top',
      style: { stroke: flowColors.cool, strokeWidth: 3 },
    });
  }

  if (visible(3) && visible(5)) {
    addEdge({
      id: 'branch-3-end',
      source: 'branch-3',
      sourceHandle: 'bottom',
      target: 'p-5',
      targetHandle: 'left',
      style: { stroke: flowColors.warm, strokeWidth: 3 },
    });
  }

  if (visible(4) && visible(5)) {
    addEdge({
      id: 'branch-4-end',
      source: 'branch-4',
      sourceHandle: 'bottom',
      target: 'p-5',
      targetHandle: 'left',
      style: { stroke: flowColors.cool, strokeWidth: 3 },
    });
  }

  return { nodes, edges };
}

export default function SchedulePage() {
  const { tripName } = useContext(TripContext);
  const [selectedDay, setSelectedDay] = useState('day1');
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [scheduleScope, setScheduleScope] = useState('all');

  const filteredSchedules = useMemo(() => {
    return schedules
      .filter((schedule) => schedule.dayId === selectedDay)
      .filter((schedule) => (
        scheduleScope === 'all' || schedule.memberIds.includes(currentUserId)
      ))
      .sort((a, b) => a.time.localeCompare(b.time));
  }, [selectedDay, scheduleScope]);

  const { nodes, edges } = useMemo(
    () => createFlowElements(filteredSchedules, setSelectedSchedule),
    [filteredSchedules],
  );
  const selectedDayInfo = days.find((day) => day.id === selectedDay);
  const selectedDayIndex = days.findIndex((day) => day.id === selectedDay);

  return (
    <div className={styles.container}>
      <Header tripName={tripName || '伊豆・海辺の週末'} />

      <main className={styles.content}>
        <section className={styles.hero} aria-label="旅行日程">
          <p>{tripName || '伊豆・海辺の週末'}</p>
          <h1>{selectedDayInfo.fullDate}</h1>
        </section>

        <section className={styles.dayPanel} aria-label="日付選択">
          <Stepper
            steps={days.map((day) => ({ label: day.date }))}
            activeStep={selectedDayIndex}
            connectorStateColors
            className={styles.dayStepper}
            styleConfig={{
              activeBgColor: themeColors.sub,
              activeTextColor: '#ffffff',
              completedBgColor: themeColors.sub,
              completedTextColor: '#ffffff',
              inactiveBgColor: themeColors.other,
              inactiveTextColor: themeColors.sub,
              size: '30px',
              circleFontSize: '13px',
              labelFontSize: '12px',
              borderRadius: '999px',
              fontWeight: 700,
            }}
            connectorStyleConfig={{
              activeColor: themeColors.sub,
              completedColor: themeColors.sub,
              disabledColor: themeColors.other,
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

        <div className={styles.segmentedControl} aria-label="表示切り替え">
          <button
            className={scheduleScope === 'all' ? styles.activeSegment : ''}
            type="button"
            onClick={() => setScheduleScope('all')}
          >
            全員
          </button>
          <button
            className={scheduleScope === 'mine' ? styles.activeSegment : ''}
            type="button"
            onClick={() => setScheduleScope('mine')}
          >
            自分のみ
          </button>
        </div>

        <section className={styles.timelineSection} aria-label="予定一覧">
          {filteredSchedules.length > 0 ? (
            <div className={styles.flowCanvas}>
              <ReactFlow
                nodes={nodes}
                edges={edges}
                nodeTypes={nodeTypes}
                fitView
                fitViewOptions={{ padding: 0.02, minZoom: 0.75, maxZoom: 1 }}
                minZoom={0.75}
                maxZoom={1}
                nodesDraggable={false}
                nodesConnectable={false}
                elementsSelectable={false}
                panOnDrag={false}
                zoomOnScroll={false}
                zoomOnPinch={false}
                zoomOnDoubleClick={false}
                preventScrolling={false}
                proOptions={{ hideAttribution: true }}
              />
            </div>
          ) : (
            <div className={styles.emptyTimeline}>
              この条件に一致する予定はありません。
            </div>
          )}
        </section>
      </main>

      <button className={styles.addButton} type="button" aria-label="予定を追加">
        +
      </button>

      <ScheduleDetailSheet
        schedule={selectedSchedule}
        members={members}
        isAllMemberEvent={selectedSchedule ? selectedSchedule.memberIds.length === members.length - 1 : false}
        onClose={() => setSelectedSchedule(null)}
      />

      <BottomNav />
    </div>
  );
}
