import { useContext, useEffect, useState } from 'react';
import { TripContext } from '../../App';
import BtmNav from '../../components/bottomNav/BottomNav';
import Header from '../../components/header/Header';

function Album() {
    const { tripName } = useContext(TripContext);

    const [photos, setPhotos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState('');
    const [selectedFile, setSelectedFile] = useState(null);
    const [caption, setCaption] = useState('');
    const [uploading, setUploading] = useState(false);

    const albumId = 1;
    const userId = 1;

    const fetchPhotos = async () => {
        try {
            setLoading(true);
            setErrorMessage('');

            const response = await fetch(
                `https://genshin.mond.jp/TABI/api/Photos/List.php?album_id=${albumId}`
            );

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.message || '写真一覧の取得に失敗しました');
            }

            setPhotos(data.photos || []);
        } catch (error) {
            console.error(error);
            setErrorMessage(error.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPhotos();
    }, []);

    const handleUpload = async () => {
        if (!selectedFile) {
            alert('画像を選択してください');
            return;
        }

        try {
            setUploading(true);

            const formData = new FormData();
            formData.append('image', selectedFile);
            formData.append('album_id', albumId);
            formData.append('user_id', userId);
            formData.append('caption', caption);
            formData.append('shot_at', '');

            const response = await fetch(
                'https://genshin.mond.jp/TABI/api/Photos/Upload.php',
                {
                    method: 'POST',
                    body: formData,
                }
            );

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.message || '画像アップロードに失敗しました');
            }

            setSelectedFile(null);
            setCaption('');

            await fetchPhotos();
        } catch (error) {
            console.error(error);
            alert(error.message);
        } finally {
            setUploading(false);
        }
    };

    return (
        <>
            <Header tripName={tripName} />

            <main style={{ padding: '10px', paddingBottom: '80px' }}>
                <div
                    style={{
                        backgroundColor: '#fff',
                        borderRadius: '12px',
                        padding: '12px',
                        marginBottom: '12px',
                        border: '1px solid #eee',
                    }}
                >
                    <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    />

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

                {loading && (
                    <p style={{ padding: '16px', textAlign: 'center' }}>
                        写真を読み込み中...
                    </p>
                )}

                {!loading && errorMessage && (
                    <p style={{ padding: '16px', color: 'red', textAlign: 'center' }}>
                        {errorMessage}
                    </p>
                )}

                {!loading && !errorMessage && photos.length === 0 && (
                    <p style={{ padding: '16px', textAlign: 'center' }}>
                        まだ写真がありません。
                    </p>
                )}

                {!loading && !errorMessage && photos.length > 0 && (
                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                            gap: '10px',
                        }}
                    >
                        {photos.map((photo) => (
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
                                    src={photo.image_url}
                                    alt={photo.caption || 'アルバム写真'}
                                    style={{
                                        width: '100%',
                                        height: '100%',
                                        objectFit: 'cover',
                                        display: 'block',
                                    }}
                                />

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