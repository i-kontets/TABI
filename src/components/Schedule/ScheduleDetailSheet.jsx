import styles from "./Schedule.module.css";

export default function ScheduleDetailSheet({
  schedule,
  onClose,
}) {
  if (!schedule) return null;

  return (
    <>
      <div
        className={styles.backdrop}
        onClick={onClose}
      />

      <div className={styles.sheet}>
        <div className={styles.handle} />

        <h2>{schedule.title}</h2>

        <p>
          {schedule.start} - {schedule.end}
        </p>

        <p>{schedule.location}</p>

        <div>
          {schedule.participants.map((member) => (
            <span key={member}>
              {member}
            </span>
          ))}
        </div>
      </div>
    </>
  );
}