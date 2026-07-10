import { useState } from "react";
import { createItemKey } from "./checkListUtils";
import styles from "./CheckListComponents.module.css";

export default function ChecklistItems({
    items,
    sectionId,
    checks,
    onCheck,
    onEdit,
    onDelete,
}) {
    const [openMenuId, setOpenMenuId] = useState(null);
    const sortedItems = items
        .map((item, index) => ({ item, index }))
        .sort((current, next) => {
            const currentKey = createItemKey(sectionId, current.item.id);
            const nextKey = createItemKey(sectionId, next.item.id);
            const currentChecked = Boolean(checks[currentKey]);
            const nextChecked = Boolean(checks[nextKey]);

            if (currentChecked === nextChecked) {
                return current.index - next.index;
            }

            return currentChecked ? 1 : -1;
        })
        .map(({ item }) => item);

    return (
        <div className={styles.itemList}>
            {sortedItems.map((item) => {
                const itemKey = createItemKey(sectionId, item.id);

                return (
                    <div className={styles.item} key={item.id}>
                        <label className={styles.itemContent}>
                            <input
                                type="checkbox"
                                checked={Boolean(checks[itemKey])}
                                onChange={() => onCheck(itemKey)}
                            />
                            <span>
                                <span className={styles.itemName}>{item.name}</span>
                                {item.note ? (
                                    <span className={styles.itemNote}>{item.note}</span>
                                ) : null}
                                {sectionId === "shared" ? (
                                    <span className={styles.assignee}>
                                        担当：{item.assignee || "未定"}
                                    </span>
                                ) : null}
                            </span>
                        </label>

                        <div className={styles.itemMenu}>
                            <button
                                className={styles.menuButton}
                                type="button"
                                aria-label={`${item.name}のメニュー`}
                                aria-expanded={openMenuId === item.id}
                                onClick={() =>
                                    setOpenMenuId((currentId) =>
                                        currentId === item.id ? null : item.id
                                    )
                                }
                            >
                                ⋮
                            </button>
                            {openMenuId === item.id ? (
                                <div className={styles.menuList}>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setOpenMenuId(null);
                                            onEdit(item);
                                        }}
                                    >
                                        編集
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setOpenMenuId(null);
                                            onDelete(item.id);
                                        }}
                                    >
                                        削除
                                    </button>
                                </div>
                            ) : null}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
