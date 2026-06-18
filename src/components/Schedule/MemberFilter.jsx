import styles from "./Schedule.module.css";

const members = [
  "全員",
  "太郎",
  "花子",
  "次郎",
  "美咲",
];

export default function MemberFilter({
  selected,
  onChange,
}) {
  return (
    <div className={styles.wrapper}>
      {members.map((member) => (
        <button
          key={member}
          className={`${styles.chip} ${
            selected === member
              ? styles.active
              : ""
          }`}
          onClick={() => onChange(member)}
        >
          {member}
        </button>
      ))}
    </div>
  );
}