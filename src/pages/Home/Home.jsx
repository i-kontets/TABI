/**
 * React の画面または部品として、表示内容とユーザー操作を担当します。
 *
 * 主な流れ:
 * 1. 必要な部品や API 関数を読み込む
 * 2. 画面表示やデータ取得に必要な値を準備する
 * 3. ユーザー操作や API の結果に合わせて表示を更新する
 *
 * 扱うデータ: React の state、props、フォーム入力、API から返ったデータを主に扱います。
 */
import { useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TripContext } from "../../App";
import TravelGroupCard from '../../components/TravelGroupCard/TravelGroupCard';
import Modal from '../../components/Modal/Modal';
import ImagePicker from '../../components/ImagePicker/ImagePicker';
import styles from './Home.module.css';
import { fetchUnreadNotificationCount } from '../../api/notificationApi';

// ここから下は、画面内で使うアイコンを SVG で直接定義しています。
// 画像素材を別ファイルに分けず、必要な見た目をこのコンポーネント内で完結させます。
function PlusIcon({ className }) {
    return (
        <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 5v14M5 12h14" />
        </svg>
    );
}

/**
 * BellIcon は、このファイルの中心となる処理をまとめた関数です。
 * 画面から渡された値や API の結果を使い、次に表示する内容を決めます。
 */
function BellIcon({ className }) {
    return (
        <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
            <path d="M18 16v-5a6 6 0 0 0-12 0v5l-2 2v1h16v-1l-2-2Z" />
            <path d="M9.5 21a2.5 2.5 0 0 0 5 0" />
        </svg>
    );
}

/**
 * LogoutIcon は、このファイルの中心となる処理をまとめた関数です。
 * 画面から渡された値や API の結果を使い、次に表示する内容を決めます。
 */
function LogoutIcon({ className }) {
    return (
        <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
            <path d="M10 5H5v14h5" />
            <path d="M14 8l4 4-4 4" />
            <path d="M8 12h10" />
        </svg>
    );
}

/**
 * HomeIcon は、このファイルの中心となる処理をまとめた関数です。
 * 画面から渡された値や API の結果を使い、次に表示する内容を決めます。
 */
function HomeIcon({ className }) {
    return (
        <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
            <path d="M3 11.5 12 4l9 7.5" />
            <path d="M5.5 10.5V20h13v-9.5" />
            <path d="M9.5 20v-5h5v5" />
        </svg>
    );
}

/**
 * UserIcon は、このファイルの中心となる処理をまとめた関数です。
 * 画面から渡された値や API の結果を使い、次に表示する内容を決めます。
 */
function UserIcon({ className }) {
    return (
        <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
            <path d="M4.5 20a7.5 7.5 0 0 1 15 0" />
        </svg>
    );
}

// Home 画面の本体です。
// 参加中の旅行グループ一覧を表示し、グループ作成と画像編集までを担当します。
function Home() {
    const navigate = useNavigate();
    // TripContext には、選択中の旅行グループ情報を入れて次画面へ渡します。
    const { setTrip } = useContext(TripContext);
    const [notificationBadgeText, setNotificationBadgeText] = useState(null);

    useEffect(() => {
        let isMounted = true;
        const controller = new AbortController();

        const fetchNotificationBadge = async () => {
            try {
                const data = await fetchUnreadNotificationCount({ signal: controller.signal });
                const count = Number(data?.data?.unreadCount ?? 0);
                const badgeText = data?.data?.badgeText || (count > 99 ? '99+' : String(count));

                if (isMounted) {
                    setNotificationBadgeText(count > 0 ? badgeText : null);
                }
            } catch (caughtError) {
                if (isMounted && caughtError?.name !== 'AbortError') {
                    setNotificationBadgeText(null);
                }
            }
        };

        fetchNotificationBadge();

        return () => {
            isMounted = false;
            controller.abort();
        };
    }, []);

    // 画面に表示する旅行グループ一覧です。
    const [travelGroups, setTravelGroups] = useState([]);
    // データ取得中かどうかを表します。true の間は「読み込み中...」を表示します。
    const [isLoading, setIsLoading] = useState(true);
    // 新しい旅行グループを作るモーダルの開閉状態です。
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    // 作成フォームの入力値です。
    const [newName, setNewName] = useState("");
    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const [newStartDate, setNewStartDate] = useState("");
    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const [newEndDate, setNewEndDate] = useState("");

    // ImagePicker で確定した画像情報を保持します。
    // previewUrl は画面に出すプレビュー、file はサーバーへ送る実ファイルです。
    const [selectedImage, setSelectedImage] = useState(null);

    // 画面表示時に、ログイン中ユーザーが参加している旅行グループを API から取得します。
    // 取得結果は一覧表示に使い、認証切れならログイン画面へ戻します。
    useEffect(() => {
        let isMounted = true;

        // fetchGroups は、画面操作や API 結果に合わせて必要な処理をまとめた関数です。
        const fetchGroups = async () => {
            // API 通信やデータ処理で失敗する可能性があるため、例外を受け取れる形で実行します。
            try {
                // 自分が参加している旅行グループ一覧を取得します。
                // credentials: include を付けることで、ログイン中のセッション情報も一緒に送ります。
                const response = await fetch(
                    "/TABI/api/Groups/List.php",
                    {
                        method: "GET",
                        credentials: "include"
                    }
                );

                // セッションが切れている場合は、ログイン画面へ戻します。
                // ローカル保存のログイン情報も消して、見た目だけログイン済みの状態が残らないようにします。
                if (response.status === 401) {
                    localStorage.removeItem("loginUser");
                    navigate("/");
                    return;
                }

                // レスポンス JSON を読み込みます。
                // 期待するのは success と groups を持つオブジェクトです。
                const data = await response.json();

                // ここで条件を確認し、状況に合う処理だけを実行します。
                if (!isMounted) {
                    // 画面が閉じた後の state 更新は避けます。
                    return;
                }

                // 正常な形式なら、カード表示に使える形へ整えて state に保存します。
                // image_url が無い場合は null にして、カード側の既定画像表示に任せます。
                // ここでやっているのは表示用の整形だけで、DB の内容は変更しません。
                if (data.success && Array.isArray(data.groups)) {
                    setTravelGroups(
                        // 配列のデータを1件ずつ画面表示用の形に変換します。
                        data.groups.map((group, index) => ({
                            ...group,
                            image: group.image_url ?? null,
                        }))
                    );
                } else {
                    // 想定外のレスポンスなら、一覧は空として扱います。
                    // 画面が壊れないことを優先し、エラー表示ではなく空一覧にします。
                    setTravelGroups([]);
                }
            // エラーが起きた場合は、画面にメッセージを出すなど安全な処理に切り替えます。
            } catch {
                // 通信エラー時も画面を壊さず、空一覧として処理します。
                // 利用者からは「参加中の旅行グループがない」状態に見せます。
                if (isMounted) {
                    setTravelGroups([]);
                }
            // 成功・失敗に関係なく最後に必要な後片付けを行います。
            } finally {
                // 取得が終わったので、読み込み中表示を解除します。
                // ここで false にすることで、ローディング表示を止めます。
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        };

        fetchGroups();

        return () => {
            // コンポーネント破棄後に state を更新しないためのフラグです。
            isMounted = false;
        };
    }, [navigate]);

    // 一覧カードをクリックしたとき、そのグループを選択中として次画面へ渡します。
    const handleGroupClick = (trip) => {
        setTrip({
            id: trip.id,
            name: trip.name
        });

        // 旅程画面へは groupId を付けて遷移します。
        // これにより Itinerary 側が、どのグループを表示すべきか判断できます。
        navigate(`/Itinerary?groupId=${trip.id}`);
    };

    // ログアウト API を呼び、成功したらローカルのログイン情報も消してログイン画面へ戻します。
    const handleLogout = async () => {
        // バックエンド API へ通信し、画面で使うデータの取得や保存を依頼します。
        const response = await fetch(
            "/TABI/api/auth/logout.php",
            {
                method: "POST",
                credentials: "include"
            }
        );

        const data = await response.json();

        // ここで条件を確認し、状況に合う処理だけを実行します。
        if (data.success) {
            // サーバー側のログアウトに加えて、端末側のログイン情報も消します。
            localStorage.removeItem("loginUser");
            navigate("/");
        }
    };

    // resetSelectedImage は、画面操作や API 結果に合わせて必要な処理をまとめた関数です。
    const resetSelectedImage = (revokePreview) => {
        // ここで条件を確認し、状況に合う処理だけを実行します。
        if (revokePreview && selectedImage?.previewUrl) {
            // previewUrl はブラウザが持つ一時的なローカル URL なので、不要になったら解放します。
            URL.revokeObjectURL(selectedImage.previewUrl);
        }
        setSelectedImage(null);
    };

    // ImagePicker から新しい画像が返ってきたときの受け口です。
    // 以前のプレビューURLを解放してから、最新の画像情報に差し替えます。
    const handleImageChange = (nextImage) => {
        // ここで条件を確認し、状況に合う処理だけを実行します。
        if (selectedImage?.previewUrl) {
            URL.revokeObjectURL(selectedImage.previewUrl);
        }
        setSelectedImage(nextImage);
    };

    // 作成フォームの入力値を初期状態に戻します。
    const resetCreateForm = () => {
        setIsCreateOpen(false);
        setNewName("");
        setNewStartDate("");
        setNewEndDate("");
    };

    // モーダルを閉じるときは、入力欄と画像の両方をまとめて片付けます。
    const closeCreateModal = () => {
        resetCreateForm();
        resetSelectedImage(true);
    };

    // 新しい旅行グループを作成します。
    // まずグループ本体を登録し、画像があればそのあとにアップロードします。
    const handleCreateGroup = async (event) => {
        event.preventDefault();

        const name = newName.trim();
        // ここで条件を確認し、状況に合う処理だけを実行します。
        if (!name) {
            // グループ名が空なら送信しません。
            return;
        }

        // API 通信やデータ処理で失敗する可能性があるため、例外を受け取れる形で実行します。
        try {
            // グループ名と日付を API へ送り、新しい旅行グループを作成します。
            // start_date / end_date は未入力なら null にして、空値として扱えるようにします。
            const response = await fetch(
                "/TABI/api/Groups/Create.php",
                {
                    method: "POST",
                    credentials: "include",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        group_name: name,
                        start_date: newStartDate || null,
                        end_date: newEndDate || null
                    })
                }
            );

            // セッションが切れている場合は、ログイン画面へ戻します。
            if (response.status === 401) {
                localStorage.removeItem("loginUser");
                navigate("/");
                return;
            }

            // API の返却 JSON を読み込みます。
            const data = await response.json();

            // ここで条件を確認し、状況に合う処理だけを実行します。
            if (data.success && data.group) {
                // トリミング済み画像がある場合だけ、追加で画像アップロードを行います。
                // 画像が無いときは、そのままカードの既定画像を使います。
                let cardImage = selectedImage?.previewUrl ?? null;
                const imageFile = selectedImage?.file ?? null;

                // ここで条件を確認し、状況に合う処理だけを実行します。
                if (imageFile) {
                    // API 通信やデータ処理で失敗する可能性があるため、例外を受け取れる形で実行します。
                    try {
                        // 画像ファイルとグループ ID を一緒に送って、保存先を紐づけます。
                        // FormData を使うことで、画像ファイルを multipart 形式で送れます。
                        const formData = new FormData();
                        formData.append("image", imageFile);
                        formData.append("group_id", data.group.id);

                        // バックエンド API へ通信し、画面で使うデータの取得や保存を依頼します。
                        // 旅行グループ作成後、選択された画像をS3保存用APIへ送ります。ここで送るのは画像ファイル本体とgroup_idです。
                        const uploadResponse = await fetch(
                            "/TABI/api/Groups/UploadImage.php",
                            {
                                method: "POST",
                                credentials: "include",
                                body: formData
                            }
                        );

                        const uploadData = await uploadResponse.json();

                        // ここで条件を確認し、状況に合う処理だけを実行します。
                        if (uploadData.success && uploadData.image_url) {
                            // アップロード成功時は、S3 の URL をカード画像として使います。
                            cardImage = uploadData.image_url;
                        }
                    // エラーが起きた場合は、画面にメッセージを出すなど安全な処理に切り替えます。
                    } catch {
                        // アップロード失敗時でも、作成直後の一覧表示は崩さずプレビュー画像を残します。
                        // 次回読み込み時に画像が無ければ、カード側の既定表示に任せます。
                    }
                }

                // 新しく作ったグループを一覧の先頭に追加します。
                // 画面再取得を待たずに見せることで、作成結果がすぐ分かるようにしています。
                setTravelGroups((prev) => [
                    {
                        ...data.group,
                        image: cardImage ?? null
                    },
                    ...prev
                ]);

                // 入力欄を空に戻し、作成モーダルを閉じます。
                resetCreateForm();
                // プレビュー画像はカード表示に使うので、ここでは解放しません。
                resetSelectedImage(false);
                return;
            }

            // 作成失敗なら、API が返したメッセージを優先して表示します。
            alert(data.message ?? "旅行グループの作成に失敗しました。");
        // エラーが起きた場合は、画面にメッセージを出すなど安全な処理に切り替えます。
        } catch {
            // 通信失敗や予期しない例外が起きた場合のメッセージです。
            alert("旅行グループの作成に失敗しました。通信環境を確認してください。");
        }
    };

    // ここから下は画面描画です。
    // 上で準備した状態を使って、ヘッダー、一覧、作成モーダル、フッターを表示します。
    return (
        <div className={styles.page}>
            <header className={styles.header}>
                {/* <button
                    type="button"
                    className={styles.logoutButton}
                    onClick={handleLogout}
                    aria-label="ログアウト"
                >
                    <LogoutIcon className={styles.headerIcon} />
                    <span>ログアウト</span>
                </button> */}

                <h1 className={styles.headerTitle}>TABI</h1>

                <button
                    type="button"
                    className={styles.noticeButton}
                    onClick={() => navigate('/notifications')}
                    aria-label="通知一覧"
                >
                    <BellIcon className={styles.headerIcon} />
                    {notificationBadgeText && <span className={styles.noticeBadge}>{notificationBadgeText}</span>}
                </button>
            </header>

            <main className={styles.content}>
                {isLoading ? (
                    <p className={styles.stateMessage}>読み込み中...</p>
                ) : travelGroups.length === 0 ? (
                    // 参加中の旅行グループがないときは、作成を促す空状態メッセージを出します。
                    <p className={styles.stateMessage}>
                        参加中の旅行グループはありません。<br />
                        右下の＋ボタンから作成できます。
                    </p>
                ) : (
                    // グループがあるときは、1 件ずつカードとして並べます。
                    travelGroups.map((group) => (
                        <TravelGroupCard
                            key={group.id}
                            group={group}
                            onClick={handleGroupClick}
                        />
                    ))
                )}
            </main>

            <button
                type="button"
                className={styles.createButton}
                onClick={() => setIsCreateOpen(true)}
                aria-label="新しい旅行グループを作成"
            >
                <PlusIcon className={styles.plusIcon} />
            </button>

            {/* 新しい旅行グループを作成するためのモーダルです。 */}
            <Modal isOpen={isCreateOpen} onClose={closeCreateModal}>
                <form className={styles.createForm} onSubmit={handleCreateGroup}>
                    <h2 className={styles.createTitle}>新しい旅行グループ</h2>

                    {/* 画像の追加・編集は ImagePicker に任せます。 */}
                    <ImagePicker
                        label="グループ画像"
                        value={selectedImage}
                        onChange={handleImageChange}
                        fileName="group_image.jpg"
                        editorTitle="グループ画像"
                        previewAlt="グループ画像プレビュー"
                    />

                    <label className={styles.createLabel}>
                        {/* グループ名は一覧表示や識別に使います。 */}
                        グループ名
                        <input
                            type="text"
                            className={styles.createInput}
                            value={newName}
                            onChange={(event) => setNewName(event.target.value)}
                            placeholder="例）沖縄旅行 🌺"
                            required
                        />
                    </label>

                    <div className={styles.createDates}>
                        <label className={styles.createLabel}>
                            {/* 開始日は旅行期間の目安として入力します。 */}
                            開始日
                            <input
                                type="date"
                                className={styles.createInput}
                                value={newStartDate}
                                onChange={(event) => setNewStartDate(event.target.value)}
                            />
                        </label>

                        <label className={styles.createLabel}>
                            {/* 終了日も同じく、旅行期間の目安として使います。 */}
                            終了日
                            <input
                                type="date"
                                className={styles.createInput}
                                value={newEndDate}
                                onChange={(event) => setNewEndDate(event.target.value)}
                                min={newStartDate || undefined}
                            />
                        </label>
                    </div>

                    <div className={styles.createActions}>
                        <button
                            type="button"
                            className={styles.cancelButton}
                            onClick={closeCreateModal}
                        >
                            {/* 入力を破棄してモーダルを閉じます。 */}
                            キャンセル
                        </button>
                        <button type="submit" className={styles.submitButton}>
                            {/* 入力内容を送信してグループを作成します。 */}
                            作成する
                        </button>
                    </div>
                </form>
            </Modal>

            {/* 画面下部のナビゲーションです。ホームとマイページを切り替えます。 */}
            <footer className={styles.footer}>
                <button
                    type="button"
                    className={`${styles.footerItem} ${styles.footerItemActive}`}
                    onClick={() => navigate('/Home')}
                    aria-label="ホーム"
                >
                    <HomeIcon className={styles.footerIcon} />
                    <span>ホーム</span>
                </button>

                <button
                    type="button"
                    className={styles.footerItem}
                    onClick={() => navigate('/mypage')}
                    aria-label="マイページ"
                >
                    <UserIcon className={styles.footerIcon} />
                    <span>マイページ</span>
                </button>
            </footer>
        </div>
    );
}

export default Home