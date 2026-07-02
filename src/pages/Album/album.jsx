import { useContext, useEffect, useState } from 'react';
import { TripContext } from '../../App';
import BtmNav from '../../components/bottomNav/BottomNav';
import Header from '../../components/header/Header';

function Album() {
    // 画面上部のヘッダー表示に使う旅行名を Context から受け取る。
    const { tripName } = useContext(TripContext);

    // 写真一覧、読み込み状態、エラー、アップロードフォームの入力値をまとめて保持する。
    const [photos, setPhotos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState('');
    const [selectedFile, setSelectedFile] = useState(null);
    const [caption, setCaption] = useState('');
    const [uploading, setUploading] = useState(false);

    // このアルバム画面では固定値を使っている。実運用ではログインユーザーや選択中アルバムに置き換わる想定。
    const albumId = 1;
    const userId = 1;

    // アルバムIDに紐づく写真一覧を取得し、画面に反映する共通処理。
    const fetchPhotos = async () => {
        try {
            // 読み込み開始時はローディング表示に切り替え、既存のエラーは消す。
            setLoading(true);
            setErrorMessage('');

            // 写真一覧 API に album_id を指定して問い合わせる。
            const response = await fetch(
                `https://genshin.mond.jp/TABI/api/Photos/List.php?album_id=${albumId}`
            );

            // API の JSON を取り出して、success の結果を確認する。
            const data = await response.json();

            // 失敗扱いなら API メッセージを優先して例外化する。
            if (!data.success) {
                throw new Error(data.message || '写真一覧の取得に失敗しました');
            }

            // 取得できた写真データが空でも一覧として扱えるように配列へ格納する。
            setPhotos(data.photos || []);
        } catch (error) {
            // コンソールにも残しておくと、開発時の原因調査がしやすい。
            console.error(error);
            setErrorMessage(error.message);
        } finally {
            // 成功・失敗に関わらず、処理終了後はローディングを解除する。
            setLoading(false);
        }
    };

    useEffect(() => {
        // 初回表示時に一覧を取得する。依存配列が空なのでマウント時に 1 回だけ実行される。
        fetchPhotos();
    }, []);

    // 画像ファイルを選んでアップロードし、成功後に一覧を再取得する。
    const handleUpload = async () => {
        // ファイル未選択のまま送信しないように、先に入力チェックを行う。
        if (!selectedFile) {
            alert('画像を選択してください');
            return;
        }

        try {
            // アップロード中の二重送信を防ぐため、ボタンを無効化する。
            setUploading(true);

            // ファイル、アルバムID、投稿者ID、キャプションなどを multipart/form-data で送る。
            const formData = new FormData();
            formData.append('image', selectedFile);
            formData.append('album_id', albumId);
            formData.append('user_id', userId);
            formData.append('caption', caption);
            formData.append('shot_at', '');

            // 画像アップロード API に POST で送信する。
            const response = await fetch(
                'https://genshin.mond.jp/TABI/api/Photos/Upload.php',
                {
                    method: 'POST',
                    body: formData,
                }
            );

            // レスポンスを JSON として受け取り、成功可否を確認する。
            const data = await response.json();

            // 失敗時は API のメッセージを優先して例外を出す。
            if (!data.success) {
                throw new Error(data.message || '画像アップロードに失敗しました');
            }

            // 成功後は入力欄を初期状態に戻す。
            setSelectedFile(null);
            setCaption('');

            // 追加した写真をすぐ一覧へ反映するため、再取得する。
            await fetchPhotos();
        } catch (error) {
            // アップロード失敗時はユーザーに原因を通知する。
            console.error(error);
            alert(error.message);
        } finally {
            // 処理が終わったらアップロード中状態を解除する。
            setUploading(false);
        }
    };

    return (
        <>
            {/* 画面上部の共通ヘッダー。旅行名を渡してページの文脈を表示する。 */}
            <Header tripName={tripName} />

            {/* 下部ナビゲーションに被らないよう、下に余白を取ったメイン領域。 */}
            <main style={{ padding: '10px', paddingBottom: '80px' }}>
                {/* 写真アップロード用の入力エリア。ファイル選択とキャプション入力をまとめている。 */}
                <div
                    style={{
                        backgroundColor: '#fff',
                        borderRadius: '12px',
                        padding: '12px',
                        marginBottom: '12px',
                        border: '1px solid #eee',
                    }}
                >
                    {/* 画像ファイルのみ受け付ける。選択結果は state に保存する。 */}
                    <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    />

                    {/* 写真に添える短い説明文。未入力でも送信できる。 */}
                    <input
                        type="text"
                        value={caption}
                        placeholder="キャプション"
                        onChange={(e) => setCaption(e.target.value)}
                        style={{
                            width: '100%',
                            marginTop: '8px',
                            padding: '8px',
                            borderRadius: '8px',
                            border: '1px solid #ddd',
                        }}
                    />

                    {/* 送信ボタン。アップロード中は連打できないようにする。 */}
                    <button
                        type="button"
                        onClick={handleUpload}
                        disabled={uploading}
                        style={{
                            width: '100%',
                            marginTop: '8px',
                            padding: '10px',
                            borderRadius: '8px',
                            border: 'none',
                            backgroundColor: '#4f63a5',
                            color: '#fff',
                            fontWeight: 'bold',
                        }}
                    >
                        {uploading ? 'アップロード中...' : '画像をアップロード'}
                    </button>
                </div>

                {/* 一覧取得中は、結果一覧の代わりに読み込みメッセージを表示する。 */}
                {loading && (
                    <p style={{ padding: '16px', textAlign: 'center' }}>
                        写真を読み込み中...
                    </p>
                )}

                {/* 取得失敗時はエラーメッセージを中央寄せで見せる。 */}
                {!loading && errorMessage && (
                    <p style={{ padding: '16px', color: 'red', textAlign: 'center' }}>
                        {errorMessage}
                    </p>
                )}

                {/* 写真が 0 件なら空状態の案内だけを出す。 */}
                {!loading && !errorMessage && photos.length === 0 && (
                    <p style={{ padding: '16px', textAlign: 'center' }}>
                        まだ写真がありません。
                    </p>
                )}

                {/* 1 件以上ある場合は、2 列グリッドで写真カードを並べる。 */}
                {!loading && !errorMessage && photos.length > 0 && (
                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                            gap: '10px',
                        }}
                    >
                        {photos.map((photo) => (
                            // 1 枚ごとに画像カードを作り、下部にキャプションを重ねる。
                            <div
                                key={photo.photo_id}
                                style={{
                                    border: '1px solid #eee',
                                    backgroundColor: '#fff',
                                    borderRadius: '10px',
                                    height: '200px',
                                    overflow: 'hidden',
                                    position: 'relative',
                                }}
                            >
                                <img
                                    // image_url をそのまま表示し、文字があれば代替テキストに使う。
                                    src={photo.image_url}
                                    alt={photo.caption || 'アルバム写真'}
                                    style={{
                                        width: '100%',
                                        height: '100%',
                                        objectFit: 'cover',
                                        display: 'block',
                                    }}
                                />

                                {/* キャプションがある写真だけ、下部に読みやすい帯を重ねる。 */}
                                {photo.caption && (
                                    <div
                                        style={{
                                            position: 'absolute',
                                            left: 0,
                                            right: 0,
                                            bottom: 0,
                                            padding: '8px',
                                            fontSize: '12px',
                                            color: '#fff',
                                            background:
                                                'linear-gradient(transparent, rgba(0,0,0,0.65))',
                                        }}
                                    >
                                        {photo.caption}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </main>

            <BtmNav />
        </>
    );
}

export default Album;