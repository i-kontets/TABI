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

const formatJapaneseDate = (date) =>
    date.toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'short',
    });

function itineraryEdit() {
    const navigate = useNavigate();
    const [selectedRange, setSelectedRange] = useState({
        from: new Date(2026, 3, 15),
        to: new Date(2026, 3, 23),
    });
    const [formValues, setFormValues] = useState({
        title: '三重',
        members: '3',
    });

    const BackClick = () => {
        navigate('/Itinerary');
    };

    const sanitizeMembers = (value) => value.replace(/[^0-9]/g, '');

    const handleChange = (event) => {
        const { name, value } = event.target;
        setFormValues((current) => ({
            ...current,
            [name]: name === 'members' ? sanitizeMembers(value) : value,
        }));
    };

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
                            transition: 'all 0.3s ease'
                        }}
                    >
                        <Check style={{fill:'var(--main-color)',paddingRight:'5px'}}/>
                        変更
                    </button>
                    <button
                        type="button"
                        onClick={BackClick}
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
                            transition: 'all 0.3s ease'
                        }}
                    >
                        <Close style={{fill:'var(--main-color)',paddingRight:'5px'}}/>
                        キャンセル
                    </button>
                </div>
            </form>
            <BtmNav /> 
        </>
    )
}

export default itineraryEdit
