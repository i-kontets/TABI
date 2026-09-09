/**
 * 旅行アルバムの写真や思い出を表示する画面です。
 *
 * 主な流れ:
 * 1. 必要な部品や API 関数を読み込む
 * 2. 画面表示やデータ取得に必要な値を準備する
 * 3. ユーザー操作や API の結果に合わせて表示を更新する
 *
 * 扱うデータ: React の state、props、フォーム入力、API から返ったデータを主に扱います。
 */
import { useState, useContext, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { TripContext } from '../../App';
import BtmNav from '../../components/bottomNav/BottomNav';
import Header from '../../components/header/Header';
import styles from './album.module.css';

const MAX_HASHTAG_COUNT = 5;
const MAX_HASHTAG_LENGTH = 20;

// parseHashtags は、画面操作や API 結果に合わせて必要な処理をまとめた関数です。
const parseHashtags = (value) =>
    String(value || '')
        .replace(/＃/g, '#')
        .replace(/\u3000/g, ' ')
        .split(/\s+/)
        // 配列のデータを1件ずつ画面表示用の形に変換します。
        .map((tag) => tag.replace(/^[#＃]+/, '').trim())
        // 条件に合うデータだけを残して、画面に出す内容を絞り込みます。
        .filter(Boolean);

// formatHashtags は、画面操作や API 結果に合わせて必要な処理をまとめた関数です。
const formatHashtags = (value) => {
    const uniqueTags = [];

    parseHashtags(value).forEach((tag) => {
        const normalizedTag = tag.slice(0, MAX_HASHTAG_LENGTH);
        // ここで条件を確認し、状況に合う処理だけを実行します。
        if (!uniqueTags.includes(normalizedTag) && uniqueTags.length < MAX_HASHTAG_COUNT) {
            uniqueTags.push(normalizedTag);
        }
    });

    // 配列のデータを1件ずつ画面表示用の形に変換します。
    return uniqueTags.map((tag) => `#${tag}`).join(' ');
};

// getHashtagNotice は、画面操作や API 結果に合わせて必要な処理をまとめた関数です。
const getHashtagNotice = (value) => {
    const tags = parseHashtags(value);

    // ここで条件を確認し、状況に合う処理だけを実行します。
    if (tags.some((tag) => tag.length > MAX_HASHTAG_LENGTH)) {
        return `1タグ${MAX_HASHTAG_LENGTH}文字までです`;
    }

    // ここで条件を確認し、状況に合う処理だけを実行します。
    if (tags.length > MAX_HASHTAG_COUNT) {
        return `タグは${MAX_HASHTAG_COUNT}個までです`;
    }

    return '';
};

// truncateHashtagPreview は、画面操作や API 結果に合わせて必要な処理をまとめた関数です。
const truncateHashtagPreview = (value) => {
    const text = String(value || '');
    return text.length > MAX_HASHTAG_LENGTH
        ? `${text.slice(0, MAX_HASHTAG_LENGTH)}...`
        : text;
};

/**
 * Album は、このファイルの中心となる処理をまとめた関数です。
 * 画面から渡された値や API の結果を使い、次に表示する内容を決めます。
 */
function Album() {
    // App.jsxで管理している旅行名を、Context経由で受け取っています。
    const { tripName } = useContext(TripContext);

    // 後で隠れているファイル選択inputを操作するための参照です。
    const fileInputRef = useRef(null);

    // 現在表示している画面を管理します。list: 一覧、detail: 詳細、add: 写真追加。
    const [view, setView] = useState('list');

    // 詳細表示している写真が、photos配列の何番目かを管理します。
    const [selectedIndex, setSelectedIndex] = useState(null);

    // 詳細画面右上のメニューを開いているかどうかです。
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    // アルバムに表示する写真一覧です。
    const [photos, setPhotos] = useState([]);

    // 追加画面で選択済みだが、まだアルバムに追加確定していない写真です。
    const [pendingPhotos, setPendingPhotos] = useState([]);

    // 追加画面でキャプションやハッシュタグを編集している写真のIDです。
    const [activePendingPhotoId, setActivePendingPhotoId] = useState(null);

    // 追加画面で大きくプレビュー表示している写真です。
    const [previewPhoto, setPreviewPhoto] = useState(null);

    const [searchParams] = useSearchParams();
    const groupId = searchParams.get('groupId');

    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const [albumId,setAlbumId] = useState(null);

    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const [uploading, setUploading] = useState(false);

    // 画面が表示された直後や監視している値が変わった時に、必要なデータ取得や初期設定を行います。
    useEffect(() => {
        // ここで条件を確認し、状況に合う処理だけを実行します。
        if (!groupId) return;

        // fetchAlbum は、画面操作や API 結果に合わせて必要な処理をまとめた関数です。
        const fetchAlbum = async () => {
            // API 通信やデータ処理で失敗する可能性があるため、例外を受け取れる形で実行します。
            try {
                // バックエンド API へ通信し、画面で使うデータの取得や保存を依頼します。
                const response = await fetch(
                    `https://genshin.mond.jp/TABI/api/Photos/GetAlbum.php?group_id=${groupId}`
                );

                const data = await response.json();

                // ここで条件を確認し、状況に合う処理だけを実行します。
                if (!data.success) {
                    throw new Error(data.message || 'アルバムの取得に失敗しました');
                }

                setAlbumId(data.album.album_id);
            // エラーが起きた場合は、画面にメッセージを出すなど安全な処理に切り替えます。
            } catch (error) {
                console.error(error);
            }
        };

        fetchAlbum();
    }, [groupId]);


    // DBからアルバム写真を取得します。
    useEffect(() => {
        // ここで条件を確認し、状況に合う処理だけを実行します。
        if (!albumId) return;
        const timerId = window.setTimeout(async () => {
            // API 通信やデータ処理で失敗する可能性があるため、例外を受け取れる形で実行します。
            try {
                // バックエンド API へ通信し、画面で使うデータの取得や保存を依頼します。
                const response = await fetch(
                    `https://genshin.mond.jp/TABI/api/Photos/List.php?album_id=${albumId}`
                );
                const data = await response.json();

                // ここで条件を確認し、状況に合う処理だけを実行します。
                if (!data.success) {
                    throw new Error(data.message || '写真の取得に失敗しました');
                }

                setPhotos(data.photos || []);
            // エラーが起きた場合は、画面にメッセージを出すなど安全な処理に切り替えます。
            } catch (error) {
                console.error(error);
            }
        }, 0);

        return () => window.clearTimeout(timerId);
    }, [albumId]);

    // 追加画面に切り替わったタイミングで、自動的にファイル選択を開きます。
    useEffect(() => {
        // ここで条件を確認し、状況に合う処理だけを実行します。
        if (view !== 'add') return;

        const timerId = window.setTimeout(() => {
            fileInputRef.current?.click();
        }, 0);

        return () => window.clearTimeout(timerId);
    }, [view]);

    // 追加画面の「+」ボタンから、手動でファイル選択を開く処理です。
    const openFilePicker = () => {
        // ここで条件を確認し、状況に合う処理だけを実行します。
        if (!fileInputRef.current) return;
        fileInputRef.current.value = '';
        fileInputRef.current.click();
    };

    // ファイル選択で画像が選ばれたときに呼ばれる処理です。
    const handleFileSelect = (event) => {
        const files = Array.from(event.target.files || []);
        // ここで条件を確認し、状況に合う処理だけを実行します。
        if (files.length === 0) return;

        // 選ばれたFileオブジェクトを、画面表示しやすい写真データの形に変換します。
        const selectedPhotos = files.map((file, index) => ({
            id: `${file.name}-${file.lastModified}-${Date.now()}-${index}-${Math.random()}`,
            src: URL.createObjectURL(file),
            caption: '',
            hashtags: '',
            file,
        }));

        // 新しく選んだ写真を左側に追加して、追加した順番が分かりやすいようにします。
        setPendingPhotos((currentPhotos) => [...selectedPhotos, ...currentPhotos]);
        setActivePendingPhotoId(selectedPhotos[0]?.id || null);
    };

    // 追加前の写真を1枚削除する処理です。
    const removePendingPhoto = (photoId) => {
        setPendingPhotos((currentPhotos) => {
            const targetPhoto = currentPhotos.find((photo) => photo.id === photoId);
            // ここで条件を確認し、状況に合う処理だけを実行します。
            if (targetPhoto) URL.revokeObjectURL(targetPhoto.src);

            // 条件に合うデータだけを残して、画面に出す内容を絞り込みます。
            const nextPhotos = currentPhotos.filter((photo) => photo.id !== photoId);
            setActivePendingPhotoId((currentId) =>
                currentId === photoId ? nextPhotos[0]?.id || null : currentId
            );

            return nextPhotos;
        });

        setPreviewPhoto((currentPhoto) => (currentPhoto?.id === photoId ? null : currentPhoto));
    };

    // 追加予定写真のキャプション入力を更新します。
    const updatePendingPhotoCaption = (photoId, caption) => {
        setPendingPhotos((currentPhotos) =>
            // 配列のデータを1件ずつ画面表示用の形に変換します。
            currentPhotos.map((photo) =>
                photo.id === photoId ? { ...photo, caption } : photo
            )
        );
    };

    // 追加予定写真のハッシュタグ入力を更新します。入力中はIMEを壊さないよう整形しません。
    const updatePendingPhotoHashtags = (photoId, hashtags) => {
        setPendingPhotos((currentPhotos) =>
            // 配列のデータを1件ずつ画面表示用の形に変換します。
            currentPhotos.map((photo) =>
                photo.id === photoId ? { ...photo, hashtags } : photo
            )
        );
    };

    // 入力欄を離れたタイミングで、検索しやすいハッシュタグ形式に整えます。
    const normalizePendingPhotoHashtags = (photoId) => {
        setPendingPhotos((currentPhotos) =>
            // 配列のデータを1件ずつ画面表示用の形に変換します。
            currentPhotos.map((photo) =>
                photo.id === photoId ? { ...photo, hashtags: formatHashtags(photo.hashtags) } : photo
            )
        );
    };

    // 写真追加をキャンセルして一覧画面に戻る処理です。
    const cancelAddPhotos = () => {
        pendingPhotos.forEach((photo) => URL.revokeObjectURL(photo.src));
        setPendingPhotos([]);
        setActivePendingPhotoId(null);
        setPreviewPhoto(null);
        setView('list');
    };

    // 選択中の写真をアルバムに追加確定する処理です。
    const addPendingPhotos = async() => {
        // ここで条件を確認し、状況に合う処理だけを実行します。
        if (pendingPhotos.length === 0) return;

        // ここで条件を確認し、状況に合う処理だけを実行します。
        if(!albumId){
            alert("アルバムIdが取得できていません")
            return;
        }

        //のちにuserIdとる予定
        const userId = 1;

        // API 通信やデータ処理で失敗する可能性があるため、例外を受け取れる形で実行します。
        try{
            setUploading(true);

            for(const photo of pendingPhotos){
                const formData = new FormData();

                formData.append('image',photo.file);
                formData.append('album_id', albumId);
                formData.append('user_id', userId);
                formData.append('caption', photo.caption || '');
                formData.append('shot_at', '');

                // バックエンド API へ通信し、画面で使うデータの取得や保存を依頼します。
                const response = await fetch (
                    'https://genshin.mond.jp/TABI/api/Photos/Upload.php',
                    {
                        method: 'POST',
                        body: formData,
                    }
                );

                const data = await response.json();

                // ここで条件を確認し、状況に合う処理だけを実行します。
                if(!response.ok || !data.success){
                    throw new Error(data.message || '画像アップロードに失敗しました');
                }
            }

                pendingPhotos.forEach((photo) => URL.revokeObjectURL(photo.src));

                setPendingPhotos([]);
                setActivePendingPhotoId(null);
                setPreviewPhoto(null);
                setView('list');

                window.location.reload();

            // エラーが起きた場合は、画面にメッセージを出すなど安全な処理に切り替えます。
            }catch (error){
                console.error(error);
                alert(error.message || '画像アップロードに失敗しました');
            // 成功・失敗に関係なく最後に必要な後片付けを行います。
            }finally{
                setUploading(false)
            } 
    };

    // 一覧の写真を押したとき、詳細画面を開く処理です。
    const handlePhotoClick = (index) => {
        setSelectedIndex(index);
        setIsMenuOpen(false);
        setView('detail');
    };

    // 写真のお気に入り状態を切り替える処理です。
    const toggleFavorite = (photoId) => {
        setPhotos((currentPhotos) =>
            // 配列のデータを1件ずつ画面表示用の形に変換します。
            currentPhotos.map((photo) =>
                photo.id === photoId ? { ...photo, favorite: !photo.favorite } : photo
            )
        );
    };

    // 詳細画面を閉じて、一覧画面へ戻る処理です。
    const closeDetail = () => {
        setIsMenuOpen(false);
        setView('list');
    };

    // 詳細表示中の写真をアルバムから削除する処理です。
    const removeSelectedPhoto = () => {
        // ここで条件を確認し、状況に合う処理だけを実行します。
        if (selectedIndex === null) return;

        const selectedPhoto = photos[selectedIndex];
        // ここで条件を確認し、状況に合う処理だけを実行します。
        if (selectedPhoto?.image_url?.startsWith('blob:')) {
            URL.revokeObjectURL(selectedPhoto.image_url);
        }

        // 条件に合うデータだけを残して、画面に出す内容を絞り込みます。
        setPhotos((currentPhotos) => currentPhotos.filter((_, index) => index !== selectedIndex));
        setSelectedIndex(null);
        setIsMenuOpen(false);
        setView('list');
    };

    // viewがdetailかつ選択されている画像があるなら、投稿詳細風の画面を表示します。
    if (view === 'detail' && selectedIndex !== null) {
        const photo = photos[selectedIndex];
        // ここで条件を確認し、状況に合う処理だけを実行します。
        if (!photo) return null;

        const hashtags = String(photo.hashtags || '');
        // 条件に合うデータだけを残して、画面に出す内容を絞り込みます。
        const hashtagList = hashtags.split(/\s+/).filter(Boolean);
        const isFavorite = Boolean(photo.favorite);
        const uploaderName = String(photo.uploaded_by || photo.uploader || '投稿者不明');
        const locationName = String(photo.place || photo.location || photo.spot_name || '場所未設定');

        return (
            <div className={styles.detailOverlay}>
                <div className={styles.detailHeader}>
                    <button className={styles.closeButton} onClick={closeDetail} aria-label="閉じる">
                        ×
                    </button>
                    <div className={styles.headerCenter}>
                        <p className={styles.albumTitle}>投稿</p>
                        <p className={styles.uploaderName}>{uploaderName}</p>
                    </div>
                    <div className={styles.menuArea}>
                        <button
                            className={styles.menuButton}
                            onClick={() => setIsMenuOpen((current) => !current)}
                            aria-label="写真メニュー"
                            aria-expanded={isMenuOpen}
                        >
                            ⋯
                        </button>
                        {isMenuOpen && (
                            <div className={styles.menuPanel}>
                                <button className={styles.deleteMenuItem} onClick={removeSelectedPhoto}>
                                    アルバムから削除
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                <main className={styles.detailContent}>
                    <div className={styles.postOwner}>
                        <div className={styles.ownerAvatar}>{uploaderName.slice(0, 1)}</div>
                        <div className={styles.ownerText}>
                            <p className={styles.ownerName}>{uploaderName}</p>
                            <p className={styles.ownerLocation}>{locationName}</p>
                        </div>
                    </div>

                    <div className={styles.postImageFrame}>
                        <img
                            className={styles.postImage}
                            src={photo.image_url}
                            alt={photo.caption || 'アルバム写真'}
                        />
                    </div>

                    <div className={styles.postInfo}>
                        <button
                            className={`${styles.favoriteButton} ${isFavorite ? styles.favoriteActive : ''}`}
                            onClick={() => toggleFavorite(photo.id)}
                            aria-label={isFavorite ? 'お気に入りを解除' : 'お気に入りに追加'}
                            aria-pressed={isFavorite}
                        >
                            {isFavorite ? '★' : '☆'}
                        </button>
                        <p className={styles.caption}>
                            <span>{uploaderName}</span>
                            {photo.caption || 'キャプション未設定'}
                        </p>
                        <div className={styles.hashtags}>
                            {hashtagList.length > 0 ? (
                                hashtagList.map((tag) => (
                                    <span key={tag} title={tag}>{truncateHashtagPreview(tag)}</span>
                                ))
                            ) : (
                                <span>#未設定</span>
                            )}
                        </div>
                        <p className={styles.postDate}>{photo.shot_at || '日付未設定'}</p>
                    </div>
                </main>
            </div>
        );
    }

    // viewがaddのときは、写真追加画面を表示します。
    if (view === 'add') {
        const activePendingPhoto =
            pendingPhotos.find((photo) => photo.id === activePendingPhotoId) || pendingPhotos[0] || null;
        const hashtagNotice = activePendingPhoto ? getHashtagNotice(activePendingPhoto.hashtags) : '';

        return (
            <div className={styles.addView}>
                <div className={styles.addHeader}>
                    <button className={styles.addCancelButton} onClick={cancelAddPhotos} aria-label="追加をキャンセル">
                        ×
                    </button>
                    <div className={styles.addTitleGroup}>
                        <p>{tripName || 'アルバム'}</p>
                        <h1>写真を追加</h1>
                    </div>
                    <div className={styles.addActionGroup}>
                        <span className={styles.addCount}>{pendingPhotos.length}</span>
                        <button
                            className={styles.addSubmitButton}
                            onClick={addPendingPhotos}
                            disabled={pendingPhotos.length === 0}
                        >
                            追加
                        </button>
                    </div>
                </div>

                <input
                    ref={fileInputRef}
                    className={styles.hiddenFileInput}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFileSelect}
                />

                <div className={styles.addPostArea}>
                    {pendingPhotos.length > 0 && (
                        <>
                            <div className={styles.pendingCarousel} aria-label="選択した写真">
                                <button className={styles.addMoreSlide} onClick={openFilePicker} type="button" aria-label="写真を追加で選択">
                                    +
                                </button>
                                {pendingPhotos.map((photo) => (
                                    <button
                                        className={`${styles.pendingSlide} ${photo.id === activePendingPhoto?.id ? styles.pendingSlideActive : ''}`}
                                        key={photo.id}
                                        onClick={() => setActivePendingPhotoId(photo.id)}
                                        type="button"
                                        aria-label={`${photo.file.name}を編集`}
                                    >
                                        <img src={photo.src} alt={photo.file.name} />
                                        <span>{pendingPhotos.findIndex((item) => item.id === photo.id) + 1}</span>
                                    </button>
                                ))}
                            </div>
                            <p className={styles.carouselHint}>横にスライドして写真を選択</p>
                        </>
                    )}

                    {activePendingPhoto ? (
                        <div className={styles.addEditPanel}>
                            <div className={styles.activePreview}>
                                <img src={activePendingPhoto.src} alt={activePendingPhoto.file.name} />
                            </div>
                            <label className={styles.addField}>
                                <span>キャプション</span>
                                <textarea
                                    value={activePendingPhoto.caption}
                                    onChange={(event) => updatePendingPhotoCaption(activePendingPhoto.id, event.target.value)}
                                    placeholder="写真の説明を書く"
                                    rows={3}
                                />
                            </label>
                            <label className={styles.addField}>
                                <span>ハッシュタグ</span>
                                <input
                                    type="text"
                                    value={activePendingPhoto.hashtags}
                                    onChange={(event) => updatePendingPhotoHashtags(activePendingPhoto.id, event.target.value)}
                                    onBlur={() => normalizePendingPhotoHashtags(activePendingPhoto.id)}
                                    placeholder="#旅行 #海"
                                />
                                <small className={styles.fieldHelp}>5個まで、1タグ20文字まで</small>
                                {hashtagNotice && <small className={styles.fieldWarning}>{hashtagNotice}</small>}
                            </label>
                            <button
                                className={styles.removeActiveButton}
                                onClick={() => removePendingPhoto(activePendingPhoto.id)}
                                type="button"
                            >
                                この写真を削除
                            </button>
                        </div>
                    ) : (
                        <button className={styles.emptyAddPicker} onClick={openFilePicker} type="button">
                            写真を選択
                        </button>
                    )}
                </div>

                {previewPhoto && (
                    <div className={styles.pendingPreviewOverlay}>
                        <img className={styles.pendingPreviewImage} src={previewPhoto.src} alt={previewPhoto.file.name} />
                        <button
                            className={styles.pendingPreviewCloseButton}
                            onClick={() => setPreviewPhoto(null)}
                            aria-label="プレビューを閉じる"
                        >
                            ×
                        </button>
                    </div>
                )}
            </div>
        );
    }

    // 通常時はアルバム一覧画面を表示します。
    return (
        <div className={styles.page}>
            <Header tripName={tripName} />

            <div className={styles.container}>
                <div className={styles.photoGrid}>
                    {photos.map((photo, index) => (
                        <div
                            key={photo.id}
                            className={styles.photoCard}
                            onClick={() => handlePhotoClick(index)}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(event) => {
                                if (event.key === 'Enter') handlePhotoClick(index);
                            }}
                        >
                            <img src={photo.image_url} alt={photo.caption || 'アルバム写真'} />
                            {photo.favorite && <span className={styles.favoriteBadge}>★</span>}
                        </div>
                    ))}
                </div>
            </div>

            <button className={styles.addButton} onClick={() => setView('add')} aria-label="写真を追加">
                +
            </button>

            <BtmNav />
        </div>
    );
}

export default Album;
