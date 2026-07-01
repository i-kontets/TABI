import { useEffect, useState } from "react";
import "./AlbumPhotos.css";

export default function AlbumPhotos({ albumId }) {
    const [photos, setPhotos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState("");

    useEffect(() => {
        if (!albumId) return;

        const fetchPhotos = async () => {
            try {
                setLoading(true);
                setErrorMessage("");

                const response = await fetch(
                    `https://genshin.mond.jp/TABI/api/Photos/List.php?album_id=${albumId}`
                );

                const data = await response.json();

                if (!data.success) {
                    throw new Error(data.message || "写真一覧の取得に失敗しました");
                }

                setPhotos(data.photos || []);
            } catch (error) {
                setErrorMessage(error.message);
            } finally {
                setLoading(false);
            }
        };

        fetchPhotos();
    }, [albumId]);

    if (loading) {
        return <p>写真を読み込み中...</p>;
    }

    if (errorMessage) {
        return <p>{errorMessage}</p>;
    }

    if (photos.length === 0) {
        return <p>まだ写真がありません。</p>;
    }

    return (
        <div className="photoGrid">
            {photos.map((photo) => (
                <div key={photo.photo_id} className="photoCard">
                    <img
                        src={photo.image_url}
                        alt={photo.caption || "アルバム写真"}
                        className="photoImage"
                    />

                    {photo.caption && (
                        <p className="caption">{photo.caption}</p>
                    )}
                </div>
            ))}
        </div>
    );
}