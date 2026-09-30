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
// React Hooks と React Router のインポート
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
// モーダル表示用コンポーネント
import Modal from "../Modal/Modal";
import "./TravelOptions.css";
import Minimap from "../Minimap/Minimap";

// 候補カテゴリーの日本語ラベルマッピング
// 「旅行先」「スポット」「宿泊先」「食べたい物」のカテゴリーを定義
const categoryLabels = {
    destination: "旅行先",
    spot: "スポット",
    hotel: "宿泊先",
    restaurant: "食べたい物",
};

/**
 * 候補に紐づいた画像またはアイコンを表示するコンポーネント
 *
 * @param {Object} candidate 候補オブジェクト（candidate_type, img_url を含む）
 *
 * 処理：
 * 1. img_url が存在する場合：画像タグで表示
 * 2. img_url が空の場合：候補タイプに応じたアイコン（⌂, ⌖, ◇, 🍴）を表示
 */
function CandidateVisual({ candidate }) {
    // 画像URLが設定されている場合、その画像を表示
    if (candidate.img_url) {
        return <img src={candidate.img_url} alt="" />;
    }

    // 画像がない場合、候補タイプに応じたアイコンを表示
    const icons = {
        destination: "◇",
        spot: "⌖",
        hotel: "⌂",
        restaurant: "🍴",
    };
    const icon = icons[candidate.candidate_type] || "◇";
    return <span aria-hidden="true">{icon}</span>;
}

/**
 * バックエンドAPI（GetCandidates.php）から候補・旅行情報を取得する非同期関数
 *
 * @param {string} groupId グループID
 * @returns {Promise<Object>} { candidates: [], trip: {} } の形式で、候補一覧と旅行情報を返す
 *
 * 処理：
 * 1. GetCandidates.php へGETリクエストを送信
 * 2. レスポンスをJSON形式でパース
 * 3. エラー時は詳細なエラーメッセージをthrow
 * 4. 成功時は候補一覧と旅行情報を含むオブジェクトを返す
 */
async function requestCandidates(groupId) {
    // GetCandidates.php への HTTP GETリクエストを送信
    // credentials: "include" により、クッキー（セッション情報）を自動的に含める
    const response = await fetch(
        `${import.meta.env.BASE_URL}api/Trips/GetCandidates.php?group_id=${encodeURIComponent(groupId)}&scope=list`,
        { credentials: "include" },
    );
    // レスポンス本体をJSON形式にパース
    const data = await response.json();

    // HTTPステータスコードが200未満または success フラグが false の場合
    if (!response.ok || !data.success) {
        // エラーメッセージを付けて例外をthrow（呼び出し元の catch で処理される）
        throw new Error(data.message || "候補を取得できませんでした");
    }

    // 候補一覧と旅行情報を含むオブジェクトを返す
    return data;
}

/**
 * 旅行候補一覧を表示するメインコンポーネント
 *
 * 機能：
 * - 複数のカテゴリー（旅行先、スポット、宿泊先、食べたい物）の候補を表示
 * - タブで候補のカテゴリーを切り替え
 * - 候補をクリックしてモーダルで詳細情報を表示
 * - API から候補データを取得
 */
function TravelOptions({ active, groupId: selectedGroupId }) {
    // 親画面の選択を優先し、固定の旅行を補いません。
    const { groupId: pathGroupId } = useParams();
    const groupId = selectedGroupId || pathGroupId;
    const location = useLocation();
    const navigate = useNavigate();
    const queryCategory = new URLSearchParams(location.search).get("category");
    const initialCategory = Object.prototype.hasOwnProperty.call(categoryLabels, queryCategory)
        ? queryCategory
        : "destination";

    // 状態管理
    // activeCategory: 現在選択されているカテゴリー（destination, spot, hotel, restaurant）
    const activeCategory = initialCategory;

    // candidates: 取得した候補データの配列
    const [candidates, setCandidates] = useState([]);

    // tripTitle: 旅行タイトル（API から取得）
    const [tripTitle, setTripTitle] = useState("");

    // selectedCandidate: モーダルで表示する選択された候補オブジェクト（null の場合モーダルは非表示）
    const [selectedCandidate, setSelectedCandidate] = useState(null);

    // loading: API通信中かどうかを示すフラグ（true = 読み込み中）
    const [loading, setLoading] = useState(true);

    // notice: ユーザーへの通知メッセージ
    const [notice, setNotice] = useState("");

    // コンポーネント マウント時に候補・旅行データを初期取得する処理
    useEffect(() => {
        // ここで条件を確認し、状況に合う処理だけを実行します。
        if (!active) {
            return undefined;
        }

        // cleanup 関数用の cancelled フラグ：非同期処理完了後に状態を更新しないようにするため
        // （コンポーネント がアンマウントされた場合、古い状態更新を防ぐ）
        let cancelled = false;

        const loadCandidates = async () => {
            setLoading(true);
            setNotice("");

            try {
                const data = await requestCandidates(groupId);

                if (cancelled) {
                    return;
                }

                setCandidates(data.candidates);
                setTripTitle(data.trip?.title || "");
            } catch {
                if (cancelled) {
                    return;
                }

                setCandidates([]);
                setNotice("候補データを取得できませんでした");
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };

        loadCandidates();

        // cleanup 関数：コンポーネント のアンマウント時に古い非同期処理の状態更新を防ぐ
        return () => {
            cancelled = true;
        };
    }, [active, groupId]); // groupId が変更されたときに再実行

    // 現在のカテゴリーに属する候補のみをフィルタリングする処理
    // activeCategory が変更されたときのみ再計算される
    const visibleCandidates = useMemo(
        // 条件に合うデータだけを残して、画面に出す内容を絞り込みます。
        () => candidates.filter((candidate) => (
            candidate.candidate_type === activeCategory
            && candidate.status === "selected"
        )),
        [activeCategory, candidates],
    );

    // カテゴリー変更時の処理
    const changeCategory = (category) => {
        // 宿泊などのタブをURLへ保存し、戻る・再読み込みでも同じカテゴリを表示します。
        const params = new URLSearchParams(location.search);
        params.set('category', category);
        params.set('tab', 'candidate');
        navigate(`/group/${encodeURIComponent(groupId)}/talk?${params}`);
        // 通知メッセージをクリア
        setNotice("");
    };

    const removeCandidate = async () => {
        if (!selectedCandidate?.candidate_id) {
            return;
        }

        try {
            const response = await fetch(`${import.meta.env.BASE_URL}api/Trips/UpdateCandidateStatus.php`, {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    candidate_id: selectedCandidate.candidate_id,
                    status: "rejected",
                }),
            });
            const data = await response.json().catch(() => null);

            if (!response.ok || !data?.success) {
                throw new Error(data?.message || "候補の削除に失敗しました");
            }

            setCandidates((current) => current.filter(
                (candidate) => candidate.candidate_id !== selectedCandidate.candidate_id,
            ));
            setSelectedCandidate(null);
            setNotice("候補から削除しました");
        } catch (error) {
            setNotice(error instanceof Error ? error.message : "候補の削除に失敗しました");
        }
    };

    // openCandidateSearch は、画面操作や API 結果に合わせて必要な処理をまとめた関数です。
    const openCandidateSearch = () => {
        // 宿泊タブから同じ候補一覧の宿泊絞り込みを開きます。
        navigate(`/Candidates?groupId=${encodeURIComponent(groupId)}&category=${encodeURIComponent(activeCategory)}`);
    };

    return (
        // メインコンテナ：候補パネル
        // hidden={!active} により、active が false の場合は非表示になる
        <section className="candidatePanel" aria-label="旅行候補" hidden={!active}>
            {/* ヘッダーセクション：タイトル・説明・「候補に追加」ボタン */}
            <header className="candidateHeading">
                <div>
                    <span className="sectionKicker">みんなで候補を集める</span>
                    <h2>旅行の候補</h2>
                    {/* API から取得した旅行タイトルを表示（取得できない場合は表示しない） */}
                    {tripTitle && <p>{tripTitle}</p>}
                </div>
                {/* 候補追加ボタン */}
                <button className="addCandidateButton" type="button" onClick={openCandidateSearch}>
                    {activeCategory === 'hotel' ? '宿泊一覧を見る' : '候補に追加'}
                </button>
            </header>

            {/* カテゴリータブ：destination, spot, hotel, restaurant を切り替えるボタングループ */}
            <div className="candidateTypes" aria-label="候補カテゴリ">
                {Object.entries(categoryLabels).map(([category, label]) => (
                    <button
                        key={category}
                        // クラス selected を追加して、アクティブなタブをハイライト
                        className={activeCategory === category ? "selected" : ""}
                        type="button"
                        // タブクリック時にカテゴリーを切り替える
                        onClick={() => changeCategory(category)}
                    >
                        {/* カテゴリーを表すアイコン */}
                        <span>{category === "destination" ? "✎" : category === "spot" ? "⌖" : category === "hotel" ? "⌂" : "🍴"}</span>
                        {label}
                    </button>
                ))}
            </div>

            {/* 候補一覧表示エリア */}
            <div className="candidateBody">
                {/* 通知メッセージ表示（投票完了、エラーメッセージなど） */}
                {notice && <p className="candidateNotice" role="status">{notice}</p>}
                {/* 候補一覧のヘッダー：カテゴリー名と候補件数を表示 */}
                <div className="candidateListHeader">
                    <div>
                        <strong>{categoryLabels[activeCategory]}の候補</strong>
                        <span>{visibleCandidates.length}件</span>
                    </div>
                </div>

                {/* 候補一覧の本体 */}
                <div className="candidateList">
                    {/* ローディング中の表示 */}
                    {loading ? (
                        <div className="candidateEmpty">候補を読み込んでいます…</div>
                    ) : visibleCandidates.length === 0 ? (
                        /* 候補がない場合のメッセージ */
                        <div className="candidateEmpty">
                            <strong>候補はまだありません</strong>
                            <p>「候補に追加」ボタンから追加してください。</p>
                        </div>
                    ) : (
                        /* 候補が存在する場合：候補カードを表示 */
                        visibleCandidates.map((candidate) => (
                            <button
                                className={`candidateCard candidateCard--${candidate.candidate_type}`}
                                type="button"
                                key={candidate.candidate_id}
                                // ボタンクリック時にモーダルで詳細を表示するため、selectedCandidate を設定
                                onClick={() => setSelectedCandidate(candidate)}
                            >
                                {/* destination 以外の候補にはアイコンを表示 */}
                                {candidate.candidate_type !== "destination" && (
                                    <div className="candidateIcon">
                                        <CandidateVisual candidate={candidate} />
                                    </div>
                                )}
                                {/* 候補の情報セクション */}
                                <div className="candidateInfo">
                                    <div className="candidateMeta">
                                        {/* カテゴリーラベル */}
                                        <span>{categoryLabels[candidate.candidate_type]}</span>
                                        {candidate.status === "selected" && (
                                            <small className="candidateStatus candidateStatus--selected">
                                                採用
                                            </small>
                                        )}
                                        {/* destination の場合は行き先候補と明記 */}
                                        {candidate.candidate_type === "destination" && (
                                            <small>行き先候補</small>
                                        )}
                                    </div>
                                    {/* 候補の名前 */}
                                    <h3>{candidate.candidate_name}</h3>
                                    {/* 候補の説明（説明がある場合のみ表示） */}
                                    {candidate.description && <p>{candidate.description}</p>}
                                    {/* 詳細閲覧へのテキストリンク */}
                                    <span className="candidateDetailLink">詳細を見る</span>
                                </div>
                                {/* 右矢印アイコン */}
                                <span className="candidateChevron" aria-hidden="true">›</span>
                            </button>
                        ))
                    )}
                </div>
            </div>

            {/* 詳細情報表示用モーダル */}
            <Modal isOpen={selectedCandidate !== null} onClose={() => setSelectedCandidate(null)}>
                {/* 候補が選択されている場合のみ詳細を表示 */}
                {selectedCandidate && (
                    <div className="candidateDetail">
                        {/* モーダルヘッダー：カテゴリー・タイトル・閉じるボタン */}
                        <div className="candidateModalHeader">
                            <div>
                                <span>{categoryLabels[selectedCandidate.candidate_type]}</span>
                                <h3>{selectedCandidate.candidate_name}</h3>
                            </div>
                            <button
                                type="button"
                                aria-label="閉じる"
                                onClick={() => setSelectedCandidate(null)}
                            >
                                ×
                            </button>
                        </div>
                        {/* モーダル内の画像表示エリア（destination 以外） */}
                        {selectedCandidate.candidate_type !== "destination" && (
                            <div className="candidateDetailVisual">
                                <CandidateVisual candidate={selectedCandidate} />
                            </div>
                        )}
                        {/* モーダル内の詳細説明 */}
                        <div className="candidateDetailBody">
                            <strong>詳細</strong>
                            {/* 説明がある場合は表示、ない場合はプレースホルダーテキストを表示 */}
                            <p>{selectedCandidate.description || "詳細情報はまだありません。"}</p>
                            <strong>地図</strong>
                            <Minimap
                                place={selectedCandidate.candidate_name}
                                address={selectedCandidate.address}
                                label={selectedCandidate.candidate_name}
                                center={selectedCandidate.longitude != null && selectedCandidate.latitude != null
                                    && Number.isFinite(Number(selectedCandidate.longitude)) && Number.isFinite(Number(selectedCandidate.latitude))
                                    ? [Number(selectedCandidate.longitude), Number(selectedCandidate.latitude)]
                                    : undefined}
                            />
                            <button className="removeCandidateButton" type="button" onClick={removeCandidate}>
                                候補から削除
                            </button>
                        </div>
                    </div>
                )}
            </Modal>
        </section>
    );
}

export default TravelOptions;
