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
 * ChecklistItemForm は、持ちものの追加・編集を行うフォームです。
 */
export default function ChecklistItemForm({
    initialItem,
    onSave,
    onCancel,
}) {
    const [name, setName] = useState(initialItem?.name || "");
    const [note, setNote] = useState(initialItem?.note || "");

    // self = 自分、all = 全員
    const [scope, setScope] = useState(
        initialItem?.scope || "all"
    );

    const radioName = initialItem
        ? `checklist-scope-edit-${initialItem.id}`
        : "checklist-scope-add";

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
            scope,
            checked: initialItem?.checked ?? false,
        });
    };

    return (
        <form
            className={styles.itemForm}
            onSubmit={handleSubmit}
        >
            <label>
                持ちもの

                <input
                    value={name}
                    onChange={(event) =>
                        setName(event.target.value)
                    }
                    placeholder="例：水筒"
                    autoFocus
                />
            </label>

            <label>
                メモ（任意）

                <input
                    value={note}
                    onChange={(event) =>
                        setNote(event.target.value)
                    }
                    placeholder="例：500mlを1本"
                />
            </label>

            <div className={styles.scopeGroup}>

                <label className={styles.radioLabel}>
                    <input
                        type="radio"
                        name={radioName}
                        value="self"
                        checked={scope === "self"}
                        onChange={(event) =>
                            setScope(event.target.value)
                        }
                    />
                    自分のみ
                </label>

                <label className={styles.radioLabel}>
                    <input
                        type="radio"
                        name={radioName}
                        value="all"
                        checked={scope === "all"}
                        onChange={(event) =>
                            setScope(event.target.value)
                        }
                    />
                    全員
                </label>
            </div>

            <div className={styles.formActions}>
                <button
                    type="button"
                    onClick={onCancel}
                >
                    キャンセル
                </button>

                <button type="submit">
                    {initialItem ? "更新" : "追加"}
                </button>
            </div>
        </form>
    );
}