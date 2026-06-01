import { useEffect, useMemo, useState } from "react";
import { useContext } from 'react';
import { TripContext } from '../../App';
import styles from "./Invoice.module.css";
import Header from "../../components/header/Header";
import BtmNav from "../../components/bottomNav/BottomNav";
import invoiceJson from "./Invoice.json";

// このファイルは「割り勘」の画面を作るコンポーネントです。
// コメントは高校生が読んでもわかるように、やさしい日本語で書いています。

// フォームの初期値（何も入力していない状態）
// storeName: 店名
// totalAmount: 支払総額
// selectedMemberIds: 参加メンバーのID一覧
const emptyForm = {
    storeName: "",
    totalAmount: "",
    selectedMemberIds: [],
};

function formatYen(value) {
    // 数字を日本円の見た目に整形するヘルパー関数
    // 例: 1000 -> "1,000円"
    return `${Number(value).toLocaleString()}円`;
}

function createDefaultMembers(payItems) {
    // payItems の中に書かれている参加人数（participantCount）を全部見て、
    // 一番大きい値を見つけます。これが「最低限必要なメンバー数」です。
    // 例えば、ある支払いが3人、別の支払いが2人なら、最大は3になります。
    const maxParticipantCount = payItems.reduce((maxCount, item) => {
        // Number(...) で文字列を数値に直し、無効な値は 0 にします。
        return Math.max(maxCount, Number(item.participantCount) || 0);
    }, 0);

    // 見つけた人数分だけメンバーのオブジェクトを作って配列で返します。
    // id は 1 から始め、name は "メンバー1" のようにします。
    // paidPayIds はそのメンバーが既に支払った請求のIDを入れる場所ですが、
    // 初期状態では誰も支払っていないので空配列にします。
    return Array.from({ length: maxParticipantCount }, (_, index) => ({
        id: index + 1,
        name: `メンバー${index + 1}`,
        paidPayIds: [],
    }));
}

// members の情報が無い場合にダミーのメンバーを作る関数。
// 旅行の参加人数が不明でも、支払いデータに合わせてメンバーを用意します。

function normalizeInvoiceData(data) {
    // 入ってきた JSON データを、この画面で使いやすい形に整えます。
    // - pay（支払い一覧）が配列でなければ空配列にする
    // - members（メンバー一覧）がなければ、pay から自動でメンバーを作る
    const pay = Array.isArray(data?.pay) ? data.pay : [];
    const members = Array.isArray(data?.members) ? data.members : createDefaultMembers(pay);
    // メンバーのIDリスト（IDが無ければ配列の順番+1を使う）
    const memberIds = members.map((member, index) => member.id ?? index + 1);

    return {
        // 支払いデータを1件ずつ見て、参加者IDと1人あたりの金額を確定する
        pay: pay.map((payItem) => {
            // payItem に participantIds があればそれを使う。
            // 無ければ participantCount の数だけ memberIds の先頭から割り当てる。
            // 例: participantCount が 3 なら memberIds の先頭3人を参加者とする。
            const participantIds = Array.isArray(payItem.participantIds)
                ? payItem.participantIds
                : memberIds.slice(0, Number(payItem.participantCount) || memberIds.length);

            return {
                ...payItem,
                participantIds,
                // 実際に参加する人数を数える
                participantCount: participantIds.length,
                // 1人あたりの金額は総額を人数で割って切り上げる
                perPersonAmount: Math.ceil(Number(payItem.totalAmount) / participantIds.length),
            };
        }),
        // collect（徴収用の別データ）があれば使い、無ければ空配列にする
        collect: Array.isArray(data?.collect) ? data.collect : [],
        // members 配列を安全な形に変換する（id, name, paidPayIds を確実に持つ）
        members: members.map((member, index) => ({
            id: member.id ?? index + 1,
            name: member.name ?? `メンバー${index + 1}`,
            // paidPayIds が配列でなければ空配列にする（誰がどの請求を払ったか）
            paidPayIds: Array.isArray(member.paidPayIds) ? member.paidPayIds : [],
        })),
    };
}

// Invoice の JSON データを安全な形に整えます。
// - pay, members の配列が必ず存在するようにする
// - 1人あたりの金額(perPersonAmount)を計算する
// これにより、画面側の処理はシンプルになります。

export default function Invoice() {
    // 表示中のタブ: 支払いを見るか（"pay"）徴収を見るか（"collect"）
    const [activeTab, setActiveTab] = useState("collect");
    // 請求データ（pay: 支払い一覧, members: メンバー一覧 等）
    const [invoiceData, setInvoiceData] = useState(normalizeInvoiceData(invoiceJson));
    // 新しい請求フォームが開いているかどうか
    const [isFormOpen, setIsFormOpen] = useState(false);
    // フォームの中の入力値を保持する状態
    const [form, setForm] = useState(emptyForm);

    useEffect(() => {
        // コンポーネントが最初に表示されたとき（マウント時）に呼ばれる処理です。
        // やっていること:
        // 1) サーバーの `api/invoices` から最新の請求データを取ってくる。
        // 2) 正常に取れたら `normalizeInvoiceData` で整形して画面用の状態に入れる。
        // 3) 取れなかったとき（ネットワークが無い、サーバーが壊れている等）は
        //    組み込みの `invoiceJson` を使ってフォールバックする（オフライン対応）。
        const loadInvoices = async () => {
            try {
                const response = await fetch(`${import.meta.env.BASE_URL}api/invoices`);
                if (!response.ok) {
                    // サーバーが正常なレスポンスを返さない場合はエラー扱いにする
                    throw new Error("Invoice.jsonを読み込めませんでした");
                }
                const data = await response.json();
                // 取得したデータを画面用に整えてから状態にセットする
                setInvoiceData(normalizeInvoiceData(data));
            } catch {
                // 失敗したら組み込みの invoiceJson を使う（ユーザーに何か表示するため）
                setInvoiceData(normalizeInvoiceData(invoiceJson));
            }
        };

        loadInvoices();
    }, []);

    // 画面が読み込まれたときにサーバーから請求データを読み込みます。
    // もしサーバーに接続できなければ、組み込みの invoiceJson を使います。

    // 各メンバーごとの徴収情報を作る処理
    // 目的: 画面表示用に「この人がどの支払いに参加しているか」と
    // 「まだ払っていない合計金額」をまとめたデータを作る
    // 手順:
    // 1) invoiceData.pay の中から、そのメンバーが参加している支払いだけを取り出す
    // 2) 取り出した支払いごとに、店名・1人分の金額・その人が支払済みかどうかを作る
    // 3) 支払っていない明細だけ合計して totalAmount を計算する
    // 4) 元の member 情報に totalAmount と details をくっつけたオブジェクトを返す
    // useMemo を使って、invoiceData が変わったときだけ再計算されるようにしている
    const collectMembers = useMemo(() => {
        return invoiceData.members.map((member) => {
            // そのメンバーが参加している支払いの明細を作る
            const details = invoiceData.pay
                .filter((payItem) => payItem.participantIds.includes(member.id))
                .map((payItem) => {
                    // member.paidPayIds にその支払いIDがあれば「支払済み」
                    const isPaid = member.paidPayIds.includes(payItem.id);

                    return {
                        id: payItem.id,
                        storeName: payItem.storeName,
                        amount: payItem.perPersonAmount,
                        isPaid,
                    };
                });

            // 明細の中から、まだ支払っていない分だけ合計する
            const totalAmount = details.reduce((sum, detail) => {
                if (detail.isPaid) {
                    return sum;
                }

                return sum + Number(detail.amount);
            }, 0);

            // メンバー情報に合計金額と明細を追加して返す
            return {
                ...member,
                totalAmount,
                details,
            };
        });
    }, [invoiceData.members, invoiceData.pay]);

    // 各メンバーごとに「この人がまだ払っていない合計金額」と
    // 「どの支払いの分なのか」という詳細リストを作ります。
    // 画面の徴収リスト表示に使います。

    // タイトルは現在のタブによって変える（"pay" のときは支払い一覧、そうでなければ徴収側）
    const title = activeTab === "pay" ? "支払い" : "徴収側";

    // 画面の状態を上書きしてサーバーに保存する関数
    // 手順:
    // 1) ローカルの state を更新してすぐに画面に反映させる（setInvoiceData）
    // 2) サーバーの `api/invoices` に POST で保存を試みる
    // 3) サーバーが失敗レスポンスを返したら例外を投げる（呼び出し元でエラー通知する）
    // 補足: この実装は先に画面表示を更新する「楽観的更新」に近いですが、
    // サーバー保存が失敗しても画面は更新されたままになるため、必要ならロールバック処理を追加してください。
    const saveInvoiceData = async (nextData) => {
        // まず画面用の状態を更新する（即時に表示を変えるため）
        setInvoiceData(nextData);

        // サーバーに保存を送る（JSON を POST）
        const response = await fetch(`${import.meta.env.BASE_URL}api/invoices`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(nextData),
        });

        // サーバーが OK を返さない場合は例外を投げて、呼び出し元でエラーを知らせられるようにする
        if (!response.ok) {
            throw new Error("Invoice.jsonに保存できませんでした");
        }
    };

    // データを上書き保存する関数。ローカルの状態を更新してからサーバーに送ります。
    // サーバーへの保存に失敗したら例外を投げます。

    const handleChange = (event) => {
        const { name, value } = event.target;
        setForm((currentForm) => ({
            ...currentForm,
            [name]: value,
        }));
    };

    // 入力フォームの値が変わったときに呼ぶ関数。どの入力が変わったかでフォーム状態を更新します。

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

    // メンバーのチェックボックスを切り替える処理。
    // 選択されていれば外し、されていなければ追加します。

    const handleOpenForm = () => {
        setForm(emptyForm);
        setIsFormOpen(true);
    };

    const handleCloseForm = () => {
        setIsFormOpen(false);
        setForm(emptyForm);
    };

    // フォームを開く / 閉じる ときの処理

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

    // 新しい請求を追加する処理
    // - 参加メンバーがいないとダメ（警告）
    // - 1人あたりの金額を計算して invoiceData に追加し、保存を試みる
    // - 保存に失敗したらユーザーに伝える

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

    // 各メンバーの支払いを「完了」にする処理
    // 確認ダイアログでユーザーに二重確認を行い、保存を行います。

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