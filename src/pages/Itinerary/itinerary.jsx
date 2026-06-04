import { useLocation,useNavigate } from "react-router-dom";
import { useContext } from "react";
import { TripContext } from "../../App";
import BtmNav from '../../components/bottomNav/BottomNav';
import Header from '../../components/header/Header';
import styles from './itinerary.module.css';
import Edit from '../../assets/icons/edit.svg?react';
import Group from '../../assets/icons/group.svg?react';




function itinerary() {
    const navigate = useNavigate();
    const location = useLocation();
    const place = location.state?.place;

    const boxes = [
        { title: 'しおりタイトル', content: '三重旅行' },
        { title: '目的地', content: '志摩市'},
        { title: '旅行期間', content: '2026年4月15日(水) - 2026年4月23日(木)' },
        { title: 'メンバー', content: 'n人' },
    ];
    const { tripName } = useContext(TripContext);
    // console.log("Itinerary:", tripName);

    const editClick = () => {
        navigate('/ItineraryEdit');
    };

    const invitationClick = () =>{
        alert('バックエンド始動後のほうが楽なのであとで作ります');
    };

    return (
        <>
            <Header tripName={tripName} />
            <div className={styles.container}>
                {boxes.map((box, index) => (
                    <div key={index} className={styles.box}>
                        <h3 className={styles.title}>{box.title}</h3>
                        <p className={styles.content}>{box.content}</p>
                    </div>
                ))}
            </div>
            <div style={{
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
                }}
                onClick={editClick}
                >
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
                }}
                onClick={invitationClick}
                >
                    <Group style={{fill:'var(--main-color)',paddingRight:'5px'}}/>
                    招待
                </button>
            </div>
           <BtmNav /> 
        </>
    )
}

export default itinerary
