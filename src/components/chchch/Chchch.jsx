import styles from "./chchch.module.css";

export default function Chchch() {
  const ngData = [
    { type: "section", title: "行動系NG" },
    {
      type: "item",
      title: "遅刻する",
      reason: "スケジュールが崩れる",
      note: "集合時間は守る"
    },
    {
      type: "item",
      title: "勝手行動",
      reason: "トラブルの原因になる"
    },

    { type: "section", title: "持ち物系NG" },
    {
      type: "item",
      title: "充電器を持ってこない",
      reason: "詰む"
    }
  ];

  return (
    <div className={styles.container}>
      <h1 className={styles.pageTitle}>旅行NGリスト</h1>

      <div className={styles.content}>
        {ngData.map((item, index) => {
          // セクションタイトル
          if (item.type === "section") {
            return (
              <h2 key={index} className={styles.sectionTitle}>
                {item.title}
              </h2>
            );
          }
        

          // カード
          return (
            <div key={index} className={styles.card}>
              <h3 className={styles.cardTitle}>{item.title}</h3>
              <p className={styles.reason}>{item.reason}</p>
              {item.note && (
                <p className={styles.note}>{item.note}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

