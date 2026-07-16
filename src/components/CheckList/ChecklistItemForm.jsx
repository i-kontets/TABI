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
import { useState } from "react";
import styles from "./CheckListComponents.module.css";

/**
 * ChecklistItemForm は、このファイルの中心となる処理をまとめた関数です。
 * 画面から渡された値や API の結果を使い、次に表示する内容を決めます。
 */
export default function ChecklistItemForm({
    sectionId,
    initialItem,
    onSave,
    onCancel,
}) {
    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const [name, setName] = useState(initialItem?.name || "");
    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const [note, setNote] = useState(initialItem?.note || "");
    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const [assignee, setAssignee] = useState(initialItem?.assignee || "");
    const showAssignee = sectionId === "shared";

    // handleSubmit は、画面操作や API 結果に合わせて必要な処理をまとめた関数です。
    const handleSubmit = (event) => {
        event.preventDefault();
        const trimmedName = name.trim();

        // ここで条件を確認し、状況に合う処理だけを実行します。
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
