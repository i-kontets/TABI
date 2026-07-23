/**
 * 旅程の確認や編集を行う画面です。
 *
 * 主な流れ:
 * 1. 必要な部品や API 関数を読み込む
 * 2. 画面表示やデータ取得に必要な値を準備する
 * 3. ユーザー操作や API の結果に合わせて表示を更新する
 *
 * 扱うデータ: React の state、props、フォーム入力、API から返ったデータを主に扱います。
 */
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { DayPicker } from 'react-day-picker';
import { ja } from 'react-day-picker/locale';
import 'react-day-picker/style.css';
import styles from './itineraryEdit.module.css';
import BtmNav from '../../components/bottomNav/BottomNav';
import ArrowBack from '../../assets/icons/arrow_back.svg?react';
import Check from '../../assets/icons/check.svg?react';
import Close from '../../assets/icons/close.svg?react';

// formatJapaneseDate は、画面操作や API 結果に合わせて必要な処理をまとめた関数です。
const formatJapaneseDate = (date) =>
    date.toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'short',
    });

/**
 * itineraryEdit は、このファイルの中心となる処理をまとめた関数です。
 * 画面から渡された値や API の結果を使い、次に表示する内容を決めます。
 */
function itineraryEdit() {
    const navigate = useNavigate();
    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const [selectedRange, setSelectedRange] = useState({
        from: new Date(2026, 3, 15),
        to: new Date(2026, 3, 23),
    });
    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const [formValues, setFormValues] = useState({
        title: '三重旅行',
        destination: '志摩市',
        members: '3',
    });

    const BackClick = () => {
        navigate('/Itinerary');
    };

    // sanitizeMembers は、画面操作や API 結果に合わせて必要な処理をまとめた関数です。
    const sanitizeMembers = (value) => value.replace(/[^0-9]/g, '');

    // handleChange は、画面操作や API 結果に合わせて必要な処理をまとめた関数です。
    const handleChange = (event) => {
        const { name, value } = event.target;
        setFormValues((current) => ({
            ...current,
            [name]: name === 'members' ? sanitizeMembers(value) : value,
        }));
    };

    // handleSubmit は、画面操作や API 結果に合わせて必要な処理をまとめた関数です。
    const handleSubmit = (event) => {
        event.preventDefault();
        const period = selectedRange?.from
            ? `${formatJapaneseDate(selectedRange.from)} - ${formatJapaneseDate(selectedRange.to ?? selectedRange.from)}`
            : '';
        console.log('編集後の内容:', {
            ...formValues,
            period,
            members: formValues.members === '' ? '' : Number(formValues.members),
        });
        navigate('/Itinerary');
    };

    return (
        <>
            <header className={styles.header}>
                <button
                    className={styles.backButton}
                    onClick={BackClick}
                    aria-label="戻る"
                >
                    <ArrowBack className={styles.icon} aria-hidden="true"/>
                </button>
                <div className={styles.Htitle} style={{margin:'auto'}}>編集画面</div>
            </header>
            <form onSubmit={handleSubmit}>
                <div className={styles.container}>
                    <div className={styles.box}>
                        <h3 className={styles.title}>しおりタイトル</h3>
                        <input
                            className={styles.input}
                            type="text"
                            name="title"
                            value={formValues.title}
                            onChange={handleChange}
                        />
                    </div>
                    <div className={styles.box}>
                        <h3 className={styles.title}>目的地</h3>
                        <input
                            className={styles.input}
                            type="text"
                            name="destination"
                            value={formValues.destination}
                            onChange={handleChange}
                        />
                    </div>
                    <div className={styles.box}>
                        <h3 className={styles.title}>旅行期間</h3>
                        <div className={styles.calendar}>
                            <DayPicker
                                mode="range"
                                selected={selectedRange}
                                onSelect={setSelectedRange}
                                defaultMonth={selectedRange?.from}
                                resetOnSelect
                                locale={ja}
                                weekStartsOn={0}
                            />
                        </div>
                    </div>
                    <div className={styles.box}>
                        <h3 className={styles.title}>メンバー</h3>
                        <input
                            className={styles.input}
                            type="text"
                            name="members"
                            value={formValues.members}
                            inputMode="numeric"
                            pattern="[0-9]*"
                            onChange={handleChange}
                        />
                    </div>
                    <button
                        type="submit"
                        style={{
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
                            transition: 'all 0.3s ease',
                            width:'100%'
                        }}
                    >
                        <Check style={{fill:'var(--main-color)',paddingRight:'5px'}}/>
                        変更
                    </button>
                </div>
            </form>
            <BtmNav /> 
        </>
    )
}

export default itineraryEdit
