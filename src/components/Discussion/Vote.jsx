import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import Modal from "../Modal/Modal";
import "./Vote.css";

// カテゴリーごとの表示名を日本語で揃える
const categoryLabels = {
    destination: "旅行先",
    spot: "スポット",
    hotel: "宿泊先",
    restaurant: "食べたい物",
};

// 日時入力欄の初期値として、現在から1週間後の値を返す
function oneWeekLaterValue() {
    const date = new Date();
    date.setDate(date.getDate() + 7);
    date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
    return date.toISOString().slice(0, 16);
}

// API呼び出しで共通化したJSON取得関数
async function requestJson(url, options) {
    const response = await fetch(url, {
        credentials: "include",
        ...options,
    });
    const data = await response.json();

    if (!response.ok || !data.success) {
        throw new Error(data.message || "処理に失敗しました");
    }

    return data;
}

// DBの日時文字列を日本語表示向けに整形する
function formatDeadline(value) {
    if (!value) {
        return "期限なし";
    }

    return new Intl.DateTimeFormat("ja-JP", {
        month: "numeric",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    }).format(new Date(value.replace(" ", "T")));
}

// アンケート一覧と作成フォームをまとめた投票画面コンポーネント
function Vote({ active }) {
    // URLパラメータの groupId を読む。未指定なら1を使う
    const { groupId = "1" } = useParams();
    // 候補一覧
    const [candidates, setCandidates] = useState([]);
    // 表示するアンケート一覧
    const [surveys, setSurveys] = useState([]);
    // 読み込み中フラグ
    const [loading, setLoading] = useState(true);
    // ユーザー向け通知文
    const [notice, setNotice] = useState("");
    // 作成モーダルの表示状態
    const [createOpen, setCreateOpen] = useState(false);
    // 新規アンケートのタイトル
    const [title, setTitle] = useState("");
    // 新規アンケートの対象カテゴリ
    const [category, setCategory] = useState("destination");
    // 作成時に選択した候補IDの集合
    const [selectedIds, setSelectedIds] = useState([]);
    // 作成時の締切日時
    const [deadline, setDeadline] = useState(oneWeekLaterValue);
    // 作成送信中フラグ
    const [submitting, setSubmitting] = useState(false);

    // 候補一覧とアンケート一覧をまとめて取得する
    const loadData = async () => {
        const query = `group_id=${encodeURIComponent(groupId)}`;
        const [candidateData, surveyData] = await Promise.all([
            requestJson(`${import.meta.env.BASE_URL}api/Trips/GetCandidates.php?${query}`),
            requestJson(`${import.meta.env.BASE_URL}api/Trips/GetSurveys.php?${query}`),
        ]);
        setCandidates(candidateData.candidates);
        setSurveys(surveyData.surveys);
    };

    // 初回表示時と groupId 変更時にデータを取得する
    useEffect(() => {
        if (!active) {
            return undefined;
        }

        setLoading(true);
        setNotice("");

        // アンマウント後の state 更新を防ぐためのフラグ
        let cancelled = false;

        const query = `group_id=${encodeURIComponent(groupId)}`;
        Promise.all([
            requestJson(`${import.meta.env.BASE_URL}api/Trips/GetCandidates.php?${query}`),
            requestJson(`${import.meta.env.BASE_URL}api/Trips/GetSurveys.php?${query}`),
        ])
            .then(([candidateData, surveyData]) => {
                if (!cancelled) {
                    setCandidates(candidateData.candidates);
                    setSurveys(surveyData.surveys);
                }
            })
            .catch((error) => {
                if (!cancelled) {
                    setCandidates([]);
                    setSurveys([]);
                    setNotice(error.message);
                }
            })
            .finally(() => {
                if (!cancelled) {
                    setLoading(false);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [active, groupId]);

    // 現在のカテゴリに合う候補だけを絞り込む
    const selectableCandidates = useMemo(
        () => candidates.filter((candidate) => candidate.candidate_type === category),
        [candidates, category],
    );

    // 作成モーダルを開く前に状態を初期化する
    const openCreate = () => {
        setTitle("");
        setCategory("destination");
        setSelectedIds([]);
        setDeadline(oneWeekLaterValue());
        setNotice("");
        setCreateOpen(true);
    };

    // カテゴリ変更時は、対象候補も切り替わるので選択済みIDをクリアする
    const changeCategory = (event) => {
        setCategory(event.target.value);
        setSelectedIds([]);
    };

    // チェックボックスのON/OFFを切り替える
    const toggleCandidate = (candidateId) => {
        setSelectedIds((current) => current.includes(candidateId)
            ? current.filter((id) => id !== candidateId)
            : [...current, candidateId]);
    };

    // 新規アンケートを作成してAPIへ送信する
    const createSurvey = async (event) => {
        event.preventDefault();

        // 候補が2件未満ならアンケートとして成立しない
        if (selectedIds.length < 2) {
            setNotice("候補を2件以上選択してください");
            return;
        }

        setSubmitting(true);
        try {
            // 作成APIへ送信する。タイトル未入力時は自動で質問文を補う
            await requestJson(`${import.meta.env.BASE_URL}api/Trips/CreateSurvey.php`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    group_id: Number(groupId),
                    title: title.trim() || `${categoryLabels[category]}はどれがいい？`,
                    candidate_type: category,
                    candidate_ids: selectedIds,
                    deadline_at: deadline,
                }),
            });
            setCreateOpen(false);
            setNotice("アンケートを作成しました");
            await loadData();
        } catch (error) {
            setNotice(error.message);
        } finally {
            setSubmitting(false);
        }
    };

    // 既存アンケートに投票する
    const vote = async (surveyId, optionId) => {
        try {
            // 投票APIへ送信する
            await requestJson(`${import.meta.env.BASE_URL}api/Trips/VoteSurvey.php`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    group_id: Number(groupId),
                    survey_id: surveyId,
                    option_id: optionId,
                }),
            });
            setNotice("回答しました");
            await loadData();
        } catch (error) {
            setNotice(error.message);
        }
    };

    return (
        // 画面全体の投票パネル。active が false の場合は非表示にする
        <section className="pollPanel" aria-label="投票" hidden={!active}>
            <div className="sectionHeader">
                <div>
                    {/* この画面が候補選択用であることを示す */}
                    <span className="sectionKicker">候補から選ぶ</span>
                    <h2>アンケート</h2>
                </div>
                {/* 新規アンケート作成を開く */}
                <button type="button" onClick={openCreate}>＋ 作成</button>
            </div>

            <div className="pollList">
                {/* 通知メッセージを表示する */}
                {notice && <p className="pollNotice" role="status">{notice}</p>}

                {/* 読み込み中は一覧を出さずに待機表示する */}
                {loading ? (
                    <div className="pollEmpty">アンケートを読み込んでいます…</div>
                ) : surveys.length === 0 ? (
                    // アンケートが1件もない場合の案内
                    <div className="pollEmpty">
                        <strong>アンケートはまだありません</strong>
                        <p>「作成」から候補を選んで作成してください。</p>
                    </div>
                ) : (
                    // アンケートごとにカード表示する
                    surveys.map((survey) => (
                        <article className={`pollCard ${survey.is_expired ? "expired" : ""}`} key={survey.survey_id}>
                            <div className="pollCardHeader">
                                <div>
                                    {/* カテゴリ名とタイトルを表示 */}
                                    <span>{categoryLabels[survey.candidate_type] || "アンケート"}</span>
                                    <h3>{survey.title}</h3>
                                </div>
                                {/* 期限切れかどうか、または締切日時を表示 */}
                                <small>{survey.is_expired ? "回答終了" : `期限 ${formatDeadline(survey.deadline_at)}`}</small>
                            </div>
                            <div className="pollOptions">
                                {survey.options.map((option) => {
                                    // 進捗バーの幅計算用に、このアンケート内の最大票数を求める
                                    const max = Math.max(...survey.options.map((item) => item.vote_count), 1);
                                    // 自分の候補の票数を割合に変換する
                                    const width = `${(option.vote_count / max) * 100}%`;

                                    return (
                                        <button
                                            // 自分が投票済みなら見た目を変える
                                            className={option.has_voted ? "selected" : ""}
                                            type="button"
                                            key={option.option_id}
                                            // 期限切れなら投票できない
                                            disabled={survey.is_expired}
                                            aria-pressed={option.has_voted}
                                            // クリックでその選択肢に投票する
                                            onClick={() => vote(survey.survey_id, option.option_id)}
                                        >
                                            {/* 投票数をバーで可視化する */}
                                            <span className="pollFill" style={{ width }} />
                                            <span className="pollLabel">{option.option_text}</span>
                                            <span className="pollCount">{option.vote_count}票</span>
                                            {option.has_voted && <span className="checkMark">✓</span>}
                                        </button>
                                    );
                                })}
                            </div>
                        </article>
                    ))
                )}
            </div>

            {/* 新しいアンケートを作成するためのモーダル */}
            <Modal isOpen={createOpen} onClose={() => setCreateOpen(false)}>
                <form className="surveyForm" onSubmit={createSurvey}>
                    <div className="surveyFormHeader">
                        <div>
                            <span>新しい投票</span>
                            <h3>アンケートを作成</h3>
                        </div>
                        <button type="button" aria-label="閉じる" onClick={() => setCreateOpen(false)}>×</button>
                    </div>

                    {/* アンケートタイトルの入力欄 */}
                    <label>
                        <span>タイトル</span>
                        <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="例：旅行先はどれがいい？" />
                    </label>

                    {/* 対象カテゴリの切り替え */}
                    <label>
                        <span>候補カテゴリ</span>
                        <select value={category} onChange={changeCategory}>
                            {Object.entries(categoryLabels).map(([value, label]) => (
                                <option value={value} key={value}>{label}</option>
                            ))}
                        </select>
                    </label>

                    {/* アンケートに含める候補を複数選択する */}
                    <fieldset className="surveyCandidates">
                        <legend>投票に含める候補（2件以上）</legend>
                        {selectableCandidates.length === 0 ? (
                            // このカテゴリに候補がない場合のメッセージ
                            <p>このカテゴリには候補がありません。</p>
                        ) : selectableCandidates.map((candidate) => (
                            <label key={candidate.candidate_id}>
                                <input
                                    type="checkbox"
                                    checked={selectedIds.includes(candidate.candidate_id)}
                                    onChange={() => toggleCandidate(candidate.candidate_id)}
                                />
                                <span>{candidate.candidate_name}</span>
                            </label>
                        ))}
                    </fieldset>

                    {/* 回答期限の入力欄 */}
                    <label>
                        <span>回答期限</span>
                        <input type="datetime-local" value={deadline} onChange={(event) => setDeadline(event.target.value)} required />
                        <small>初期値は作成日から1週間後です。</small>
                    </label>

                    {/* キャンセルと送信ボタン */}
                    <div className="surveyFormActions">
                        <button type="button" onClick={() => setCreateOpen(false)}>キャンセル</button>
                        <button type="submit" disabled={submitting || selectedIds.length < 2}>
                            {submitting ? "作成中…" : "作成する"}
                        </button>
                    </div>
                </form>
            </Modal>
        </section>
    );
}

export default Vote;
