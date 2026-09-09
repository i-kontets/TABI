import { useLocation, useNavigate } from 'react-router-dom';

import BottomNav from '../../components/bottomNav/BottomNav';
import Header from '../../components/header/Header';

import AlbumImage from '../../assets/widget_img/Album.png';
import DutchTreatImage from '../../assets/widget_img/DutchTreat.png';
import SpotImage from '../../assets/widget_img/Spot.png';
import TrafficImage from '../../assets/widget_img/Traffic.png';
import TranslationImage from '../../assets/widget_img/Translation.png';
import WeatherImage from '../../assets/widget_img/Weather.png';

import styles from './Other.module.css';

const supportItems = [
    {
        id: 'weather',
        image: WeatherImage,
        path: '/Weather',
    },
    {
        id: 'Invoice',
        image: DutchTreatImage,
        path: '/Invoice',
    },
    {
        id: 'translate',
        image: TranslationImage,
        path: '/Translation',
    },
    {
        id: 'transport',
        image: TrafficImage,
        path: '/Appointment',
    },
    {
        id: 'nearby',
        image: SpotImage,
        path: '/Tourist',
    },
    {
        id: 'album',
        image: AlbumImage,
        path: '/Album',
    },
];

export default function Other() {
    const navigate = useNavigate();
    const location = useLocation();

    const params = new URLSearchParams(location.search);
    const groupId = params.get('groupId');

    const buildPathWithGroupId = (path) => {
        if (!groupId) {
            return path;
        }

        return `${path}?groupId=${encodeURIComponent(groupId)}`;
    };

    return (
        <>
            <Header />

            <div className={styles.page}>
                <main className={styles.content}>
                    <div className={styles.menu}>
                        {supportItems.map((item) => (
                            <button
                                key={item.id}
                                type="button"
                                className={styles.menuItem}
                                onClick={() =>
                                    navigate(
                                        buildPathWithGroupId(item.path)
                                    )
                                }
                            >
                                <img
                                    src={item.image}
                                    alt=""
                                    className={styles.cardImage}
                                />
                            </button>
                        ))}
                    </div>
                </main>

                <BottomNav />
            </div>
        </>
    );
}