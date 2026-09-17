import { useLocation, useNavigate } from 'react-router-dom';

import BottomNav from '../../components/bottomNav/BottomNav';
import Header from '../../components/header/Header';
import albumImage from '../../assets/widget_img/Album.svg';
import invoiceImage from '../../assets/widget_img/DutchTreat.svg';
import surveyImage from '../../assets/widget_img/Questionary.svg';
import nearbyImage from '../../assets/widget_img/Spot.svg';
import transportImage from '../../assets/widget_img/Traffic.svg';
import weatherImage from '../../assets/widget_img/Weather.svg';

import styles from './Other.module.css';

const widgetImages = {
    weather: weatherImage,
    invoice: invoiceImage,
    survey: surveyImage,
    transport: transportImage,
    nearby: nearbyImage,
    album: albumImage,
};

function FeatureIcon({ type }) {
    return <img className={styles.featureIcon} src={widgetImages[type]} alt="" aria-hidden="true" />;
}

const supportItems = [
    {
        id: 'weather',
        icon: 'weather',
        label: '天気情報',
        description: '現在地や目的地の天気を確認',
        path: '/Weather',
    },
    {
        id: 'Invoice',
        icon: 'invoice',
        label: '割り勘計算',
        description: '旅行中の費用をかんたんに整理',
        path: '/Invoice',
    },
    {
        id: 'survey',
        icon: 'survey',
        label: 'アンケート',
        description: '旅行前にお互いの希望を確認',
    },
    {
        id: 'transport',
        icon: 'transport',
        label: '交通情報',
        description: '移動に必要な情報をチェック',
        path: '/Appointment',
    },
    {
        id: 'nearby',
        icon: 'nearby',
        label: '周辺スポット',
        description: '近くの観光地やおすすめを探す',
        path: '/Tourist',
    },
    {
        id: 'album',
        icon: 'album',
        label: 'アルバム',
        description: '旅行中の思い出を写真で共有',
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
            <Header showDate={false} />

            <div className={styles.page}>
                <main className={styles.content}>
                    <div className={styles.menu}>
                        {supportItems.map((item) => (
                            <button
                                key={item.id}
                                type="button"
                                className={styles.menuItem}
                                aria-label={item.label}
                                onClick={() => {
                                    if (item.path) {
                                        navigate(buildPathWithGroupId(item.path));
                                    }
                                }}
                            >
                                <span className={styles.cardIcon}>
                                    <FeatureIcon type={item.icon} />
                                </span>
                                <span className={styles.itemText}>
                                    <strong>{item.label}</strong>
                                    <span>{item.description}</span>
                                </span>
                                <span className={styles.arrow} aria-hidden="true">
                                    →
                                </span>
                            </button>
                        ))}
                    </div>
                </main>

                <BottomNav />
            </div>
        </>
    );
}
