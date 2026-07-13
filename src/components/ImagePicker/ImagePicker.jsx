import { useRef, useState } from 'react';
import styles from './ImagePicker.module.css';

// 切り抜き後に書き出す画像の幅（px）です。
// 高さは切り抜き枠の縦横比（aspectRatio）から自動で決まります。
const CROPPED_IMAGE_WIDTH = 700;

// Home画面カードの画像（140×110）と同じ縦横比です。
const DEFAULT_ASPECT_RATIO = 140 / 110;

// 画像をドラッグしたとき、切り抜き枠からはみ出さないように移動量を制限します。
// cropSize は枠の大きさ、dispSize は実際に表示している画像サイズです。
const clampOffset = (value, cropSize, dispSize) =>
    Math.min(0, Math.max(cropSize - dispSize, value));

// ここから下は、このコンポーネント内で使うアイコンを SVG で直接定義しています。
// 画像ファイルを別で用意せず、表示に必要な見た目をこの中で完結させます。
function CameraIcon({ className }) {
    return (
        <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 8h3l2-2h6l2 2h3v11H4V8Z" />
            <circle cx="12" cy="13" r="3.5" />
        </svg>
    );
}

// 左向きの矢印アイコンです。
// 編集画面の「戻る」ボタンに使います。
function ChevronLeftIcon({ className }) {
    return (
        <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
            <path d="m15 5-7 7 7 7" />
        </svg>
    );
}

// ImagePicker は、画像を選ぶ・編集する・切り抜く・親へ返す、までをまとめた部品です。
// 親コンポーネントは value と onChange を渡すだけで、画像選択 UI を再利用できます。
function ImagePicker({
    label = "画像",
    value = null,
    onChange,
    fileName = "image.jpg",
    // 切り抜き枠の縦横比（幅 ÷ 高さ）。既定は Home カード画像と同じ長方形です。
    aspectRatio = DEFAULT_ASPECT_RATIO,
    editorTitle = label,
    previewAlt = "画像プレビュー",
    addLabel = "画像を追加",
    changeLabel = "画像を変更",
    doneLabel = "完了",
}) {
    // editorSrc は編集画面に表示する一時的な画像 URL です。
    // editorLayout は画像の移動量と拡大率を表し、どこを切り抜くかを決めます。
    // editorMeta は元画像の実寸など、切り抜き計算に必要な情報を保持します。
    const [editorSrc, setEditorSrc] = useState(null);
    const [editorLayout, setEditorLayout] = useState({ tx: 0, ty: 0, zoom: 1 });
    const [editorMeta, setEditorMeta] = useState(null);

    // ファイル選択ダイアログを開くための参照です。
    const fileInputRef = useRef(null);
    // 画像の実寸を読むための参照です。
    const editorImgRef = useRef(null);
    // 切り抜き枠の大きさを測るための参照です。
    const editorCropRef = useRef(null);
    // ドラッグやピンチ操作で触っているポインタ位置を記録します。
    const pointersRef = useRef(new Map());

    // 親から渡された画像のプレビュー URL をそのまま表示に使います。
    const previewUrl = value?.previewUrl ?? null;

    // ファイル選択後の処理です。
    // 画像以外をはじき、選んだ画像を編集画面で開けるようにします。
    const handleFileChange = (event) => {
        const file = event.target.files?.[0];
        // 同じファイルを選び直せるよう、入力値は毎回リセットします。
        event.target.value = "";

        if (!file || !file.type.startsWith("image/")) {
            // 画像以外は受け付けません。
            return;
        }

        if (editorSrc) {
            // 既に別画像を編集中なら、古い一時 URL を解放します。
            URL.revokeObjectURL(editorSrc);
        }

        // 新しい画像を開く前に、編集用の情報を初期化します。
        setEditorMeta(null);
        setEditorLayout({ tx: 0, ty: 0, zoom: 1 });
        // 選んだ画像を一時 URL に変換して、編集画面で表示します。
        setEditorSrc(URL.createObjectURL(file));
    };

    // 画像が読み込まれたあとに、切り抜き枠へ収まる初期位置を計算します。
    // 短辺を枠いっぱいに合わせ、中央寄せの状態から編集を始めます。
    const handleEditorImageLoad = () => {
        const img = editorImgRef.current;
        const crop = editorCropRef.current;

        if (!img || !crop) {
            // 要素がまだ取れない場合は、計算できないので何もしません。
            return;
        }

        // 実際に画面へ出ている切り抜き枠の幅と高さを測ります（長方形対応）。
        const rect = crop.getBoundingClientRect();
        const cropW = rect.width;
        const cropH = rect.height;
        const natW = img.naturalWidth;
        const natH = img.naturalHeight;
        // 長方形の枠全体を画像が覆うよう、基準倍率を計算します（cover 相当）。
        const baseScale = Math.max(cropW / natW, cropH / natH);

        // 元画像サイズと基準倍率を保存し、以後のドラッグやズーム計算に使います。
        setEditorMeta({ natW, natH, baseScale, cropW, cropH });
        // 画像が中央に来るように初期オフセットを設定します。
        setEditorLayout({
            tx: (cropW - natW * baseScale) / 2,
            ty: (cropH - natH * baseScale) / 2,
            zoom: 1,
        });
    };

    // ズーム倍率が変わったとき、見ている中心位置が大きくずれないように再計算します。
    const applyZoom = (getNextZoom) => {
        const meta = editorMeta;

        if (!meta) {
            // 画像メタ情報がなければ、ズーム計算はできません。
            return;
        }

        setEditorLayout((prev) => {
            // ズームは 1 倍から 4 倍までに制限します。
            const zoom = Math.min(4, Math.max(1, getNextZoom(prev.zoom)));
            const k1 = meta.baseScale * prev.zoom;
            const k2 = meta.baseScale * zoom;
            const halfW = meta.cropW / 2;
            const halfH = meta.cropH / 2;
            // 現在の表示中心が、元画像上のどの位置を見ているかを計算します。
            const cx = (halfW - prev.tx) / k1;
            const cy = (halfH - prev.ty) / k1;

            return {
                zoom,
                // 拡大後も同じ中心位置を保つように、移動量を再計算します。
                tx: clampOffset(halfW - cx * k2, meta.cropW, meta.natW * k2),
                ty: clampOffset(halfH - cy * k2, meta.cropH, meta.natH * k2),
            };
        });
    };

    // ポインタが押されたら、その指やマウスを追跡対象として記録します。
    const handleEditorPointerDown = (event) => {
        event.currentTarget.setPointerCapture(event.pointerId);
        pointersRef.current.set(event.pointerId, {
            x: event.clientX,
            y: event.clientY
        });
    };

    // ポインタが動いたら、ドラッグ移動かピンチズームかを判定して反映します。
    const handleEditorPointerMove = (event) => {
        const pointers = pointersRef.current;
        const meta = editorMeta;

        if (!meta || !pointers.has(event.pointerId)) {
            // 画像情報が無い、または追跡対象でない指なら何もしません。
            return;
        }

        const prevPoint = pointers.get(event.pointerId);
        const nextPoint = { x: event.clientX, y: event.clientY };
        pointers.set(event.pointerId, nextPoint);

        // 2本指なら、指同士の距離変化を使ってピンチズームします。
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

        // 1本指なら、動いた分だけ画像を平行移動します。
        const dx = nextPoint.x - prevPoint.x;
        const dy = nextPoint.y - prevPoint.y;

        setEditorLayout((prev) => {
            const k = meta.baseScale * prev.zoom;

            return {
                ...prev,
                tx: clampOffset(prev.tx + dx, meta.cropW, meta.natW * k),
                ty: clampOffset(prev.ty + dy, meta.cropH, meta.natH * k),
            };
        });
    };

    // ポインタを離したら、その指の記録を消します。
    const handleEditorPointerUp = (event) => {
        pointersRef.current.delete(event.pointerId);
    };

    // 編集をやめて、元の選択画面へ戻ります。
    const closeEditor = () => {
        if (editorSrc) {
            // 一時 URL は使い終わるので解放します。
            URL.revokeObjectURL(editorSrc);
        }

        setEditorSrc(null);
        setEditorMeta(null);
        pointersRef.current.clear();
    };

    // 編集画面で見えている範囲を、枠と同じ縦横比の長方形画像として切り抜きます。
    // 切り抜いた結果は File にして、親コンポーネントへ返します。
    const handleEditorConfirm = () => {
        const img = editorImgRef.current;
        const meta = editorMeta;

        if (!img || !meta) {
            // 画像が読み込まれていなければ、まだ切り抜きはできません。
            return;
        }

        const { tx, ty, zoom } = editorLayout;
        const k = meta.baseScale * zoom;

        // 書き出しサイズは幅を固定し、高さは枠の縦横比から求めます。
        const outputWidth = CROPPED_IMAGE_WIDTH;
        const outputHeight = Math.round(outputWidth * meta.cropH / meta.cropW);

        // canvas を使って、切り抜き結果を画像として書き出します。
        const canvas = document.createElement("canvas");
        canvas.width = outputWidth;
        canvas.height = outputHeight;

        const ctx = canvas.getContext("2d");
        // 今見えている範囲を、元画像から長方形で切り抜きます。
        ctx.drawImage(
            img,
            -tx / k,
            -ty / k,
            meta.cropW / k,
            meta.cropH / k,
            0,
            0,
            outputWidth,
            outputHeight
        );

        canvas.toBlob(
            (blob) => {
                if (!blob) {
                    return;
                }

                onChange?.({
                    file: new File([blob], fileName, { type: "image/jpeg" }),
                    previewUrl: URL.createObjectURL(blob),
                });
                closeEditor();
            },
            "image/jpeg",
            0.9
        );
    };

    // 編集中の画像を描画するための style を計算します。
    // 実寸が分かるまでは非表示にして、ちらつきを防ぎます。
    const editorImgStyle = editorMeta
        ? {
            width: `${editorMeta.natW * editorMeta.baseScale * editorLayout.zoom}px`,
            transform: `translate(${editorLayout.tx}px, ${editorLayout.ty}px)`,
        }
        : { opacity: 0 };

    return (
        <>
            {/* 画面には見せず、ファイル選択ダイアログを開くためだけに置いている input です。 */}
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className={styles.hiddenFileInput}
                onChange={handleFileChange}
                aria-hidden="true"
                tabIndex={-1}
            />

            {/* 画像のプレビューと「追加」「変更」ボタンを表示する欄です。 */}
            <div className={styles.field}>
                <span className={styles.fieldLabel}>{label}</span>

                <div className={styles.row}>
                    {/* 親から渡されたプレビュー画像を表示します。 */}
                    <div className={styles.preview}>
                        {previewUrl ? (
                            <img
                                src={previewUrl}
                                alt={previewAlt}
                                className={styles.previewImg}
                            />
                        ) : (
                            // まだ画像がないときは、カメラアイコンで「未選択」を示します。
                            <CameraIcon className={styles.placeholderIcon} />
                        )}
                    </div>

                    {/* ここを押すとファイル選択ダイアログが開きます。 */}
                    <button
                        type="button"
                        className={styles.button}
                        onClick={() => fileInputRef.current?.click()}
                    >
                        {previewUrl ? changeLabel : addLabel}
                    </button>
                </div>
            </div>

            {/* 画像が選ばれている間だけ、切り抜き編集画面を表示します。 */}
            {editorSrc && (
                <div
                    className={styles.editorOverlay}
                    role="dialog"
                    aria-modal="true"
                    aria-label={editorTitle}
                >
                    {/* 編集画面の上部。戻るボタンとタイトルを配置します。 */}
                    <div className={styles.editorHeader}>
                        <button
                            type="button"
                            className={styles.editorBackButton}
                            onClick={closeEditor}
                            aria-label="編集をキャンセルして戻る"
                        >
                            <ChevronLeftIcon className={styles.editorBackIcon} />
                        </button>

                        <h2 className={styles.editorTitle}>{editorTitle}</h2>

                        <span className={styles.editorHeaderSpacer} />
                    </div>

                    {/* ここが画像を実際に切り抜く作業領域です。 */}
                    <div className={styles.editorStage}>
                        <div
                            className={styles.editorCrop}
                            style={{ aspectRatio }}
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

                    {/* スライダーで拡大縮小を操作します。 */}
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

                    {/* 下部には画像変更と確定ボタンを置きます。 */}
                    <div className={styles.editorFooter}>
                        <button
                            type="button"
                            className={styles.editorChangeButton}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            {changeLabel}
                        </button>

                        <button
                            type="button"
                            className={styles.editorDoneButton}
                            onClick={handleEditorConfirm}
                        >
                            {doneLabel}
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}

export default ImagePicker;
