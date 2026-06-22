import styles from './Schedule.module.css';

const typeLabels = {
  meal: '食事',
  move: '移動',
  spot: '観光',
  free: '自由',
  shopping: '買物',
  hotel: '宿泊',
};

function getParticipants(schedule, members) {
  return schedule.memberIds
    .map((id) => members.find((member) => member.id === id))
    .filter(Boolean);
}

export default function TimelineCard({
  schedule,
  members,
  isAllMemberEvent,
  onClick,
}) {
  const participants = getParticipants(schedule, members);

  return (
    <button
      className={`${styles.timelineCard} ${styles[schedule.type]} ${isAllMemberEvent ? styles.allMemberCard : ''}`}
      type="button"
      onClick={onClick}
    >
      <div className={styles.cardTop}>
        <span className={styles.typeBadge}>{typeLabels[schedule.type]}</span>
        {schedule.groupLabel && (
          <span className={styles.groupBadge}>{schedule.groupLabel}</span>
        )}
      </div>

      <h3>{schedule.title}</h3>

      <div className={styles.cardMeta}>
        <span>{schedule.time} - {schedule.endTime}</span>
        <span>{schedule.place}</span>
      </div>

      <div className={styles.cardFooter}>
        <div className={styles.avatarStack}>
          {participants.map((member) => (
            <span
              key={member.id}
              className={styles.smallAvatar}
              style={{ backgroundColor: member.color }}
              title={member.name}
            >
              {member.shortName}
            </span>
          ))}
        </div>
        <span className={styles.participantText}>
          {isAllMemberEvent ? '全員参加' : participants.map((member) => member.name).join('・')}
        </span>
      </div>
    </button>
  );
}
