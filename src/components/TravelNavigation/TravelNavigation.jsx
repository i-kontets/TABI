/**
 * Homeの旅行メニューです。参加グループを選択→共通状態に保存→ID付きURLへ移動します。
 * APIで取得済みのグループだけを選べるようにし、未選択時に固定IDを補いません。
 */
import { useContext } from 'react';
import { Link } from 'react-router-dom';
import { TripContext } from '../../App';
import styles from './TravelNavigation.module.css';

// Homeからグループ一覧を受け取り、しおり・宿泊など6経路を表示します。
export default function TravelNavigation({ groups }) {
    const { trip, setTrip } = useContext(TripContext);
    const selected = groups.find((group) => String(group.id) === String(trip.id));
    const groupId = selected?.id;
    const query = `groupId=${encodeURIComponent(groupId ?? '')}`;
    const links = [
        ['しおり', `/Itinerary?${query}`],
        ['話し合い', `/group/${encodeURIComponent(groupId ?? '')}/talk`],
        ['スケジュール', `/schedule?${query}`],
        ['宿泊一覧', `/Candidates?${query}&category=hotel`],
        ['持ち物', `/CheckList?${query}`],
        ['その他', `/Other?${query}`],
    ];
    return <section className={styles.menu} aria-label="旅行メニュー">
        <label>旅行グループ
            <select value={groupId ?? ''} onChange={(event) => {
                // 選択したAPI由来のIDを引き継ぎます。URLは再読み込み時の復元にも使います。
                const group = groups.find((item) => String(item.id) === event.target.value);
                setTrip(group ? { id: group.id, name: group.name, image: group.image } : {});
            }}>
                <option value="">旅行グループを選択してください</option>
                {groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
            </select>
        </label>
        {!selected && <p>旅行グループを選択すると各機能を開けます。</p>}
        <nav>{links.map(([label, path]) => selected
            ? <Link key={label} to={path}>{label}</Link>
            : <span key={label} aria-disabled="true">{label}</span>)}</nav>
    </section>;
}
