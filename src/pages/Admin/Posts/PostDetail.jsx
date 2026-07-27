/**
 * 管理者向け画面の表示と、管理 API から取得したデータの操作を担当します。
 *
 * 主な流れ:
 * 1. 必要な部品や API 関数を読み込む
 * 2. 画面表示やデータ取得に必要な値を準備する
 * 3. ユーザー操作や API の結果に合わせて表示を更新する
 *
 * 扱うデータ: 管理 API から取得した一覧や詳細データ、画面上の検索条件や入力値を主に扱います。
 */
import { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import AdminLayout from '../../../components/Admin/AdminLayout';
import { Avatar, Badge, Card, DetailRow, Button, EmptyState } from '../../../components/Admin/ui/Ui';
import { fetchPost, togglePostVisibility, deletePost, fetchReports } from '../../../services/admin';
import { useAdminRealtimeRefresh } from '../Realtime/useAdminRealtimeRefresh';
import styles from './Posts.module.css';

const STATUS_OPTIONS = ['未対応', '確認中', '対応済み'];

/**
 * PostDetail は、このファイルの中心となる処理をまとめた関数です。
 * 画面から渡された値や API の結果を使い、次に表示する内容を決めます。
 */
export default function PostDetail() {
    const { postId } = useParams();
    const navigate = useNavigate();
    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const [post, setPost] = useState(null);
    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const [reports, setReports] = useState([]);
    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const [status, setStatus] = useState('未対応');

    const loadPostDetail = useCallback(() => {
        // API などの非同期処理が終わった後に、受け取った結果を次の処理へ渡します。
        fetchPost(postId).then(setPost);
        // API などの非同期処理が終わった後に、受け取った結果を次の処理へ渡します。
        fetchReports().then((r) => setReports(r.items));
    }, [postId]);

    // 画面が表示された直後や監視している値が変わった時に、必要なデータ取得や初期設定を行います。
    useEffect(() => {
        loadPostDetail();
    }, [loadPostDetail]);

    useAdminRealtimeRefresh(['admin:post_updated', 'admin:post_deleted', 'admin:report_created', 'admin:report_updated'], loadPostDetail);

    // ここで条件を確認し、状況に合う処理だけを実行します。
    if (!post) {
        return (
            <AdminLayout title="投稿詳細" back>
                <EmptyState message="投稿が見つかりません" />
            </AdminLayout>
        );
    }

    // 条件に合うデータだけを残して、画面に出す内容を絞り込みます。
    const relatedReports = reports.filter((r) => r.targetPostId === post.id);

    // handleToggle は、画面操作や API 結果に合わせて必要な処理をまとめた関数です。
    const handleToggle = async () => {
        const updated = await togglePostVisibility(post.id);
        setPost({ ...updated });
    };

    // handleDelete は、画面操作や API 結果に合わせて必要な処理をまとめた関数です。
    const handleDelete = async () => {
        // ここで条件を確認し、状況に合う処理だけを実行します。
        if (!window.confirm('この投稿を削除しますか?この操作は取り消せません。')) return;
        await deletePost(post.id);
        navigate('/admin/posts');
    };

    return (
        <AdminLayout title="投稿詳細" back>
            <Card>
                <div className={styles.detailHead}>
                    <Avatar name={post.author} size={44} />
                    <div>
                        <div className={styles.detailAuthor}>{post.author}</div>
                        <div className={styles.rowSub}>{post.group}</div>
                        <div className={styles.rowSub}>{post.createdAt}</div>
                    </div>
                </div>
                <p className={styles.detailBody}>{post.body}</p>
                <div className={styles.metaRow}>
                    <span>返信 {post.replies}</span>
                    <span>いいね {post.likes}</span>
                    {post.reportCount > 0 && <Badge label={`通報 ${post.reportCount}`} tone="red" />}
                </div>
            </Card>

            <Card title="通報情報">
                {relatedReports.length === 0 && <EmptyState message="この投稿への通報はありません" />}
                {relatedReports.map((r) => (
                    <div key={r.id}>
                        <DetailRow label="通報理由">{r.reason}</DetailRow>
                        <DetailRow label="通報者">
                            <Link to={`/admin/users/${r.reporterId}`} className={styles.userLink}>{r.reporter}</Link>
                        </DetailRow>
                        <DetailRow label="通報日時">{r.reportedAt}</DetailRow>
                    </div>
                ))}
            </Card>

            <Card title="対応ステータス">
                <select className={styles.select} value={status} onChange={(e) => setStatus(e.target.value)}>
                    {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
            </Card>

            <div className={styles.actionRow}>
                <Button variant="outline" onClick={handleToggle}>
                    {post.status === '非表示' ? '再表示する' : '非表示にする'}
                </Button>
                <Button variant="danger" onClick={handleDelete}>削除する</Button>
            </div>
        </AdminLayout>
    );
}
