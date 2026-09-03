/**
 * 旅行の持ち物や準備項目をチェックリストとして管理します。
 *
 * 主な流れ:
 * 1. 必要な部品や API 関数を読み込む
 * 2. 画面表示やデータ取得に必要な値を準備する
 * 3. ユーザー操作や API の結果に合わせて表示を更新する
 *
 * 扱うデータ: React の state、props、フォーム入力、API から返ったデータを主に扱います。
 */
import styles from "./CheckListComponents.module.css";

/**
 * ChecklistDeleteActions は、このファイルの中心となる処理をまとめた関数です。
 * 画面から渡された値や API の結果を使い、次に表示する内容を決めます。
 */
export default function ChecklistDeleteActions({
    hasItems,
    hasCheckedItems,
    onDeleteChecked,
    onDeleteAll,
}) {
    // ここで条件を確認し、状況に合う処理だけを実行します。
    if (!hasItems) {
        return <p className={styles.emptyText}>持ちものがありません。</p>;
    }

    return (
        <div className={styles.deleteActions}>
            <button
                type="button"
                disabled={!hasCheckedItems}
                onClick={onDeleteChecked}
            >
                チェック済みを一括削除
            </button>
        </div>
    );
}
