import { useState, useContext, useEffect, useRef } from 'react';
import { TripContext } from '../../App';
import BtmNav from '../../components/bottomNav/BottomNav';
import Header from '../../components/header/Header';
import styles from './album.module.css';

const assetPath = (path) => `${import.meta.env.BASE_URL}${path}`;

const demoPhotos = [
    {
        id: 1,
        src: assetPath('assets/login/sunset.jpg'),
        uploader: 'たろう',
        date: '2026/06/18',
        place: '夕暮れの海辺',
        memo: '日が沈む時間に撮った写真',
    },
    {
        id: 2,
        src: assetPath('assets/login/river.jpg'),
        uploader: 'はなこ',
        date: '2026/06/18',
        place: '川沿い',
        memo: '散歩中に見つけた景色',
    },
    {
        id: 3,
        src: assetPath('assets/login/login_train.jpg'),
        uploader: 'じろう',
        date: '2026/06/18',
        place: '駅',
        memo: '移動中の一枚',
    },
    {
        id: 4,
        src: assetPath('assets/login/login_umi.jpg'),
        uploader: 'たろう',
        date: '2026/06/18',
        place: '海',
        memo: 'アルバム表示のデモ画像',
    },
    {
        id: 5,
        src: assetPath('assets/login/login_road.jpg'),
        uploader: 'はなこ',
        date: '2026/06/18',
        place: '旅先の道',
        memo: '目的地へ向かう途中',
    },
    {
        id: 6,
        src: assetPath('assets/login/night_sky.jpg'),
        uploader: 'じろう',
        date: '2026/06/18',
        place: '夜空',
        memo: '夜の雰囲気確認用',
    },
];

function Album() {
    const { tripName } = useContext(TripContext);
    const fileInputRef = useRef(null);
    const [view, setView] = useState('list');
    const [selectedIndex, setSelectedIndex] = useState(null);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isInfoOpen, setIsInfoOpen] = useState(false);
    const [photos, setPhotos] = useState(demoPhotos);
    const [pendingPhotos, setPendingPhotos] = useState([]);
    const [previewPhoto, setPreviewPhoto] = useState(null);

    useEffect(() => {
        if (view !== 'add') return;

        const timerId = window.setTimeout(() => {
            fileInputRef.current?.click();
        }, 0);

        return () => window.clearTimeout(timerId);
    }, [view]);

    const openFilePicker = () => {
        if (!fileInputRef.current) return;
        fileInputRef.current.value = '';
        fileInputRef.current.click();
    };

    const handleFileSelect = (event) => {
        const files = Array.from(event.target.files || []);
        if (files.length === 0) return;

        const selectedPhotos = files.map((file, index) => ({
            id: `${file.name}-${file.lastModified}-${Date.now()}-${index}-${Math.random()}`,
            src: URL.createObjectURL(file),
            file,
        }));

        setPendingPhotos((currentPhotos) => [...currentPhotos, ...selectedPhotos]);
    };

    const removePendingPhoto = (photoId) => {
        setPendingPhotos((currentPhotos) => {
            const targetPhoto = currentPhotos.find((photo) => photo.id === photoId);
            if (targetPhoto) URL.revokeObjectURL(targetPhoto.src);
            return currentPhotos.filter((photo) => photo.id !== photoId);
        });
        setPreviewPhoto((currentPhoto) => (currentPhoto?.id === photoId ? null : currentPhoto));
    };

    const cancelAddPhotos = () => {
        pendingPhotos.forEach((photo) => URL.revokeObjectURL(photo.src));
        setPendingPhotos([]);
        setPreviewPhoto(null);
        setView('list');
    };

    const addPendingPhotos = () => {
        if (pendingPhotos.length === 0) return;

        const today = new Date().toLocaleDateString('ja-JP');
        const maxPhotoId = photos.reduce((maxId, photo) => Math.max(maxId, photo.id), 0);
        const newPhotos = pendingPhotos.map((photo, index) => ({
            id: maxPhotoId + index + 1,
            src: photo.src,
            uploader: '自分',
            date: today,
            place: '未設定',
            memo: photo.file.name,
        }));

        setPhotos((currentPhotos) => [...newPhotos, ...currentPhotos]);
        setPendingPhotos([]);
        setPreviewPhoto(null);
        setView('list');
    };

    const handlePhotoClick = (index) => {
        setSelectedIndex(index);
        setIsMenuOpen(false);
        setIsInfoOpen(false);
        setView('detail');
    };

    const closeDetail = () => {
        setIsMenuOpen(false);
        setIsInfoOpen(false);
        setView('list');
    };

    const removeSelectedPhoto = () => {
        if (selectedIndex === null) return;

        const selectedPhoto = photos[selectedIndex];
        if (selectedPhoto?.src.startsWith('blob:')) URL.revokeObjectURL(selectedPhoto.src);

        setPhotos((currentPhotos) => currentPhotos.filter((_, index) => index !== selectedIndex));
        setSelectedIndex(null);
        setIsMenuOpen(false);
        setIsInfoOpen(false);
        setView('list');
    };

    if (view === 'detail' && selectedIndex !== null) {
        const photo = photos[selectedIndex];

        if (!photo) return null;

        return (
            <div className={styles.detailOverlay}>
                <img className={styles.fullscreenImage} src={photo.src} alt={`${photo.uploader}の写真`} />

                <div className={styles.detailHeader}>
                    <button className={styles.closeButton} onClick={closeDetail} aria-label="閉じる">
                        ×
                    </button>
                    <div className={styles.headerCenter}>
                        <p className={styles.albumTitle}>
                            {tripName || 'アルバム'} {selectedIndex + 1} / {photos.length}
                        </p>
                        <p className={styles.uploaderName}>{photo.uploader}</p>
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
                                <button
                                    className={styles.menuItem}
                                    onClick={() => {
                                        setIsMenuOpen(false);
                                        setIsInfoOpen(true);
                                    }}
                                >
                                    詳細情報
                                </button>
                                <button className={styles.deleteMenuItem} onClick={removeSelectedPhoto}>
                                    アルバムから削除
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                <button className={styles.imageTapLayer} onClick={() => setIsMenuOpen(false)} aria-label="メニューを閉じる" />

                {isInfoOpen && (
                    <div className={styles.infoPanel}>
                        <div className={styles.infoHeader}>
                            <h2>詳細情報</h2>
                            <button
                                className={styles.infoCloseButton}
                                onClick={() => setIsInfoOpen(false)}
                                aria-label="詳細情報を閉じる"
                            >
                                ×
                            </button>
                        </div>
                        <dl className={styles.infoList}>
                            <div>
                                <dt>投稿者</dt>
                                <dd>{photo.uploader}</dd>
                            </div>
                            <div>
                                <dt>撮影日</dt>
                                <dd>{photo.date}</dd>
                            </div>
                            <div>
                                <dt>場所</dt>
                                <dd>{photo.place}</dd>
                            </div>
                            <div>
                                <dt>メモ</dt>
                                <dd>{photo.memo}</dd>
                            </div>
                            <div>
                                <dt>写真ID</dt>
                                <dd>{photo.id}</dd>
                            </div>
                        </dl>
                    </div>
                )}

                <div className={styles.detailFooter}>
                    <button className={styles.reactionButton}>♡</button>
                    <button className={styles.downloadButton}>↓</button>
                </div>
            </div>
        );
    }

    if (view === 'add') {
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

                <div className={styles.addPhotoGrid}>
                    <button className={styles.addPhotoTile} onClick={openFilePicker} aria-label="写真を選択">
                        +
                    </button>
                    {pendingPhotos.map((photo) => (
                        <div className={styles.pendingPhotoCard} key={photo.id}>
                            <button
                                className={styles.pendingPhotoPreviewButton}
                                onClick={() => setPreviewPhoto(photo)}
                                aria-label={`${photo.file.name}を全体表示`}
                            >
                                <img src={photo.src} alt={photo.file.name} />
                            </button>
                            <button
                                className={styles.removePendingButton}
                                onClick={() => removePendingPhoto(photo.id)}
                                aria-label={`${photo.file.name}を削除`}
                            >
                                ×
                            </button>
                        </div>
                    ))}
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

    return (
        <>
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
                            <img src={photo.src} alt={`${photo.uploader}の写真`} />
                        </div>
                    ))}
                </div>
            </div>

            <button className={styles.addButton} onClick={() => setView('add')} aria-label="写真を追加">
                +
            </button>

            <BtmNav />
        </>
    );
}

export default Album;
