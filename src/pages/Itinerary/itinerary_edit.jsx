import { useLocation,useNavigate } from "react-router-dom";
import { useContext } from "react";
import { TripContext } from "../../App";
import styles from './itineraryEdit.module.css';
import ArrowBack from '../../assets/icons/arrow_back.svg?react';


function itinerary_edit() {
    const navigate = useNavigate();
    const location = useLocation();
    const place = location.state?.place;
    const { tripName } = useContext(TripContext);

    const boxes = [
        { title: 'しおりタイトル', content: '三重' },
        { title: '旅行期間', content: '2026年4月15日(水) - 2026年4月23日(木)' },
        { title: 'メンバー', content: 'n人' },
    ];

    const BackClick = () => {
        navigate('/Itinerary');
    };

    return (
        <>
            <header className={styles.header}>
                <button
                    className={styles.backButton}
                    onClick={BackClick}
                    aria-label="戻る"
                >
                    <ArrowBack className={styles.icon} aria-hidden="true"/>
                </button>
                <div className={styles.Htitle} style={{margin:'auto'}}>編集画面</div>
            </header>
            <div className={styles.container}>
                {boxes.map((box, index) => (
                    <div key={index} className={styles.box}>
                        <h3 className={styles.title}>{box.title}</h3>
                        <p className={styles.content}>{box.content}</p>
                    </div>
                ))}
            </div>
            {/* <div style={{
                position: 'fixed',
                bottom: '80px',
                right: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                zIndex: '100',
                backgroundColor:'var(--main-color)'
            }}>
                <button style={{
                    padding: '12px 16px',
                    border: '2px solid #44558D',
                    backgroundColor: 'var(--sub-color)',
                    color: 'var(--main-color)',
                    borderRadius: '15px',
                    cursor: 'pointer',
                    fontWeight: '500',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.3s ease'
                }}>
                    <Edit  style={{fill:'var(--main-color)',paddingRight:'5px'}}/>
                    編集
                </button>
                <button style={{
                    padding: '12px 16px',
                    border: '2px solid #44558D',
                    backgroundColor: 'var(--sub-color)',
                    color: 'var(--main-color)',
                    borderRadius: '15px',
                    cursor: 'pointer',
                    fontWeight: '500',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.3s ease'
                }}>
                    <Group style={{fill:'var(--main-color)',paddingRight:'5px'}}/>
                    招待
                </button>
            </div> */}
        </>
    )
}

export default itinerary_edit
