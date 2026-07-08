import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import AdminLayout from '../../../components/Admin/AdminLayout';
import { Avatar, Badge, Card, DetailRow, Button, EmptyState } from '../../../components/Admin/ui/Ui';
import { fetchPost, togglePostVisibility, deletePost, fetchReports } from '../../../services/admin';
import styles from './Posts.module.css';

const STATUS_OPTIONS = ['未対応', '確認中', '対応済み'];

export default function PostDetail() {
    const { postId } = useParams();
    const navigate = useNavigate();
    const [post, setPost] = useState(null);
    const [reports, setReports] = useState([]);
    const [status, setStatus] = useState('未対応');

    useEffect(() => {
        fetchPost(postId).then(setPost);
        fetchReports().then((r) => setReports(r.items));
    }, [postId]);

    if (!post) {
        return (
            <AdminLayout title="投稿詳細" back>
                <EmptyState message="投稿が見つかりません" />
            </AdminLayout>
        );
    }

    const relatedReports = reports.filter((r) => r.targetPostId === post.id);

    const handleToggle = async () => {
        const updated = await togglePostVisibility(post.id);
        setPost({ ...updated });
    };

    const handleDelete = async () => {
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
