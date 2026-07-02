import { useNavigate } from 'react-router-dom';
import { useState, useContext } from "react"
import styles from './header.module.css';
import Home from '../../assets/icons/home.svg?react';
import ChatIcon from '../../assets/icons/chat.svg?react';
import { ssrExportNameKey } from 'vite/module-runner';
import { TripContext } from "../../App";


function Header({tripName}) {
    const navigate = useNavigate();
    const subtitle = '2026年05月14日 - 2026年05月16日';
    const {trip} = useContext(TripContext);
    

    const handleBackClick = () => {
        navigate('/Home');
    };

    const chatClick = () =>{
        console.log("test内容");
        navigate('/Chat')
    };

    return (
        <header className={styles.header}>
            <button
                className={styles.backButton}
                onClick={handleBackClick}
                aria-label="戻る"
            >
                {/* aria-hidden="true"は画面上で読み上げ機能を使用した際にsvgを範囲に含めないための命令です。 */}
                <Home className={styles.icon} aria-hidden="true"/>
            </button>

            <div className={styles.titleWrapper}>
                <h1 className={styles.title}>{trip.name}</h1>
                <p className={styles.subtitle}>{subtitle}</p>
            </div>

            <button 
                className={styles.chatButton} 
                onClick={chatClick}
                aria-label="チャットゥ"
                // onClick={() => {
                //     console.log("chat clicked")
                //     navigate("/chat")
                >
                    
                    <ChatIcon className={styles.icon}  aria-hidden="true" />
            </button>
        </header>
    );
}

export default Header;
