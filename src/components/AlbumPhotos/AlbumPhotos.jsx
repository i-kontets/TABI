import { useEffect, useState } from "react";
import "./AlbumPhotos.css";

export default function AlbumPhotos({ albumId }) {
    // アルバム内の写真一覧、読み込み状態、エラー文言をまとめて管理する。
    const [photos, setPhotos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState("");

    useEffect(() => {
        // albumId が未設定なら API を呼ばず、初期表示のまま終了する。
        if (!albumId) return;

        // アルバムIDに紐づく写真一覧を API から取得する処理を切り出している。
        const fetchPhotos = async () => {
            try {
                // 取得開始時はいったん読み込み中にして、前回のエラー表示は消す。
                setLoading(true);
                setErrorMessage("");

                // 写真一覧 API に album_id を付けて問い合わせる。
                const response = await fetch(
                    `https://genshin.mond.jp/TABI/api/Photos/List.php?album_id=${albumId}`
                );

                // API の JSON 応答を受け取り、成功フラグを確認する。
                const data = await response.json();

                // success が false の場合は API 側のメッセージを優先して例外にする。
                if (!data.success) {
                    throw new Error(data.message || "写真一覧の取得に失敗しました");
                }

                // 取得できた写真一覧を state に反映する。空配列なら一覧なしとして扱う。
                setPhotos(data.photos || []);
            } catch (error) {
                // 取得失敗時は画面側でメッセージを出せるように保持する。
                setErrorMessage(error.message);
            } finally {
                // 成功・失敗のどちらでも、処理終了後は読み込み状態を解除する。
                setLoading(false);
            }
        };

        // 依存している albumId が変わるたびに一覧を取り直す。
        fetchPhotos();
    }, [albumId]);

    // 取得中は一覧の代わりにローディング文言だけを返す。
    if (loading) {
        return <p>写真を読み込み中...</p>;
    }

    // API 失敗時は一覧ではなくエラーメッセージを表示する。
    if (errorMessage) {
        return <p>{errorMessage}</p>;
    }

    // 写真が 0 件なら、空状態の案内を表示する。
    if (photos.length === 0) {
        return <p>まだ写真がありません。</p>;
    }

    // 2 列グリッドで写真カードを並べ、サムネイル一覧として見せる。
    return (
        <div className="photoGrid">
            {photos.map((photo) => (
                // photo_id を key にして、写真ごとのカードを安定して描画する。
                <div key={photo.photo_id} className="photoCard">
                    <img
                        // 画像本体は image_url をそのまま参照し、キャプションがあれば代替テキストに使う。
                        src={photo.image_url}
                        alt={photo.caption || "アルバム写真"}
                        className="photoImage"
                    />

                    // キャプションがある写真だけ、下部に説明文を重ねて表示する。
                    {photo.caption && (
                        <p className="caption">{photo.caption}</p>
                    )}
                </div>
            ))}
        </div>
    );
}