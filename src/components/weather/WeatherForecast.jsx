/**
 * 天気予報データを表示するための画面部品です。
 *
 * 主な流れ:
 * 1. 必要な部品や API 関数を読み込む
 * 2. 画面表示やデータ取得に必要な値を準備する
 * 3. ユーザー操作や API の結果に合わせて表示を更新する
 *
 * 扱うデータ: React の state、props、フォーム入力、API から返ったデータを主に扱います。
 */
import styles from './WeatherForecast.module.css';

const forecast = [
    {
        day: '今日',
        date: '6/18',
        location: '三重',
        condition: '晴れ',
        icon: 'sunny',
        high: 29,
        low: 21,
        precipitation: 10,
        wind: '北東 2m',
    },
    {
        day: '明日',
        date: '6/19',
        location: '三重',
        condition: 'くもり',
        icon: 'cloudy',
        high: 27,
        low: 22,
        precipitation: 30,
        wind: '東 3m',
    },
    {
        day: '土',
        date: '6/20',
        location: '三重',
        condition: '雨',
        icon: 'rainy',
        high: 25,
        low: 20,
        precipitation: 70,
        wind: '南東 4m',
    },
    {
        day: '日',
        date: '6/21',
        location: '三重',
        condition: '晴れ時々くもり',
        icon: 'partlyCloudy',
        high: 28,
        low: 21,
        precipitation: 20,
        wind: '西 2m',
    },
];

const weatherIcons = {
    sunny: '☀',
    cloudy: '☁',
    rainy: '☂',
    partlyCloudy: '◐',
};

/**
 * WeatherForecast は、このファイルの中心となる処理をまとめた関数です。
 * 画面から渡された値や API の結果を使い、次に表示する内容を決めます。
 */
function WeatherForecast() {
    const today = forecast[0];

    return (
        <section className={styles.weather} aria-labelledby="weather-title">
            <div className={styles.summary}>
                <div>
                    <p className={styles.location}>{today.location}</p>
                    <h2 id="weather-title" className={styles.title}>
                        天気予報
                    </h2>
                </div>

                <div className={styles.current}>
                    <span className={styles.currentIcon} aria-hidden="true">
                        {weatherIcons[today.icon]}
                    </span>
                    <div>
                        <p className={styles.currentCondition}>{today.condition}</p>
                        <p className={styles.currentTemp}>
                            {today.high}° / {today.low}°
                        </p>
                    </div>
                </div>
            </div>

            <div className={styles.forecastList}>
                {forecast.map((item) => (
                    <article className={styles.forecastCard} key={`${item.day}-${item.date}`}>
                        <div className={styles.cardHeader}>
                            <span className={styles.day}>{item.day}</span>
                            <span className={styles.date}>{item.date}</span>
                        </div>

                        <span className={styles.icon} aria-hidden="true">
                            {weatherIcons[item.icon]}
                        </span>

                        <p className={styles.condition}>{item.condition}</p>

                        <div className={styles.temps}>
                            <span className={styles.high}>{item.high}°</span>
                            <span className={styles.low}>{item.low}°</span>
                        </div>

                        <dl className={styles.details}>
                            <div>
                                <dt>降水</dt>
                                <dd>{item.precipitation}%</dd>
                            </div>
                            <div>
                                <dt>風</dt>
                                <dd>{item.wind}</dd>
                            </div>
                        </dl>
                    </article>
                ))}
            </div>
        </section>
    );
}

export default WeatherForecast;
