/**
 * 支払い記録をすべて確認するページです。
 *
 * Invoice.jsx の「すべて見る」から遷移し、URL の groupId をもとに
 * 対象グループの支払いデータだけを一覧表示します。
 */
import { useContext, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { TripContext } from "../../App";
import styles from "./InvoiceAll.module.css";
import Header from "../../components/header/Header";
import BtmNav from "../../components/bottomNav/BottomNav";
import invoiceJson from "../Invoice/Invoice.json";

const legacyGroupIds = {
    mie: 1,
    hok: 2,
    wak: 3,
    nara: 4,
    aom: 5,
};

const groupNames = {
    1: "三重旅行",
    2: "北海道旅行",
    3: "和歌山旅行",
    4: "奈良旅行",
    5: "青森旅行",
};

const defaultMembers = [
    { id: 1, name: "山田", paidPayIds: [] },
    { id: 2, name: "石垣", paidPayIds: [] },
    { id: 3, name: "田中", paidPayIds: [] },
    { id: 4, name: "寺川", paidPayIds: [] },
    { id: 5, name: "岩井", paidPayIds: [] },
];

const invoiceStorageKey = "tabi:invoice-data";

const categories = [
    { value: "food", label: "食費", icon: "🍽️" },
    { value: "hotel", label: "宿泊費", icon: "🏨" },
    { value: "transport", label: "交通費", icon: "🚃" },
    { value: "sightseeing", label: "観光費", icon: "🎟️" },
    { value: "shopping", label: "買い物", icon: "🛒" },
    { value: "other", label: "その他", icon: "💰" },
];

function formatYen(value) {
    const number = Number(value);
    return Number.isNaN(number) ? "0円" : `${number.toLocaleString()}円`;
}

function getCategory(categoryValue) {
    return categories.find((category) => category.value === categoryValue) || categories.at(-1);
}

function formatPaymentDate(dateString) {
    const date = dateString ? new Date(dateString) : new Date();

    if (Number.isNaN(date.getTime())) {
        return "";
    }

    const weekDays = ["日", "月", "火", "水", "木", "金", "土"];
    return `${date.getMonth() + 1}/${date.getDate()}(${weekDays[date.getDay()]})`;
}

function normalizeGroupId(groupId) {
    if (groupId == null || groupId === "") {
        return 1;
    }

    const numericGroupId = Number(groupId);

    if (Number.isInteger(numericGroupId) && numericGroupId > 0) {
        return numericGroupId;
    }

    return legacyGroupIds[groupId] || 1;
}

function normalizeMembers(members) {
    const sourceMembers = Array.isArray(members) && members.length > 0
        ? members
        : defaultMembers;

    return sourceMembers.map((member) => ({
        id: Number(member.id),
        name: member.name || "メンバー",
        paidPayIds: Array.isArray(member.paidPayIds) ? member.paidPayIds : [],
    }));
}

function normalizePayItem(payItem, members) {
    const memberIds = members.map((member) => member.id);
    const participantIds = Array.isArray(payItem.selectedMemberIds)
        ? payItem.selectedMemberIds
        : Array.isArray(payItem.participantIds)
            ? payItem.participantIds
            : memberIds;
    const payMembers = Array.isArray(payItem.members)
        ? payItem.members.map((member) => ({
            id: Number(member.id),
            amount: Number(member.amount) || 0,
        }))
        : participantIds.map((id) => ({
            id: Number(id),
            amount: Number(payItem.perPersonAmount ?? 0),
        }));
    const totalAmount = Number(payItem.totalAmount || payItem.amount)
        || payMembers.reduce((sum, member) => sum + Number(member.amount), 0);

    return {
        id: payItem.id || Date.now(),
        storeName: payItem.storeName || "支払い",
        amount: totalAmount,
        paidById: Number(payItem.paidById || payItem.paid_by || payMembers[0]?.id || memberIds[0] || 0),
        paidByName: payItem.paidByName || "",
        category: payItem.category || "other",
        members: payMembers,
        participantCount: payMembers.length,
        totalAmount,
        createdAt: payItem.createdAt || new Date().toISOString(),
    };
}

function normalizeGroupData(data) {
    const members = normalizeMembers(data?.members);
    const pay = Array.isArray(data?.pay) ? data.pay : [];

    return {
        pay: pay.map((payItem) => normalizePayItem(payItem, members)),
        collect: Array.isArray(data?.collect) ? data.collect : [],
        members,
    };
}

function createEmptyGroupData(members = defaultMembers) {
    return normalizeGroupData({
        pay: [],
        collect: [],
        members,
    });
}

function normalizeInvoiceFile(data) {
    if (data?.groups) {
        return {
            groups: Object.fromEntries(
                Object.entries(data.groups).map(([groupId, groupData]) => [
                    normalizeGroupId(groupId),
                    normalizeGroupData(groupData),
                ])
            ),
        };
    }

    return {
        groups: {
            1: normalizeGroupData(data),
        },
    };
}

function loadStoredInvoiceData() {
    try {
        const storedData = localStorage.getItem(invoiceStorageKey);
        return storedData ? JSON.parse(storedData) : invoiceJson;
    } catch {
        return invoiceJson;
    }
}

function buildInvoiceData(data) {
    return normalizeGroupData({
        pay: data?.pay,
        members: data?.members,
    });
}

export default function InvoiceAll() {
    const location = useLocation();
    const navigate = useNavigate();
    const params = new URLSearchParams(location.search);
    const groupId = normalizeGroupId(params.get("groupId"));
    const { trip, fetchMembers } = useContext(TripContext);

    const [invoiceData, setInvoiceData] = useState(() => (
        normalizeInvoiceFile(loadStoredInvoiceData()).groups[groupId] || createEmptyGroupData()
    ));

    useEffect(() => {
        let isMounted = true;

        const loadInvoiceData = async () => {
            try {
                const response = await fetch(
                    `/TABI/api/Invoice/List.php?group_id=${encodeURIComponent(groupId)}`,
                    {
                        method: "GET",
                        credentials: "include",
                    }
                );

                if (response.status === 401) {
                    localStorage.removeItem("loginUser");
                    navigate("/");
                    return;
                }

                const data = await response.json();

                if (isMounted && data.success) {
                    setInvoiceData(buildInvoiceData(data));
                }
            } catch (error) {
                console.error(error);
            }
        };

        loadInvoiceData();

        return () => {
            isMounted = false;
        };
    }, [groupId, navigate]);

    useEffect(() => {
        if (!groupId || typeof fetchMembers !== "function") {
            return;
        }

        const loadGroupMembers = async () => {
            const result = await fetchMembers(groupId);

            if (!result.success || !Array.isArray(result.members) || result.members.length === 0) {
                return;
            }

            const groupMembers = result.members.map((member) => ({
                id: Number(member.id),
                name: member.name || "メンバー",
                paidPayIds: [],
            }));

            setInvoiceData((currentData) => ({
                ...currentData,
                members: groupMembers.map((groupMember) => {
                    const currentMember = currentData.members.find(
                        (member) => member.id === groupMember.id
                    );

                    return {
                        ...groupMember,
                        paidPayIds: currentMember?.paidPayIds || [],
                    };
                }),
            }));
        };

        loadGroupMembers();
    }, [fetchMembers, groupId]);

    const allPayments = useMemo(() => (
        [...invoiceData.pay].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    ), [invoiceData.pay]);
    const headerTitle = trip?.name || groupNames[groupId] || "支払い一覧";

    const getMemberName = (memberId) => (
        invoiceData.members.find((member) => member.id === memberId)?.name || `対象ID: ${memberId}`
    );

    const getPayerName = (payItem) => (
        payItem.paidByName
        || invoiceData.members.find((member) => member.id === payItem.paidById)?.name
        || `支払者ID: ${payItem.paidById}`
    );

    return (
        <>
            <Header tripName={headerTitle} />

            <main className={styles.page}>
                <section className={styles.recentHeader}>
                    <h2>すべての支払い</h2>
                    <button
                        className={styles.viewAllButton}
                        type="button"
                        onClick={() => navigate(`/Invoice?groupId=${encodeURIComponent(groupId)}`)}
                    >
                        戻る
                    </button>
                </section>

                <section className={styles.paymentList}>
                    {allPayments.length === 0 ? (
                        <p className={styles.emptyText}>まだ支払いがありません</p>
                    ) : (
                        allPayments.map((item) => {
                            const category = getCategory(item.category);

                            return (
                                <article className={styles.paymentCard} key={item.id}>
                                    <div className={styles.paymentMain}>
                                        <div className={styles.categoryIcon} aria-hidden="true">
                                            {category.icon}
                                        </div>

                                        <div className={styles.paymentInfo}>
                                            <h3>{item.storeName}</h3>
                                            <p>
                                                {formatPaymentDate(item.createdAt)} / {category.label}
                                            </p>
                                        </div>

                                        <div className={styles.paymentAmountArea}>
                                            <p className={styles.paymentAmount}>{formatYen(item.totalAmount)}</p>
                                            <p className={styles.paymentData}>{getPayerName(item)}</p>
                                        </div>
                                    </div>

                                    <details className={styles.breakdown}>
                                        <summary>内訳を見る（誰がいくら）▼</summary>
                                        <div className={styles.breakdownBody}>
                                            {item.members.map((payMember) => (
                                                <div className={styles.breakdownRow} key={payMember.id}>
                                                    <span />
                                                    <span>{getMemberName(payMember.id)}</span>
                                                    <strong>{formatYen(payMember.amount)}</strong>
                                                </div>
                                            ))}
                                        </div>
                                    </details>
                                </article>
                            );
                        })
                    )}
                </section>
            </main>

            <BtmNav />
        </>
    );
}
