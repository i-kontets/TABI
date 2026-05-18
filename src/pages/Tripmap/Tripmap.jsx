import Tripmap from './Tripmap/Tripmap.css'

const map;
async function initMap() {
    const { Map, RenderingType } = (await google.maps.importLibrary('maps'));
    map = new Map(document.getElementById('map'), {
        center: { lat: -34.397, lng: 150.644 },
        zoom: 8,
        renderingType: RenderingType.VECTOR,
    });
}
initMap();
