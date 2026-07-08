import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import AdminLayout from '../../../components/Admin/AdminLayout';
import { Badge, Card, DetailRow, Button, EmptyState } from '../../../components/Admin/ui/Ui';
import { fetchInquiry, updateInquiry, replyInquiry } from '../../../services/admin';
import styles from './Inquiries.module.css';

const STATUS_OPTIONS = ['未対応', '対応中', '対応済み'];

export default function InquiryDetail() {
    const { inquiryId } = useParams();
    const [inquiry, setInquiry] = useState(null);
    const [status, setStatus] = useState('未対応');
    const [memo, setMemo] = useState('');
    const [reply, setReply] = useState('');

    useEffect(() => {
        fetchInquiry(inquiryId).then((i) => {
            setInquiry(i);
            if (i) {
                setStatus(i.status);
                setMemo(i.memo || '');
            }
        });
    }, [inquiryId]);

    if (!inquiry) {
        return (
            <AdminLayout title="お問い合わせ詳細" back>
                <EmptyState message="お問い合わせが見つかりません" />
            </AdminLayout>
        );
    }

    const handleReply = async () => {
        if (!reply.trim()) {
            window.alert('返信内容を入力してください。');
            return;
        }
        await replyInquiry(inquiry.id, reply);
        await updateInquiry(inquiry.id, { status, memo });
        const updated = await fetchInquiry(inquiry.id);
        setInquiry({ ...updated });
        setReply('');
        window.alert('返信しました。');
    };

    const handleSaveMemo = async () => {
        const updated = await updateInquiry(inquiry.id, { status, memo });
        setInquiry({ ...updated });
        window.alert('保存しました。');
    };

    return (
        <AdminLayout title="お問い合わせ詳細" back>
            <div className={styles.detailHead}>
                <Badge label={inquiry.status} />
                <span className={styles.detailTitle}>{inquiry.title}</span>
            </div>

            <Card>
                <DetailRow label="お問い合わせID">{inquiry.id}</DetailRow>
                <DetailRow label="ユーザー">
                    <Link to={`/admin/users/${inquiry.userId}`} className={styles.userLink}>
                        {inquiry.user} (ID: {inquiry.userId})
                    </Link>
                </DetailRow>
                <DetailRow label="お問い合わせ日時">{inquiry.createdAt}</DetailRow>
                <DetailRow label="カテゴリ">{inquiry.category}</DetailRow>
            </Card>

            <Card title="内容">
                <p className={styles.detailBody}>{inquiry.body}</p>
                {inquiry.hasAttachment && (
                    <div className={styles.attachment}>添付画像あり</div>
                )}
            </Card>

            <Card title="対応ステータス">
                <select className={styles.select} value={status} onChange={(e) => setStatus(e.target.value)}>
                    {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
            </Card>

            <Card title="管理者メモ">
                <textarea
                    className={styles.memoArea}
                    value={memo}
                    onChange={(e) => setMemo(e.target.value)}
                    placeholder="メモを入力してください"
                    rows={3}
                />
                <div className={styles.memoBtnRow}>
                    <Button variant="outline" onClick={handleSaveMemo}>メモを保存</Button>
                </div>
            </Card>

            <Card title="返信">
                <textarea
                    className={styles.memoArea}
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    placeholder="返信内容を入力してください"
                    rows={4}
                />
            </Card>

            <Button variant="primary" full onClick={handleReply}>返信する</Button>
        </AdminLayout>
    );
}
