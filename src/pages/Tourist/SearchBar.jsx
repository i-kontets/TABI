/**
 * 観光スポットの検索、一覧表示、詳細表示、お気に入り操作を担当します。
 *
 * 主な流れ:
 * 1. 必要な部品や API 関数を読み込む
 * 2. 画面表示やデータ取得に必要な値を準備する
 * 3. ユーザー操作や API の結果に合わせて表示を更新する
 *
 * 扱うデータ: React の state、props、フォーム入力、API から返ったデータを主に扱います。
 */
import { useState } from 'react';
import styles from './SearchBar.module.css';

/**
 * SearchBar は、このファイルの中心となる処理をまとめた関数です。
 * 画面から渡された値や API の結果を使い、次に表示する内容を決めます。
 */
function SearchBar({ onSearch }) {
    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const [city, setCity] = useState('京都');

    // handleSubmit は、画面操作や API 結果に合わせて必要な処理をまとめた関数です。
    const handleSubmit = (event) => {
        event.preventDefault();
        const keyword = city.trim();

        // ここで条件を確認し、状況に合う処理だけを実行します。
        if (!keyword) {
            return;
        }

        onSearch(keyword);
    };

    return (
        <form className={styles.searchBar} onSubmit={handleSubmit}>
            <label className={styles.label} htmlFor="tourist-city">
                地域名
            </label>
            <div className={styles.formRow}>
                <input
                    id="tourist-city"
                    className={styles.input}
                    type="search"
                    value={city}
                    onChange={(event) => setCity(event.target.value)}
                    placeholder="京都"
                />
                <button className={styles.button} type="submit">
                    検索
                </button>
            </div>
        </form>
    );
}

export default SearchBar;
