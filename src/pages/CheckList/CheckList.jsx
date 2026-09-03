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
import { useContext, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { TripContext } from "../../App";
import ChecklistSection from "../../components/CheckList/ChecklistSection";
import { createItemKey } from "../../components/CheckList/checkListUtils";
import Header from "../../components/header/Header";
import BottomNav from "../../components/bottomNav/BottomNav";
import checklistData from "./CheckList.json";
import styles from "./CheckList.module.css";

const CHECKLIST_API_BASE = "/TABI/api/CheckList";
const CHECKLIST_API = {
    list: `${CHECKLIST_API_BASE}/List.php`,
    add: `${CHECKLIST_API_BASE}/Add.php`,
    update: `${CHECKLIST_API_BASE}/Update.php`,
    delete: `${CHECKLIST_API_BASE}/Delete.php`,
    deleteChecked: `${CHECKLIST_API_BASE}/DeleteChecked.php`,
};

const initialSections = [
    checklistData.sections.find((section) => section.id === "common"),
    checklistData.personal,
// 条件に合うデータだけを残して、画面に出す内容を絞り込みます。
]
    .filter(Boolean)
    .map((section) => ({
        ...section,
        id: section.id === "common" ? "shared" : section.id,
    }));

/**
 * createInitialChecks は、このファイルの中心となる処理をまとめた関数です。
 * 画面から渡された値や API の結果を使い、次に表示する内容を決めます。
 */
function createChecks(nextSections) {
    return Object.fromEntries(
        nextSections.flatMap((section) =>
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
    const location = useLocation();
    const queryParams = useMemo(
        () => new URLSearchParams(location.search),
        [location.search]
    );
    const groupId =
        queryParams.get("groupId") ||
        queryParams.get("group_id") ||
        trip?.id ||
        "";
    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const [sections, setSections] = useState(initialSections);
    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const [checks, setChecks] = useState(() => createChecks(initialSections));
    const [isLoading, setIsLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState("");
    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const [addTarget, setAddTarget] = useState(null);
    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const [editingItem, setEditingItem] = useState(null);
    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const [activeSectionId, setActiveSectionId] = useState(
        initialSections[0]?.id || ""
    );

    useEffect(() => {
        let isMounted = true;

        const loadChecklist = async () => {
            setIsLoading(true);
            setErrorMessage("");

            try {
                const params = new URLSearchParams();
                if (groupId) {
                    params.set("group_id", groupId);
                }

                const response = await fetch(
                    `${CHECKLIST_API.list}${params.toString() ? `?${params}` : ""}`,
                    {
                        method: "GET",
                        credentials: "include",
                    }
                );
                const data = await response.json();

                if (!isMounted) {
                    return;
                }

                if (!response.ok || !data.success) {
                    throw new Error(data.message || "チェックリストを取得できませんでした");
                }

                const nextSections =
                    Array.isArray(data.sections) && data.sections.length > 0
                        ? data.sections
                        : initialSections;

                setSections(nextSections);
                setChecks(createChecks(nextSections));
                setActiveSectionId((currentId) =>
                    nextSections.some((section) => section.id === currentId)
                        ? currentId
                        : nextSections[0]?.id || ""
                );
            } catch (error) {
                if (isMounted) {
                    setErrorMessage(
                        error instanceof Error
                            ? error.message
                            : "チェックリストを取得できませんでした"
                    );
                }
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        };

        loadChecklist();

        return () => {
            isMounted = false;
        };
    }, [groupId]);

    const requestChecklistApi = async (endpoint, method, body) => {
        const response = await fetch(endpoint, {
            method,
            credentials: "include",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                group_id: groupId || null,
                ...body,
            }),
        });
        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.message || "チェックリストを更新できませんでした");
        }

        return data;
    };

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
    const handleCheck = async (itemKey) => {
        const itemId = itemKey.split("-").at(-1);
        const nextChecked = !checks[itemKey];

        setChecks((currentChecks) => ({
            ...currentChecks,
            [itemKey]: nextChecked,
        }));

        try {
            await requestChecklistApi(CHECKLIST_API.update, "PATCH", {
                item_id: itemId,
                checked: nextChecked,
            });
        } catch (error) {
            setChecks((currentChecks) => ({
                ...currentChecks,
                [itemKey]: !nextChecked,
            }));
            setErrorMessage(
                error instanceof Error
                    ? error.message
                    : "チェック状態を更新できませんでした"
            );
        }
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
    const handleAddItem = async (sectionId, item) => {
        try {
            const data = await requestChecklistApi(CHECKLIST_API.add, "POST", {
                section_id: sectionId,
                name: item.name,
                assigned_user_id: item.assigned_user_id,
            });
            const savedItem = data.item || item;

            setSections((currentSections) =>
                // 配列のデータを1件ずつ画面表示用の形に変換します。
                currentSections.map((section) =>
                    section.id === sectionId
                        ? { ...section, items: [savedItem, ...section.items] }
                        : section
                )
            );
            setChecks((currentChecks) => ({
                ...currentChecks,
                [createItemKey(sectionId, savedItem.id)]: Boolean(savedItem.checked),
            }));
            setAddTarget(null);
            setErrorMessage("");
        } catch (error) {
            setErrorMessage(
                error instanceof Error
                    ? error.message
                    : "持ちものを追加できませんでした"
            );
        }
    };

    // handleEditItem は、画面操作や API 結果に合わせて必要な処理をまとめた関数です。
    const handleEditItem = async (sectionId, updatedItem) => {
        try {
            await requestChecklistApi(CHECKLIST_API.update, "PATCH", {
                item_id: updatedItem.id,
                name: updatedItem.name,
                assigned_user_id: updatedItem.assigned_user_id,
            });

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
            setErrorMessage("");
        } catch (error) {
            setErrorMessage(
                error instanceof Error
                    ? error.message
                    : "持ちものを更新できませんでした"
            );
        }
    };

    // handleDeleteItems は、画面操作や API 結果に合わせて必要な処理をまとめた関数です。
    const handleDeleteItems = async (sectionId, itemIds, options = {}) => {
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

        try {
            await requestChecklistApi(
                options.checkedOnly ? CHECKLIST_API.deleteChecked : CHECKLIST_API.delete,
                "DELETE",
                {
                item_ids: itemIds,
                }
            );

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
            setErrorMessage("");
        } catch (error) {
            setErrorMessage(
                error instanceof Error
                    ? error.message
                    : "持ちものを削除できませんでした"
            );
        }
    };

    return (
        <>
            <Header tripName={trip.name || "持ちものチェック"} />

            <main className={styles.page}>
                {isLoading ? (
                    <p className={styles.stateMessage}>読み込み中...</p>
                ) : null}
                {errorMessage ? (
                    <p className={styles.errorMessage}>{errorMessage}</p>
                ) : null}

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
