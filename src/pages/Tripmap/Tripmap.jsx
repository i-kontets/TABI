/**
 * 旅行先やスポットを地図上で確認する画面です。
 *
 * 主な流れ:
 * 1. 必要な部品や API 関数を読み込む
 * 2. 画面表示やデータ取得に必要な値を準備する
 * 3. ユーザー操作や API の結果に合わせて表示を更新する
 *
 * 扱うデータ: React の state、props、フォーム入力、API から返ったデータを主に扱います。
 */
import Tripmap from './Tripmap.module.css'

/**
 * Map は、このファイルの中心となる処理をまとめた関数です。
 * 画面から渡された値や API の結果を使い、次に表示する内容を決めます。
 */
function Map() {
    return (
    <main className={Tripmap.page}>
        <a href="Itinerary">旅のしおり</a>
    </main>

    )
}

export default Map
