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
import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AdminLayout from '../../../components/Admin/AdminLayout';
import { Card, Button, EmptyState } from '../../../components/Admin/ui/Ui';
import { fetchNotice, createNotice, updateNotice, deleteNotice } from '../../../services/admin';
import styles from './Notices.module.css';

const TARGETS = ['全ユーザー', '特定ユーザー', '特定グループ'];

/**
 * NoticeForm は、このファイルの中心となる処理をまとめた関数です。
 * 画面から渡された値や API の結果を使い、次に表示する内容を決めます。
 */
export default function NoticeForm() {
    const { noticeId } = useParams();
    const navigate = useNavigate();
    const isEdit = Boolean(noticeId);

    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const [form, setForm] = useState({
        title: '',
        body: '',
        target: '全ユーザー',
        targetId: '',
        startAt: '',
        endAt: '',
        push: false,
    });
    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const [notFound, setNotFound] = useState(false);
    // 連打は同期ロックで防ぎ、通信失敗後の再送も同じキーで重複登録を防ぎます。
    const submittingRef = useRef(false);
    const requestKeyRef = useRef(null);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    // 画面が表示された直後や監視している値が変わった時に、必要なデータ取得や初期設定を行います。
    useEffect(() => {
        // ここで条件を確認し、状況に合う処理だけを実行します。
        if (!isEdit) return;
        // API などの非同期処理が終わった後に、受け取った結果を次の処理へ渡します。
        fetchNotice(noticeId).then((n) => {
            // ここで条件を確認し、状況に合う処理だけを実行します。
            if (!n) {
                setNotFound(true);
                return;
            }
            setForm({
                title: n.title,
                body: n.body,
                target: n.target,
                targetId: n.targetId ?? '',
                startAt: n.startAt,
                endAt: n.endAt,
                push: n.push,
            });
        }).catch(() => setError('お知らせを読み込めませんでした。画面を開き直してください。'));
    }, [noticeId, isEdit]);

    // ここで条件を確認し、状況に合う処理だけを実行します。
    if (notFound) {
        return (
            <AdminLayout title="お知らせ編集" back>
                <EmptyState message="お知らせが見つかりません" />
            </AdminLayout>
        );
    }

    // set は、画面操作や API 結果に合わせて必要な処理をまとめた関数です。
    const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

    // handleSubmit は、画面操作や API 結果に合わせて必要な処理をまとめた関数です。
    const handleSubmit = async () => {
        if (submittingRef.current) return;
        // ここで条件を確認し、状況に合う処理だけを実行します。
        if (!form.title.trim() || !form.body.trim()) {
            window.alert('タイトルと本文は必須です。');
            return;
        }
        if (form.target !== '全ユーザー' && !/^[1-9]\d*$/.test(String(form.targetId))) {
            setError('対象のユーザーIDまたはグループIDを指定してください。');
            return;
        }
        // 既存の確認ボタンで内容を確認してから登録します。日時の最終検証はAPIでも行います。
        if (!window.confirm(`以下のお知らせを${isEdit ? '保存' : '登録'}しますか？\n\n${form.title}\n${form.body}\n対象: ${form.target}${form.targetId ? ` (${form.targetId})` : ''}\n公開開始: ${form.startAt || '今すぐ'}\n公開終了: ${form.endAt || '期限なし'}`)) return;
        submittingRef.current = true;
        setSubmitting(true);
        setError('');
        try {
            if (isEdit) {
                await updateNotice(noticeId, form);
            } else {
                requestKeyRef.current ??= crypto.randomUUID();
                await createNotice({ ...form, requestKey: requestKeyRef.current });
            }
            navigate('/admin/notices');
        } catch (caughtError) {
            setError(caughtError.message || '保存に失敗しました。もう一度お試しください。');
        } finally {
            submittingRef.current = false;
            setSubmitting(false);
        }
    };

    // handleDelete は、画面操作や API 結果に合わせて必要な処理をまとめた関数です。
    const handleDelete = async () => {
        // ここで条件を確認し、状況に合う処理だけを実行します。
        if (!window.confirm('このお知らせを削除しますか?')) return;
        await deleteNotice(noticeId);
        navigate('/admin/notices');
    };

    return (
        <AdminLayout title={isEdit ? 'お知らせ編集' : 'お知らせ作成'} back>
            <Card>
                <label className={styles.field}>
                    <span className={styles.fieldLabel}>タイトル <em>必須</em></span>
                    <input type="text" maxLength={150} value={form.title} onChange={set('title')} placeholder="お知らせのタイトル" />
                </label>
                <label className={styles.field}>
                    <span className={styles.fieldLabel}>本文 <em>必須</em></span>
                    <textarea rows={5} maxLength={1000} value={form.body} onChange={set('body')} placeholder="お知らせの本文" />
                </label>
                <label className={styles.field}>
                    <span className={styles.fieldLabel}>対象</span>
                    <select value={form.target} onChange={set('target')}>
                        {TARGETS.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                </label>
                {/* 対象IDは宛先候補です。実在・有効性・所属はサーバー側で確認します。 */}
                {form.target !== '全ユーザー' && (
                    <label className={styles.field}>
                        <span className={styles.fieldLabel}>{form.target === '特定ユーザー' ? 'ユーザーID' : 'グループID'}</span>
                        <input type="number" min="1" step="1" value={form.targetId} onChange={set('targetId')} />
                    </label>
                )}
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
                    ブラウザPush通知を希望する（現在は希望の保存のみ）
                </label>
                {/* WebSocket更新とブラウザPushは別機能なので、送信できる範囲を説明します。 */}
                <p>チェックの有無にかかわらず、公開期間中はアプリ内通知に表示されます。ブラウザPushの送信は未対応です。日時は日本時間です。</p>
            </Card>
            {error && <p role="alert">{error}</p>}
            <Button variant="primary" full onClick={handleSubmit} disabled={submitting}>
                {submitting ? '保存中...' : isEdit ? '保存する' : '確認する'}
            </Button>
            {isEdit && (
                <div className={styles.deleteRow}>
                    <Button variant="dangerOutline" full onClick={handleDelete}>削除する</Button>
                </div>
            )}
        </AdminLayout>
    );
}
