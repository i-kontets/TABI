import { useLocation,useNavigate } from "react-router-dom";
import { useContext } from "react";
import { TripContext } from "../../App";
import BtmNav from '../../components/bottomNav/BottomNav';
import Header from '../../components/header/Header';
import styles from './itinerary.module.css';
import Edit from '../../assets/icons/edit.svg?react';
import Group from '../../assets/icons/group.svg?react';





function Itinerary() {
    const navigate = useNavigate();
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

    const editClick = () => {
        navigate('/ItineraryEdit');
    };

    return (
        <>
            <Header tripName={currentTripName} />
            <div className={styles.container}>
                {boxes.map((box, index) => (
                    <div key={index}
                    className={styles.box}
                    onClick={()=>{
                        if(box.path){
                            navigate(box.path);
                        }
                    }}
                    >
                        <h3 className={styles.title}>{box.title}</h3>
                        <p className={styles.content}>{box.content}</p>
                    </div>
                ))}
                <div
                    className={styles.box}
                    onClick={() => { navigate('/appointment', { state: { groupId, tripName: currentTripName } }); }}
                    role="button"
                    tabIndex={0}
                    onKeyPress={(e) => { if (e.key === 'Enter') navigate('/appointment', { state: { groupId, tripName: currentTripName } }); }}
                >
                    <h3 className={styles.title}>移動手段</h3>
                    <p className={styles.content}>コンテンツは登録されていません</p>
                </div>
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
                }}>
                    <Group style={{fill:'var(--main-color)',paddingRight:'5px'}}/>
                    招待
                </button>
            </div>
           <BtmNav /> 
            <BtmNav />
        </>
    )
}

export default Itinerary
