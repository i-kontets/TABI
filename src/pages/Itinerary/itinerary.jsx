import { useLocation } from "react-router-dom";
import { useContext } from "react";
import { TripContext } from "../../App";
import BtmNav from '../../components/bottomNav/BottomNav';
import Header from '../../components/header/Header';
import styles from './itinerary.module.css';

function Itinerary() {
    const location = useLocation();
    const { tripName } = useContext(TripContext);
    // URL の groupId と、画面遷移時に渡された state から現在の旅行情報を決める
    const params = new URLSearchParams(location.search);
    const groupId = params.get("groupId") || location.state?.groupId;
    const currentTripName = location.state?.tripName || tripName;

    // 画面に表示する項目を、カードとして並べやすい形にまとめる
    const boxes = [
        { title: 'しおりタイトル', content: currentTripName || '未選択' },
        { title: '旅行期間', content: '2026年05月14日 - 2026年05月16日' },
        { title: 'メンバー', content: 'n人' },
    ];

    return (
        <>
            <Header tripName={currentTripName} />
            <div className={styles.container}>
                {boxes.map((box, index) => (
                    <div key={index} className={styles.box}>
                        <h3 className={styles.title}>{box.title}</h3>
                        <p className={styles.content}>{box.content}</p>
                    </div>
                ))}
            </div>
            <BtmNav />
        </>
    )
}

export default Itinerary
