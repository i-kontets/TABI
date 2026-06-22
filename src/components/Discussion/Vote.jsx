// React Hooks と React Router のインポート
import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import "./Vote.css";

// 候補カテゴリーの日本語ラベルマッピング
// 「旅行先」「スポット」「宿泊先」の3つのカテゴリーを定義
const categoryLabels = {
    destination: "旅行先",
    spot: "スポット",
    hotel: "宿泊先",
};

/**
 * バックエンドAPIから候補一覧を取得する非同期関数
 * 
 * @param {string} groupId グループID
 * @returns {Promise<Array>} 候補情報の配列
 * 
 * 処理：
 * 1. GetCandidates.php へGETリクエストを送信
 * 2. レスポンスをJSON形式でパース
 * 3. エラー時は詳細なエラーメッセージをthrow
 * 4. 成功時は候補配列を返す
 */
async function requestCandidates(groupId) {
    // GetCandidates.php への HTTP GETリクエストを送信
    // credentials: "include" により、クッキー（セッション情報）を自動的に含める
    const response = await fetch(
        `${import.meta.env.BASE_URL}api/Trips/GetCandidates.php?group_id=${encodeURIComponent(groupId)}`,
        { credentials: "include" },
    );
    
    // レスポンス本体をJSON形式にパース
    const data = await response.json();

    // HTTPステータスコードが200未満または200-299の範囲外、または success フラグが false の場合
    if (!response.ok || !data.success) {
        // エラーメッセージを付けて例外をthrow（呼び出し元の catch で処理される）
        throw new Error(data.message || "候補を取得できませんでした");
    }

    // 取得した候補配列を返す
    return data.candidates;
}

function Vote({ active }) {
    // URL パラメータから groupId を取得（デフォルト値は "1"）
    const { groupId = "1" } = useParams();
    
    // 状態管理
    // candidates: 取得した候補データの配列
    const [candidates, setCandidates] = useState([]);
    
    // loading: API通信中かどうかを示すフラグ（true = 読み込み中）
    const [loading, setLoading] = useState(true);
    
    // notice: ユーザーへの通知メッセージ（投票完了、エラーなど）
    const [notice, setNotice] = useState("");
    
    // API から候補を再取得して、画面を更新する関数
    const refreshCandidates = async () => {
        // ローディング状態を有効に
        setLoading(true);

        try {
            // 新しい候補データを取得して状態を更新
            setCandidates(await requestCandidates(groupId));
        } catch {
            setCandidates([]);
            setNotice("投票候補を取得できませんでした");
        } finally {
            // エラー / 成功の両方の場合、ローディングを終了
            setLoading(false);
        }
    };

    // コンポーネント マウント時に候補データを初期取得する処理
    useEffect(() => {
        // cleanup 関数用の cancelled フラグ：非同期処理が完了した後に状態を更新しないようにするため
        // （コンポーネント がアンマウントされた場合、古い状態更新を防ぐ）
        let cancelled = false;

        // GetCandidates.php から候補データを非同期に取得
        requestCandidates(groupId)
            // 取得成功時
            .then((data) => {
                // キャンセルされていない場合のみ状態を更新
                if (!cancelled) {
                    setCandidates(data);
                }
            })
            // 取得失敗時
            .catch(() => {
                if (!cancelled) {
                    setCandidates([]);
                    setNotice("投票候補を取得できませんでした");
                }
            })
            // 成功・失敗の両方で実行
            .finally(() => {
                if (!cancelled) {
                    // ローディング状態を終了
                    setLoading(false);
                }
            });

        // cleanup 関数：コンポーネント のアンマウント時に古い非同期処理の状態更新を防ぐ
        return () => {
            cancelled = true;
        };
    }, [groupId]); // groupId が変更されたときに再実行

    // 候補データをカテゴリー別にグループ化してポーリングデータを生成する
    // candidates が変更されたときのみ再計算される
    const polls = useMemo(
        () => Object.entries(categoryLabels)
            // カテゴリーの[キー, 値]の配列をイテレートして、各カテゴリーのオブジェクトにマッピング
            .map(([category, label]) => ({
                category,
                label,
                // candidates を絞り込んで、現在のカテゴリーに属する候補のみを options に格納
                options: candidates.filter((candidate) => candidate.candidate_type === category),
            }))
            // options が空（候補がない）のカテゴリーはフィルタで除外
            .filter((poll) => poll.options.length > 0),
        [candidates],
    );

    // 投票処理を実行する関数
    // candidateId: 投票先の候補ID
    const vote = async (candidateId) => {
        try {
            // バックエンド VoteCandidate.php へPOSTリクエストを送信
            const response = await fetch(`${import.meta.env.BASE_URL}api/Trips/VoteCandidate.php`, {
                method: "POST",
                // クッキー（セッション情報）を自動的に含める
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                // リクエストボディに group_id と candidate_id を含める
                body: JSON.stringify({
                    group_id: Number(groupId),
                    candidate_id: Number(candidateId),
                }),
            });
            const data = await response.json();

            // HTTPステータスコードが200未満または success フラグが false の場合
            if (!response.ok || !data.success) {
                throw new Error(data.message || "投票できませんでした");
            }

            // 投票成功のメッセージを表示
            setNotice("投票しました");
            // 最新の投票状況をAPIから再取得して、画面を更新
            await refreshCandidates();
        } catch (error) {
            // エラーメッセージをユーザーに表示
            setNotice(error.message);
        }
    };

    return (
        // メインコンテナ：投票パネル
        // hidden={!active} により、active が false の場合は非表示になる
        <section className="pollPanel" aria-label="投票" hidden={!active}>
            {/* ヘッダーセクション：タイトル・説明・投票ルール */}
            <div className="sectionHeader">
                <div>
                    <span className="sectionKicker">候補から選ぶ</span>
                    <h2>アンケート</h2>
                </div>
                {/* 投票ルールの説明：各カテゴリー1票のみ可能 */}
                <span className="pollRule">各カテゴリ1票</span>
            </div>

            {/* ポーリング（投票）一覧の表示エリア */}
            <div className="pollList">
                {/* 通知メッセージ表示（投票完了、エラーメッセージなど） */}
                {notice && <p className="pollNotice" role="status">{notice}</p>}
                {/* ローディング状態・候補がない場合・候補がある場合の3つの表示をコンディショナルレンダリング */}
                {loading ? (
                    // ローディング中の表示
                    <div className="pollEmpty">投票候補を読み込んでいます…</div>
                ) : polls.length === 0 ? (
                    // 投票できる候補がない場合のメッセージ
                    <div className="pollEmpty">
                        <strong>投票できる候補がありません</strong>
                        <p>候補タブから案を追加してください。</p>
                    </div>
                ) : (
                    // 投票用のカテゴリーごとのポーリングカードを表示
                    polls.map((poll) => (
                        <article className="pollCard" key={poll.category}>
                            {/* ポーリングカードのヘッダー：カテゴリー名・質問・候補数 */}
                            <div className="pollCardHeader">
                                <div>
                                    <span>{poll.label}</span>
                                    <h3>{poll.label}はどれがいい？</h3>
                                </div>
                                <small>{poll.options.length}候補</small>
                            </div>
                            {/* ポーリングのオプション（選択肢）を表示 */}
                            <div className="pollOptions">
                                {poll.options.map((option) => {
                                    // このカテゴリーの最大投票数を計算（グラフバーの幅計算用）
                                    const max = Math.max(...poll.options.map((item) => item.vote_count), 1);
                                    // このオプションの投票数をパーセンテージに変換（グラフバー用）
                                    const width = `${(option.vote_count / max) * 100}%`;

                                    return (
                                        <button
                                            // 投票済みの場合は selected クラスを追加（スタイル適用）
                                            className={option.has_voted ? "selected" : ""}
                                            type="button"
                                            key={option.candidate_id}
                                            // aria-pressed 属性で投票済み状態をアクセシビリティに伝える
                                            aria-pressed={option.has_voted}
                                            // ボタンクリック時に投票処理を実行
                                            onClick={() => vote(option.candidate_id)}
                                        >
                                            {/* 投票数を視覚的に表現するグラフバー */}
                                            <span className="pollFill" style={{ width }} />
                                            {/* 候補名 */}
                                            <span className="pollLabel">{option.candidate_name}</span>
                                            {/* 投票数の表示 */}
                                            <span className="pollCount">{option.vote_count}票</span>
                                            {/* このユーザーが投票済みの場合、チェックマークを表示 */}
                                            {option.has_voted && <span className="checkMark">✓</span>}
                                        </button>
                                    );
                                })}
                            </div>
                        </article>
                    ))
                )}
            </div>
        </section>
    );
}

export default Vote;
