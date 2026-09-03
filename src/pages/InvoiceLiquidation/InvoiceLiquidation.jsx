/**
 * 割り勘の精算結果を表示するページです。
 *
 * URL の groupId をもとに対象グループの支払いデータを読み込み、
 * 誰がいくら立て替えていて、平均との差額がどれくらいあるかを表示します。
 */
import { useContext, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { TripContext } from "../../App";
import Header from "../../components/header/Header";
import BtmNav from "../../components/bottomNav/BottomNav";
import invoiceJson from "../Invoice/Invoice.json";
import styles from "./InvoiceLiquidation.module.css";

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

function formatYen(value) {
    const number = Number(value);
    return Number.isNaN(number) ? "0円" : `${number.toLocaleString()}円`;
}

function getLoginUser() {
    try {
        return JSON.parse(localStorage.getItem("loginUser") || "null");
    } catch {
        return null;
    }
}

function buildInvoiceData(data) {
    return normalizeGroupData({
        pay: data?.pay,
        members: data?.members,
    });
}

export default function InvoiceLiquidation() {
    const location = useLocation();
    const navigate = useNavigate();
    const params = new URLSearchParams(location.search);
    const groupId = normalizeGroupId(params.get("groupId"));
    const { trip, fetchMembers } = useContext(TripContext);
    const loginUser = getLoginUser();
    const loginUserId = Number(loginUser?.user_id) || 0;

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

    const headerTitle = trip?.name || groupNames[groupId] || "精算結果";

    const liquidationMembers = useMemo(() => (
        invoiceData.members.map((member) => {
            const expenseTotal = invoiceData.pay.reduce((sum, payItem) => {
                const targetPayment = payItem.members.find(
                    (payMember) => payMember.id === member.id
                );

                return sum + Number(targetPayment?.amount || 0);
            }, 0);
            const paidTotal = invoiceData.pay.reduce((sum, payItem) => {
                if (payItem.paidById !== member.id) {
                    return sum;
                }

                return sum + Number(payItem.totalAmount || payItem.amount || 0);
            }, 0);
            const balance = paidTotal - expenseTotal;

            return {
                ...member,
                expenseTotal,
                paidTotal,
                balance,
            };
        })
    ), [invoiceData.members, invoiceData.pay]);
    const currentMember = invoiceData.members.find((member) => member.id === loginUserId);
    const memberNameMap = useMemo(
        () => new Map(invoiceData.members.map((member) => [member.id, member.name])),
        [invoiceData.members]
    );
    const paymentBreakdowns = useMemo(() => {
        if (!loginUserId) {
            return {
                pay: [],
                receive: [],
            };
        }

        const pay = invoiceData.pay.flatMap((payItem) => {
            if (payItem.paidById === loginUserId || currentMember?.paidPayIds.includes(payItem.id)) {
                return [];
            }

            const myPayment = payItem.members.find((member) => member.id === loginUserId);

            if (!myPayment || myPayment.amount <= 0) {
                return [];
            }

            return [{
                id: `${payItem.id}-pay`,
                storeName: payItem.storeName,
                partnerName: memberNameMap.get(payItem.paidById) || `メンバーID: ${payItem.paidById}`,
                amount: myPayment.amount,
            }];
        });

        const receive = invoiceData.pay.flatMap((payItem) => {
            if (payItem.paidById !== loginUserId) {
                return [];
            }

            return payItem.members
                .filter((member) => {
                    const targetMember = invoiceData.members.find(
                        (invoiceMember) => invoiceMember.id === member.id
                    );

                    return (
                        member.id !== loginUserId
                        && member.amount > 0
                        && !targetMember?.paidPayIds.includes(payItem.id)
                    );
                })
                .map((member) => ({
                    id: `${payItem.id}-receive-${member.id}`,
                    storeName: payItem.storeName,
                    partnerName: memberNameMap.get(member.id) || `メンバーID: ${member.id}`,
                    amount: member.amount,
                }));
        });

        return {
            pay,
            receive,
        };
    }, [currentMember?.paidPayIds, invoiceData.members, invoiceData.pay, loginUserId, memberNameMap]);
    const paymentBreakdownTotal = paymentBreakdowns.pay.reduce(
        (sum, item) => sum + item.amount,
        0
    );
    const receiveBreakdownTotal = paymentBreakdowns.receive.reduce(
        (sum, item) => sum + item.amount,
        0
    );

    return (
        <>
            <Header tripName={headerTitle} />

            <main className={styles.page}>
                <section className={styles.breakdownSection}>
                    <details className={styles.breakdownAccordion}>
                        <summary>
                            <span>自分が払わなければいけない支払いの内訳</span>
                            <strong>{formatYen(paymentBreakdownTotal)}</strong>
                        </summary>

                        <div className={styles.breakdownList}>
                            {paymentBreakdowns.pay.length === 0 ? (
                                <p className={styles.emptyText}>支払う必要がある内訳はありません</p>
                            ) : (
                                paymentBreakdowns.pay.map((item) => (
                                    <div className={styles.breakdownRow} key={item.id}>
                                        <span>{item.storeName}</span>
                                        <span>{item.partnerName}へ</span>
                                        <strong>{formatYen(item.amount)}</strong>
                                    </div>
                                ))
                            )}
                        </div>
                    </details>

                    <details className={styles.breakdownAccordion}>
                        <summary>
                            <span>受け取りの内訳</span>
                            <strong>{formatYen(receiveBreakdownTotal)}</strong>
                        </summary>

                        <div className={styles.breakdownList}>
                            {paymentBreakdowns.receive.length === 0 ? (
                                <p className={styles.emptyText}>受け取り予定の内訳はありません</p>
                            ) : (
                                paymentBreakdowns.receive.map((item) => (
                                    <div className={styles.breakdownRow} key={item.id}>
                                        <span>{item.storeName}</span>
                                        <span>{item.partnerName}から</span>
                                        <strong>{formatYen(item.amount)}</strong>
                                    </div>
                                ))
                            )}
                        </div>
                    </details>
                </section>

                <section className={styles.balanceSection}>
                    <h2>メンバーごとの収支</h2>

                    <table className={styles.balanceTable}>
                        <thead>
                            <tr>
                                <th>名前</th>
                                <th>支出額</th>
                                <th>収入額</th>
                                <th>差額</th>
                            </tr>
                        </thead>

                        <tbody>
                            {liquidationMembers.map((member) => {
                                const incomeAmount = Math.max(member.balance, 0);
                                const differenceAmount = member.balance;

                                return (
                                    <tr key={member.id}>
                                        <th scope="row">{member.name}</th>
                                        <td>{formatYen(member.expenseTotal)}</td>
                                        <td>{formatYen(incomeAmount)}</td>
                                        <td className={differenceAmount >= 0 ? styles.receive : styles.pay}>
                                            {differenceAmount >= 0 ? "+" : "-"}{formatYen(Math.abs(differenceAmount))}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
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
