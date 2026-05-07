import { useState } from "react";
import styles from "./chchch.module.css";

const DEFAULT_CHOICE_ID = "neutral";
const CHOICE_LOG_CODES = {
  agree: "a",
  disagree: "b",
  neutral: "c"
};

const valueAlignmentQuestions = [
  {
    id: "sleep-early",
    title: "夜は早く寝たい"
  },
  {
    id: "test",
    title: "test"
  }
];

export default function Chchch() {
  //ゴミデータ削除
  const questions = valueAlignmentQuestions.filter(
    (question) => question.id && question.title
  );

  //質問の個数分answersを作成する
  const [answers, setAnswers] = useState(() =>
    questions.reduce((acc, question) => {
      acc[question.id] = DEFAULT_CHOICE_ID;
      return acc;
    }, {})
  );

  const handleSelect = (questionId, choiceId) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: choiceId
    }));
    console.log(`${questionId}:${CHOICE_LOG_CODES[choiceId]}`);
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.pageTitle}>旅行前の価値観すり合わせ</h1>

      <div className={styles.content}>
        {questions.map((question) => (
          <section key={question.id} className={styles.card}>
            <h2 className={styles.questionTitle}>{question.title}</h2>
            <div className={styles.choiceGroup}>
              {[
                { id: "agree", label: "そう思う" },
                { id: "disagree", label: "違う" },
                { id: "neutral", label: "どちらとも言えない" }
              ].map((choice) => {
                const isSelected =
                  (answers[question.id] ?? DEFAULT_CHOICE_ID) === choice.id;
                return (
                  <button
                    key={choice.id}
                    type="button"
                    className={`${styles.choiceButton} ${isSelected ? styles.selected : ""}`}
                    onClick={() => handleSelect(question.id, choice.id)}
                  >
                  {choice.label}
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}