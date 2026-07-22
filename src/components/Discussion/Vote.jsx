/**
 * 旅行グループ内の話し合い、候補、投票などの画面表示を担当します。
 *
 * 主な流れ:
 * 1. 必要な部品や API 関数を読み込む
 * 2. 画面表示やデータ取得に必要な値を準備する
 * 3. ユーザー操作や API の結果に合わせて表示を更新する
 *
 * 扱うデータ: React の state、props、フォーム入力、API から返ったデータを主に扱います。
 */
import { useCallback, useEffect, useMemo, useState } from "react";
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

const refreshIntervalMs = 10000;

// 日時入力欄の初期値として、現在から1週間後の値を返す
function oneWeekLaterValue() {
    const date = new Date();
    date.setDate(date.getDate() + 7);
    date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
    return date.toISOString().slice(0, 16);
}

// API呼び出しで共通化したJSON取得関数
async function requestJson(url, options) {
    // バックエンド API へ通信し、画面で使うデータの取得や保存を依頼します。
    const response = await fetch(url, {
        credentials: "include",
        ...options,
    });
    const data = await response.json();

    // ここで条件を確認し、状況に合う処理だけを実行します。
    if (!response.ok || !data.success) {
        throw new Error(data.message || "処理に失敗しました");
    }

    return data;
}

// DBの日時文字列を日本語表示向けに整形する
function formatDeadline(value) {
    // ここで条件を確認し、状況に合う処理だけを実行します。
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
    const loadData = useCallback(async () => {
        const query = `group_id=${encodeURIComponent(groupId)}`;
        const [candidateData, surveyData] = await Promise.all([
            requestJson(`${import.meta.env.BASE_URL}api/Trips/GetCandidates.php?${query}`),
            requestJson(`${import.meta.env.BASE_URL}api/Trips/GetSurveys.php?${query}`),
        ]);
        setCandidates(candidateData.candidates);
        setSurveys(surveyData.surveys);
    }, [groupId]);

    // 初回表示時と groupId 変更時にデータを取得する
    useEffect(() => {
        // ここで条件を確認し、状況に合う処理だけを実行します。
        if (!active) {
            return undefined;
        }

        setLoading(true);
        setNotice("");

        // アンマウント後の state 更新を防ぐためのフラグ
        let cancelled = false;

        loadData()
            // API などの非同期処理が終わった後に、受け取った結果を次の処理へ渡します。
            .then(() => {
                // ここで条件を確認し、状況に合う処理だけを実行します。
                if (!cancelled) {
                    setLoading(false);
                }
            })
            .catch((error) => {
                // ここで条件を確認し、状況に合う処理だけを実行します。
                if (!cancelled) {
                    setCandidates([]);
                    setSurveys([]);
                    setNotice(error.message);
                    setLoading(false);
                }
            });

        const intervalId = window.setInterval(() => {
            loadData().catch(() => {
                // Keep the current list if a background refresh fails.
            });
        }, refreshIntervalMs);

        return () => {
            cancelled = true;
            window.clearInterval(intervalId);
        };
    }, [active, loadData]);

    // 現在のカテゴリに合う候補だけを絞り込む
    const selectableCandidates = useMemo(
        // 条件に合うデータだけを残して、画面に出す内容を絞り込みます。
        () => candidates.filter((candidate) => candidate.candidate_type === category),
        [candidates, category],
    );

    const visibleSurveys = useMemo(() => {
        return [...surveys].sort((left, right) => {
            const leftDone = left.is_expired || left.options?.some((option) => option.has_voted);
            const rightDone = right.is_expired || right.options?.some((option) => option.has_voted);

            // ここで条件を確認し、状況に合う処理だけを実行します。
            if (leftDone === rightDone) {
                return 0;
            }

            return leftDone ? 1 : -1;
        });
    }, [surveys]);

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
            // 条件に合うデータだけを残して、画面に出す内容を絞り込みます。
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
        // API 通信やデータ処理で失敗する可能性があるため、例外を受け取れる形で実行します。
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
        // エラーが起きた場合は、画面にメッセージを出すなど安全な処理に切り替えます。
        } catch (error) {
            setNotice(error.message);
        // 成功・失敗に関係なく最後に必要な後片付けを行います。
        } finally {
            setSubmitting(false);
        }
    };

    // 既存アンケートに投票する
    const vote = async (surveyId, optionId) => {
        // API 通信やデータ処理で失敗する可能性があるため、例外を受け取れる形で実行します。
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
        // エラーが起きた場合は、画面にメッセージを出すなど安全な処理に切り替えます。
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
                ) : visibleSurveys.length === 0 ? (
                    // アンケートが1件もない場合の案内
                    <div className="pollEmpty">
                        <strong>アンケートはまだありません</strong>
                        <p>「作成」から候補を選んで作成してください。</p>
                    </div>
                ) : (
                    // アンケートごとにカード表示する
                    visibleSurveys.map((survey) => (
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
