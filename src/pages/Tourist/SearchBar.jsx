import { useState } from 'react';
import styles from './SearchBar.module.css';

function SearchBar({ initialValue = '京都', onSearch }) {
    const [city, setCity] = useState(initialValue);

    const handleSubmit = (event) => {
        event.preventDefault();
        onSearch(city);
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
