import ChecklistDeleteActions from "./ChecklistDeleteActions";
import ChecklistItemForm from "./ChecklistItemForm";
import ChecklistItems from "./ChecklistItems";
import { createItemKey } from "./checkListUtils";
import styles from "./CheckListComponents.module.css";

export default function ChecklistSection({
    section,
    checks,
    isOpen,
    addTarget,
    editingItem,
    onToggle,
    onCheck,
    onStartAdd,
    onStartEdit,
    onCancelForm,
    onAdd,
    onEdit,
    onDelete,
}) {
    const checkedItemIds = section.items
        .filter((item) => checks[createItemKey(section.id, item.id)])
        .map((item) => item.id);
    const isEditing = editingItem?.sectionId === section.id;
    const isAdding = addTarget === section.id;

    return (
        <details
            className={styles.section}
            open={isOpen}
            onToggle={(event) => onToggle(section.id, event.currentTarget.open)}
        >
            <summary className={styles.summary}>
                <span>
                    <span className={styles.sectionTitle}>{section.title}</span>
                    <span className={styles.description}>{section.description}</span>
                </span>
                <span className={styles.progress}>
                    {checkedItemIds.length}/{section.items.length}
                </span>
            </summary>

            <ChecklistItems
                items={section.items}
                sectionId={section.id}
                checks={checks}
                onCheck={onCheck}
                onEdit={(item) => onStartEdit(section.id, item)}
                onDelete={(itemId) => onDelete(section.id, [itemId])}
            />
            <ChecklistDeleteActions
                hasItems={section.items.length > 0}
                hasCheckedItems={checkedItemIds.length > 0}
                onDeleteChecked={() => onDelete(section.id, checkedItemIds)}
                onDeleteAll={() =>
                    onDelete(
                        section.id,
                        section.items.map((item) => item.id)
                    )
                }
            />

            {isEditing ? (
                <ChecklistItemForm
                    sectionId={section.id}
                    initialItem={editingItem.item}
                    onSave={(item) => onEdit(section.id, item)}
                    onCancel={onCancelForm}
                />
            ) : isAdding ? (
                <ChecklistItemForm
                    sectionId={section.id}
                    onSave={(item) => onAdd(section.id, item)}
                    onCancel={onCancelForm}
                />
            ) : (
                <button
                    className={styles.addItemButton}
                    type="button"
                    onClick={() => onStartAdd(section.id)}
                >
                    ＋ {section.id === "personal" ? "自分の" : ""}持ちものを追加
                </button>
            )}
        </details>
    );
}
