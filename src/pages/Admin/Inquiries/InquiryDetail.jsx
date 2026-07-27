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
import { useParams, Link } from 'react-router-dom';
import AdminLayout from '../../../components/Admin/AdminLayout';
import { Badge, Card, DetailRow, Button, EmptyState } from '../../../components/Admin/ui/Ui';
import { fetchInquiry, updateInquiry, replyInquiry } from '../../../services/admin';
import { useAdminRealtimeRefresh } from '../Realtime/useAdminRealtimeRefresh';
import styles from './Inquiries.module.css';

const STATUS_OPTIONS = ['未対応', '対応中', '対応済み'];

/**
 * InquiryDetail は、このファイルの中心となる処理をまとめた関数です。
 * 画面から渡された値や API の結果を使い、次に表示する内容を決めます。
 */
export default function InquiryDetail() {
    const { inquiryId } = useParams();
    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const [inquiry, setInquiry] = useState(null);
    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const [status, setStatus] = useState('未対応');
    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const [memo, setMemo] = useState('');
    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const [reply, setReply] = useState('');

    const loadInquiry = useCallback(() => {
        // API などの非同期処理が終わった後に、受け取った結果を次の処理へ渡します。
        fetchInquiry(inquiryId).then((i) => {
            setInquiry(i);
            // ここで条件を確認し、状況に合う処理だけを実行します。
            if (i) {
                setStatus(i.status);
                setMemo(i.memo || '');
            }
        });
    }, [inquiryId]);

    // 画面が表示された直後や監視している値が変わった時に、必要なデータ取得や初期設定を行います。
    useEffect(() => {
        loadInquiry();
    }, [loadInquiry]);

    useAdminRealtimeRefresh(['admin:inquiry_updated'], loadInquiry);

    // ここで条件を確認し、状況に合う処理だけを実行します。
    if (!inquiry) {
        return (
            <AdminLayout title="お問い合わせ詳細" back backTo="/admin/support?type=inquiries">
                <EmptyState message="お問い合わせが見つかりません" />
            </AdminLayout>
        );
    }

    // handleReply は、画面操作や API 結果に合わせて必要な処理をまとめた関数です。
    const handleReply = async () => {
        // ここで条件を確認し、状況に合う処理だけを実行します。
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

    // handleSaveMemo は、画面操作や API 結果に合わせて必要な処理をまとめた関数です。
    const handleSaveMemo = async () => {
        const updated = await updateInquiry(inquiry.id, { status, memo });
        setInquiry({ ...updated });
        window.alert('保存しました。');
    };

    return (
        <AdminLayout title="お問い合わせ詳細" back backTo="/admin/support?type=inquiries">
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
