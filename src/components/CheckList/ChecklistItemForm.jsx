import { useState } from "react";
import styles from "./CheckListComponents.module.css";

export default function ChecklistItemForm({
    sectionId,
    initialItem,
    onSave,
    onCancel,
}) {
    const [name, setName] = useState(initialItem?.name || "");
    const [note, setNote] = useState(initialItem?.note || "");
    const [assignee, setAssignee] = useState(initialItem?.assignee || "");
    const showAssignee = sectionId === "shared";

    const handleSubmit = (event) => {
        event.preventDefault();
        const trimmedName = name.trim();

        if (!trimmedName) {
            return;
        }

        onSave({
            id: initialItem?.id || `added-${Date.now()}`,
            name: trimmedName,
            note: note.trim(),
            ...(showAssignee ? { assignee: assignee.trim() } : {}),
            checked: false,
        });
    };

    return (
        <form className={styles.itemForm} onSubmit={handleSubmit}>
            <label>
                持ちもの
                <input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="例：水筒"
                    autoFocus
                />
            </label>
            <label>
                メモ（任意）
                <input
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    placeholder="例：500mlを1本"
                />
            </label>
            {showAssignee ? (
                <label>
                    担当者
                    <input
                        value={assignee}
                        onChange={(event) => setAssignee(event.target.value)}
                        placeholder="例：志田"
                    />
                </label>
            ) : null}
            <div className={styles.formActions}>
                <button type="button" onClick={onCancel}>
                    キャンセル
                </button>
                <button type="submit">{initialItem ? "更新" : "追加"}</button>
            </div>
        </form>
    );
}
