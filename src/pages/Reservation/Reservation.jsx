/**
 * 宿泊詳細から開く仮の予約ページです。本文は「ハローワールド」だけを表示します。
 * URLのcandidateIdとgroupIdは戻り先へ渡すだけで、施設取得・予約・決済の通信は行いません。
 * 今後の予約処理はこの独立コンポーネントに追加し、サーバーで施設と参加権限を再確認してください。
 */
import { Link, useParams, useSearchParams } from 'react-router-dom';
import BottomNav from '../../components/bottomNav/BottomNav';
import styles from './Reservation.module.css';

// 詳細画面からの遷移・直接アクセスとも、URLだけで同じ表示と戻り先を作ります。
export default function Reservation() {
    const { candidateId } = useParams();
    const [params] = useSearchParams();
    const groupId = params.get('groupId') || params.get('group_id');
    const query = new URLSearchParams(groupId ? { groupId } : {});
    return <div className={styles.page}>
        <header><Link to={`/Candidates/${encodeURIComponent(candidateId)}?${query}`}>施設詳細へ戻る</Link></header>
        <main>ハローワールド</main>
        <BottomNav groupId={groupId} />
    </div>;
}
