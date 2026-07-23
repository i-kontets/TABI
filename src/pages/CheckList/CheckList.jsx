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
import { useContext, useState } from "react";
import { TripContext } from "../../App";
import ChecklistSection from "../../components/CheckList/ChecklistSection";
import { createItemKey } from "../../components/CheckList/checkListUtils";
import Header from "../../components/header/Header";
import BottomNav from "../../components/bottomNav/BottomNav";
import checklistData from "./CheckList.json";
import styles from "./CheckList.module.css";

const initialSections = [
    checklistData.sections.find((section) => section.id === "common"),
    checklistData.personal,
// 条件に合うデータだけを残して、画面に出す内容を絞り込みます。
].filter(Boolean);

/**
 * createInitialChecks は、このファイルの中心となる処理をまとめた関数です。
 * 画面から渡された値や API の結果を使い、次に表示する内容を決めます。
 */
function createInitialChecks() {
    return Object.fromEntries(
        initialSections.flatMap((section) =>
            // 配列のデータを1件ずつ画面表示用の形に変換します。
            section.items.map((item) => [
                createItemKey(section.id, item.id),
                item.checked,
            ])
        )
    );
}

/**
 * CheckList は、このファイルの中心となる処理をまとめた関数です。
 * 画面から渡された値や API の結果を使い、次に表示する内容を決めます。
 */
export default function CheckList() {
    const { trip } = useContext(TripContext);
    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const [sections, setSections] = useState(initialSections);
    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const [checks, setChecks] = useState(createInitialChecks);
    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const [addTarget, setAddTarget] = useState(null);
    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const [editingItem, setEditingItem] = useState(null);
    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const [activeSectionId, setActiveSectionId] = useState(
        initialSections[0]?.id || ""
    );
    const totalItemCount = sections.reduce(
        (count, section) => count + section.items.length,
        0
    );
    const checkedItemCount = sections.reduce(
        (count, section) =>
            count +
            // 条件に合うデータだけを残して、画面に出す内容を絞り込みます。
            section.items.filter(
                (item) => checks[createItemKey(section.id, item.id)]
            ).length,
        0
    );

    // handleCheck は、画面操作や API 結果に合わせて必要な処理をまとめた関数です。
    const handleCheck = (itemKey) => {
        setChecks((currentChecks) => ({
            ...currentChecks,
            [itemKey]: !currentChecks[itemKey],
        }));
    };

    // handleStartAdd は、画面操作や API 結果に合わせて必要な処理をまとめた関数です。
    const handleStartAdd = (sectionId) => {
        setEditingItem(null);
        setAddTarget(sectionId);
    };

    // handleStartEdit は、画面操作や API 結果に合わせて必要な処理をまとめた関数です。
    const handleStartEdit = (sectionId, item) => {
        setAddTarget(null);
        setEditingItem({ sectionId, item });
    };

    // handleCancelForm は、画面操作や API 結果に合わせて必要な処理をまとめた関数です。
    const handleCancelForm = () => {
        setAddTarget(null);
        setEditingItem(null);
    };

    // handleAddItem は、画面操作や API 結果に合わせて必要な処理をまとめた関数です。
    const handleAddItem = (sectionId, item) => {
        setSections((currentSections) =>
            // 配列のデータを1件ずつ画面表示用の形に変換します。
            currentSections.map((section) =>
                section.id === sectionId
                    ? { ...section, items: [item, ...section.items] }
                    : section
            )
        );
        setAddTarget(null);
    };

    // handleEditItem は、画面操作や API 結果に合わせて必要な処理をまとめた関数です。
    const handleEditItem = (sectionId, updatedItem) => {
        setSections((currentSections) =>
            // 配列のデータを1件ずつ画面表示用の形に変換します。
            currentSections.map((section) =>
                section.id === sectionId
                    ? {
                          ...section,
                          // 配列のデータを1件ずつ画面表示用の形に変換します。
                          items: section.items.map((item) =>
                              item.id === updatedItem.id ? updatedItem : item
                          ),
                      }
                    : section
            )
        );
        setEditingItem(null);
    };

    // handleDeleteItems は、画面操作や API 結果に合わせて必要な処理をまとめた関数です。
    const handleDeleteItems = (sectionId, itemIds) => {
        const section = sections.find((item) => item.id === sectionId);
        const targetItems =
            // 条件に合うデータだけを残して、画面に出す内容を絞り込みます。
            section?.items.filter((item) => itemIds.includes(item.id)) || [];

        // ここで条件を確認し、状況に合う処理だけを実行します。
        if (
            targetItems.length === 0 ||
            !confirm(
                targetItems.length === 1
                    ? `「${targetItems[0].name}」を削除しますか？`
                    : `${targetItems.length}件の持ちものを削除しますか？`
            )
        ) {
            return;
        }

        setSections((currentSections) =>
            // 配列のデータを1件ずつ画面表示用の形に変換します。
            currentSections.map((currentSection) =>
                currentSection.id === sectionId
                    ? {
                          ...currentSection,
                          // 条件に合うデータだけを残して、画面に出す内容を絞り込みます。
                          items: currentSection.items.filter(
                              (item) => !itemIds.includes(item.id)
                          ),
                      }
                    : currentSection
            )
        );
        setChecks((currentChecks) => {
            const nextChecks = { ...currentChecks };
            targetItems.forEach((item) => {
                delete nextChecks[createItemKey(sectionId, item.id)];
            });
            return nextChecks;
        });
    };

    return (
        <>
            <Header tripName={trip.name || "持ちものチェック"} />

            <main className={styles.page}>
                <div className={styles.toolbar}>
                    <div className={styles.tabs} role="tablist" aria-label="持ちものの分類">
                        {sections.map((section) => (
                            <button
                                key={section.id}
                                className={`${styles.tabButton} ${
                                    activeSectionId === section.id ? styles.activeTab : ""
                                }`}
                                type="button"
                                role="tab"
                                aria-selected={activeSectionId === section.id}
                                onClick={() => {
                                    setActiveSectionId(section.id);
                                    setAddTarget(null);
                                    setEditingItem(null);
                                }}
                            >
                                {section.id === "personal" ? "個人の分" : "全員の分"}
                            </button>
                        ))}
                    </div>

                    <span className={styles.progress}>
                        {checkedItemCount}/{totalItemCount}
                    </span>
                </div>

                <div className={styles.sections}>
                    {sections
                        .filter((section) => section.id === activeSectionId)
                        .map((section) => (
                            <ChecklistSection
                                key={section.id}
                                section={section}
                                checks={checks}
                                addTarget={addTarget}
                                editingItem={editingItem}
                                onCheck={handleCheck}
                                onStartAdd={handleStartAdd}
                                onStartEdit={handleStartEdit}
                                onCancelForm={handleCancelForm}
                                onAdd={handleAddItem}
                                onEdit={handleEditItem}
                                onDelete={handleDeleteItems}
                            />
                        ))}
                </div>
            </main>

            <BottomNav />
        </>
    );
}
