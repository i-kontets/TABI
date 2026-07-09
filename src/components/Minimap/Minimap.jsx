import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import styles from "./Minimap.module.css";

mapboxgl.accessToken = "pk.eyJ1IjoibWFoaTYyIiwiYSI6ImNtb3c3bXBsZTAzdnkycHB2bnlpc3V0bmcifQ.GYUUwH-J7E4wU9yX4snLfg";

function MiniMap({ place, center = [135.4983, 34.7025], zoom = 12 }) {

    const mapContainer = useRef(null);
    const map = useRef(null);

    useEffect(() => {
        if (!mapContainer.current) {
            return undefined;
        }

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