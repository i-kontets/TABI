import { useState, useEffect } from 'react'
import { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { TripContext } from "../../App";
import styles from './Home.module.css';



function Home() {
    const navigate = useNavigate();
    const { setTripName } = useContext(TripContext);

    const handleClick = (place) => {
        setTripName(place);
        console.log("保存する値:", place);
        navigate("/Itinerary");
    };

    const handleBackClick = () => {
    navigate('/');
    };
    return (
    <>
       <div className={styles.header}>
        <button onClick={handleBackClick}>
            ログアウト
        </button>

        <div className={styles.titleWrapper}>
            <p className={styles.title}>TABI</p>
        </div>

        
    

       </div>

       <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '10px', padding: '10px' }}>
                <div style={{ padding: '20px', border: '1px solid #eee', backgroundColor: '#fff', textAlign: 'center', borderRadius:'10px', height:'200px'}}>
                    <button onClick={() => handleClick("三重")}>三重</button>
                </div>
                <div style={{ padding: '20px', border: '1px solid #eee', backgroundColor: '#fff', textAlign: 'center', borderRadius:'10px', height:'200px'}}>
                    <button onClick={() => handleClick("北海道")}>北海道</button>
                </div>
                <div style={{ padding: '20px', border: '1px solid #eee', backgroundColor: '#fff', textAlign: 'center', borderRadius:'10px', height:'200px'}}>
                    <button onClick={() => handleClick("和歌山")}>和歌山</button>
                </div>
                <div style={{ padding: '20px', border: '1px solid #eee', backgroundColor: '#fff', textAlign: 'center', borderRadius:'10px', height:'200px'}}>
                    <button onClick={() => handleClick("奈良")}>奈良</button>
                </div>
                <div style={{ padding: '20px', border: '1px solid #eee', backgroundColor: '#fff', textAlign: 'center', borderRadius:'10px', height:'200px'}}>
                    <button onClick={() => handleClick("青森")}>青森</button>
                </div>
        </div>

    </>
  );
}

export default Home