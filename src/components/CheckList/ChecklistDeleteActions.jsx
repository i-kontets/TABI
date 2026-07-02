import styles from "./CheckListComponents.module.css";

export default function ChecklistDeleteActions({
    hasItems,
    hasCheckedItems,
    onDeleteChecked,
    onDeleteAll,
}) {
    if (!hasItems) {
        return <p className={styles.emptyText}>持ちものがありません。</p>;
    }

    return (
        <div className={styles.deleteActions}>
            <button
                type="button"
                disabled={!hasCheckedItems}
                onClick={onDeleteChecked}
            >
                チェック済みを一括削除
            </button>
            <button type="button" onClick={onDeleteAll}>
                すべて削除
            </button>
        </div>
    );
}
