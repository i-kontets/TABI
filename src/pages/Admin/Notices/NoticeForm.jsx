import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AdminLayout from '../../../components/Admin/AdminLayout';
import { Card, Button, EmptyState } from '../../../components/Admin/ui/Ui';
import { fetchNotice, createNotice, updateNotice, deleteNotice } from '../../../services/admin';
import styles from './Notices.module.css';

const TARGETS = ['全ユーザー', '特定ユーザー', '特定グループ'];

export default function NoticeForm() {
    const { noticeId } = useParams();
    const navigate = useNavigate();
    const isEdit = Boolean(noticeId);

    const [form, setForm] = useState({
        title: '',
        body: '',
        target: '全ユーザー',
        startAt: '',
        endAt: '',
        push: false,
    });
    const [notFound, setNotFound] = useState(false);

    useEffect(() => {
        if (!isEdit) return;
        fetchNotice(noticeId).then((n) => {
            if (!n) {
                setNotFound(true);
                return;
            }
            setForm({
                title: n.title,
                body: n.body,
                target: n.target,
                startAt: n.startAt,
                endAt: n.endAt,
                push: n.push,
            });
        });
    }, [noticeId, isEdit]);

    if (notFound) {
        return (
            <AdminLayout title="お知らせ編集" back>
                <EmptyState message="お知らせが見つかりません" />
            </AdminLayout>
        );
    }

    const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

    const handleSubmit = async () => {
        if (!form.title.trim() || !form.body.trim()) {
            window.alert('タイトルと本文は必須です。');
            return;
        }
        if (isEdit) {
            await updateNotice(noticeId, form);
        } else {
            await createNotice(form);
        }
        navigate('/admin/notices');
    };

    const handleDelete = async () => {
        if (!window.confirm('このお知らせを削除しますか?')) return;
        await deleteNotice(noticeId);
        navigate('/admin/notices');
    };

    return (
        <AdminLayout title={isEdit ? 'お知らせ編集' : 'お知らせ作成'} back>
            <Card>
                <label className={styles.field}>
                    <span className={styles.fieldLabel}>タイトル <em>必須</em></span>
                    <input type="text" value={form.title} onChange={set('title')} placeholder="お知らせのタイトル" />
                </label>
                <label className={styles.field}>
                    <span className={styles.fieldLabel}>本文 <em>必須</em></span>
                    <textarea rows={5} value={form.body} onChange={set('body')} placeholder="お知らせの本文" />
                </label>
                <label className={styles.field}>
                    <span className={styles.fieldLabel}>対象</span>
                    <select value={form.target} onChange={set('target')}>
                        {TARGETS.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                </label>
                <label className={styles.field}>
                    <span className={styles.fieldLabel}>公開開始</span>
                    <input type="text" value={form.startAt} onChange={set('startAt')} placeholder="2026/07/01 00:00" />
                </label>
                <label className={styles.field}>
                    <span className={styles.fieldLabel}>公開終了</span>
                    <input type="text" value={form.endAt} onChange={set('endAt')} placeholder="2026/07/07 23:59" />
                </label>
                <label className={styles.checkRow}>
                    <input
                        type="checkbox"
                        checked={form.push}
                        onChange={(e) => setForm({ ...form, push: e.target.checked })}
                    />
                    プッシュ通知を送信する
                </label>
            </Card>

            <Button variant="primary" full onClick={handleSubmit}>
                {isEdit ? '保存する' : '確認する'}
            </Button>
            {isEdit && (
                <div className={styles.deleteRow}>
                    <Button variant="dangerOutline" full onClick={handleDelete}>削除する</Button>
                </div>
            )}
        </AdminLayout>
    );
}
