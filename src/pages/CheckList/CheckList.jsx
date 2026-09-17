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

const initialItems = [
    ...(checklistData.sections?.find(
        (section) => section.id === "common"
    )?.items || []),

    ...(checklistData.personal?.items || []),
];

const initialSection = {
    id: "checklist",
    title: "持ちもの",
    description: "旅行に必要な持ちものを確認します。",
    items: initialItems,
};

function createChecks(nextSections) {
    return Object.fromEntries(
        nextSections.flatMap((section) =>
            section.items.map((item) => [
                createItemKey(section.id, item.id),
                item.checked,
            ])
        )
    );
}

function getLoginUserId() {
    try {
        const loginUser = JSON.parse(
            localStorage.getItem("loginUser") || "null"
        );

        return Number(loginUser?.user_id) || null;
    } catch {
        return null;
    }
}

function canDisplayItem(item, loginUserId) {
    const assignedUserId = item?.assigned_user_id;

    return (
        assignedUserId === null
        || assignedUserId === undefined
        || Number(assignedUserId) === loginUserId
    );
}

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

    const [sections, setSections] = useState([
        initialSection,
    ]);

    const [checks, setChecks] = useState(() =>
        createChecks([initialSection])
    );

    const [isLoading, setIsLoading] = useState(true);

    const [errorMessage, setErrorMessage] = useState("");

    const [addTarget, setAddTarget] = useState(null);

    const [editingItem, setEditingItem] = useState(null);

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
                    `${CHECKLIST_API.list}${
                        params.toString()
                            ? `?${params}`
                            : ""
                    }`,
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
                    throw new Error(
                        data.message ||
                            "チェックリストを取得できませんでした"
                    );
                }

                const apiItems = Array.isArray(
                    data.sections
                )
                    ? data.sections.flatMap(
                          (section) =>
                              Array.isArray(
                                  section.items
                              )
                                  ? section.items
                                  : []
                      )
                    : [];

                const loginUserId = getLoginUserId();
                const visibleItems = apiItems.filter((item) =>
                    canDisplayItem(item, loginUserId)
                );

                const nextSection = {
                    id: "checklist",
                    title: "持ちもの",
                    description:
                        "旅行に必要な持ちものを確認します。",
                    items: visibleItems,
                };

                setSections([nextSection]);

                setChecks(
                    createChecks([nextSection])
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

    const requestChecklistApi = async (
        endpoint,
        method,
        body
    ) => {
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
            throw new Error(
                data.message ||
                    "チェックリストを更新できませんでした"
            );
        }

        return data;
    };

    const totalItemCount = sections.reduce(
        (count, section) =>
            count + section.items.length,
        0
    );

    const checkedItemCount = sections.reduce(
        (count, section) =>
            count +
            section.items.filter(
                (item) =>
                    checks[
                        createItemKey(
                            section.id,
                            item.id
                        )
                    ]
            ).length,
        0
    );

    const handleCheck = async (itemKey) => {
        const itemId = itemKey.split("-").at(-1);

        const nextChecked = !checks[itemKey];

        setChecks((currentChecks) => ({
            ...currentChecks,
            [itemKey]: nextChecked,
        }));

        try {
            await requestChecklistApi(
                CHECKLIST_API.update,
                "PATCH",
                {
                    item_id: itemId,
                    checked: nextChecked,
                }
            );
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

    const handleStartAdd = (sectionId) => {
        setEditingItem(null);
        setAddTarget(sectionId);
    };

    const handleStartEdit = (sectionId, item) => {
        setAddTarget(null);

        setEditingItem({
            sectionId,
            item,
        });
    };

    const handleCancelForm = () => {
        setAddTarget(null);
        setEditingItem(null);
    };

    const handleAddItem = async (
        sectionId,
        item
    ) => {
        try {
            const data =
                await requestChecklistApi(
                    CHECKLIST_API.add,
                    "POST",
                    {
                        name: item.name,
                        note: item.note,
                        scope: item.scope,
                    }
                );

            const savedItem =
                data.item || item;

            setSections(
                (currentSections) =>
                    currentSections.map(
                        (section) =>
                            section.id === sectionId
                                ? {
                                      ...section,
                                      items: [
                                          savedItem,
                                          ...section.items,
                                      ],
                                  }
                                : section
                    )
            );

            setChecks((currentChecks) => ({
                ...currentChecks,
                [createItemKey(
                    sectionId,
                    savedItem.id
                )]: Boolean(savedItem.checked),
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

    const handleEditItem = async (
        sectionId,
        updatedItem
    ) => {
        try {
            const data =
                await requestChecklistApi(
                    CHECKLIST_API.update,
                    "PATCH",
                    {
                        item_id: updatedItem.id,
                        name: updatedItem.name,
                        note: updatedItem.note,
                        scope: updatedItem.scope,
                    }
                );

            const savedItem =
                data.item || updatedItem;

            setSections(
                (currentSections) =>
                    currentSections.map(
                        (section) =>
                            section.id === sectionId
                                ? {
                                      ...section,
                                      items: section.items.map(
                                          (item) =>
                                              item.id ===
                                              savedItem.id
                                                  ? savedItem
                                                  : item
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

    const handleDeleteItems = async (
        sectionId,
        itemIds,
        options = {}
    ) => {
        const section = sections.find(
            (item) => item.id === sectionId
        );

        const targetItems =
            section?.items.filter((item) =>
                itemIds.includes(item.id)
            ) || [];

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
                options.checkedOnly
                    ? CHECKLIST_API.deleteChecked
                    : CHECKLIST_API.delete,
                "DELETE",
                {
                    item_ids: itemIds,
                }
            );

            setSections(
                (currentSections) =>
                    currentSections.map(
                        (currentSection) =>
                            currentSection.id ===
                            sectionId
                                ? {
                                      ...currentSection,
                                      items: currentSection.items.filter(
                                          (item) =>
                                              !itemIds.includes(
                                                  item.id
                                              )
                                      ),
                                  }
                                : currentSection
                    )
            );

            setChecks((currentChecks) => {
                const nextChecks = {
                    ...currentChecks,
                };

                targetItems.forEach((item) => {
                    delete nextChecks[
                        createItemKey(
                            sectionId,
                            item.id
                        )
                    ];
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
            <Header
                tripName={
                    trip?.name || "持ちものチェック"
                }
            />

            <main className={styles.page}>
                {isLoading ? (
                    <p className={styles.stateMessage}>
                        読み込み中...
                    </p>
                ) : null}

                {errorMessage ? (
                    <p className={styles.errorMessage}>
                        {errorMessage}
                    </p>
                ) : null}

                <div className={styles.toolbar}>
                    <span className={styles.progress}>
                        {checkedItemCount}/
                        {totalItemCount}
                    </span>
                </div>

                <div className={styles.sections}>
                    {sections.map((section) => (
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
