import { useContext, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { TripContext } from "../../App";
import styles from "./Invoice.module.css";
import Header from "../../components/header/Header";
import BtmNav from "../../components/bottomNav/BottomNav";
import invoiceJson from "./Invoice.json";

const groupNames = {
    mie: "三重",
    hok: "北海道",
    wak: "和歌山",
    nara: "奈良",
    aom: "青森",
};

const defaultMembers = [
    { id: 1, name: "志田", paidPayIds: [] },
    { id: 2, name: "石垣", paidPayIds: [] },
    { id: 3, name: "田中", paidPayIds: [] },
    { id: 4, name: "寺川", paidPayIds: [] },
    { id: 5, name: "岩井", paidPayIds: [] },
];

const emptyForm = {
    storeName: "",
    totalAmount: "",
    selectedMemberIds: [],
};

function formatYen(value) {
    // 数値を「1,000円」のような表示にそろえる
    return `${Number(value).toLocaleString()}円`;
}

function normalizeGroupData(data) {
    const members = Array.isArray(data?.members) ? data.members : defaultMembers;
    const memberIds = members.map((member) => member.id);
    const pay = Array.isArray(data?.pay) ? data.pay : [];

    return {
        // 支払いデータを画面で扱いやすい形に整える
        pay: pay.map((payItem) => {
            // participantIds があればそれを優先し、なければ participantCount 分だけ
            // メンバー一覧の先頭から参加者として扱う
            const participantIds = Array.isArray(payItem.participantIds)
                ? payItem.participantIds
                : memberIds.slice(0, Number(payItem.participantCount) || memberIds.length);

            return {
                ...payItem,
                participantIds,
                // 参加人数は参加者IDの件数で確定する
                participantCount: participantIds.length,
                // 1人あたりの金額は総額を参加人数で割り、端数は切り上げる
                perPersonAmount: Math.ceil(Number(payItem.totalAmount) / participantIds.length),
            };
        }),
        // collect は未使用でもデータ構造だけは残す
        collect: Array.isArray(data?.collect) ? data.collect : [],
        members: members.map((member) => ({
            id: member.id,
            name: member.name,
            paidPayIds: Array.isArray(member.paidPayIds) ? member.paidPayIds : [],
        })),
    };
}

function createEmptyGroupData() {
    // データがまだ無いグループ用に、空の請求データを作る
    return normalizeGroupData({
        pay: [],
        collect: [],
        members: defaultMembers,
    });
}

function normalizeInvoiceFile(data) {
    // 読み込んだ請求ファイルを、画面側で同じ形に扱えるよう整える
    if (data?.groups) {
        // すでに groups 形式なら、各グループをまとめて正規化する
        return {
            groups: Object.fromEntries(
                Object.entries(data.groups).map(([groupId, groupData]) => [
                    groupId,
                    normalizeGroupData(groupData),
                ])
            ),
        };
    }

    // 古い単一グループ形式なら、mie グループとして包み直す
    return {
        groups: {
            mie: normalizeGroupData(data),
        },
    };
}

export default function Invoice() {
    const location = useLocation();
    const params = new URLSearchParams(location.search);
    const groupId = params.get("groupId") || "mie";
    const { tripName } = useContext(TripContext);

    const [activeTab, setActiveTab] = useState("collect");
    const [allInvoiceData, setAllInvoiceData] = useState(normalizeInvoiceFile(invoiceJson));
    const [invoiceData, setInvoiceData] = useState(
        normalizeInvoiceFile(invoiceJson).groups[groupId] || createEmptyGroupData()
    );
    const [isFormOpen, setIsFormOpen] = useState(false);
    // 追加フォームの入力内容をまとめて保持する
    const [form, setForm] = useState(emptyForm);

    useEffect(() => {
        // groupId が変わったタイミングで請求データを読み直す
        const loadInvoices = async () => {
            try {
                const response = await fetch(`${import.meta.env.BASE_URL}api/invoices`);
                if (!response.ok) {
                    // 正常なレスポンスでなければ失敗として扱う
                    throw new Error("Invoice.jsonを読み込めませんでした");
                }

                const data = normalizeInvoiceFile(await response.json());
                const currentGroupData = data.groups[groupId] || createEmptyGroupData();
                setAllInvoiceData(data);
                setInvoiceData(currentGroupData);
            } catch {
                const data = normalizeInvoiceFile(invoiceJson);
                setAllInvoiceData(data);
                setInvoiceData(data.groups[groupId] || createEmptyGroupData());
            }
        };

        loadInvoices();
    }, [groupId]);

    // メンバーごとに「参加している支払い」と「未払い合計」をまとめる
    const collectMembers = useMemo(() => {
        return invoiceData.members.map((member) => {
            // 参加している支払いだけを明細化する
            const details = invoiceData.pay
                .filter((payItem) => payItem.participantIds.includes(member.id))
                .map((payItem) => {
                    // paidPayIds に入っていれば支払済み扱い
                    const isPaid = member.paidPayIds.includes(payItem.id);

                    return {
                        id: payItem.id,
                        storeName: payItem.storeName,
                        amount: payItem.perPersonAmount,
                        isPaid,
                    };
                });

            // 未払い分だけを合計する
            const totalAmount = details.reduce((sum, detail) => {
                return detail.isPaid ? sum : sum + Number(detail.amount);
            }, 0);

            // 画面表示用に合計金額と明細を付け足す
            return {
                ...member,
                totalAmount,
                details,
            };
        });
    }, [invoiceData.members, invoiceData.pay]);

    // タブに応じて見出しを切り替える
    const title = activeTab === "pay" ? "支払い" : "徴収側";
    const headerTitle = tripName || groupNames[groupId] || "割り勘";

    const saveInvoiceData = async (nextGroupData) => {
        const nextAllData = {
            groups: {
                ...allInvoiceData.groups,
                [groupId]: nextGroupData,
            },
        };

        setInvoiceData(nextGroupData);
        setAllInvoiceData(nextAllData);

        const response = await fetch(`${import.meta.env.BASE_URL}api/invoices`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(nextAllData),
        });

        // 保存に失敗したら呼び出し元へ例外を返す
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
        // チェックのON/OFFに合わせて参加メンバーIDを更新する
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
        // 新規追加用なので入力内容を初期化してフォームを開く
        setForm(emptyForm);
        setIsFormOpen(true);
    };

    const handleCloseForm = () => {
        // フォームを閉じて入力内容を破棄する
        setIsFormOpen(false);
        setForm(emptyForm);
    };

    const handleSubmit = async (event) => {
        // 新しい支払いを追加して保存する
        event.preventDefault();

        // 参加メンバーが最低1人いるか確認する
        if (form.selectedMemberIds.length === 0) {
            alert("参加メンバーを1人以上選択してください。");
            return;
        }

        // 入力値を数値化して、人数ごとの金額を計算する
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
        // 支払い完了の確認を取ってから、該当メンバーの支払済み一覧に追加する
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

    return (
        <>
            <Header tripName={headerTitle} />

            {/* 画面全体のメイン領域 */}
            <main className={styles.page}>
                {/* 画面上部のタイトルとメニュー */}
                <section className={styles.titleArea}>
                    <h2>{title}</h2>
                    <button className={styles.menuButton} aria-label="メニュー"></button>
                </section>

                {/* 支払い表示と徴収表示を切り替えるタブ */}
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

                {/* タブに応じて表示する一覧を切り替える */}
                <div className={styles.list}>
                    {activeTab === "pay" ? (
                        // 支払い一覧を表示する
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
                        // 徴収一覧を出す対象がいない場合のメッセージ
                        <p className={styles.emptyText}>表示するメンバーがいません</p>
                    ) : (
                        // メンバーごとに未払い金額を折りたたみ表示する
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
                                        // 各明細に店名、金額、支払済みチェックを表示する
                                        member.details.map((detail) => (
                                            <label
                                                className={`${styles.detailRow} ${detail.isPaid ? styles.paidDetail : ""}`}
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

                {/* 支払いタブのときだけ新規追加ボタンを表示する */}
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

                {/* isFormOpen のときだけ新規支払いフォームを表示する */}
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

            {/* 下部ナビゲーション */}
            <BtmNav />
        </>
    );
}
