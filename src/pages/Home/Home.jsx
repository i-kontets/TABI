import { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { TripContext } from "../../App";
import styles from './Home.module.css';

const trips = [
    { id: "1", name: "三重" },
    { id: "2", name: "北海道" },
    { id: "3", name: "和歌山" },
    { id: "4", name: "奈良" },
    { id: "5", name: "青森" },
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

    // ログアウト処理
    // - サーバーにログアウトをリクエストしてセッションを破棄
    // - 成功したらクライアント側のログイン情報を削除してルートへ遷移
    const handleLogout = async () => {
        // サーバー側のログアウトAPIにPOST（セッション破棄のためCookieを含める）
        const response = await fetch(
            "/TABI/api/auth/logout.php",
            {
                method: "POST",
                credentials: "include"
            }
        );

        // レスポンスをJSONとして取得
        const data = await response.json();

        // ログアウトに成功したらクライアント側のキャッシュを削除してトップ画面へ戻す
        if (data.success) {
            localStorage.removeItem("loginUser");
            navigate("/");
        }
    };

    return (
        <>
            <div className={styles.header}>
                <button onClick={handleLogout}>ログアウト</button>

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
