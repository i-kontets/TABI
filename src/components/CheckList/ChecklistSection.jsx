import ChecklistDeleteActions from "./ChecklistDeleteActions";
import ChecklistItemForm from "./ChecklistItemForm";
import ChecklistItems from "./ChecklistItems";
import { createItemKey } from "./checkListUtils";
import styles from "./CheckListComponents.module.css";

export default function ChecklistSection({
    section,
    checks,
    addTarget,
    editingItem,
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
        <section className={styles.section}>
            <div className={styles.sectionHeader}>
                <span>
                    <span className={styles.sectionTitle}>{section.title}</span>
                    <span className={styles.description}>{section.description}</span>
                </span>
                {!isEditing && !isAdding ? (
                    <button
                        className={styles.addHeaderButton}
                        type="button"
                        aria-label={`${section.title}に持ちものを追加`}
                        onClick={() => onStartAdd(section.id)}
                    >
                        +
                    </button>
                ) : null}
            </div>

            {isAdding ? (
                <ChecklistItemForm
                    sectionId={section.id}
                    onSave={(item) => onAdd(section.id, item)}
                    onCancel={onCancelForm}
                />
            ) : null}

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
            ) : null}
        </section>
    );
}
