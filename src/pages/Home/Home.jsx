import { useContext, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TripContext } from "../../App";
import TravelGroupCard from '../../components/TravelGroupCard/TravelGroupCard';
import Modal from '../../components/Modal/Modal';
import styles from './Home.module.css';

// トリミング画像の出力サイズ（px）
const CROPPED_IMAGE_SIZE = 600;

// 画像のオフセットをトリミング枠の範囲内に収める
const clampOffset = (value, cropSize, dispSize) =>
    Math.min(0, Math.max(cropSize - dispSize, value));

function PlusIcon({ className }) {
    return (
        <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 5v14M5 12h14" />
        </svg>
    );
}

function BellIcon({ className }) {
    return (
        <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
            <path d="M18 16v-5a6 6 0 0 0-12 0v5l-2 2v1h16v-1l-2-2Z" />
            <path d="M9.5 21a2.5 2.5 0 0 0 5 0" />
        </svg>
    );
}

function LogoutIcon({ className }) {
    return (
        <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
            <path d="M10 5H5v14h5" />
            <path d="M14 8l4 4-4 4" />
            <path d="M8 12h10" />
        </svg>
    );
}

function HomeIcon({ className }) {
    return (
        <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
            <path d="M3 11.5 12 4l9 7.5" />
            <path d="M5.5 10.5V20h13v-9.5" />
            <path d="M9.5 20v-5h5v5" />
        </svg>
    );
}

function UserIcon({ className }) {
    return (
        <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
            <path d="M4.5 20a7.5 7.5 0 0 1 15 0" />
        </svg>
    );
}

function CameraIcon({ className }) {
    return (
        <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 8h3l2-2h6l2 2h3v11H4V8Z" />
            <circle cx="12" cy="13" r="3.5" />
        </svg>
    );
}

function ChevronLeftIcon({ className }) {
    return (
        <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
            <path d="m15 5-7 7 7 7" />
        </svg>
    );
}

function Home() {
    const navigate = useNavigate();
    const { setTrip } = useContext(TripContext);

    const [travelGroups, setTravelGroups] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [newName, setNewName] = useState("");
    const [newStartDate, setNewStartDate] = useState("");
    const [newEndDate, setNewEndDate] = useState("");

    // グループ画像関連
    // newImagePreview : 作成フォームに表示するトリミング済み画像のURL
    // editorSrc       : 編集画面で表示中の元画像URL
    // editorLayout    : 編集画面での画像の位置（tx, ty）と拡大率（zoom）
    const [newImagePreview, setNewImagePreview] = useState(null);
    const [editorSrc, setEditorSrc] = useState(null);
    const [editorLayout, setEditorLayout] = useState({ tx: 0, ty: 0, zoom: 1 });
    // 編集中画像のメタ情報 { natW, natH, baseScale, cropSize }（表示計算に使うためstateで持つ）
    const [editorMeta, setEditorMeta] = useState(null);

    const fileInputRef = useRef(null);
    const editorImgRef = useRef(null);
    const editorCropRef = useRef(null);
    // ピンチ・ドラッグ用のアクティブなポインタ一覧
    const pointersRef = useRef(new Map());
    // トリミング済み画像（File）。グループ作成時の送信用に保持する
    const croppedImageFileRef = useRef(null);

    // ログイン中ユーザーが参加している旅行グループをDBから取得する
    useEffect(() => {
        let isMounted = true;

        const fetchGroups = async () => {
            try {
                const response = await fetch(
                    "/TABI/api/Groups/List.php",
                    {
                        method: "GET",
                        credentials: "include"
                    }
                );

                // 未ログインならログインフォームへ強制移動する
                if (response.status === 401) {
                    localStorage.removeItem("loginUser");
                    navigate("/");
                    return;
                }

                const data = await response.json();

                if (!isMounted) {
                    return;
                }

                if (data.success && Array.isArray(data.groups)) {
                    setTravelGroups(
                        data.groups.map((group, index) => ({
                            ...group,
                            image: group.image_url ?? null,
                        }))
                    );
                } else {
                    setTravelGroups([]);
                }
            } catch {
                if (isMounted) {
                    setTravelGroups([]);
                }
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        };

        fetchGroups();

        return () => {
            isMounted = false;
        };
    }, [navigate]);

    const handleGroupClick = (trip) => {
        setTrip({
            id: trip.id,
            name: trip.name
        });

        navigate(`/Itinerary?groupId=${trip.id}`);
    };

    const handleLogout = async () => {
        const response = await fetch(
            "/TABI/api/auth/logout.php",
            {
                method: "POST",
                credentials: "include"
            }
        );

        const data = await response.json();

        if (data.success) {
            localStorage.removeItem("loginUser");
            navigate("/");
        }
    };

    // フォームの画像状態をリセットする
    // revokePreview=false の場合、プレビューURLはカード表示に使うため解放しない
    const resetNewImage = (revokePreview) => {
        if (revokePreview && newImagePreview) {
            URL.revokeObjectURL(newImagePreview);
        }
        setNewImagePreview(null);
        croppedImageFileRef.current = null;
    };

    const resetCreateForm = () => {
        setIsCreateOpen(false);
        setNewName("");
        setNewStartDate("");
        setNewEndDate("");
    };

    const closeCreateModal = () => {
        resetCreateForm();
        resetNewImage(true);
    };

    // ---- グループ画像の選択・編集 ----

    // ファイル選択後、すぐ確定せず編集画面を開く
    const handleFileChange = (event) => {
        const file = event.target.files?.[0];
        // 同じファイルを選び直せるように毎回リセットする
        event.target.value = "";

        if (!file || !file.type.startsWith("image/")) {
            return;
        }

        if (editorSrc) {
            URL.revokeObjectURL(editorSrc);
        }

        setEditorMeta(null);
        setEditorLayout({ tx: 0, ty: 0, zoom: 1 });
        setEditorSrc(URL.createObjectURL(file));
    };

    // 画像読み込み後、トリミング枠いっぱいに収まる倍率を基準にして中央配置する
    const handleEditorImageLoad = () => {
        const img = editorImgRef.current;
        const crop = editorCropRef.current;

        if (!img || !crop) {
            return;
        }

        const cropSize = crop.getBoundingClientRect().width;
        const natW = img.naturalWidth;
        const natH = img.naturalHeight;
        const baseScale = cropSize / Math.min(natW, natH);

        setEditorMeta({ natW, natH, baseScale, cropSize });

        setEditorLayout({
            tx: (cropSize - natW * baseScale) / 2,
            ty: (cropSize - natH * baseScale) / 2,
            zoom: 1,
        });
    };

    // トリミング枠の中心を基準に拡大縮小する
    const applyZoom = (getNextZoom) => {
        const meta = editorMeta;

        if (!meta) {
            return;
        }

        setEditorLayout((prev) => {
            const zoom = Math.min(4, Math.max(1, getNextZoom(prev.zoom)));
            const k1 = meta.baseScale * prev.zoom;
            const k2 = meta.baseScale * zoom;
            const half = meta.cropSize / 2;
            const cx = (half - prev.tx) / k1;
            const cy = (half - prev.ty) / k1;

            return {
                zoom,
                tx: clampOffset(half - cx * k2, meta.cropSize, meta.natW * k2),
                ty: clampOffset(half - cy * k2, meta.cropSize, meta.natH * k2),
            };
        });
    };

    const handleEditorPointerDown = (event) => {
        event.currentTarget.setPointerCapture(event.pointerId);
        pointersRef.current.set(event.pointerId, {
            x: event.clientX,
            y: event.clientY
        });
    };

    const handleEditorPointerMove = (event) => {
        const pointers = pointersRef.current;
        const meta = editorMeta;

        if (!meta || !pointers.has(event.pointerId)) {
            return;
        }

        const prevPoint = pointers.get(event.pointerId);
        const nextPoint = { x: event.clientX, y: event.clientY };
        pointers.set(event.pointerId, nextPoint);

        // 2本指ならピンチで拡大縮小
        if (pointers.size === 2) {
            let other = null;

            for (const [id, point] of pointers) {
                if (id !== event.pointerId) {
                    other = point;
                }
            }

            const prevDist = Math.hypot(prevPoint.x - other.x, prevPoint.y - other.y);
            const nextDist = Math.hypot(nextPoint.x - other.x, nextPoint.y - other.y);

            if (prevDist > 0) {
                applyZoom((prevZoom) => prevZoom * (nextDist / prevDist));
            }

            return;
        }

        // 1本指ならドラッグで位置調整
        const dx = nextPoint.x - prevPoint.x;
        const dy = nextPoint.y - prevPoint.y;

        setEditorLayout((prev) => {
            const k = meta.baseScale * prev.zoom;

            return {
                ...prev,
                tx: clampOffset(prev.tx + dx, meta.cropSize, meta.natW * k),
                ty: clampOffset(prev.ty + dy, meta.cropSize, meta.natH * k),
            };
        });
    };

    const handleEditorPointerUp = (event) => {
        pointersRef.current.delete(event.pointerId);
    };

    // 戻るボタン：編集をキャンセルして作成画面に戻る
    const closeEditor = () => {
        if (editorSrc) {
            URL.revokeObjectURL(editorSrc);
        }

        setEditorSrc(null);
        setEditorMeta(null);
        pointersRef.current.clear();
    };

    // 完了ボタン：表示中の範囲を canvas で切り抜いて File 化する
    const handleEditorConfirm = () => {
        const img = editorImgRef.current;
        const meta = editorMeta;

        if (!img || !meta) {
            return;
        }

        const { tx, ty, zoom } = editorLayout;
        const k = meta.baseScale * zoom;

        const canvas = document.createElement("canvas");
        canvas.width = CROPPED_IMAGE_SIZE;
        canvas.height = CROPPED_IMAGE_SIZE;

        const ctx = canvas.getContext("2d");
        ctx.drawImage(
            img,
            -tx / k,
            -ty / k,
            meta.cropSize / k,
            meta.cropSize / k,
            0,
            0,
            CROPPED_IMAGE_SIZE,
            CROPPED_IMAGE_SIZE
        );

        canvas.toBlob(
            (blob) => {
                if (!blob) {
                    return;
                }

                if (newImagePreview) {
                    URL.revokeObjectURL(newImagePreview);
                }

                croppedImageFileRef.current = new File(
                    [blob],
                    "group_image.jpg",
                    { type: "image/jpeg" }
                );
                setNewImagePreview(URL.createObjectURL(blob));
                closeEditor();
            },
            "image/jpeg",
            0.9
        );
    };

    // 新しい旅行グループをDBに登録し、成功したら一覧の先頭に追加する
    const handleCreateGroup = async (event) => {
        event.preventDefault();

        const name = newName.trim();
        if (!name) {
            return;
        }

        try {
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

            // 未ログインならログインフォームへ強制移動する
            if (response.status === 401) {
                localStorage.removeItem("loginUser");
                navigate("/");
                return;
            }

            const data = await response.json();

            if (data.success && data.group) {
                // トリミング済み画像があればS3へアップロードする（Photos/Upload.php と同じ FormData 方式）
                let cardImage = newImagePreview;
                const imageFile = croppedImageFileRef.current;

                if (imageFile) {
                    try {
                        const formData = new FormData();
                        formData.append("image", imageFile);
                        formData.append("group_id", data.group.id);

                        const uploadResponse = await fetch(
                            "/TABI/api/Groups/UploadImage.php",
                            {
                                method: "POST",
                                credentials: "include",
                                body: formData
                            }
                        );

                        const uploadData = await uploadResponse.json();

                        if (uploadData.success && uploadData.image_url) {
                            cardImage = uploadData.image_url;
                        }
                    } catch {
                        // アップロード失敗時はローカルプレビューをそのまま表示する
                        // （次回一覧取得時にS3画像が無ければデフォルト画像になる）
                    }
                }

                setTravelGroups((prev) => [
                    {
                        ...data.group,
                        image: cardImage ?? null
                    },
                    ...prev
                ]);

                resetCreateForm();
                // プレビューURLはカード表示に使うため解放しない
                resetNewImage(false);
                return;
            }

            alert(data.message ?? "旅行グループの作成に失敗しました。");
        } catch {
            alert("旅行グループの作成に失敗しました。通信環境を確認してください。");
        }
    };

    // 編集画面の画像表示スタイル（メタ情報が揃うまでは非表示）
    const editorImgStyle = editorMeta
        ? {
            width: `${editorMeta.natW * editorMeta.baseScale * editorLayout.zoom}px`,
            transform: `translate(${editorLayout.tx}px, ${editorLayout.ty}px)`,
        }
        : { opacity: 0 };

    return (
        <div className={styles.page}>
            <header className={styles.header}>
                <button
                    type="button"
                    className={styles.logoutButton}
                    onClick={handleLogout}
                    aria-label="ログアウト"
                >
                    <LogoutIcon className={styles.headerIcon} />
                    <span>ログアウト</span>
                </button>

                <h1 className={styles.headerTitle}>TABI</h1>

                <button
                    type="button"
                    className={styles.noticeButton}
                    aria-label="通知"
                >
                    <BellIcon className={styles.headerIcon} />
                </button>
            </header>

            <main className={styles.content}>
                {isLoading ? (
                    <p className={styles.stateMessage}>読み込み中...</p>
                ) : travelGroups.length === 0 ? (
                    <p className={styles.stateMessage}>
                        参加中の旅行グループはありません。<br />
                        右下の＋ボタンから作成できます。
                    </p>
                ) : (
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

            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className={styles.hiddenFileInput}
                onChange={handleFileChange}
                aria-hidden="true"
                tabIndex={-1}
            />

            <Modal isOpen={isCreateOpen} onClose={closeCreateModal}>
                <form className={styles.createForm} onSubmit={handleCreateGroup}>
                    <h2 className={styles.createTitle}>新しい旅行グループ</h2>

                    <div className={styles.imageField}>
                        <span className={styles.imageFieldLabel}>グループ画像</span>

                        <div className={styles.imageRow}>
                            <div className={styles.imagePreview}>
                                {newImagePreview ? (
                                    <img
                                        src={newImagePreview}
                                        alt="グループ画像プレビュー"
                                        className={styles.imagePreviewImg}
                                    />
                                ) : (
                                    <CameraIcon className={styles.imagePlaceholderIcon} />
                                )}
                            </div>

                            <button
                                type="button"
                                className={styles.imageButton}
                                onClick={() => fileInputRef.current?.click()}
                            >
                                {newImagePreview ? "画像を変更" : "画像を追加"}
                            </button>
                        </div>
                    </div>

                    <label className={styles.createLabel}>
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
                            開始日
                            <input
                                type="date"
                                className={styles.createInput}
                                value={newStartDate}
                                onChange={(event) => setNewStartDate(event.target.value)}
                            />
                        </label>

                        <label className={styles.createLabel}>
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
                            キャンセル
                        </button>
                        <button type="submit" className={styles.submitButton}>
                            作成する
                        </button>
                    </div>
                </form>
            </Modal>

            {editorSrc && (
                <div
                    className={styles.editorOverlay}
                    role="dialog"
                    aria-modal="true"
                    aria-label="グループ画像を編集"
                >
                    <div className={styles.editorHeader}>
                        <button
                            type="button"
                            className={styles.editorBackButton}
                            onClick={closeEditor}
                            aria-label="編集をキャンセルして戻る"
                        >
                            <ChevronLeftIcon className={styles.editorBackIcon} />
                        </button>

                        <h2 className={styles.editorTitle}>グループ画像</h2>

                        <span className={styles.editorHeaderSpacer} />
                    </div>

                    <div className={styles.editorStage}>
                        <div
                            className={styles.editorCrop}
                            ref={editorCropRef}
                            onPointerDown={handleEditorPointerDown}
                            onPointerMove={handleEditorPointerMove}
                            onPointerUp={handleEditorPointerUp}
                            onPointerCancel={handleEditorPointerUp}
                        >
                            <img
                                ref={editorImgRef}
                                src={editorSrc}
                                alt=""
                                className={styles.editorImg}
                                style={editorImgStyle}
                                onLoad={handleEditorImageLoad}
                                draggable={false}
                            />
                        </div>
                    </div>

                    <div className={styles.editorSliderRow}>
                        <input
                            type="range"
                            className={styles.editorSlider}
                            min="1"
                            max="4"
                            step="0.01"
                            value={editorLayout.zoom}
                            onChange={(event) => {
                                const nextZoom = Number(event.target.value);
                                applyZoom(() => nextZoom);
                            }}
                            aria-label="拡大縮小"
                        />
                    </div>

                    <div className={styles.editorFooter}>
                        <button
                            type="button"
                            className={styles.editorChangeButton}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            画像を変更
                        </button>

                        <button
                            type="button"
                            className={styles.editorDoneButton}
                            onClick={handleEditorConfirm}
                        >
                            完了
                        </button>
                    </div>
                </div>
            )}

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
