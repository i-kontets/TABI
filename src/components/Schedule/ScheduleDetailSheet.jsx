import styles from './Schedule.module.css';

function getParticipants(schedule, members) {
  return schedule.memberIds
    .map((id) => members.find((member) => member.id === id))
    .filter(Boolean);
}

export default function ScheduleDetailSheet({
  schedule,
  members,
  isAllMemberEvent,
  onClose,
}) {
  if (!schedule) return null;

  const participants = getParticipants(schedule, members);

  return (
    <>
      <div className={styles.backdrop} onClick={onClose} />

      <aside className={styles.detailSheet} aria-label="予定詳細">
        <div className={styles.sheetHandle} />

        <div className={styles.detailHeader}>
          <div>
            {schedule.groupLabel && (
              <span className={styles.groupBadge}>{schedule.groupLabel}</span>
            )}
            <h2>{schedule.title}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="閉じる">×</button>
        </div>

        <dl className={styles.detailList}>
          <div>
            <dt>時間</dt>
            <dd>{schedule.time} - {schedule.endTime}</dd>
          </div>
          <div>
            <dt>場所</dt>
            <dd>{schedule.place}</dd>
          </div>
          <div>
            <dt>参加</dt>
            <dd>{isAllMemberEvent ? '全員' : participants.map((member) => member.name).join('・')}</dd>
          </div>
        </dl>

        <div className={styles.detailMembers}>
          {participants.map((member) => (
            <span key={member.id}>
              <span style={{ backgroundColor: member.color }}>{member.shortName}</span>
              {member.name}
            </span>
          ))}
        </div>

        <div className={styles.memoBox}>
          <p>メモ</p>
          <strong>{schedule.memo}</strong>
        </div>
      </aside>
    </>
  );
}
