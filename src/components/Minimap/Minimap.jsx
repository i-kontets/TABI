import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import styles from "./Minimap.module.css";

mapboxgl.accessToken = "pk.eyJ1IjoibWFoaTYyIiwiYSI6ImNtb3c3bXBsZTAzdnkycHB2bnlpc3V0bmcifQ.GYUUwH-J7E4wU9yX4snLfg";

function MiniMap({ place }) {

    const mapContainer = useRef(null);
    const map = useRef(null);

    useEffect(() => {

        if (map.current) return;

        console.log("Map作成開始");

        map.current = new mapboxgl.Map({
            container: mapContainer.current,
            style: "mapbox://styles/mapbox/streets-v12",
            center: [135.4983, 34.7025],
            zoom: 12,
        });

        console.log("Map作成完了");

    }, []);

return (
    <>
        <p>MiniMapです</p>
        <div className={styles.miniMap} ref={mapContainer} />
    </>
);
}

export default MiniMap;