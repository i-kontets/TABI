/**
 * 割り勘ページです。
 *
 * 今回はスマホ画面に合わせて、支払い履歴をカード形式で表示します。
 * 支払い記録の追加・削除は localStorage に保存しています。
 */
import { useContext, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { TripContext } from "../../App";
import styles from "./Invoice.module.css";
import Header from "../../components/header/Header";
import BtmNav from "../../components/bottomNav/BottomNav";
import invoiceJson from "./Invoice.json";

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

const emptyForm = {
    storeName: "",
    amount: "",
    category: "food",
    selectedMemberIds: [],
};

const invoiceStorageKey = "tabi:invoice-data";

const categories = [
    { value: "food", label: "食費", icon: "🍽️" },
    { value: "hotel", label: "宿泊費", icon: "🏨" },
    { value: "transport", label: "交通費", icon: "⛽" },
    { value: "sightseeing", label: "観光費", icon: "🎡" },
    { value: "shopping", label: "買い物", icon: "🛒" },
    { value: "other", label: "その他", icon: "💰" },
];

const yenFormatter = new Intl.NumberFormat("ja-JP");

function formatYen(value) {
    const number = Number(String(value ?? "").replace(/,/g, ""));
    return Number.isFinite(number) ? `${yenFormatter.format(number)}円` : "0円";
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

function formatTripDate(dateString) {
    if (!dateString) {
        return "";
    }

    const date = new Date(dateString);

    if (Number.isNaN(date.getTime())) {
        return "";
    }

    return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
}

function formatTripPeriod(startDate, endDate) {
    const formattedStartDate = formatTripDate(startDate);
    const formattedEndDate = formatTripDate(endDate);

    if (!formattedStartDate || !formattedEndDate) {
        return "期間未設定";
    }

    return `${formattedStartDate} - ${formattedEndDate}`;
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

function splitAmount(totalAmount, memberIds) {
    const baseAmount = Math.floor(totalAmount / memberIds.length);
    const remainder = totalAmount % memberIds.length;

    return memberIds.map((id, index) => ({
        id,
        amount: baseAmount + (index < remainder ? 1 : 0),
    }));
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

export default function Invoice() {
    const location = useLocation();
    const navigate = useNavigate();
    const params = new URLSearchParams(location.search);
    const groupId = normalizeGroupId(params.get("groupId"));
    const { trip, fetchMembers, tripPeriod } = useContext(TripContext);
    const loginUser = getLoginUser();
    const loginUserId = Number(loginUser?.user_id) || 0;
    const loginUserName = loginUser?.name || "ログイン中のユーザー";

    const [invoiceData, setInvoiceData] = useState(() =>
        normalizeInvoiceFile(loadStoredInvoiceData()).groups[groupId] || createEmptyGroupData()
    );
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [form, setForm] = useState(emptyForm);

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

    const selectableMembers = invoiceData.members;
    const recentPayments = useMemo(() => (
        [...invoiceData.pay].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    ), [invoiceData.pay]);
    const headerTitle = trip?.name || groupNames[groupId] || "割り勘";

    const tripStartDate = tripPeriod?.startDate || trip?.start_date || trip?.startDate;
    const tripEndDate = tripPeriod?.endDate || trip?.end_date || trip?.endDate;
    const tripPeriodText = formatTripPeriod(tripStartDate, tripEndDate);
    const totalExpense = invoiceData.pay.reduce(
        (sum, payItem) => sum + Number(payItem.totalAmount || payItem.amount || 0),
        0
    );
    const perPersonExpense = selectableMembers.length > 0
        ? Math.round(totalExpense / selectableMembers.length)
        : 0;

    const handleChange = (event) => {
        const { name, value } = event.target;
        setForm((currentForm) => ({
            ...currentForm,
            [name]: value,
        }));
    };

    const handleMemberSelect = (memberId) => {
        setForm((currentForm) => {
            const isSelected = currentForm.selectedMemberIds.includes(memberId);

            return {
                ...currentForm,
                selectedMemberIds: isSelected
                    ? currentForm.selectedMemberIds.filter((id) => id !== memberId)
                    : [...currentForm.selectedMemberIds, memberId],
            };
        });
    };

    const handleOpenForm = () => {
        setForm({
            ...emptyForm,
            selectedMemberIds: selectableMembers.map((member) => member.id),
        });
        setIsFormOpen(true);
    };

    const handleCloseForm = () => {
        setIsFormOpen(false);
        setForm(emptyForm);
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        const totalAmount = Number(form.amount);

        if (!form.storeName.trim()) {
            alert("支払い名を入力してください。");
            return;
        }

        if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
            alert("金額は1円以上で入力してください。");
            return;
        }

        if (!loginUserId) {
            alert("ログイン中のユーザー情報が取得できません。");
            return;
        }

        if (form.selectedMemberIds.length === 0) {
            alert("対象メンバーを1人以上選択してください。");
            return;
        }

        const members = splitAmount(totalAmount, form.selectedMemberIds);

        try {
            const response = await fetch("/TABI/api/Invoice/Create.php", {
                method: "POST",
                credentials: "include",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    group_id: groupId,
                    title: form.storeName.trim(),
                    amount: totalAmount,
                    category: form.category,
                    members: members.map((member) => ({
                        user_id: member.id,
                        amount: member.amount,
                    })),
                }),
            });

            if (response.status === 401) {
                localStorage.removeItem("loginUser");
                navigate("/");
                return;
            }

            const data = await response.json();

            if (!data.success) {
                alert(data.message || "支払いの追加に失敗しました。");
                return;
            }

            setInvoiceData(buildInvoiceData(data));
            handleCloseForm();
        } catch (error) {
            console.error(error);
            alert("支払いの追加に失敗しました。通信環境を確認してください。");
        }
    };

    const handleDeletePayment = async (payItem) => {
        const isConfirmed = confirm(
            `「${payItem.storeName}」の支払い記録を削除しますか？\nこの操作は取り消せません。`
        );

        if (!isConfirmed) {
            return;
        }

        try {
            const response = await fetch("/TABI/api/Invoice/Delete.php", {
                method: "POST",
                credentials: "include",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    payment_id: payItem.id,
                }),
            });

            if (response.status === 401) {
                localStorage.removeItem("loginUser");
                navigate("/");
                return;
            }

            const data = await response.json();

            if (!data.success) {
                alert(data.message || "支払いの削除に失敗しました。");
                return;
            }

            setInvoiceData(buildInvoiceData(data));
        } catch (error) {
            console.error(error);
            alert("支払いの削除に失敗しました。通信環境を確認してください。");
        }
    };

    const handleCompletePayment = async (memberId, payId) => {
        const isConfirmed = confirm(
            "支払い完了にしますか？\n完了後は編集できません。"
        );

        if (!isConfirmed) {
            return;
        }

        try {
            const response = await fetch("/TABI/api/Invoice/MarkPaid.php", {
                method: "POST",
                credentials: "include",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    payment_id: payId,
                    user_id: memberId,
                }),
            });

            if (response.status === 401) {
                localStorage.removeItem("loginUser");
                navigate("/");
                return;
            }

            const data = await response.json();

            if (!data.success) {
                alert(data.message || "支払い完了の保存に失敗しました。");
                return;
            }

            setInvoiceData(buildInvoiceData(data));
        } catch (error) {
            console.error(error);
            alert("支払い完了の保存に失敗しました。通信環境を確認してください。");
        }
    };

    const handleViewAllPayments = () => {
        navigate(`/InvoiceAll?groupId=${encodeURIComponent(groupId)}`);
    };

    const getPayerName = (payItem) => (
        payItem.paidByName
        || invoiceData.members.find((member) => member.id === payItem.paidById)?.name
        || `支払者ID: ${payItem.paidById}`
    );

    return (
        <>
            <Header tripName={headerTitle} isOther={true} />

            <main className={styles.page}>
                <section className={styles.tripSummaryCard}>
                    <h2 className={styles.tripSummaryTitle}>{headerTitle}</h2>
                    <p className={styles.tripPeriodText}>{tripPeriodText}</p>

                    <p className={styles.tripSummaryLabel}>総支出</p>
                    <p className={styles.totalExpense}>{formatYen(totalExpense)}</p>
                    <p className={styles.tripSummaryMeta}>
                        1人あたり {formatYen(perPersonExpense)}・{recentPayments.length}件の支払い
                    </p>

                    <div className={styles.summaryActions}>
                        <button
                            className={styles.summaryAction}
                            type="button"
                            onClick={handleOpenForm}
                        >
                            <span className={`${styles.summaryActionIcon} ${styles.summaryActionBlue}`}>＋</span>
                            <span>支払い追加</span>
                        </button>

                        <button
                            className={styles.summaryAction}
                            type="button"
                            onClick={() => navigate(`/InvoiceLiquidation?groupId=${encodeURIComponent(groupId)}`)}
                        >
                            <span className={`${styles.summaryActionIcon} ${styles.summaryActionCyan}`}>🤝</span>
                            <span>精算結果</span>
                        </button>

                        <button
                            className={styles.summaryAction}
                            type="button"
                            onClick={() => navigate(`/InvoiceTotal?groupId=${encodeURIComponent(groupId)}`)}
                        >
                            <span className={`${styles.summaryActionIcon} ${styles.summaryActionSky}`}>📊</span>
                            <span>集計</span>
                        </button>
                    </div>
                </section>

                <section className={styles.recentHeader}>
                    <h2>最近の支払い</h2>
                    <button
                        className={styles.viewAllButton}
                        type="button"
                        onClick={handleViewAllPayments}
                    >
                        すべて見る ›
                    </button>
                </section>

                <section className={styles.paymentList}>
                    {recentPayments.length === 0 ? (
                        <p className={styles.emptyText}>まだ支払いがありません</p>
                    ) : (
                        recentPayments.map((item) => {
                            const category = getCategory(item.category);
                            const remainingAmount = item.members.reduce((sum, payMember) => {
                                const member = invoiceData.members.find(
                                    (m) => m.id === payMember.id
                                );

                                if (member?.paidPayIds.includes(item.id)) {
                                    return sum;
                                }

                                return sum + payMember.amount;
                            }, 0);

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
                                            {item.members.map((payMember) => {
                                                const member = invoiceData.members.find(
                                                    (invoiceMember) => invoiceMember.id === payMember.id
                                                );
                                                const isPaid = member?.paidPayIds.includes(item.id);
                                                const canMarkPaid = item.paidById === loginUserId;

                                                return (
                                                    <label
                                                        className={`${styles.breakdownRow} ${isPaid ? styles.paidDetail : ""}`}
                                                        key={payMember.id}
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={Boolean(isPaid)}
                                                            disabled={Boolean(isPaid) || !canMarkPaid}
                                                            onChange={() => handleCompletePayment(payMember.id, item.id)}
                                                        />
                                                        <span>{member?.name || `対象ID: ${payMember.id}`}</span>
                                                        <strong>{formatYen(payMember.amount)}</strong>
                                                    </label>
                                                );
                                            })}

                                            <div className={styles.breakdownFooter}>
                                                <span>残額 {formatYen(remainingAmount)}</span>

                                                {item.paidById === loginUserId ? (
                                                    <button
                                                        className={styles.deleteButton}
                                                        type="button"
                                                        onClick={() => handleDeletePayment(item)}
                                                    >
                                                        削除
                                                    </button>
                                                ) : null}
                                            </div>
                                        </div>
                                    </details>
                                </article>
                            );
                        })
                    )}
                </section>

                <button
                    className={styles.addButton}
                    type="button"
                    aria-label="支払いを追加"
                    onClick={handleOpenForm}
                >
                    ＋ 支払いを追加
                </button>

                {isFormOpen ? (
                    <div className={styles.modalBack}>
                        <form className={styles.form} onSubmit={handleSubmit}>
                            <h3>新しい支払い</h3>

                            <label className={styles.form_label}>
                                支払い名
                                <input
                                    name="storeName"
                                    value={form.storeName}
                                    onChange={handleChange}
                                    placeholder="例：昼ごはん"
                                    required
                                />
                            </label>

                            <label className={styles.form_label}>
                                金額
                                <input
                                    name="amount"
                                    type="number"
                                    min="1"
                                    value={form.amount}
                                    onChange={handleChange}
                                    placeholder="例：6000"
                                    required
                                />
                            </label>

                            <label className={styles.form_label}>
                                支払った人
                                <div className={styles.fixedPayer}>
                                    {loginUserName}
                                </div>
                            </label>

                            <label className={styles.form_label}>
                                分類
                                <select
                                    name="category"
                                    value={form.category}
                                    onChange={handleChange}
                                >
                                    {categories.map((category) => (
                                        <option value={category.value} key={category.value}>
                                            {category.label}
                                        </option>
                                    ))}
                                </select>
                            </label>

                            <fieldset className={styles.memberSelect}>
                                <legend>対象メンバー</legend>
                                {selectableMembers.map((member) => (
                                    <label className={styles.memberOption} key={member.id}>
                                        <input
                                            type="checkbox"
                                            checked={form.selectedMemberIds.includes(member.id)}
                                            onChange={() => handleMemberSelect(member.id)}
                                        />
                                        {member.name}
                                    </label>
                                ))}
                            </fieldset>

                            <div className={styles.formButtons}>
                                <button type="button" onClick={handleCloseForm}>
                                    キャンセル
                                </button>
                                <button type="submit">追加</button>
                            </div>
                        </form>
                    </div>
                ) : null}
            </main>

            <BtmNav />
        </>
    );
}
