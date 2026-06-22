import styles from './Schedule.module.css';

export default function MemberFilter({ members, selectedMember, onChange }) {
  return (
    <section className={styles.memberFilter} aria-label="メンバーで絞り込み">
      <div className={styles.filterHeader}>
        <h3>メンバー</h3>
        <p>別行動も含めて確認できます</p>
      </div>

      <div className={styles.memberChips}>
        {members.map((member) => (
          <button
            key={member.id}
            className={`${styles.memberChip} ${selectedMember === member.id ? styles.selectedChip : ''}`}
            type="button"
            onClick={() => onChange(member.id)}
          >
            <span
              className={styles.memberAvatar}
              style={{ backgroundColor: member.color }}
            >
              {member.shortName}
            </span>
            {member.name}
          </button>
        ))}
      </div>
    </section>
  );
}
