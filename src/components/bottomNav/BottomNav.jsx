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
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import styles from './bottomNav.module.css';
import timeIcon from '../../assets/icons/time.svg';
import checklistIcon from '../../assets/icons/checkList.svg';
import AppsIcon from '../../assets/icons/apps.svg';
import Tbook from '../../assets/icons/Tbook.svg';
import Meet from '../../assets/icons/speaker_notes.svg';

/**
 * BottomNav は、このファイルの中心となる処理をまとめた関数です。
 * 画面から渡された値や API の結果を使い、次に表示する内容を決めます。
 */
function BottomNav({ groupId: groupIdProp }) {
    const navigate = useNavigate();
    const location = useLocation();
    const { groupId: pathGroupId } = useParams();
    const params = new URLSearchParams(location.search);
    // 未選択ならHomeで選び直します。候補画面のgroup_idも引き継ぎます。
    const groupId = groupIdProp || pathGroupId || params.get('groupId') || params.get('group_id');

    const menuItems = [
        { id: 'bookmark', label: 'しおり', path:'/Itinerary', icon: Tbook},
        { id: 'meeting', label: '話し合い' , path:`/group/${groupId}/talk`, icon: Meet},
        { id: 'time', label: 'スケジュール', path: '/schedule', icon: timeIcon },
        { id: 'hotel', label: '宿泊一覧', path: '/Candidates', icon: Tbook },
        { id: 'checkList', label: '持ち物リスト', path: '/CheckList', icon: checklistIcon },
        { id: 'other', label: 'その他機能', path: '/Other', icon: AppsIcon },
    ];

    // handleNavigation は、画面操作や API 結果に合わせて必要な処理をまとめた関数です。
    const handleNavigation = (path) => {
        if (!groupId) {
            navigate('/Home');
            return;
        }
        // ここで条件を確認し、状況に合う処理だけを実行します。
        if (path.startsWith('/group/')) {
            navigate(path);
            return;
        }
        navigate(`${path}?groupId=${encodeURIComponent(groupId)}${path === '/Candidates' ? '&category=hotel' : ''}`);
    };

    return (
        <nav className={styles.bottomNav}>
            {menuItems.map((item) => (
                <button
                    key={item.id}
                    className={styles.navItem}
                    onClick={() => handleNavigation(item.path)}
                    aria-label={item.label}
                >
                    {item.icon ? (
                        <img src={item.icon} alt={item.label} className={styles.icon} />
                    ) : (
                        <div className={styles.iconPlaceholder}></div>
                    )}
                    <span className={styles.label}>{item.label}</span>
                </button>
            ))}
        </nav>
    );
}

export default BottomNav;
