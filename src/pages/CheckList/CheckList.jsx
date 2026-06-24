import { useContext, useState } from "react";
import { TripContext } from "../../App";
import ChecklistSection from "../../components/CheckList/ChecklistSection";
import { createItemKey } from "../../components/CheckList/checkListUtils";
import Header from "../../components/header/Header";
import BottomNav from "../../components/bottomNav/BottomNav";
import checklistData from "./CheckList.json";
import styles from "./CheckList.module.css";

const initialSections = [
    ...checklistData.sections,
    checklistData.personal,
];

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
    const [openSections, setOpenSections] = useState([]);

    const handleSectionToggle = (sectionId, isOpen) => {
        setOpenSections((currentSections) =>
            isOpen
                ? [...new Set([...currentSections, sectionId])]
                : currentSections.filter((id) => id !== sectionId)
        );
    };

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
                    ? { ...section, items: [...section.items, item] }
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
                <div className={styles.titleArea}>
                    <h2>持ちものチェックリスト</h2>
                    <p>準備できたものにチェックを入れましょう。</p>
                </div>

                <div className={styles.sections}>
                    {sections.map((section) => (
                        <ChecklistSection
                            key={section.id}
                            section={section}
                            checks={checks}
                            isOpen={openSections.includes(section.id)}
                            addTarget={addTarget}
                            editingItem={editingItem}
                            onToggle={handleSectionToggle}
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
