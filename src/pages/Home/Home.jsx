import { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { TripContext } from "../../App";
import styles from './Home.module.css';

const trips = [
    { id: "mie", name: "三重" },
    { id: "hok", name: "北海道" },
    { id: "wak", name: "和歌山" },
    { id: "nara", name: "奈良" },
    { id: "aom", name: "青森" },
];

function Home() {
    const navigate = useNavigate();
    const { setTripName } = useContext(TripContext);

    const handleClick = (trip) => {
        setTripName(trip.name);
        navigate(`/Itinerary?groupId=${trip.id}`, {
            state: { groupId: trip.id, tripName: trip.name },
        });
    };

    const handleBackClick = () => {
        navigate('/');
    };

    return (
        <>
            <div className={styles.header}>
                <button onClick={handleBackClick}>ログアウト</button>

                <div className={styles.titleWrapper}>
                    <p className={styles.title}>TABI</p>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '10px', padding: '10px' }}>
                {trips.map((trip) => (
                    <div
                        key={trip.id}
                        id={trip.id}
                        style={{ padding: '20px', border: '1px solid #eee', backgroundColor: '#fff', textAlign: 'center', borderRadius: '10px', height: '200px' }}
                    >
                        <button onClick={() => handleClick(trip)}>{trip.name}</button>
                    </div>
                ))}
            </div>
        </>
    );
}

export default Home
