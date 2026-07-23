/**
 * 複数の画面から使われる共通の表示部品です。
 *
 * 主な流れ:
 * 1. 必要な部品や API 関数を読み込む
 * 2. 画面表示やデータ取得に必要な値を準備する
 * 3. ユーザー操作や API の結果に合わせて表示を更新する
 *
 * 扱うデータ: React の state、props、フォーム入力、API から返ったデータを主に扱います。
 */
import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import styles from "./Minimap.module.css";

mapboxgl.accessToken = "pk.eyJ1IjoibWFoaTYyIiwiYSI6ImNtb3c3bXBsZTAzdnkycHB2bnlpc3V0bmcifQ.GYUUwH-J7E4wU9yX4snLfg";

/**
 * MiniMap は、このファイルの中心となる処理をまとめた関数です。
 * 画面から渡された値や API の結果を使い、次に表示する内容を決めます。
 */
function MiniMap({ place, center = [135.4983, 34.7025], zoom = 12 }) {

    const mapContainer = useRef(null);
    const map = useRef(null);

    // 画面が表示された直後や監視している値が変わった時に、必要なデータ取得や初期設定を行います。
    useEffect(() => {
        // ここで条件を確認し、状況に合う処理だけを実行します。
        if (!mapContainer.current) {
            return undefined;
        }

        // ここで条件を確認し、状況に合う処理だけを実行します。
        if (!map.current) {
            map.current = new mapboxgl.Map({
                container: mapContainer.current,
                style: "mapbox://styles/mapbox/streets-v12",
                center,
                zoom,
            });
        } else {
            map.current.setCenter(center);
            map.current.setZoom(zoom);
        }

        return () => {
            map.current?.remove();
            map.current = null;
        };
    }, [center, zoom]);

return (
    <div className={styles.miniMap} ref={mapContainer} aria-label={place ? `${place}の地図` : '地図'} />
);
}

export default MiniMap;