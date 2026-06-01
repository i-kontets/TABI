import { useEffect, useMemo, useState } from "react";
import { useContext } from 'react';
import { TripContext } from '../../App';
import styles from "./Invoice.module.css";
import Header from "../../components/header/Header";
import BtmNav from "../../components/bottomNav/BottomNav";
import invoiceJson from "./Invoice.json";

const emptyForm = {
    storeName: "",
    totalAmount: "",
    selectedMemberIds: [],
};

function formatYen(value) {
    return `${Number(value).toLocaleString()}円`;
}

function createDefaultMembers(payItems) {
    const maxParticipantCount = payItems.reduce((maxCount, item) => {
        return Math.max(maxCount, Number(item.participantCount) || 0);
    }, 0);

    return Array.from({ length: maxParticipantCount }, (_, index) => ({
        id: index + 1,
        name: `メンバー${index + 1}`,
        paidPayIds: [],
    }));
}

function normalizeInvoiceData(data) {
    const pay = Array.isArray(data?.pay) ? data.pay : [];
    const members = Array.isArray(data?.members) ? data.members : createDefaultMembers(pay);
    const memberIds = members.map((member, index) => member.id ?? index + 1);

    return {
        pay: pay.map((payItem) => {
            const participantIds = Array.isArray(payItem.participantIds)
                ? payItem.participantIds
                : memberIds.slice(0, Number(payItem.participantCount) || memberIds.length);

            return {
                ...payItem,
                participantIds,
                participantCount: participantIds.length,
                perPersonAmount: Math.ceil(Number(payItem.totalAmount) / participantIds.length),
            };
        }),
        collect: Array.isArray(data?.collect) ? data.collect : [],
        members: members.map((member, index) => ({
            id: member.id ?? index + 1,
            name: member.name ?? `メンバー${index + 1}`,
            paidPayIds: Array.isArray(member.paidPayIds) ? member.paidPayIds : [],
        })),
    };
}

export default function Invoice() {
    const [activeTab, setActiveTab] = useState("collect");
    const [invoiceData, setInvoiceData] = useState(normalizeInvoiceData(invoiceJson));
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [form, setForm] = useState(emptyForm);

    useEffect(() => {
        const loadInvoices = async () => {
            try {
                const response = await fetch(`${import.meta.env.BASE_URL}api/invoices`);
                if (!response.ok) {
                    throw new Error("Invoice.jsonを読み込めませんでした");
                }
                const data = await response.json();
                setInvoiceData(normalizeInvoiceData(data));
            } catch {
                setInvoiceData(normalizeInvoiceData(invoiceJson));
            }
        };

        loadInvoices();
    }, []);

    const collectMembers = useMemo(() => {
        return invoiceData.members.map((member) => {
            const details = invoiceData.pay
                .filter((payItem) => payItem.participantIds.includes(member.id))
                .map((payItem) => {
                    const isPaid = member.paidPayIds.includes(payItem.id);

                    return {
                        id: payItem.id,
                        storeName: payItem.storeName,
                        amount: payItem.perPersonAmount,
                        isPaid,
                    };
                });

            const totalAmount = details.reduce((sum, detail) => {
                if (detail.isPaid) {
                    return sum;
                }

                return sum + Number(detail.amount);
            }, 0);

            return {
                ...member,
                totalAmount,
                details,
            };
        });
    }, [invoiceData.members, invoiceData.pay]);

    const title = activeTab === "pay" ? "支払い" : "徴収側";

    const saveInvoiceData = async (nextData) => {
        setInvoiceData(nextData);

        const response = await fetch(`${import.meta.env.BASE_URL}api/invoices`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(nextData),
        });

        if (!response.ok) {
            throw new Error("Invoice.jsonに保存できませんでした");
        }
    };

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
        setForm(emptyForm);
        setIsFormOpen(true);
    };

    const handleCloseForm = () => {
        setIsFormOpen(false);
        setForm(emptyForm);
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        if (form.selectedMemberIds.length === 0) {
            alert("参加メンバーを1人以上選択してください。");
            return;
        }

        const totalAmount = Number(form.totalAmount);
        const participantCount = form.selectedMemberIds.length;
        const newInvoice = {
            id: Date.now(),
            storeName: form.storeName,
            totalAmount,
            participantIds: form.selectedMemberIds,
            participantCount,
            perPersonAmount: Math.ceil(totalAmount / participantCount),
        };

        const nextData = {
            ...invoiceData,
            pay: [...invoiceData.pay, newInvoice],
        };

        try {
            await saveInvoiceData(nextData);
            handleCloseForm();
        } catch {
            alert("画面には追加しましたが、Invoice.jsonへの保存に失敗しました。");
        }
    };

    const handleCompletePayment = async (memberId, payId) => {
        const isConfirmed = confirm("支払い完了にしますか？\n完了後は編集できません。");

        if (!isConfirmed) {
            return;
        }

        const nextData = {
            ...invoiceData,
            members: invoiceData.members.map((member) => {
                if (member.id !== memberId || member.paidPayIds.includes(payId)) {
                    return member;
                }

                return {
                    ...member,
                    paidPayIds: [...member.paidPayIds, payId],
                };
            }),
        };

        try {
            await saveInvoiceData(nextData);
        } catch {
            alert("支払い完了の保存に失敗しました。");
        }
    };

    const { tripName } = useContext(TripContext);
    return (
        <>
            <Header tripName={tripName} />

            <main className={styles.page}>
                <section className={styles.titleArea}>
                    <h2>{title}</h2>
                    <button className={styles.menuButton} aria-label="メニュー"></button>
                </section>

                <div className={styles.tabs}>
                    <button
                        type="button"
                        className={activeTab === "pay" ? styles.activeTab : ""}
                        onClick={() => setActiveTab("pay")}
                    >
                        支払い
                    </button>
                    <button
                        type="button"
                        className={activeTab === "collect" ? styles.activeTab : ""}
                        onClick={() => setActiveTab("collect")}
                    >
                        徴収分
                    </button>
                </div>

                <div className={styles.list}>
                    {activeTab === "pay" ? (
                        invoiceData.pay.length === 0 ? (
                            <p className={styles.emptyText}>まだ支払いがありません</p>
                        ) : (
                            invoiceData.pay.map((item) => (
                                <div className={styles.payItem} key={item.id}>
                                    <p className={styles.storeName}>{item.storeName}</p>
                                    <p className={styles.perPersonAmount}>
                                        {formatYen(item.perPersonAmount)}
                                    </p>
                                    <p className={styles.participantCount}>
                                        {item.participantCount}人
                                    </p>
                                    <p className={styles.totalAmount}>
                                        総額{formatYen(item.totalAmount)}
                                    </p>
                                </div>
                            ))
                        )
                    ) : collectMembers.length === 0 ? (
                        <p className={styles.emptyText}>表示するメンバーがいません</p>
                    ) : (
                        collectMembers.map((member) => (
                            <details className={styles.collectItem} key={member.id}>
                                <summary className={styles.collectSummary}>
                                    <span className={styles.memberName}>{member.name}</span>
                                    <span className={styles.memberTotal}>
                                        {formatYen(member.totalAmount)}
                                    </span>
                                </summary>

                                <div className={styles.detailList}>
                                    {member.details.length === 0 ? (
                                        <p className={styles.emptyDetail}>支払い詳細がありません</p>
                                    ) : (
                                        member.details.map((detail) => (
                                            <label
                                                className={`${styles.detailRow} ${detail.isPaid ? styles.paidDetail : ""
                                                    }`}
                                                key={detail.id}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={detail.isPaid}
                                                    disabled={detail.isPaid}
                                                    onChange={() =>
                                                        handleCompletePayment(member.id, detail.id)
                                                    }
                                                />
                                                <span className={styles.detailStore}>
                                                    {detail.storeName}
                                                </span>
                                                <span className={styles.detailAmount}>
                                                    {formatYen(detail.amount)}
                                                </span>
                                            </label>
                                        ))
                                    )}
                                </div>
                            </details>
                        ))
                    )}
                </div>

                {activeTab === "pay" ? (
                    <button
                        className={styles.addButton}
                        type="button"
                        aria-label="請求を追加"
                        onClick={handleOpenForm}
                    >
                        +
                    </button>
                ) : null}

                {isFormOpen ? (
                    <div className={styles.modalBack}>
                        <form className={styles.form} onSubmit={handleSubmit}>
                            <h3>新しい支払い</h3>

                            <label className={styles.form_label}>
                                店名
                                <input
                                    name="storeName"
                                    value={form.storeName}
                                    onChange={handleChange}
                                    placeholder="例: スーパーA店"
                                    required
                                />
                            </label>

                            <label className={styles.form_label}>
                                総支払金額
                                <input
                                    name="totalAmount"
                                    type="number"
                                    min="1"
                                    value={form.totalAmount}
                                    onChange={handleChange}
                                    placeholder="例: 4000"
                                    required
                                />
                            </label>

                            <fieldset className={styles.memberSelect}>
                                <legend>参加メンバー</legend>
                                {invoiceData.members.map((member) => (
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
