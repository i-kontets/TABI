/**
 * 日程候補の確認や決定に使う画面部品です。
 *
 * 主な流れ:
 * 1. 必要な部品や API 関数を読み込む
 * 2. 画面表示やデータ取得に必要な値を準備する
 * 3. ユーザー操作や API の結果に合わせて表示を更新する
 *
 * 扱うデータ: React の state、props、フォーム入力、API から返ったデータを主に扱います。
 */
import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import BtmNav from '../bottomNav/BottomNav';
import ArrowBack from '../../assets/icons/arrow_back.svg?react';
import styles from '../../pages/Appointment/Appointment.module.css';

/**
 * DecisionComponent は、このファイルの中心となる処理をまとめた関数です。
 * 画面から渡された値や API の結果を使い、次に表示する内容を決めます。
 */
function DecisionComponent() {
    const navigate = useNavigate();
    const location = useLocation();
    const { booking: passedBooking, bookingNumber: passedNumber } = location.state || {};

    // If booking was not passed, show a helpful message
    if (!passedBooking) {
        return (
            <div style={{ padding: 16 }}>
                <header className={styles.header}>
                    <button className={styles.backButton} onClick={() => navigate(-1)} aria-label="戻る">
                        <ArrowBack className={styles.icon} aria-hidden="true" />
                    </button>
                    <div className={styles.Htitle} style={{ margin: 'auto' }}>予約内容</div>
                </header>
                <div className={styles.container}>
                    <div>予約情報が見つかりませんでした。予約一覧や予約番号で確認してください。</div>
                </div>
                <BtmNav />
            </div>
        );
    }

    const booking = passedBooking;
    const bookingNumber = passedNumber || ('R' + Date.now().toString(36).toUpperCase());

    return (
        <>
            <header className={styles.header}>
                <button className={styles.backButton} onClick={() => navigate(-1)} aria-label="戻る">
                    <ArrowBack className={styles.icon} aria-hidden="true" />
                </button>
                <div className={styles.Htitle} style={{ margin: 'auto' }}>予約内容の確認</div>
            </header>

            <div className={styles.container}>
                <div className={styles.card}>
                    <div style={{ fontWeight: 700 }}>予約番号</div>
                    <div style={{ marginTop: 6 }}>{bookingNumber}</div>
                </div>

                <div className={styles.card} style={{ marginTop: 8 }}>
                    <div style={{ fontWeight: 700 }}>{booking.item?.carrier} • {booking.item?.type}</div>
                    <div>{booking.item?.from} → {booking.item?.to}</div>
                    <div>出発日: {booking.date}</div>
                    <div>選択時刻: {booking.time}</div>
                </div>

                <div className={styles.card} style={{ marginTop: 8 }}>
                    <div style={{ fontWeight: 700 }}>乗降地</div>
                    <div>乗車: {booking.boarding}</div>
                    <div>降車: {booking.alighting}</div>
                </div>

                <div className={styles.card} style={{ marginTop: 8 }}>
                    <div style={{ fontWeight: 700 }}>人数・料金</div>
                    <div>人数: {booking.people} 名</div>
                    <div>{(booking.pricePerPerson || 0).toLocaleString()} 円 / 人</div>
                    <div style={{ marginTop: 6, fontWeight: 700 }}>合計: {(booking.totalPrice || 0).toLocaleString()} 円</div>
                </div>

                <div className={styles.actions} style={{ marginTop: 12 }}>
                                    <button className={styles.button} onClick={() => navigate('/Itinerary')}>しおりに戻る</button>
                </div>
            </div>

            <BtmNav />
        </>
    );
}

export default DecisionComponent;
