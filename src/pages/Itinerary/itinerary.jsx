import { useLocation,useNavigate } from "react-router-dom";
import { useContext, useState } from "react";
import { TripContext } from "../../App";
import BtmNav from '../../components/bottomNav/BottomNav';
import Header from '../../components/header/Header';
import styles from './itinerary.module.css';
import Edit from '../../assets/icons/edit.svg?react';
import Group from '../../assets/icons/group.svg?react';

const latestBookingStorageKey = 'tabiLatestBooking';

function getStoredBooking() {
    try {
        const storedBooking = localStorage.getItem(latestBookingStorageKey);
        return storedBooking ? JSON.parse(storedBooking) : null;
    } catch {
        return null;
    }
}

function Itinerary() {
    const navigate = useNavigate();
    const location = useLocation();
    const { tripName } = useContext(TripContext);
    const [isTransportOpen, setIsTransportOpen] = useState(false);
    // URL の groupId と、画面遷移時に渡された state から現在の旅行情報を決める
    const params = new URLSearchParams(location.search);
    const groupId = params.get("groupId") || location.state?.groupId;
    const currentTripName = location.state?.tripName || tripName;
    const latestBooking = location.state?.booking || getStoredBooking();
    const transportRoute = latestBooking?.item?.from && latestBooking?.item?.to
        ? `${latestBooking.item.from} → ${latestBooking.item.to}`
        : 'コンテンツは登録されていません';

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
                {latestBooking ? (
                    <section className={styles.box}>
                        <button
                            type="button"
                            className={styles.accordionButton}
                            onClick={() => setIsTransportOpen((current) => !current)}
                            aria-expanded={isTransportOpen}
                            aria-controls="transport-details"
                        >
                            <span>
                                <span className={styles.title}>移動手段</span>
                                <span className={styles.content}>{transportRoute}</span>
                            </span>
                            <span
                                className={`${styles.accordionIcon} ${isTransportOpen ? styles.accordionIconOpen : ''}`}
                                aria-hidden="true"
                            >
                                ▼
                            </span>
                        </button>

                        {isTransportOpen && (
                            <div id="transport-details" className={styles.transportDetails}>
                                <p><span>種類</span>{latestBooking.item?.type || '未設定'}</p>
                                <p><span>事業者</span>{latestBooking.item?.carrier || '未設定'}</p>
                                <p><span>出発日時</span>{latestBooking.date || '未設定'} {latestBooking.time || ''}</p>
                                <p><span>乗降地</span>{latestBooking.boarding || '未設定'} → {latestBooking.alighting || '未設定'}</p>
                                <p><span>人数</span>{latestBooking.people || 1}名</p>
                                <p><span>合計料金</span>{(latestBooking.totalPrice || 0).toLocaleString()}円</p>
                            </div>
                        )}
                    </section>
                ) : (
                    <button
                        type="button"
                        className={`${styles.box} ${styles.emptyTransportButton}`}
                        onClick={() => navigate('/appointment', { state: { groupId, tripName: currentTripName } })}
                    >
                        <span className={styles.title}>移動手段</span>
                        <span className={styles.content}>コンテンツは登録されていません</span>
                    </button>
                )}
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
