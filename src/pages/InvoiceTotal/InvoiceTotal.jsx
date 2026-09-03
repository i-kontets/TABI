/**
 * 割り勘の支出集計を表示するページです。
 *
 * URL の groupId をもとに対象グループの支払いデータを読み込み、
 * 総支出・単純な一人当たり・カテゴリ別・日付別の支出を表示します。
 */
import { useContext, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { TripContext } from "../../App";
import Header from "../../components/header/Header";
import BtmNav from "../../components/bottomNav/BottomNav";
import invoiceJson from "../Invoice/Invoice.json";
import styles from "./InvoiceTotal.module.css";

const invoiceStorageKey = "tabi:invoice-data";

const legacyGroupIds = {
    mie: 1,
    hok: 2,
    wak: 3,
    nara: 4,
    aom: 5,
};

const groupNames = {
    1: "三重",
    2: "北海道",
    3: "和歌山",
    4: "奈良",
    5: "青森",
};

const defaultMembers = [
    { id: 1, name: "山田", paidPayIds: [] },
    { id: 2, name: "石垣", paidPayIds: [] },
    { id: 3, name: "田中", paidPayIds: [] },
    { id: 4, name: "寺川", paidPayIds: [] },
    { id: 5, name: "岩井", paidPayIds: [] },
];

const categories = [
    { value: "food", label: "食費", icon: "🍽️" },
    { value: "hotel", label: "宿泊費", icon: "🏨" },
    { value: "transport", label: "交通費", icon: "🚃" },
    { value: "sightseeing", label: "観光費", icon: "🎟️" },
    { value: "shopping", label: "買い物", icon: "🛒" },
    { value: "other", label: "その他", icon: "💰" },
];

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
        category: payItem.category || "other",
        members: payMembers,
        totalAmount,
        createdAt: payItem.createdAt || new Date().toISOString(),
    };
}

function normalizeGroupData(data) {
    const members = normalizeMembers(data?.members);
    const pay = Array.isArray(data?.pay) ? data.pay : [];

    return {
        pay: pay.map((payItem) => normalizePayItem(payItem, members)),
        members,
    };
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

const yenFormatter = new Intl.NumberFormat("ja-JP");

function formatYen(value) {
    const number = Number(String(value ?? "").replace(/,/g, ""));
    return Number.isFinite(number) ? `${yenFormatter.format(number)}円` : "0円";
}

function formatDateKey(dateString) {
    const date = dateString ? new Date(dateString) : new Date();

    if (Number.isNaN(date.getTime())) {
        return "日付未設定";
    }

    return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
}

function buildInvoiceData(data) {
    return normalizeGroupData({
        pay: data?.pay,
        members: data?.members,
    });
}

export default function InvoiceTotal() {
    const location = useLocation();
    const navigate = useNavigate();
    const params = new URLSearchParams(location.search);
    const groupId = normalizeGroupId(params.get("groupId"));
    const { trip, fetchMembers } = useContext(TripContext);

    const [invoiceData, setInvoiceData] = useState(() => {
        const data = normalizeInvoiceFile(loadStoredInvoiceData());
        return data.groups[groupId] || normalizeGroupData({ pay: [], members: defaultMembers });
    });

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

            setInvoiceData((currentData) => ({
                ...currentData,
                members: result.members.map((member) => ({
                    id: Number(member.id),
                    name: member.name || "メンバー",
                    paidPayIds: [],
                })),
            }));
        };

        loadGroupMembers();
    }, [fetchMembers, groupId]);

    const headerTitle = trip?.name || groupNames[groupId] || "支出集計";
    const totalExpense = invoiceData.pay.reduce(
        (sum, payItem) => sum + Number(payItem.totalAmount || payItem.amount || 0),
        0
    );
    const perPersonExpense = invoiceData.members.length > 0
        ? Math.round(totalExpense / invoiceData.members.length)
        : 0;

    const categoryTotals = useMemo(() => (
        categories.map((category) => {
            const amount = invoiceData.pay.reduce((sum, payItem) => {
                if ((payItem.category || "other") !== category.value) {
                    return sum;
                }

                return sum + Number(payItem.totalAmount || payItem.amount || 0);
            }, 0);

            return {
                ...category,
                amount,
                rate: totalExpense > 0 ? Math.round((amount / totalExpense) * 100) : 0,
            };
        })
            .filter((category) => category.amount > 0)
            .sort((a, b) => b.amount - a.amount)
    ), [invoiceData.pay, totalExpense]);

    const dateTotals = useMemo(() => {
        const totals = new Map();

        invoiceData.pay.forEach((payItem) => {
            const dateKey = formatDateKey(payItem.createdAt);
            const currentAmount = totals.get(dateKey) || 0;
            totals.set(dateKey, currentAmount + Number(payItem.totalAmount || payItem.amount || 0));
        });

        return [...totals.entries()]
            .map(([date, amount]) => ({
                date,
                amount,
                rate: totalExpense > 0 ? Math.round((amount / totalExpense) * 100) : 0,
            }))
            .sort((a, b) => new Date(a.date) - new Date(b.date));
    }, [invoiceData.pay, totalExpense]);

    return (
        <>
            <Header tripName={headerTitle} />

            <main className={styles.page}>
                <section className={styles.summaryCard}>
                    <p>総支出</p>
                    <strong>{formatYen(totalExpense)}</strong>
                    <span>単純な一人当たり {formatYen(perPersonExpense)}</span>
                </section>

                <section className={styles.totalGrid}>
                    <div>
                        <span>支払い件数</span>
                        <strong>{invoiceData.pay.length}件</strong>
                    </div>
                    <div>
                        <span>メンバー数</span>
                        <strong>{invoiceData.members.length}人</strong>
                    </div>
                </section>

                <section className={styles.section}>
                    <h2>カテゴリ別の支出</h2>

                    {categoryTotals.length === 0 ? (
                        <p className={styles.emptyText}>まだ支払いがありません</p>
                    ) : (
                        <div className={styles.categoryGraphBox}>
                            {categoryTotals.map((category) => (
                                <div className={styles.categoryGraphRow} key={category.value}>
                                    <div className={styles.categoryGraphInfo}>
                                        <span className={styles.categoryLabel}>
                                            <span aria-hidden="true">{category.icon}</span>
                                            {category.label}
                                        </span>
                                        <strong>{formatYen(category.amount)}</strong>
                                    </div>

                                    <div className={styles.categoryBarArea}>
                                        <span
                                            className={styles.categoryBar}
                                            style={{ width: `${Math.max(category.rate, 4)}%` }}
                                        />
                                    </div>

                                    <span className={styles.categoryRate}>{category.rate}%</span>
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                <section className={styles.section}>
                    <h2>日付別の支出</h2>

                    {dateTotals.length === 0 ? (
                        <p className={styles.emptyText}>まだ支払いがありません</p>
                    ) : (
                        <div className={styles.categoryGraphBox}>
                            {dateTotals.map((dateTotal) => (
                                <div className={styles.categoryGraphRow} key={dateTotal.date}>
                                    <div className={styles.categoryGraphInfo}>
                                        <span className={styles.categoryLabel}>
                                            {dateTotal.date}
                                        </span>
                                        <strong>{formatYen(dateTotal.amount)}</strong>
                                    </div>

                                    <div className={styles.categoryBarArea}>
                                        <span
                                            className={styles.dateBar}
                                            style={{ width: `${Math.max(dateTotal.rate, 4)}%` }}
                                        />
                                    </div>

                                    <span className={styles.categoryRate}>{dateTotal.rate}%</span>
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                <button
                    className={styles.backButton}
                    type="button"
                    onClick={() => navigate(`/Invoice?groupId=${encodeURIComponent(groupId)}`)}
                >
                    割り勘に戻る
                </button>
            </main>

            <BtmNav />
        </>
    );
}
