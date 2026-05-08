import { useState } from 'react';
import styles from './chchch.module.css';

const questions = [
  {
    id: 1,
    question: 'このアプリケーションは使いやすいと思いますか？'
  },
  {
    id: 2,
    question: 'デザインは魅力的だと思いますか？'
  },
  {
    id: 3,
    question: '機能は充実していると感じますか？'
  },
  {
    id: 4,
    question: '読み込み速度は十分だと思いますか？'
  },
  {
    id: 5,
    question: 'また使用したいと思いますか？'
  }
];

export default function Chchch() {
  const [answers, setAnswers] = useState({});

  const handleAnswer = (questionId, answer) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: answer,
    }));
  };

  const handleSubmit = () => {
    const result = questions.map((q) => ({
      id: q.id,
      answer: answers[q.id] || 'なし',
    }));
    console.log(result);
  };

  return (
    <div className={styles.questionBoxContainer}>
      <h2 className={styles.title}>質問箱</h2>
      <div className={styles.questionsWrapper}>
        {questions.map((question) => (
          <div key={question.id} className={styles.questionItem}>
            <p className={styles.questionText}>{question.question}</p>
            <div className={styles.buttonGroup}>
              <button
                className={`${styles.button} ${
                  answers[question.id] === 'そう思う' ? styles.selected : ''
                }`}
                onClick={() => handleAnswer(question.id, 'そう思う')}
              >
                そう思う
              </button>
              <button
                className={`${styles.button} ${
                  answers[question.id] === 'どちらでもない' ? styles.selected : ''
                }`}
                onClick={() => handleAnswer(question.id, 'どちらでもない')}
              >
                どちらでもない
              </button>
              <button
                className={`${styles.button} ${
                  answers[question.id] === 'そうは思わない' ? styles.selected : ''
                }`}
                onClick={() => handleAnswer(question.id, 'そうは思わない')}
              >
                そうは思わない
              </button>
            </div>
          </div>
        ))}
      </div>
      <button className={styles.submitButton} onClick={handleSubmit}>
        完了
      </button>
    </div>
  );
}
