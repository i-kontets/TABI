import { useContext, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { TripContext } from "../../App";
import styles from "./Invoice.module.css";
import Header from "../../components/header/Header";
import BtmNav from "../../components/bottomNav/BottomNav";
import invoiceJson from "./Invoice.json";
import QRCode from "react-qr-code";
// 旧グループIDとの互換用
const legacyGroupIds = {
    mie: 1,
    hok: 2,
    wak: 3,
    nara: 4,
    aom: 5,
};
// グループ名表示用
const groupNames = {
    1: "三重",
    2: "北海道",
    3: "和歌山",
    4: "奈良",
    5: "青森",
};
// 仮メンバー
const defaultMembers = [
    { id: 1, name: "志田", paidPayIds: [] },
    { id: 2, name: "石垣", paidPayIds: [] },
    { id: 3, name: "田中", paidPayIds: [] },
    { id: 4, name: "寺川", paidPayIds: [] },
    { id: 5, name: "岩井", paidPayIds: [] },
];
// 支払い追加フォーム初期値
// 金額は人数割りせず、そのまま各メンバーへ設定する
const emptyForm = {
    storeName: "",
    amount: "",
    selectedMemberIds: []
};
// 金額表示
function formatYen(value) {
    const number = Number(value);

    if(Number.isNaN(number)){

        return "0円";

    }


    return `${number.toLocaleString()}円`;
}
// グループデータを画面用へ変換
function normalizeGroupData(data) {
    const members =
        Array.isArray(data?.members)
            ? data.members
            : defaultMembers;

    const memberIds =
        members.map(member => member.id);

    const pay =
        Array.isArray(data?.pay)
            ? data.pay
            : [];
    return {
        pay: pay.map((payItem) => {
            let invoiceMembers = [];

            /*
                新形式
                {
                    id:1,
                    storeName:"ホテル",
                    members:[
                        {
                            id:1,
                            amount:5000
                        }
                    ]
                }
            */

            if(Array.isArray(payItem.members)){

                invoiceMembers =
                    payItem.members.map(member => ({

                        id: member.id,
                        amount:
                            Number(member.amount)
                    }));
            }

            /*
                旧形式対応
                以前は
                totalAmount ÷ 人数
                で保存していたため、
                読み込み時だけ変換する
            */

            else {
                const participantIds =
                    Array.isArray(payItem.participantIds)
                        ? payItem.participantIds
                        : memberIds;
                invoiceMembers =
                    participantIds.map(id => ({
                        id,
                        amount:
                            Number(
                                payItem.perPersonAmount
                                ??
                                payItem.totalAmount
                                ??
                                0
                            )
                    }));
            }

            return {
                ...payItem,

                // 各メンバーごとの請求情報
                members: invoiceMembers,

                // 参加人数
                participantCount:
                    invoiceMembers.length,

                /*
                    総額は人数割りではなく
                    各メンバーの請求額を合計
                */

                totalAmount:
                    invoiceMembers.reduce(
                        (sum,member) =>
                            sum + Number(member.amount),
                        0
                    )
            };

        }),

        // 徴収データ
        collect:
            Array.isArray(data?.collect)
                ? data.collect
                : [],

        // メンバー情報
        members:
            members.map(member => ({
                id: member.id,
                name: member.name,
                paidPayIds:
                    Array.isArray(member.paidPayIds)
                        ? member.paidPayIds
                        : []
            }))
    };
}

// 空のグループデータ作成
function createEmptyGroupData(){
    return normalizeGroupData({
        pay: [],
        collect: [],
        members: defaultMembers
    });
}

// groupIdを統一
function normalizeGroupId(groupId){
    if(groupId == null || groupId === ""){
        return 1;

    }
    const numericGroupId =
        Number(groupId);

    if(
        Number.isInteger(numericGroupId)
        &&
        numericGroupId > 0
    ){
        return numericGroupId;

    }
    return legacyGroupIds[groupId] || 1;

}
// Invoiceデータ全体を整形
function normalizeInvoiceFile(data){

    // groups形式
    if(data?.groups){
        return {
            groups:
                Object.fromEntries(
                    Object.entries(data.groups)
                    .map(([groupId,groupData]) => [
                        normalizeGroupId(groupId),
                        normalizeGroupData(groupData)
                    ])
                )
        };
    }

    // 古い単一グループ形式
    return {
        groups:{
            1:
                normalizeGroupData(data)
        }
    };
}

export default function Invoice() {

    const location = useLocation();

    const params =
        new URLSearchParams(location.search);

    // URLからグループID取得
    const groupId =
        normalizeGroupId(
            params.get("groupId")
        );

    // Contextから旅行名取得
    const { tripName } =
        useContext(TripContext);

    // 現在選択中のタブ
    const [activeTab,setActiveTab] =
        useState("collect");

    // 全グループの請求データ
    const [allInvoiceData,setAllInvoiceData] =
        useState(
            normalizeInvoiceFile(invoiceJson)
        );

    // 現在表示中の請求データ
    const [invoiceData,setInvoiceData] =
        useState(
            normalizeInvoiceFile(invoiceJson)
                .groups[groupId]
            ||
            createEmptyGroupData()
        );

    // 支払い追加フォーム表示状態
    const [isFormOpen,setIsFormOpen] =
        useState(false);

    // 入力フォーム
    const [form,setForm] =
        useState(emptyForm);

    /*
        グループID変更時に
        請求データを取得する
    */
    useEffect(()=>{
        const loadInvoices = async()=>{
            try{
                const response =
                    await fetch(
                        `${import.meta.env.BASE_URL}api/invoices`
                    );

                if(!response.ok){
                    throw new Error(
                        "Invoice取得失敗"
                    );
                }

                const data =
                    normalizeInvoiceFile(
                        await response.json()
                    );

                const currentGroupData =
                    data.groups[groupId]
                    ||
                    createEmptyGroupData();

                setAllInvoiceData(data);

                setInvoiceData(
                    currentGroupData
                );

            }

            catch{
                // API取得失敗時はjsonを利用
                const data =
                    normalizeInvoiceFile(
                        invoiceJson
                    );

                setAllInvoiceData(data);

                setInvoiceData(
                    data.groups[groupId]
                    ||
                    createEmptyGroupData()
                );

            }

        };

        loadInvoices();

    },[groupId]);

    /*
        徴収一覧用データ作成
        変更前:
        総額 ÷ 人数
        変更後:
        各メンバーに設定された金額を表示
    */

    const collectMembers =

        useMemo(()=>{

            return invoiceData.members.map(

                (member)=>{

                    // このメンバーが参加している支払い取得
                    const details =

                        invoiceData.pay
                        .filter(
                            payItem =>
                                payItem.members.some(
                                    payMember =>
                                        payMember.id
                                        ===
                                        member.id
                                )
                        )

                        .map(
                            payItem=>{
                                // メンバー個人の金額取得
                                const memberPayment =
                                    payItem.members.find(
                                        payMember =>
                                            payMember.id
                                            ===
                                            member.id
                                    );

                                return {
                                    
                                    id:
                                        payItem.id,
                                    storeName:
                                        payItem.storeName,
                                    // 人数割りせずそのまま表示
                                    amount:
                                        memberPayment.amount,
                                    // 支払い済み判定
                                    isPaid:
                                        member.paidPayIds.includes(
                                            payItem.id
                                        )
                                };
                            }
                        );
                    // 未払い合計
                    const totalAmount =
                        details.reduce(
                            (sum,detail)=>{
                                if(detail.isPaid){
                                    return sum;
                                }
                                return (
                                    sum
                                    +
                                    Number(detail.amount)
                                );
                            },
                            0
                        );
                    return {
                        ...member,
                        // 未払い合計
                        totalAmount,
                        // 明細
                        details
                    };
                }
            );
        },[
            invoiceData.members,
            invoiceData.pay
        ]);
    // タイトル変更
    const title =
        activeTab === "pay"
            ? "支払い"
            : "徴収側";
    // ヘッダー表示名
    const headerTitle =
        tripName
        ||
        groupNames[groupId]

        ||
        "割り勘";
    /*
        請求データ保存
        JSON保存APIへ送信
    */
    const saveInvoiceData =
        async(nextGroupData)=>{
            const nextAllData = {
                groups:{
                    ...allInvoiceData.groups,
                    [groupId]:
                        nextGroupData
                }
            };
            // 画面更新
            setInvoiceData(
                nextGroupData
            );
            setAllInvoiceData(
                nextAllData
            );
            const response =
                await fetch(
                    `${import.meta.env.BASE_URL}api/invoices`,
                    {
                        method:"POST",
                        headers:{
                            "Content-Type":
                                "application/json"
                        },
                        body:
                            JSON.stringify(
                                nextAllData
                            )
                    }
                );
            if(!response.ok){
                throw new Error(
                    "保存失敗"
                );
            }
        };
    /*
        入力変更
    */
    const handleChange =
        (event)=>{
            const {
                name,
                value
            } = event.target;
            setForm(
                currentForm=>({
                    ...currentForm,
                    [name]:
                        value
                })
            );
        };
    /*
        メンバー選択変更
    */
    const handleMemberSelect =
        (memberId)=>{
            setForm(
                currentForm=>{
                    const isSelected =
                        currentForm.selectedMemberIds
                        .includes(memberId);
                    return {
                        ...currentForm,
                        selectedMemberIds:
                            isSelected
                            ?
                            currentForm.selectedMemberIds
                            .filter(
                                id =>
                                    id !== memberId
                            )
                            :
                            [
                                ...currentForm.selectedMemberIds,
                                memberId
                            ]
                    };
                }
            );
        };
    // フォームを開く
    const handleOpenForm = ()=>{
        setForm(emptyForm);
        setIsFormOpen(true);
    };
    // フォームを閉じる
    const handleCloseForm = ()=>{
        setIsFormOpen(false);
        setForm(emptyForm);
    };
 /*
        支払い追加処理

        変更前:
        入力金額 ÷ 人数

        変更後:
        入力金額を各メンバーへそのまま設定
    */
    const handleSubmit = async(event) => {
        event.preventDefault();
        // 参加メンバー確認
        if(form.selectedMemberIds.length === 0){
            alert(
                "参加メンバーを1人以上選択してください。"
            );
            return;
        }
        // 入力された金額
        const amount =
            Number(form.amount);
        /*
            選択されたメンバーごとの
            請求金額を作成

            例:
            田中 5000円
            山田 5000円
        */
        const members =
            form.selectedMemberIds.map(
                id => ({
                    id:id,
                    amount:amount
                })
            );
        const newInvoice = {
            // 支払いID
            id:
                Date.now(),
            // 店名
            storeName:
                form.storeName,
            // 各メンバーの請求情報
            members,
            // 人数
            participantCount:
                members.length,
            // 各メンバー金額の合計
            totalAmount:
                members.reduce(
                    (sum,member)=>
                        sum + Number(member.amount),
                    0
                )
        };
        const nextData = {
            ...invoiceData,
            pay:[
                ...invoiceData.pay,
                newInvoice
            ]
        };
        try{
            await saveInvoiceData(nextData);
            handleCloseForm();
        }
        catch{
            alert(
                "請求データの保存に失敗しました。"
            );
        }
    };

    /*
        支払い完了処理
    */
    const handleCompletePayment = async(memberId,payId)=>{

        const isConfirmed =
            confirm(
                "支払い完了にしますか？\n完了後は編集できません。"
            );

        if(!isConfirmed){
            return;
        }

        const nextData = {
            ...invoiceData,
            members:
                invoiceData.members.map(
                    member=>{
                        if(
                            member.id !== memberId
                            ||
                            member.paidPayIds.includes(payId)
                        ){
                            return member;
                        }
                        return {
                            ...member,
                            paidPayIds:[
                                ...member.paidPayIds,
                                payId
                            ]
                        };
                    }
                )
        };
        try{
            await saveInvoiceData(nextData);
        }
        catch{
            alert(
                "支払い完了の保存に失敗しました。"
            );
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
                            invoiceData.pay.map((item) => {
                                // 支払いの残額を計算
                                const remainingAmount = item.members.reduce((sum, payMember) => {
                                    // メンバー情報を取得
                                    const member = invoiceData.members.find(
                                        (m) => m.id === payMember.id
                                    );

                                    // 支払い済みなら加算しない
                                    if(member?.paidPayIds.includes(item.id)){
                                        return sum;
                                    }

                                    // 未払いなら残額へ加算
                                    return sum + payMember.amount;
                                
                                }, 0);

                                return (
                                    <div className={styles.payItem} key={item.id}>
                                        <p className={styles.storeName}>{item.storeName}</p>
                                        <p className={styles.perPersonAmount}>
                                            総額{formatYen(item.totalAmount)}
                                        </p>
                                        
                                        <p className={styles.participantCount}>
                                            {item.participantCount}人
                                        </p>

                                        <p className={styles.totalAmount}>
                                            残額{formatYen(remainingAmount)}
                                        </p>
                                    </div>
                                );
                            })
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
                                支払金額
                                <input
                                    name="amount"
                                    type="number"
                                    min="1"
                                    value={form.amount}
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
