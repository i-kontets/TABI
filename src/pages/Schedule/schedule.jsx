/**
 * 旅行スケジュールを時間軸に沿って表示する画面部品です。
 *
 * 主な流れ:
 * 1. 必要な部品や API 関数を読み込む
 * 2. 画面表示やデータ取得に必要な値を準備する
 * 3. ユーザー操作や API の結果に合わせて表示を更新する
 *
 * 扱うデータ: React の state、props、フォーム入力、API から返ったデータを主に扱います。
 */
import { useContext, useState } from 'react';
import { Stepper } from 'react-form-stepper';
import { TripContext } from '../../App';
import ScheduleTimeAxis from '../../components/Schedule/ScheduleTimeAxis';
import BottomNav from '../../components/bottomNav/BottomNav';
import Header from '../../components/header/Header';
import styles from './Schedulepage.module.css';

const days = [
    { id: 'day1', date: '6/28(日)' },
    { id: 'day2', date: '6/29(月)' },
    { id: 'day3', date: '6/30(火)' },
    { id: 'day4', date: '7/1(水)' },
    { id: 'day5', date: '7/2(木)' },
];

/**
 * SchedulePage は、このファイルの中心となる処理をまとめた関数です。
 * 画面から渡された値や API の結果を使い、次に表示する内容を決めます。
 */
export default function SchedulePage() {
    const { tripName } = useContext(TripContext);
    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const [selectedDay, setSelectedDay] = useState('day1');
    const selectedDayIndex = days.findIndex((day) => day.id === selectedDay);
    const rootStyles = getComputedStyle(document.documentElement);
    const subColor = rootStyles.getPropertyValue('--sub-color').trim();
    const otherColor = rootStyles.getPropertyValue('--other-color').trim();

    return (
        <div className={styles.container}>
            <Header tripName={tripName || '伊豆・海辺の週末'} />

            <main className={styles.content}>
                <section className={styles.dayPanel} aria-label="日付選択">
                    <Stepper
                        steps={days.map((day) => ({ label: day.date }))}
                        activeStep={selectedDayIndex}
                        connectorStateColors
                        className={styles.dayStepper}
                        styleConfig={{
                            activeBgColor: subColor,
                            activeTextColor: '#ffffff',
                            completedBgColor: subColor,
                            completedTextColor: '#ffffff',
                            inactiveBgColor: otherColor,
                            inactiveTextColor: subColor,
                            size: '30px',
                            circleFontSize: '13px',
                            labelFontSize: '12px',
                            borderRadius: '999px',
                            fontWeight: 700,
                        }}
                        connectorStyleConfig={{
                            activeColor: subColor,
                            completedColor: subColor,
                            disabledColor: otherColor,
                            size: 2,
                            stepSize: '30px',
                        }}
                    />

                    <div className={styles.stepperClickLayer} style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` }} aria-label="日付を切り替え">
                        {days.map((day) => (
                            <button
                                key={day.id}
                                className={styles.stepperClickTarget}
                                type="button"
                                onClick={() => setSelectedDay(day.id)}
                                aria-label={`${day.date}の予定を表示`}
                            />
                        ))}
                    </div>
                </section>

                <ScheduleTimeAxis selectedDay={selectedDay} />
            </main>

            <BottomNav />
        </div>
    );
}
