import { useLocation } from "react-router-dom";
import BtmNav from '../../components/bottomNav/BottomNav';
import Header from '../../components/header/Header';
import styles from './itinerary.module.css';

function itinerary() {
    const location = useLocation();
    const place = location.state?.place;

    const boxes = [
        { title: 'しおりタイトル', content: '三重' },
        { title: '旅行期間', content: '2026年4月15日(水) - 2026年4月23日(木)' },
        { title: 'メンバー', content: 'n人' },
    ];

    return (
        <>
            <Header place = {place} />
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

export default itinerary
