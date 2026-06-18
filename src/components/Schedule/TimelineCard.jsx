import styles from "./Schedule.module.css";

export default function TimelineCard({
  schedule,
  onClick,
}) {
  return (
    <div
      className={styles.card}
      style={{
        background: schedule.color,
      }}
      onClick={onClick}
    >
      <div className={styles.time}>
        {schedule.start} - {schedule.end}
      </div>

      <h3>{schedule.title}</h3>

      <div className={styles.members}>
        {schedule.participants.join("・")}
      </div>
    </div>
  );
}