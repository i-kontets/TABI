import styles from './TravelGroupCard.module.css';

function CalendarIcon({ className }) {
    return (
        <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
            <path d="M7 3v3M17 3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z" />
        </svg>
    );
}

function UsersIcon({ className }) {
    return (
        <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
            <path d="M16 19c0-2.2-1.8-4-4-4H8c-2.2 0-4 1.8-4 4" />
            <path d="M10 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
            <path d="M20 19c0-1.8-1.2-3.4-3-3.9" />
            <path d="M15 5.2a3 3 0 0 1 0 5.6" />
        </svg>
    );
}

function ChevronRightIcon({ className }) {
    return (
        <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
            <path d="m9 5 7 7-7 7" />
        </svg>
    );
}

const STATUS_CLASS = {
    "進行中": "statusActive",
    "計画中": "statusPlanning",
    "終了": "statusDone",
};

function TravelGroupCard({ group, onClick }) {
    const statusClass = styles[STATUS_CLASS[group.status]] ?? styles.statusPlanning;

    return (
        <button
            type="button"
            className={styles.card}
            onClick={() => onClick?.(group)}
        >
            <div className={styles.imageWrap}>
                <img src={group.image} alt="" className={styles.image} />
                <span className={`${styles.statusBadge} ${statusClass}`}>
                    {group.status}
                </span>
            </div>

            <div className={styles.body}>
                <h2 className={styles.name}>{group.name}</h2>

                <p className={styles.metaRow}>
                    <CalendarIcon className={styles.metaIcon} />
                    <span>{group.date}</span>
                </p>

                <p className={styles.metaRow}>
                    <UsersIcon className={styles.metaIcon} />
                    <span>メンバー {group.members}人</span>
                </p>
            </div>

            <ChevronRightIcon className={styles.chevron} />
        </button>
    );
}

export default TravelGroupCard;
