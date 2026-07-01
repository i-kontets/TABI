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
].filter(Boolean);

function createInitialChecks() {
    return Object.fromEntries(
        initialSections.flatMap((section) =>
            section.items.map((item) => [
                createItemKey(section.id, item.id),
                item.checked,
            ])
        )
    );
}

export default function CheckList() {
    const { trip } = useContext(TripContext);
    const [sections, setSections] = useState(initialSections);
    const [checks, setChecks] = useState(createInitialChecks);
    const [addTarget, setAddTarget] = useState(null);
    const [editingItem, setEditingItem] = useState(null);
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
            section.items.filter(
                (item) => checks[createItemKey(section.id, item.id)]
            ).length,
        0
    );

    const handleCheck = (itemKey) => {
        setChecks((currentChecks) => ({
            ...currentChecks,
            [itemKey]: !currentChecks[itemKey],
        }));
    };

    const handleStartAdd = (sectionId) => {
        setEditingItem(null);
        setAddTarget(sectionId);
    };

    const handleStartEdit = (sectionId, item) => {
        setAddTarget(null);
        setEditingItem({ sectionId, item });
    };

    const handleCancelForm = () => {
        setAddTarget(null);
        setEditingItem(null);
    };

    const handleAddItem = (sectionId, item) => {
        setSections((currentSections) =>
            currentSections.map((section) =>
                section.id === sectionId
                    ? { ...section, items: [item, ...section.items] }
                    : section
            )
        );
        setAddTarget(null);
    };

    const handleEditItem = (sectionId, updatedItem) => {
        setSections((currentSections) =>
            currentSections.map((section) =>
                section.id === sectionId
                    ? {
                          ...section,
                          items: section.items.map((item) =>
                              item.id === updatedItem.id ? updatedItem : item
                          ),
                      }
                    : section
            )
        );
        setEditingItem(null);
    };

    const handleDeleteItems = (sectionId, itemIds) => {
        const section = sections.find((item) => item.id === sectionId);
        const targetItems =
            section?.items.filter((item) => itemIds.includes(item.id)) || [];

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
            currentSections.map((currentSection) =>
                currentSection.id === sectionId
                    ? {
                          ...currentSection,
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
