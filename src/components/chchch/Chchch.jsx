/**
 * 複数の画面から使われる共通の表示部品です。
 *
 * 主な流れ:
 * 1. 必要な部品や API 関数を読み込む
 * 2. 画面表示やデータ取得に必要な値を準備する
 * 3. ユーザー操作や API の結果に合わせて表示を更新する
 *
 * 扱うデータ: React の state、props、フォーム入力、API から返ったデータを主に扱います。
 */
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

/**
 * Chchch は、このファイルの中心となる処理をまとめた関数です。
 * 画面から渡された値や API の結果を使い、次に表示する内容を決めます。
 */
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

  // handleSelect は、画面操作や API 結果に合わせて必要な処理をまとめた関数です。
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