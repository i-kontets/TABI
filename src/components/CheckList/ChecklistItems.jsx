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
            const currentKey = createItemKey(
                sectionId,
                current.item.id
            );

            const nextKey = createItemKey(
                sectionId,
                next.item.id
            );

            const currentChecked = Boolean(
                checks[currentKey]
            );

            const nextChecked = Boolean(
                checks[nextKey]
            );

            if (currentChecked === nextChecked) {
                return current.index - next.index;
            }

            return currentChecked ? 1 : -1;
        })
        .map(({ item }) => item);

    return (
        <div className={styles.itemList}>
            {sortedItems.map((item) => {
                const itemKey = createItemKey(
                    sectionId,
                    item.id
                );

                return (
                    <div
                        className={styles.item}
                        key={item.id}
                    >
                        <label
                            className={styles.itemContent}
                        >
                            <input
                                type="checkbox"
                                checked={Boolean(
                                    checks[itemKey]
                                )}
                                onChange={() =>
                                    onCheck(itemKey)
                                }
                            />

                            <span>
                                <span
                                    className={
                                        styles.itemName
                                    }
                                >
                                    {item.name}

                                    {item.scope ===
                                    "self" ? (
                                        <span
                                            className={
                                                styles.scopeBadge
                                            }
                                        >
                                            自分のみ
                                        </span>
                                    ) : null}
                                </span>

                                {item.note ? (
                                    <span
                                        className={
                                            styles.itemNote
                                        }
                                    >
                                        {item.note}
                                    </span>
                                ) : null}
                            </span>
                        </label>

                        <div
                            className={styles.itemMenu}
                        >
                            <button
                                className={
                                    styles.menuButton
                                }
                                type="button"
                                aria-label={`${item.name}のメニュー`}
                                aria-expanded={
                                    openMenuId === item.id
                                }
                                onClick={() =>
                                    setOpenMenuId(
                                        (currentId) =>
                                            currentId ===
                                            item.id
                                                ? null
                                                : item.id
                                    )
                                }
                            >
                                ⋮
                            </button>

                            {openMenuId === item.id ? (
                                <div
                                    className={
                                        styles.menuList
                                    }
                                >
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setOpenMenuId(
                                                null
                                            );

                                            onEdit(item);
                                        }}
                                    >
                                        編集
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => {
                                            setOpenMenuId(
                                                null
                                            );

                                            onDelete(
                                                item.id
                                            );
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