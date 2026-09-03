/**
 * 旅行の持ち物や準備項目をチェックリストとして管理します。
 *
 * 主な流れ:
 * 1. 必要な部品や API 関数を読み込む
 * 2. 画面表示やデータ取得に必要な値を準備する
 * 3. ユーザー操作や API の結果に合わせて表示を更新する
 *
 * 扱うデータ: React の state、props、フォーム入力、API から返ったデータを主に扱います。
 */
import ChecklistDeleteActions from "./ChecklistDeleteActions";
import ChecklistItemForm from "./ChecklistItemForm";
import ChecklistItems from "./ChecklistItems";
import { createItemKey } from "./checkListUtils";
import AddButtonIcon from "../../assets/icons/add_button.svg?react";
import styles from "./CheckListComponents.module.css";

/**
 * ChecklistSection は、このファイルの中心となる処理をまとめた関数です。
 * 画面から渡された値や API の結果を使い、次に表示する内容を決めます。
 */
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
        // 条件に合うデータだけを残して、画面に出す内容を絞り込みます。
        .filter((item) => checks[createItemKey(section.id, item.id)])
        // 配列のデータを1件ずつ画面表示用の形に変換します。
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
                        <AddButtonIcon className={styles.addHeaderIcon} aria-hidden="true" />
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
                onDeleteChecked={() =>
                    onDelete(section.id, checkedItemIds, { checkedOnly: true })
                }
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
