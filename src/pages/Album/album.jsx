import { useState, useContext, useEffect, useRef } from 'react';
import { TripContext } from '../../App';
import BtmNav from '../../components/bottomNav/BottomNav';
import Header from '../../components/header/Header';
import styles from './album.module.css';

// publicフォルダ配下の画像を、Viteのbase URL込みで参照するための関数です。
const assetPath = (path) => `${import.meta.env.BASE_URL}${path}`;

// 最初から画面に表示しておくデモ用の写真データです。
// 実際にDBから写真を取得するようになったら、この部分はAPIの取得結果に置き換わります。

function Album() {
    // App.jsxで管理している旅行名を、Context経由で受け取っています。
    const { tripName } = useContext(TripContext);

    

    //「後で隠れているファイル選択ボタンを見つけるためのメモ帳を作る」
    const fileInputRef = useRef(null);

    // 現在表示している画面を管理します。list: 一覧、detail: 詳細、add: 写真追加。
    const [view, setView] = useState('list');

    // 詳細表示している写真が、photos配列の何番目かを管理します。
    const [selectedIndex, setSelectedIndex] = useState(null);

    // 詳細画面右上のメニューを開いているかどうかです。
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    // 写真の詳細情報パネルを開いているかどうかです。
    const [isInfoOpen, setIsInfoOpen] = useState(false);

    // アルバムに表示する写真一覧です。
    const [photos, setPhotos] = useState([]);

    // 追加画面で選択済みだが、まだアルバムに追加確定していない写真です。
    const [pendingPhotos, setPendingPhotos] = useState([]);

    // 追加画面で大きくプレビュー表示している写真です。
    const [previewPhoto, setPreviewPhoto] = useState(null);

    const albumId = 1;
    const userId = 1;

    const fetchPhotos = async() => {
        try{
            const response = await fetch(
                `https://genshin.mond.jp/TABI/api/Photos/List.php?album_id=${albumId}`
            );

            const data = await response.json();

            if(!data.success){
                throw new Error(data.message || '写真の取得に失敗しました');
            }

            setPhotos(data.photos || []);
        }catch(error){
            console.error(error);
        }
    };

    useEffect(()=>{
        fetchPhotos();
    },[]);

    // 追加画面に切り替わったタイミングで、ここの処理が動き、fileInputRefに保存してた
    // <input type="file">を.click();されることになるので、自動的にファイル選択を開きます。
    useEffect(() => {
        if (view !== 'add') return;

        const timerId = window.setTimeout(() => {
            fileInputRef.current?.click();
        }, 0);

        return () => window.clearTimeout(timerId);
    }, [view]);

    // 追加画面の「+」ボタンから、手動でファイル選択を開く処理
    //プラスボタンをおすことで、inputがあるかを見に行く、なければ処理終了
    //ある場合は,input内のvalueをリセットし、inputを開く処理
    const openFilePicker = () => {
        if (!fileInputRef.current) return;
        fileInputRef.current.value = '';
        fileInputRef.current.click();
    };

    // ファイル選択で画像が選ばれたときに呼ばれる処理です。
    //選択されたファイルを配列に変換している　もし選択されたファイルがなければ処理はなし
    const handleFileSelect = (event) => {
        const files = Array.from(event.target.files || []);
        if (files.length === 0) return;

        // 選ばれたFileオブジェクトを、画面表示しやすい写真データの形に変換します。
        //fileを含んだ新しいオブジェクトの作成
        const selectedPhotos = files.map((file, index) => ({
            id: `${file.name}-${file.lastModified}-${Date.now()}-${index}-${Math.random()}`,
            //画像データからURLを作成
            src: URL.createObjectURL(file),
            file,
        }));

        // 既に選んでいる写真を残したまま、新しく選んだ写真を後ろに追加します。
        setPendingPhotos((currentPhotos) => [...currentPhotos, ...selectedPhotos]);
    };

    // 追加前の写真を1枚削除する処理です。
    //376行目でphoto.idを引数として持ってきています。
    const removePendingPhoto = (photoId) => {
        //setPedingphotosの中身を更新
        setPendingPhotos((currentPhotos) => {
            //追加予定の画像たち(currentPhotos)から削除予定のやつと同じidのものを探し出し、targetphotoに入れる
            const targetPhoto = currentPhotos.find((photo) => photo.id === photoId);

            // 124行目のcreateObjectURLで作ったtargetPhotoのURLを開放する
            if (targetPhoto) URL.revokeObjectURL(targetPhoto.src);
            //filterを使い追加予定の画像たち(currentPhoto)から削除予定のやつとidが異なったものだけを
            //新しい配列に入れることで実質削除になる returnすることでsetPendingPhotosに自動的に新しく作った配列が入る
            return currentPhotos.filter((photo) => photo.id !== photoId);
        });

        // setPreviewの更新　削除予定の画像のプレビューを開いている場合プレビューから削除する(ほぼ機能しないと思っていい)
        //プレビューを開いている画像のidと削除予定のidが一緒ならnullを返し、違うのであればそのままプレビュー中の画像を返す
        setPreviewPhoto((currentPhoto) => (currentPhoto?.id === photoId ? null : currentPhoto));
    };

    // 写真追加をキャンセルして一覧画面に戻る処理です。
    const cancelAddPhotos = () => {
        //追加予定の画像(pendingPhotos)をforEachで画像すべてのURLを開放
        pendingPhotos.forEach((photo) => URL.revokeObjectURL(photo.src));
        //追加予定の画像用の配列をリセット
        setPendingPhotos([]);
        //プレビューもリセット
        setPreviewPhoto(null);
        //Viewをaddからlistに変更し、画像一覧に戻る
        setView('list');
    };

    // 選択中の写真をアルバムに追加確定する処理です。
    const addPendingPhotos = () => {
        //追加する画像がなければ何もなしで終了
        if (pendingPhotos.length === 0) return;

        //今日の日付を取得
        const today = new Date().toLocaleDateString('ja-JP');
        //今登録されている写真の一番大きいIDを取得
        //maxIdを初手に後ろに書いてある0で初期化
        //photos配列を一つずつ出していきMath.maxでmaxIdとphoto.idを比べて大きいほうの数値を返し、
        //reduceは返された値でmaxIdを上書きしてループを行うため最大値を持ってくることができる
        const maxPhotoId = photos.reduce((maxId, photo) => Math.max(maxId, photo.id), 0);

        // 追加する画像のデータをさらに変更
        //idをすでにある画像からのつづきの番号にするためにmaxPhotoId + index + 1にしている
        const newPhotos = pendingPhotos.map((photo, index) => ({
            id: maxPhotoId + index + 1,
            src: photo.src,
            uploader: '自分',
            date: today,
            place: '未設定',
            memo: photo.file.name,
        }));

        // 新しく追加した写真を、一覧の先頭に表示します。
        //setphotosに選択した画像を追加　追加した画像のほうを先に出すために newPhotosのほうが先に入れる
        setPhotos((currentPhotos) => [...newPhotos, ...currentPhotos]);
        //追加予定用の配列をリセット
        setPendingPhotos([]);
        //追加画像用のプレビューをリセット
        setPreviewPhoto(null);
        //Viewをaddからlistに変更し、画像一覧に画面変更
        setView('list');
    };

    // 一覧の写真を押したとき、詳細画面を開く処理です。
    const handlePhotoClick = (index) => {
        //選択された画像のphoto配列内の要素番号を保存
        setSelectedIndex(index);
        //一覧から画像を押したときに出る三点リーダーを閉じる
        setIsMenuOpen(false);
        //三点リーダー内の詳細情報を閉じる
        setIsInfoOpen(false);
        //viewをaddからdetailに変える 画像詳細に(詳細情報とはべつ)
        setView('detail');
    };

    // 写真のお気に入り状態を切り替える処理です。
    //引数で選択した画像のIdを持ってくる
    const toggleFavorite = (photoId) => {
        //photosを更新します
        setPhotos((currentPhotos) =>
            // mapで新しい配列を作り、対象の写真だけfavoriteを反転します。
            currentPhotos.map((photo) =>
                //お気に入り登録する画像のidとcurrentPhotoのidを見比べて同じIdのものの
                //photoのfovoriteの値を反転させる 違うやつはphotoを返す(そのまま返すってこと)
                photo.id === photoId ? { ...photo, favorite: !photo.favorite } : photo
            )
        );
    };

    // 詳細画面を閉じて、一覧画面へ戻る処理です。
    const closeDetail = () => {
        //三点リーダーを閉じる
        setIsMenuOpen(false);
        //詳細情報を閉じる
        setIsInfoOpen(false);
        //Viewをdetailからlistに変更
        setView('list');
    };

    // 詳細表示中の写真をアルバムから削除する処理です。
    const removeSelectedPhoto = () => {
        //現状ほぼ動くことのないもの 選択された画像の要素数がnullなら終了
        if (selectedIndex === null) return;

        //selectedPhotoに選択された写真の情報を入れる
        const selectedPhoto = photos[selectedIndex];

        // ユーザーが追加した画像の場合は、不要になったURLを解放します。
        //selectedPhotoがNULlじゃなくて、blob:から始まるURLならURLを開放
        if (selectedPhoto?.src.startsWith('blob:')) URL.revokeObjectURL(selectedPhoto.src);

        //削除予定の写真の要素番号とPhotosの写真すべての要素番号を比べ、違ったものだけを集めて新しいPhotosを作る
        setPhotos((currentPhotos) => currentPhotos.filter((_, index) => index !== selectedIndex));
        //削除後はすべてリセットし、写真一覧に戻る
        setSelectedIndex(null);
        setIsMenuOpen(false);
        setIsInfoOpen(false);
        setView('list');
    };

    // viewがdetail()かつ選択されてる画像がNULLじゃないなら
    if (view === 'detail' && selectedIndex !== null) {
        //photoに選択されてる画像の情報を補完
        const photo = photos[selectedIndex];

        // 選択中の写真の要素番号が見つからないなら何もしない
        if (!photo) return null;

        // favoriteは未設定だとundefinedなので、Booleanでtrue/falseにそろえています。
        const isFavorite = Boolean(photo.favorite);

        return (
            <div className={styles.detailOverlay}>
                {/* 詳細画面で画像です　photoには選択された画像の情報が入っているので、そこからurlやその他の情報を持ってこれます*/}
                <img className={styles.fullscreenImage} src={photo.src} alt={`${photo.uploader}の写真`} />

                {/* 詳細画面上部の戻るボタン、タイトル、メニューです。 */}
                <div className={styles.detailHeader}>
                    {/*/Closeボタンが押されたら226行目のcloseDetail関数を実行*/}
                    <button className={styles.closeButton} onClick={closeDetail} aria-label="閉じる">
                        ×
                    </button>
                    <div className={styles.headerCenter}>
                        <p className={styles.albumTitle}>
                            {/*tripNameがあればtripNameをなければアルバム表示 selectedIndexとphotos.lengthで何枚目/画像数 を表示*/}
                            {tripName || 'アルバム'} {selectedIndex + 1} / {photos.length}
                        </p>
                        {/*画像を上げた人の名前 */}
                        <p className={styles.uploaderName}>{photo.uploader}</p>
                    </div>
                    <div className={styles.menuArea}>
                        {/*三点リーダーを押したときに開いたり閉じたりする処理 */}
                        <button
                            className={styles.menuButton}
                            onClick={() => setIsMenuOpen((current) => !current)}
                            aria-label="写真メニュー"
                            aria-expanded={isMenuOpen}
                        >
                            ⋯
                        </button>
                        {/* isMenuOpenがtrueのときだけメニューを表示します。 */}
                        {isMenuOpen && (
                            <div className={styles.menuPanel}>
                                <button
                                    className={styles.menuItem}
                                    //詳細情報を押したときの処理
                                    onClick={() => {
                                        setIsMenuOpen(false);
                                        setIsInfoOpen(true);
                                    }}
                                >
                                    詳細情報
                                </button>
                                    {/* アルバムから削除を押したときの処理  removeSelectedPhoto関数を呼ぶ */}
                                <button className={styles.deleteMenuItem} onClick={removeSelectedPhoto}>
                                    アルバムから削除
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* 画像部分をタップしたとき、開いているメニューだけ閉じるための透明ボタンです。 */}
                <button className={styles.imageTapLayer} onClick={() => setIsMenuOpen(false)} aria-label="メニューを閉じる" />

                {/* isInfoOpenがtrueのときだけ詳細情報パネルを表示します。 */}
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

                {/* 詳細画面下部のアクションボタンです。 */}
                <div className={styles.detailFooter}>
                    <button
                        //お気に入りなら favoriteActive を追加違うなら何も追加しない
                        className={`${styles.reactionButton} ${isFavorite ? styles.favoriteActive : ''}`}
                        //選択された画像のお気に入りの切り替え
                        onClick={() => toggleFavorite(photo.id)}
                        aria-label={isFavorite ? 'お気に入りを解除' : 'お気に入りに追加'}
                        aria-pressed={isFavorite}
                    >
                        {/*isFavoriteがtrueなら★ falseなら☆ */}
                        {isFavorite ? '★' : '☆'}
                    </button>
                    <button className={styles.downloadButton}>↓</button>
                </div>
            </div>
        );
    }

    // viewがaddのときは、写真追加画面を表示します。
    if (view === 'add') {
        return (
            <div className={styles.addView}>
                {/* 追加画面のヘッダーです。キャンセル、タイトル、追加ボタンがあります。 */}
                <div className={styles.addHeader}>
                    {/*153行目の追加をキャンセルする機能を実行*/}
                    <button className={styles.addCancelButton} onClick={cancelAddPhotos} aria-label="追加をキャンセル">
                        ×
                    </button>
                    <div className={styles.addTitleGroup}>
                        <p>{tripName || 'アルバム'}</p>
                        <h1>写真を追加</h1>
                    </div>
                    <div className={styles.addActionGroup}>
                        {/*現在追加される予定の写真の枚数の表示 */}
                        <span className={styles.addCount}>{pendingPhotos.length}</span>
                        <button
                            className={styles.addSubmitButton}
                            /*ボタンが押されたら165行目のaddPendingPhotosを実行*/
                            onClick={addPendingPhotos}
                            /*もし追加予定の画像が一つも選択されていない場合ボタンを押せなくする*/
                            disabled={pendingPhotos.length === 0}
                        >
                            追加
                        </button>
                    </div>
                </div>

                {/* 実際のファイル選択inputです。画面には出さず、ボタンからクリックします。 */}
                <input
                    /*ここでこれを宣言することでこのinputをfileInputRefで操作できるようにする*/
                    ref={fileInputRef}
                    className={styles.hiddenFileInput}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFileSelect}
                />

                {/* 追加前の写真一覧です。先頭の+からさらに写真を選べます。 */}
                <div className={styles.addPhotoGrid}>
                    {/*openFilePickerを実行し、ファイル選択画面を開く */}
                    <button className={styles.addPhotoTile} onClick={openFilePicker} aria-label="写真を選択">
                        +
                    </button>
                    {/*追加予定も画像を一枚ずつ表示する */}
                    {pendingPhotos.map((photo) => (
                        <div className={styles.pendingPhotoCard} key={photo.id}>
                            {/* サムネイルを押すと、その写真を大きくプレビューします。 */}
                            <button
                                className={styles.pendingPhotoPreviewButton}
                                onClick={() => setPreviewPhoto(photo)}
                                aria-label={`${photo.file.name}を全体表示`}
                            >
                                <img src={photo.src} alt={photo.file.name} />
                            </button>
                            {/* 追加前の写真を1枚削除します。 */}
                            <button
                                className={styles.removePendingButton}
                                //追加画像の写真を消すためにremovePendingPhotoを使う 
                                onClick={() => removePendingPhoto(photo.id)}
                                aria-label={`${photo.file.name}を削除`}
                            >
                                ×
                            </button>
                        </div>
                    ))}
                </div>

                {/* previewPhotoがあるときだけ、追加前写真の大きいプレビューを表示します。 */}
                {previewPhoto && (
                    <div className={styles.pendingPreviewOverlay}>
                        <img className={styles.pendingPreviewImage} src={previewPhoto.src} alt={previewPhoto.file.name} />
                        <button
                            className={styles.pendingPreviewCloseButton}
                            //プレビューを閉じるためにプレビューにnullを代入 
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
        <>
            <Header tripName={tripName} />

            <div className={styles.container}>
                <div className={styles.photoGrid}>
                    {/* photos配列をmapで回して、写真カードを1枚ずつ表示します。 */}
                    {photos.map((photo, index) => (
                        <div
                            key={photo.id}
                            className={styles.photoCard}
                            //画像をクリックしたらhandlePhotoClickが機能し、画像詳細画面に切り替わる
                            onClick={() => handlePhotoClick(index)}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(event) => {
                                if (event.key === 'Enter') handlePhotoClick(index);
                            }}
                        >
                            <img src={photo.image_url} alt={`${photo.uploader}の写真`} />
                            {/* favoriteがtrueの写真だけ、一覧右上に星を表示します。 */}
                            {photo.favorite && <span className={styles.favoriteBadge}>★</span>}
                        </div>
                    ))}
                </div>
            </div>

            {/* 一覧右下の写真追加ボタンです。押すとviewをaddに切り替えます。 */}
            <button className={styles.addButton} onClick={() => setView('add')} aria-label="写真を追加">
                +
            </button>

            <BtmNav />
        </>
    );
}

export default Album;
